/**
 * Every player-facing string the board draws, in one place — the copy axis, kept
 * separate from theme.ts (which owns only sizes and colours). Edit wording here
 * without hunting through the drawing code; it's also the single seam a future
 * French translation would swap.
 *
 * Grouped by where the text appears:
 *  - `TITLE`   — the board title.
 *  - `DIE`     — the centre die's "your turn to roll" prompt.
 *  - `PROMPT`  — the quiet per-turn nudge in the current player's nest.
 *  - `NOTICE`  — the "what just happened" lines in the acting player's nest.
 */
export const TITLE = 'Jeu de piton'

export const DIE = {
  /** Shown on the centre die when it's a player's turn to roll (in place of pips). */
  rollPrompt: 'Roll',
} as const

export const PROMPT = {
  /** Current player still has to roll. */
  awaitingRoll: 'Your turn',
  /** Roll is in; current player must now move a piton. */
  awaitingMove: 'Pick a piton',
} as const

export const NOTICE = {
  /** Rolled a 6 (bonus roll) but it left no legal move — roll again anyway. */
  noMoveRollAgain: 'No move — roll again',
  /** Third 6 in a row — the streak penalty sends a piton home. */
  threeSixes: 'Three 6s — sent home',
  /** Roll left no legal move and wasn't a bonus — the turn passes. */
  noMovePass: 'No move — pass',
  /** A move landed on and captured an enemy piton. */
  capture: 'Capture!',
  /** A move that earned another go (rolled a 6). */
  rollAgain: 'Roll again',
  /** The acting player just finished their last piton and won. */
  win: 'Wins! 🎉',
  /** Joiner between two event fragments (e.g. "Capture! · Roll again"). */
  separator: ' · ',
} as const
