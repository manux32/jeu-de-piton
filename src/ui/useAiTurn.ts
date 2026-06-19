/**
 * AI turn driver — the seam that lets non-human seats play themselves.
 *
 * The engine and the strategy are both pure; this hook is the small piece of
 * *controller* glue that connects them to the live React loop. It watches the
 * game and, whenever it is an AI seat's turn, drives the very same path a human
 * would tap through:
 *
 *   awaiting-roll  →  (wait a beat)  →  roll()      [reuses the real spin anim]
 *   awaiting-move  →  (wait a beat)  →  strategy → dispatch a 'pick'
 *
 * Everything downstream is unchanged: `roll` is useDieRoll's own trigger (so an
 * AI roll spins and settles exactly like a human's), and a 'pick' goes through
 * the normal reducer. The two "beats" (theme knobs) just make the AI watchable.
 *
 * Why this stays correct without a re-entrancy flag of its own:
 *  - it only ever *schedules* one action, in a `useEffect` keyed on the game;
 *  - each action changes the game (or the `rolling` flag), which re-runs the
 *    effect — and the cleanup clears any still-pending timer first, so at most
 *    one timer is ever live. The `rolling` guard keeps it from firing again
 *    during the ~1s spin its own roll kicked off.
 *
 * Bonus-6 chains and AI→AI hand-offs need no special code: each keeps or passes
 * the turn, the effect re-evaluates, and it drives whoever is up as long as that
 * seat is an AI one. It goes dormant on a human's turn (they tap as before) and
 * at game-over. With `humanSeats = []` every seat is AI, so the whole game plays
 * itself — a handy self-running smoke test of the engine.
 */
import { useEffect } from 'react'
import { legalMoves, type GameState } from '../engine'
import type { Strategy } from '../ai/strategy'
import type { GameAction } from './useGame'
import { AI_ROLL_DELAY_MS, AI_MOVE_DELAY_MS } from './theme'

export function useAiTurn(
  game: GameState,
  humanSeats: number[],
  rolling: boolean,
  roll: () => void,
  dispatch: (action: GameAction) => void,
  strategy: Strategy,
) {
  // It's an AI's move when the live game is mid-play and the seat to act isn't a
  // human one. (A finished game has no seat to drive.)
  const isAiTurn = game.phase !== 'game-over' && !humanSeats.includes(game.turn)

  useEffect(() => {
    // Stand down on a human's turn, at game-over, or while a roll is mid-spin —
    // the spin our own roll() started must finish before we look again.
    if (!isAiTurn || rolling) return

    if (game.phase === 'awaiting-roll') {
      // Pause, then roll — useDieRoll handles the spin/settle/handover, and its
      // own guards no-op if anything changed under us before the timer fired.
      const timer = window.setTimeout(roll, AI_ROLL_DELAY_MS)
      return () => window.clearTimeout(timer)
    }

    if (game.phase === 'awaiting-move' && game.lastRoll !== null) {
      const moves = legalMoves(game, game.lastRoll)
      // awaiting-move always carries at least one legal move (the engine only
      // enters it when one exists), but guard defensively rather than dispatch junk.
      if (moves.length === 0) return
      const timer = window.setTimeout(() => {
        dispatch({ type: 'pick', move: strategy(game, moves) })
      }, AI_MOVE_DELAY_MS)
      return () => window.clearTimeout(timer)
    }
  }, [game, isAiTurn, rolling, roll, dispatch, strategy])
}
