/**
 * The interaction loop's state container (Milestone 4). Holds the live
 * `GameState` in a reducer and drives it purely through the engine's public
 * functions — `applyRoll` / `applyMove` — never re-implementing a rule. The die
 * value is rolled by the caller (the engine takes its RNG injected) and passed
 * in, so the reducer itself stays a pure function of `(view, action)`.
 *
 * Alongside the engine state it keeps two bits of *view* state the board doesn't
 * carry: `rolled` (the die face to show — the last value rolled, held until the
 * next roll, surviving both a forfeit where the engine clears `lastRoll` and the
 * handover to the next player) and `notice` (a one-line message
 * surfacing what the engine just decided — a capture, an extra roll, a forfeit,
 * the streak penalty, or a win). Both are derived by *observing* the before/after
 * states, not by re-deriving the rules.
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
  /** Die face to display — the most recent roll, held until someone rolls
   *  again; null only before any roll has happened (a fresh game). */
  rolled: number | null
  /** Which player rolled the held `rolled` value. Lets the board show that roll
   *  as a small die in *their* nest once the turn has moved on (the centre die
   *  becomes a "Roll" prompt for whoever's up). Optional: the dev scenario
   *  loader may omit it. */
  rolledBy?: number | null
  /** One-line feedback about the last engine event, or null. A list of text runs
   *  so part of it (e.g. a captured colour's name) can be tinted — see Notice. */
  notice: Notice | null
  /**
   * Which player the `notice` is about — the player who just acted (so the board
   * can anchor the message in *their* nest). Optional: omitted by the dev
   * scenario loader, where the board falls back to the current player's nest.
   */
  noticeOwner?: number | null
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

function init(playerCount: number): GameView {
  return { game: createGame(JEU_DE_PITON, playerCount), rolled: null, notice: null }
}

function reducer(view: GameView, action: GameAction): GameView {
  switch (action.type) {
    case 'newGame':
      return init(action.playerCount)

    case 'load':
      return action.view

    case 'forceNextTurn': {
      // Unstick a wedged game: hand the turn on, clearing any stale notice. A
      // finished game has no "next turn", so leave game-over untouched.
      if (view.game.phase === 'game-over') return view
      return {
        game: forceNextTurn(view.game),
        rolled: view.rolled,
        rolledBy: view.rolledBy,
        notice: null,
        noticeOwner: null,
      }
    }

    case 'roll': {
      const prev = view.game
      if (prev.phase !== 'awaiting-roll') return view
      const roller = prev.turn
      const next = applyRoll(prev, action.value)

      // A roll with a legal move drops us into awaiting-move — no message; the
      // board lights up the movable pitons instead.
      if (next.phase === 'awaiting-move') {
        return { game: next, rolled: action.value, rolledBy: roller, notice: null, noticeOwner: null }
      }

      // No legal move, yet the turn stayed put ⇒ an unplayable bonus 6: nothing
      // to play, but the player still rolls again. The message lands in the
      // roller's own (colour-coded) nest, so it omits the player's name.
      if (next.turn === roller) {
        return {
          game: next,
          rolled: action.value,
          rolledBy: roller,
          notice: NOTICE.noMoveRollAgain,
          noticeOwner: roller,
        }
      }

      // Otherwise the engine has passed the turn. Two cases, told apart by
      // observing whether the roller lost a piton to its nest (the 3rd-6 streak
      // penalty) versus an ordinary no-legal-move forfeit.
      const penalized = nestCount(next, roller) > nestCount(prev, roller)
      const notice = penalized ? NOTICE.threeSixes : NOTICE.noMovePass
      return { game: next, rolled: action.value, rolledBy: roller, notice, noticeOwner: roller }
    }

    case 'pick': {
      const prev = view.game
      if (prev.phase !== 'awaiting-move') return view
      const next = applyMove(prev, action.move)

      if (next.phase === 'game-over') {
        return { game: next, rolled: view.rolled, rolledBy: view.rolledBy, notice: NOTICE.win, noticeOwner: prev.turn }
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
      if (next.turn === prev.turn) parts.push(NOTICE.rollAgain)
      const notice = parts.length ? joinNotice(parts) : null
      // Keep the rolled face + its roller on display through the move and into
      // the next player's awaiting-roll — once the turn moves on, the board shows
      // that value as a small die in the roller's nest while the centre die
      // becomes a "Roll" prompt. (Both reset only on a new game.)
      return { game: next, rolled: view.rolled, rolledBy: view.rolledBy, notice, noticeOwner: notice ? prev.turn : null }
    }
  }
}

export function useGame(initialPlayers: number) {
  return useReducer(reducer, initialPlayers, init)
}
