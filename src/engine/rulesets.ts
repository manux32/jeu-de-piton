/**
 * jeu-de-piton — concrete rule variants.
 *
 * A `Ruleset` is the swappable config the engine reads; the UI never needs to
 * know which one is active. This file holds the built-in variants. We build the
 * cabin game (`JEU_DE_PITON`) first — it's the version we actually play, and a
 * single die is the simpler engine core. Canonical Parcheesi (two dice) may join
 * later as a second constant without touching the engine.
 */

import type { Ruleset } from './types'

/**
 * The cabin house rules, confirmed 2026-06-11 (see docs/rules-and-lineage.md).
 * Single die; a 6 moves 12 and grants another roll; path-based passing/blocking;
 * no stacking; exact HOME; the 3rd consecutive 6 is penalized.
 */
export const JEU_DE_PITON: Ruleset = {
  id: 'jeu-de-piton',
  label: 'Jeu de piton (cabin rules)',
  playerCount: 4,
  pitonsPerPlayer: 4,
  diceCount: 1,
  entryRolls: [5],
  trackLength: 68,
  laneLength: 7,

  rollStepOverrides: { 6: 12 }, // a 6 moves twelve
  exactHomeEntry: true,
  forcedMove: true,

  extraTurnOn: 6,
  extraTurnStreakLimit: 3, // the 3rd consecutive 6 triggers the penalty
  streakPenalty: 'lose-leading',

  maxPerSquare: 1,
  captureEnabled: true,
  // Confirmed safe: the 4 colored entry/start squares (one per arm). The other 8
  // marked squares (a lane-mouth + mid-arm pair per arm) are positionally known
  // but not yet numbered off the board photo — see rules-and-lineage.md "Still
  // open". Non-blocking; pinned during the movement/capture rungs.
  safeSquares: [0, 17, 34, 51],
  alliesBlockPassage: true,
  safeSquaresBlockPassage: true,
}
