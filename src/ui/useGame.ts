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
  forceNextTurn,
  JEU_DE_PITON,
  type GameState,
  type Move,
} from '../engine'
import { NOTICE, joinNotice, type Notice } from './strings'

/** One completed sub-turn in a seat's turn log: the die that was rolled and the
 *  notice describing what came of it. */
export interface TurnEntry {
  die: number
  /** The one-line outcome. A list of text runs so part of it (e.g. a captured
   *  colour's name) can be tinted — see Notice. */
  notice: Notice
}

export interface GameView {
  game: GameState
  /** Per-seat turn log, indexed by player: the sub-turns that seat completed,
   *  oldest first. Pinned in their nest (shown as stacked die+notice rows) until
   *  their turn comes round again, then wiped. Empty = nothing to show. */
  log: TurnEntry[][]
}

export type GameAction =
  | { type: 'roll'; value: number }
  | { type: 'pick'; move: Move }
  | { type: 'newGame'; playerCount: number }
  // Escape hatch: force the turn to the next player to unstick a wedged game.
  | { type: 'forceNextTurn' }
  // DEV-only: drop a fully-built view straight in (see src/ui/dev/).
  | { type: 'load'; view: GameView }

const nestCount = (game: GameState, i: number) =>
  game.players[i].pitons.filter((p) => p.position.kind === 'nest').length

/** Immutably set one seat's slot in a per-seat array, leaving the rest as-is. */
const setAt = <T>(arr: T[], i: number, value: T): T[] =>
  arr.map((x, j) => (j === i ? value : x))

function init(playerCount: number): GameView {
  const game = createGame(JEU_DE_PITON, playerCount)
  return {
    game,
    log: game.players.map(() => []),
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
      return init(action.playerCount)

    case 'load':
      return action.view

    case 'forceNextTurn': {
      // Unstick a wedged game: hand the turn on. A finished game has no "next
      // turn", so leave game-over untouched.
      if (view.game.phase === 'game-over') return view
      const next = forceNextTurn(view.game)
      // Treat it as a handover: wipe the seat now on the clock (the skipped seat
      // keeps its log — that's legit history).
      return handover(view, next, view.game.turn)
    }

    case 'roll': {
      const prev = view.game
      if (prev.phase !== 'awaiting-roll') return view
      const roller = prev.turn
      const next = applyRoll(prev, action.value)

      // A roll with a legal move drops us into awaiting-move — this sub-turn isn't
      // complete yet (the move is what logs it), so no entry now; the board lights
      // up the movable pitons instead.
      if (next.phase === 'awaiting-move') return { ...view, game: next }

      // No legal move. Log this sub-turn against the roller, carrying its die.
      // (Appends to whatever they've already done this turn.)
      const append = (notice: Notice): GameView => ({
        ...view,
        game: next,
        log: setAt(view.log, roller, [...view.log[roller], { die: action.value, notice }]),
      })

      // The turn stayed put ⇒ an unplayable bonus 6: nothing to play, but the
      // player rolls again. No handover (the turn kept the roller). The "roll
      // again" is shown by the live prompt, not baked into this finished row.
      if (next.turn === roller) return append(NOTICE.noMove)

      // Otherwise the engine passed the turn. Two cases, told apart by observing
      // whether the roller lost a piton to its nest (the 3rd-6 streak penalty)
      // versus an ordinary no-legal-move forfeit. The handover wipes the incoming
      // seat's log.
      const penalized = nestCount(next, roller) > nestCount(prev, roller)
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

      const logged: GameView = {
        ...view,
        game: next,
        log: setAt(view.log, mover, [...view.log[mover], { die, notice: joinNotice(parts) }]),
      }
      // Game over: play has stopped, so no handover — the win line stays put and
      // every seat keeps its log behind the popup. Otherwise hand over if the
      // turn moved on (a non-bonus move), wiping the incoming seat's stale log.
      return next.phase === 'game-over' ? logged : handover(logged, next, mover)
    }
  }
}

/**
 * Apply the "pinned until it's their turn again" rule at a turn boundary: if the
 * turn has left `actor`, wipe the log of the seat now on the clock (`next.turn`)
 * — its entries are last-round history the player no longer needs to see, and its
 * nest shows the "Roll" prompt + centre die instead. A turn that *stays* with the
 * actor (a bonus 6 / game-over) is not a handover, so nothing is wiped.
 */
function handover(view: GameView, next: GameState, actor: number): GameView {
  if (next.turn === actor) return { ...view, game: next }
  return { ...view, game: next, log: setAt(view.log, next.turn, []) }
}

export function useGame(initialPlayers: number) {
  return useReducer(reducer, initialPlayers, init)
}
