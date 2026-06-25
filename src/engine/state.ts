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
export const PLAYER_COLORS: PlayerColor[] = ['green', 'red', 'blue', 'yellow']

/**
 * The full palette a seat may be switched to in New Game, in picker order — the
 * four default seat colours above plus the extras. A game still seats ≤ 4
 * players (so `PLAYER_COLORS` alone always fills the defaults); this superset
 * only widens what a player can *pick*, keeping every seat's colour distinct.
 * Add a new colour here (and its hex in theme.ts) to offer it.
 */
export const ALL_PLAYER_COLORS: PlayerColor[] = [...PLAYER_COLORS, 'orange', 'purple']

/**
 * Build the opening state for a game of `ruleset` with `playerCount` players
 * (defaults to the ruleset's own count). Every piton starts in its nest and
 * player 0 is first to roll.
 *
 * `colors` lets a seat take a colour other than its default seat colour (the New
 * Game setup uses this for per-seat colour choice). It must have one entry per
 * seat and they must be distinct — colours are the engine's player identity
 * (piton ids, owner, capture/win), so duplicates would collide. Omit it to keep
 * the default seat→colour order.
 *
 * `teams` sets each seat's team id (seats sharing an id are partners) — the 2v2
 * setup is `[0, 1, 0, 1]`. Omit it for a free-for-all, where every seat is its
 * own team and the team rules collapse to the solo ones (see `GameState.teams`).
 */
export function createGame(
  ruleset: Ruleset,
  playerCount = ruleset.playerCount,
  colors: readonly PlayerColor[] = PLAYER_COLORS.slice(0, playerCount),
  teams: readonly number[] = Array.from({ length: playerCount }, (_, i) => i),
): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2–4, got ${playerCount}`)
  }
  if (colors.length !== playerCount) {
    throw new Error(`colors must have ${playerCount} entries, got ${colors.length}`)
  }
  if (new Set(colors).size !== colors.length) {
    throw new Error(`colors must be distinct, got ${colors.join(', ')}`)
  }
  if (teams.length !== playerCount) {
    throw new Error(`teams must have ${playerCount} entries, got ${teams.length}`)
  }

  const geometry = makeGeometry(
    ruleset.trackLength,
    ruleset.laneLength,
    playerCount,
    ruleset.homeEntryOffset,
  )

  const players: PlayerState[] = []
  for (let i = 0; i < playerCount; i++) {
    const color = colors[i]
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
    teams: [...teams],
    turn: 0,
    lastRoll: null,
    extraTurnStreak: 0,
    phase: 'awaiting-roll',
    winner: null,
  }
}
