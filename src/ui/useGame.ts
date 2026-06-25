/**
 * The interaction loop's state container (Milestone 4). Holds the live
 * `GameState` in a reducer and drives it purely through the engine's public
 * functions — `applyRoll` / `applyMove` — never re-implementing a rule. The die
 * value is rolled by the caller (the engine takes its RNG injected) and passed
 * in, so the reducer itself stays a pure function of `(view, action)`.
 *
 * Alongside the engine state it keeps one bit of *view* state the board doesn't
 * carry: a **per-seat turn log** (`log[p]`), a list of `TurnEntry`s — one per
 * *sub-turn* that seat completed (each carries the die it rolled + a one-line
 * notice describing the outcome: a move description, a capture, an extra roll, a
 * forfeit, the streak penalty, or a win). Because a 6 grants another roll, a
 * single turn can complete several sub-turns, so the entries stack — the nest
 * shows the whole "here's everything I did this turn" history. All of it is
 * derived by *observing* the before/after engine states, never by re-deriving a
 * rule.
 *
 * Lifecycle — "pinned until it's their turn again": entries are appended as a
 * seat acts and the whole log **persists in their nest** while play moves around
 * the table, so before you roll you can read everything every other player/AI did
 * since your last turn. The log is wiped the moment the turn lands back on that
 * seat (see `handover` below) — their nest then shows the "Roll" prompt + centre
 * die, not stale history. A turn that *stays* (a bonus 6) is not a handover, so
 * the roller's accumulating entries remain and the next sub-turn appends to them.
 *
 * (The centre die is driven separately, off `game.lastRoll`, in App — the log
 * only records *completed* sub-turns, so a roll still awaiting its move isn't in
 * it yet.)
 */
import { useReducer } from 'react'
import {
  applyMove,
  applyRoll,
  createGame,
  seatOfPiton,
  JEU_DE_PITON,
  type GameState,
  type Move,
  type PitonPosition,
  type PlayerColor,
} from '../engine'
import { NOTICE, joinNotice, type Notice } from './strings'

/** One completed sub-turn in a seat's turn log: the die that was rolled and the
 *  notice describing what came of it. */
export interface TurnEntry {
  die: number
  /** The one-line outcome. A list of text runs so part of it (e.g. a captured
   *  colour's name) can be tinted — see Notice. */
  notice: Notice
  /**
   * The piece move this sub-turn played, if any — purely so the board can draw a
   * persisted trajectory line for it (see Trajectories). NOT shown in the nest
   * notice (which reads only `die`/`notice`). Absent for sub-turns with no piece
   * move: a forfeit, an unplayable bonus 6, or the streak penalty.
   *
   * `owner` is the seat that OWNS the moved piton, which differs from the seat
   * that played it when a finished 2v2 seat plays its partner's piton. The
   * trajectory's screen geometry (entry, home lane, nest) is the owner's, even
   * though the line is drawn in the playing seat's colour — so the line must
   * carry the owner, not be assumed to match the log's seat key.
   */
  move?: { from: PitonPosition; to: PitonPosition; owner: number }
}

/**
 * One *completed* turn in the permanent game-log history: which seat played it and
 * the stack of sub-turns they finished (the very rows their nest showed). Unlike
 * the per-seat `log`, which is wiped each round, these are snapshotted the moment a
 * seat's turn ends and kept for the whole game — the Game Log window reads them.
 * The in-progress turn is never here (only finished stacks are snapshotted), so the
 * log shows previous turns only, exactly like the board notices.
 */
export interface CompletedTurn {
  /** The seat that played this turn (index into `state.players`). */
  seat: number
  /** Its finished sub-turns, oldest first — a copy of the seat's nest stack. */
  entries: TurnEntry[]
}

/**
 * One seat's running tally for the whole game — a scoreboard shown in the Stats
 * window (totals are derived in the UI). Like the turn log, it's pure observation
 * of the engine's before/after states, never a re-derived rule; unlike the log it
 * is NEVER wiped — it accumulates from the new-game deal to the win.
 *
 * Captures split by *where* they land, which maps exactly onto the cabin's
 * start-square exception: a moving piton can never capture on a (always-safe)
 * start square, so every movement capture is `regularCaptures`; the only capture
 * that lands on a start square is leaving the nest straight onto your OWN start
 * and bumping a squatting enemy (`startCaptures`). The two loss fields are the
 * mirror of those, from the victim's side.
 */
export interface PlayerStats {
  /** Captures made on an ordinary track square (the common case). */
  regularCaptures: number
  /** Captures made by leaving the nest onto your own start square, bumping an
   *  enemy sheltering there (the start-square exception). */
  startCaptures: number
  /** Own pitons sent back to the nest by an enemy's ordinary move. */
  lostToCapture: number
  /** Own pitons bumped because they sheltered on an enemy's start square and the
   *  owner came out of the nest onto them (mirror of `startCaptures`). */
  lostOnEnemyStart: number
  /** Own pitons sent home by the triple-6 penalty — counted only when a piton was
   *  actually lost (none if the player had nothing on the track to lose). */
  lostToThreeSixes: number
  /** Every 6 this seat rolled, including an unplayable bonus 6 and the penalized
   *  third one — all are 6s that came up. */
  sixesRolled: number
}

