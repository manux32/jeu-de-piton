/**
 * The interaction loop's state container (Milestone 4). Holds the live
 * `GameState` in a reducer and drives it purely through the engine's public
 * functions — `applyRoll` / `applyMove` — never re-implementing a rule. The die
 * value is rolled by the caller (the engine takes its RNG injected) and passed
 * in, so the reducer itself stays a pure function of `(view, action)`.
 *
 * Alongside the engine state it keeps two bits of *view* state the board doesn't
 * carry, each as a **per-seat array** indexed by player: `rolls[p]` (the last die
 * value player p rolled) and `notices[p]` (a one-line message surfacing what the
 * engine decided on p's last action — a capture, an extra roll, a forfeit, the
 * streak penalty, or a win). Both are derived by *observing* the before/after
 * states, not by re-deriving the rules.
 *
 * Lifecycle — "pinned until it's their turn again": a seat's roll + notice are
 * set when that seat acts and **persist in their nest** while play moves around
 * the table, so before you roll you can see what every other player/AI did since
 * your last turn. They're wiped the moment the turn lands back on that seat (see
 * `handover` below) — their nest then shows the "Roll" prompt + centre die, not a
 * stale line. A turn that *stays* (a bonus 6) is not a handover, so a roller's
 * own "Roll again" line + die remain.
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

export interface GameView {
  game: GameState
  /** Per-seat last die roll, indexed by player. Each value shows as a small die
   *  in *that* player's nest until their turn comes round again; null = they
   *  haven't rolled since the last new game. The board reads `rolls[turn]` to
   *  rest the centre die on the current player's roll. */
  rolls: (number | null)[]
  /** Per-seat last-event notice, indexed by player — the one-line message the
   *  engine warranted on that seat's last action (capture, extra roll, forfeit,
   *  streak penalty, win), or null. Each is a list of text runs so part of it
   *  (e.g. a captured colour's name) can be tinted — see Notice. */
  notices: (Notice | null)[]
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
    rolls: game.players.map(() => null),
    notices: game.players.map(() => null),
  }
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
      // keeps its last message — that's legit history).
      return handover(view, next, view.game.turn)
    }

    case 'roll': {
      const prev = view.game
      if (prev.phase !== 'awaiting-roll') return view
      const roller = prev.turn
      const next = applyRoll(prev, action.value)
      const rolls = setAt(view.rolls, roller, action.value)

      // A roll with a legal move drops us into awaiting-move — no message; the
      // board lights up the movable pitons instead. Clear the roller's own slot:
      // their turn is underway, and a real notice lands when they move.
      if (next.phase === 'awaiting-move') {
        return { game: next, rolls, notices: setAt(view.notices, roller, null) }
      }

      // No legal move, yet the turn stayed put ⇒ an unplayable bonus 6: nothing
      // to play, but the player still rolls again. The message lands in the
      // roller's own (colour-coded) nest, so it omits the player's name. No
      // handover (the turn kept the roller).
      if (next.turn === roller) {
        return { game: next, rolls, notices: setAt(view.notices, roller, NOTICE.noMoveRollAgain) }
      }

      // Otherwise the engine has passed the turn. Two cases, told apart by
      // observing whether the roller lost a piton to its nest (the 3rd-6 streak
      // penalty) versus an ordinary no-legal-move forfeit. The message stays
      // pinned in the roller's nest; the handover wipes the incoming seat.
      const penalized = nestCount(next, roller) > nestCount(prev, roller)
      const message = penalized ? NOTICE.threeSixes : NOTICE.noMovePass
      return handover(
        { game: next, rolls, notices: setAt(view.notices, roller, message) },
        next,
        roller,
      )
    }

    case 'pick': {
      const prev = view.game
      if (prev.phase !== 'awaiting-move') return view
      const mover = prev.turn
      const next = applyMove(prev, action.move)

      if (next.phase === 'game-over') {
        // Game over: the win line stays in the winner's nest (no handover — play
        // has stopped). Other seats keep their last messages behind the popup.
        return { ...view, game: next, notices: setAt(view.notices, mover, NOTICE.win) }
      }
      const parts: Notice[] = []
      if (action.move.captures) {
        // Name the captured colour in the notice (e.g. "Capture! (red)"), tinted
        // in that player's colour. Read the colour off the captured piton's owner
        // in the pre-move state, not by parsing the id, so it stays correct if the
        // id scheme ever changes.
        const captured = prev.players
          .flatMap((pl) => pl.pitons)
          .find((pt) => pt.id === action.move.captures)
        if (captured) parts.push(NOTICE.capture(captured.owner))
      }
      // Turn unchanged after a move ⇒ the roll earned another go (a 6).
      if (next.turn === mover) parts.push(NOTICE.rollAgain)
      // SEAM — "Richer notice copy" backlog item: an ordinary move with no
      // capture and no bonus produces no notice today, so the mover's nest then
      // shows only their last-roll die. To describe the move itself ("advanced",
      // "left the nest", "finished one"), push a part here derived from
      // `action.move` — it persists in the mover's nest like any other notice.
      const message = parts.length ? joinNotice(parts) : null
      // The mover's rolls[] slot was set at roll time and stays (their roll
      // persists in their nest). Pin the new message there, then hand over if the
      // turn moved on (a non-bonus move) to wipe the incoming seat's stale slot.
      return handover(
        { ...view, game: next, notices: setAt(view.notices, mover, message) },
        next,
        mover,
      )
    }
  }
}

/**
 * Apply the "pinned until it's their turn again" rule at a turn boundary: if the
 * turn has left `actor`, wipe the seat now on the clock (`next.turn`) — its
 * roll + notice are last-round history the player no longer needs to see, and its
 * nest shows the "Roll" prompt + centre die instead. A turn that *stays* with the
 * actor (a bonus 6 / game-over) is not a handover, so nothing is wiped.
 */
function handover(view: GameView, next: GameState, actor: number): GameView {
  if (next.turn === actor) return { ...view, game: next }
  return {
    ...view,
    game: next,
    rolls: setAt(view.rolls, next.turn, null),
    notices: setAt(view.notices, next.turn, null),
  }
}

export function useGame(initialPlayers: number) {
  return useReducer(reducer, initialPlayers, init)
}
