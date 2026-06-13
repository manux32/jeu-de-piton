/**
 * The interaction loop's state container (Milestone 4). Holds the live
 * `GameState` in a reducer and drives it purely through the engine's public
 * functions — `applyRoll` / `applyMove` — never re-implementing a rule. The die
 * value is rolled by the caller (the engine takes its RNG injected) and passed
 * in, so the reducer itself stays a pure function of `(view, action)`.
 *
 * Alongside the engine state it keeps two bits of *view* state the board doesn't
 * carry: `rolled` (the die face to show on the chip, which survives an immediate
 * forfeit where the engine clears `lastRoll`) and `notice` (a one-line message
 * surfacing what the engine just decided — a capture, an extra roll, a forfeit,
 * the streak penalty, or a win). Both are derived by *observing* the before/after
 * states, not by re-deriving the rules.
 */
import { useReducer } from 'react'
import {
  applyMove,
  applyRoll,
  createGame,
  JEU_DE_PITON,
  type GameState,
  type Move,
} from '../engine'

export interface GameView {
  game: GameState
  /** Die face to display; null before the first roll of a turn. */
  rolled: number | null
  /** One-line feedback about the last engine event, or null. */
  notice: string | null
}

export type GameAction =
  | { type: 'roll'; value: number }
  | { type: 'pick'; move: Move }
  | { type: 'newGame'; playerCount: number }

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const name = (game: GameState, i: number) => cap(game.players[i].color)
const nestCount = (game: GameState, i: number) =>
  game.players[i].pitons.filter((p) => p.position.kind === 'nest').length

function init(playerCount: number): GameView {
  return { game: createGame(JEU_DE_PITON, playerCount), rolled: null, notice: null }
}

function reducer(view: GameView, action: GameAction): GameView {
  switch (action.type) {
    case 'newGame':
      return init(action.playerCount)

    case 'roll': {
      const prev = view.game
      if (prev.phase !== 'awaiting-roll') return view
      const roller = prev.turn
      const next = applyRoll(prev, action.value)

      // A roll with a legal move drops us into awaiting-move — no message; the
      // board lights up the movable pitons instead.
      if (next.phase === 'awaiting-move') {
        return { game: next, rolled: action.value, notice: null }
      }

      // No legal move, yet the turn stayed put ⇒ an unplayable bonus 6: nothing
      // to play, but the player still rolls again.
      if (next.turn === roller) {
        return {
          game: next,
          rolled: action.value,
          notice: `${name(prev, roller)} rolled ${action.value} — no legal move, rolls again.`,
        }
      }

      // Otherwise the engine has passed the turn. Two cases, told apart by
      // observing whether the roller lost a piton to its nest (the 3rd-6 streak
      // penalty) versus an ordinary no-legal-move forfeit.
      const penalized = nestCount(next, roller) > nestCount(prev, roller)
      const notice = penalized
        ? `${name(prev, roller)} rolled three ${action.value}s — leading piton sent home.`
        : `${name(prev, roller)} rolled ${action.value} — no legal move, turn passes.`
      return { game: next, rolled: action.value, notice }
    }

    case 'pick': {
      const prev = view.game
      if (prev.phase !== 'awaiting-move') return view
      const next = applyMove(prev, action.move)

      if (next.phase === 'game-over') {
        return { game: next, rolled: null, notice: `${cap(next.winner!)} wins! 🎉` }
      }
      const parts: string[] = []
      if (action.move.captures) parts.push('Capture!')
      // Turn unchanged after a move ⇒ the roll earned another go (a 6).
      if (next.turn === prev.turn) parts.push(`${name(prev, prev.turn)} rolls again.`)
      return { game: next, rolled: null, notice: parts.join(' ') || null }
    }
  }
}

export function useGame(initialPlayers: number) {
  return useReducer(reducer, initialPlayers, init)
}