/** A fresh, all-zero tally for one seat. */
export const emptyStats = (): PlayerStats => ({
  regularCaptures: 0,
  startCaptures: 0,
  lostToCapture: 0,
  lostOnEnemyStart: 0,
  lostToThreeSixes: 0,
  sixesRolled: 0,
})

export interface GameView {
  game: GameState
  /** Per-seat turn log, indexed by player: the sub-turns that seat completed,
   *  oldest first. Pinned in their nest (shown as stacked die+notice rows) until
   *  their turn comes round again, then wiped. Empty = nothing to show. */
  log: TurnEntry[][]
  /** Per-seat running tally for the whole game (the Stats window). Indexed by
   *  player; accumulates from the deal to the win, never wiped at a handover. */
  stats: PlayerStats[]
  /** Append-only full-game history, oldest turn first: every seat's completed
   *  sub-turn stack, snapshotted when its turn ended. Never wiped except by New
   *  Game. Powers the Game Log window. */
  history: CompletedTurn[]
}

export type GameAction =
  | { type: 'roll'; value: number }
  | { type: 'pick'; move: Move }
  // Start a fresh game. `colors` (optional) sets each seat's colour from the New
  // Game setup window; its length is the player count. Omit it and `playerCount`
  // chooses the count with the default seat→colour order. `teams` (optional) sets
  // each seat's team id for 2v2 (`[0,1,0,1]`); omit it for a free-for-all.
  | { type: 'newGame'; playerCount: number; colors?: PlayerColor[]; teams?: number[] }
  // DEV-only: drop a fully-built view straight in (see src/ui/dev/).
  | { type: 'load'; view: GameView }

const nestCount = (game: GameState, i: number) =>
  game.players[i].pitons.filter((p) => p.position.kind === 'nest').length

/** Immutably set one seat's slot in a per-seat array, leaving the rest as-is. */
const setAt = <T>(arr: T[], i: number, value: T): T[] =>
  arr.map((x, j) => (j === i ? value : x))

/** Immutably +1 one counter of one seat's tally, leaving the rest as-is. */
const bumpStat = (
  stats: PlayerStats[],
  seat: number,
  key: keyof PlayerStats,
): PlayerStats[] => setAt(stats, seat, { ...stats[seat], [key]: stats[seat][key] + 1 })

function init(playerCount: number, colors?: PlayerColor[], teams?: number[]): GameView {
  const game = createGame(JEU_DE_PITON, playerCount, colors, teams)
  return {
    game,
    log: game.players.map(() => []),
    stats: game.players.map(() => emptyStats()),
    history: [],
  }
}

/**
 * Describe what a move did, as notice parts (most specific milestone first), for
 * the turn log. A bare advance is "Moved" — but only as a fallback when nothing
 * more specific (a milestone, or a capture) already says it. Pure observation of
 * the move's from→to against the engine's geometry/ruleset; no rule re-derived.
 */
function describeMove(move: Move, before: GameState, mover: number): Notice[] {
  const { from, to } = move
  const parts: Notice[] = []

  if (to.kind === 'finished') {
    parts.push(NOTICE.gotHome)
  } else if (from.kind === 'nest') {
    // Leaving the nest lands on the (safe) start square — that's the headline,
    // so don't also announce "reached safe square".
    parts.push(NOTICE.leftNest)
  } else {
    if (from.kind === 'track' && from.square === before.geometry.entryIndices[mover]) {
      parts.push(NOTICE.leftStart)
    }
    if (to.kind === 'lane' && from.kind !== 'lane') {
      parts.push(NOTICE.reachedHomeLane)
    } else if (to.kind === 'track' && before.ruleset.safeSquares.includes(to.square)) {
      parts.push(NOTICE.reachedSafe)
    }
  }

  // A capture already implies a move, so it rides alongside any milestone and
  // suppresses the bland "Moved" fallback. Read the captured colour off the
  // pre-move state (not by parsing the id) so it survives an id-scheme change.
  if (move.captures) {
    const captured = before.players
      .flatMap((pl) => pl.pitons)
      .find((pt) => pt.id === move.captures)
    if (captured) parts.push(NOTICE.capture(captured.owner))
  }

  if (parts.length === 0) parts.push(NOTICE.moved)
  return parts
}

