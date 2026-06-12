/**
 * jeu-de-piton — game-state construction.
 *
 * Pure TypeScript, no React/DOM. `createGame` turns a `Ruleset` (+ player count)
 * into the opening `GameState`: every piton in its nest, player 0 to roll. The
 * board geometry is resolved once here and carried on the state so move
 * generation never recomputes it.
 */

import type { GameState, Piton, PlayerColor, PlayerState, Ruleset } from './types'
import { makeGeometry } from './board'

/**
 * Player colors in seating order. `geometry.entryIndices[i]` is the entry square
 * for player `i`, so `PLAYER_COLORS[i]` is that player's color. (Which color maps
 * to which physical arm is a board-layout concern; the engine only cares about
 * the index ordering.)
 */
const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green']

/**
 * Build the opening state for a game of `ruleset` with `playerCount` players
 * (defaults to the ruleset's own count). Every piton starts in its nest and
 * player 0 is first to roll.
 */
export function createGame(
  ruleset: Ruleset,
  playerCount = ruleset.playerCount,
): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2–4, got ${playerCount}`)
  }

  const geometry = makeGeometry(ruleset.trackLength, ruleset.laneLength, playerCount)

  const players: PlayerState[] = []
  for (let i = 0; i < playerCount; i++) {
    const color = PLAYER_COLORS[i]
    const pitons: Piton[] = []
    for (let n = 0; n < ruleset.pitonsPerPlayer; n++) {
      pitons.push({ id: `${color}-${n}`, owner: color, position: { kind: 'nest' } })
    }
    players.push({ color, pitons })
  }

  return {
    ruleset,
    geometry,
    players,
    turn: 0,
    lastRoll: null,
    extraTurnStreak: 0,
    phase: 'awaiting-roll',
    winner: null,
  }
}