function reducer(view: GameView, action: GameAction): GameView {
  switch (action.type) {
    case 'newGame':
      return init(action.playerCount, action.colors, action.teams)

    case 'load':
      return action.view

    case 'roll': {
      const prev = view.game
      if (prev.phase !== 'awaiting-roll') return view
      const roller = prev.turn
      const next = applyRoll(prev, action.value)

      // Stats: count every 6 the roller turned up — whether it's played, an
      // unplayable bonus, or the penalized third one. `stats` (a let) threads into
      // every return path below; the `append` closure reads its latest value.
      let stats = view.stats
      if (action.value === 6) stats = bumpStat(stats, roller, 'sixesRolled')

      // A roll with a legal move drops us into awaiting-move — this sub-turn isn't
      // complete yet (the move is what logs it), so no entry now; the board lights
      // up the movable pitons instead.
      if (next.phase === 'awaiting-move') return { ...view, game: next, stats }

      // No legal move. Log this sub-turn against the roller, carrying its die.
      // (Appends to whatever they've already done this turn.)
      const append = (notice: Notice): GameView => ({
        ...view,
        game: next,
        stats,
        log: setAt(view.log, roller, [...view.log[roller], { die: action.value, notice }]),
      })

      // The turn stayed put ⇒ an unplayable bonus 6: nothing to play, but the
      // player rolls again. No handover (the turn kept the roller). The "roll
      // again" is shown by the live prompt, not baked into this finished row.
      if (next.turn === roller) return append(NOTICE.noMove)

      // Otherwise the engine passed the turn. Two cases, told apart by observing
      // whether the roller lost a piton to its nest (the 3rd-6 streak penalty)
      // versus an ordinary no-legal-move forfeit. The penalty stat is gated on the
      // same observation, so it only counts a 6 that ACTUALLY cost a piton. The
      // handover wipes the incoming seat's log.
      const penalized = nestCount(next, roller) > nestCount(prev, roller)
      if (penalized) stats = bumpStat(stats, roller, 'lostToThreeSixes')
      return handover(append(penalized ? NOTICE.threeSixes : NOTICE.noMovePass), next, roller)
    }

    case 'pick': {
      const prev = view.game
      // awaiting-move guarantees a pending roll; bail defensively if not.
      if (prev.phase !== 'awaiting-move' || prev.lastRoll === null) return view
      const mover = prev.turn
      const die = prev.lastRoll
      const next = applyMove(prev, action.move)

      // Describe the move, then tack on the win modifier if this finished the
      // game. A 6's extra go is NOT added here: "roll again" belongs to the live
      // prompt (PROMPT.rollAgain) on the next sub-turn, so finished rows stay
      // short and never repeat it. The whole thing is one logged sub-turn
      // carrying the roll that drove it.
      const parts = describeMove(action.move, prev, mover)
      if (next.phase === 'game-over') parts.push(NOTICE.win)

      // Stats: a capture scores for the mover and a loss for its victim, split by
      // WHERE it landed. A capture out of the nest (from === nest) is the entry
      // capture onto the mover's own start square — the only capture a start square
      // can host, since every start is a safe square that blocks a moving piton.
      // Any other capture happened on an ordinary track square.
      let stats = view.stats
      if (action.move.captures) {
        const captured = prev.players
          .flatMap((pl) => pl.pitons)
          .find((pt) => pt.id === action.move.captures)
        const victim = captured
          ? prev.players.findIndex((pl) => pl.color === captured.owner)
          : -1
        const onStart = action.move.from.kind === 'nest'
        stats = bumpStat(stats, mover, onStart ? 'startCaptures' : 'regularCaptures')
        if (victim >= 0) {
          stats = bumpStat(stats, victim, onStart ? 'lostOnEnemyStart' : 'lostToCapture')
        }
      }

      // The piton's owner — same as `mover` except when a finished 2v2 seat is
      // playing its partner's piton, where the trajectory must follow the
      // partner's arm geometry (lane/nest), not the playing seat's.
      const owner = seatOfPiton(prev, action.move.pitonId)

      const logged: GameView = {
        ...view,
        game: next,
        stats,
        log: setAt(view.log, mover, [
          ...view.log[mover],
          { die, notice: joinNotice(parts), move: { from: action.move.from, to: action.move.to, owner } },
        ]),
      }
      // Game over: play has stopped, so no handover — the win line stays put and
      // every seat keeps its log behind the popup. There's no handover to snapshot
      // the winning turn, so flush it into the history here, so the log ends on the
      // win. Otherwise hand over if the turn moved on (a non-bonus move), wiping the
      // incoming seat's stale log (handover snapshots the outgoing turn).
      return next.phase === 'game-over'
        ? { ...logged, history: [...logged.history, { seat: mover, entries: logged.log[mover] }] }
        : handover(logged, next, mover)
    }
  }
}

/**
 * Apply the "pinned until it's their turn again" rule at a turn boundary: if the
 * turn has left `actor`, wipe the log of the seat now on the clock (`next.turn`)
 * — its entries are last-round history the player no longer needs to see, and its
 * nest shows the "Roll" prompt + centre die instead. A turn that *stays* with the
 * actor (a bonus 6 / game-over) is not a handover, so nothing is wiped.
 *
 * A real handover also marks the end of `actor`'s turn, so this is where their now
 * finished stack is snapshotted (a copy) into the permanent `history` for the Game
 * Log — once per turn, never the in-progress one (a bonus-6 stay returns early
 * above, before any snapshot).
 */
function handover(view: GameView, next: GameState, actor: number): GameView {
  if (next.turn === actor) return { ...view, game: next }
  return {
    ...view,
    game: next,
    history: [...view.history, { seat: actor, entries: view.log[actor] }],
    log: setAt(view.log, next.turn, []),
  }
}

export function useGame(initialPlayers: number) {
  return useReducer(reducer, initialPlayers, init)
}
