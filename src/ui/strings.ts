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
 *
 * Notices are richer than plain text: a notice is a list of `NoticeSegment`s, so
 * a run of it can be tinted in a player's colour (e.g. the captured colour's
 * name). The renderer resolves a segment's `color` (a player colour name) to a
 * hex via PLAYER_HEX — strings stay free of theme values.
 */
import type { PlayerColor } from '../engine'

export const TITLE = 'Jeu de piton'

export const DIE = {
  /** Shown on the centre die when it's a player's turn to roll (in place of pips). */
  rollPrompt: 'Roll',
} as const

export const PROMPT = {
  /** Current player still has to roll. */
  awaitingRoll: 'Your turn!',
  /** Roll is in; current player must now move a piton. */
  awaitingMove: 'Pick a piton',
} as const

export const WIN = {
  /** The big board announcement. `color` is the engine's lowercase colour name
   *  (e.g. 'green'); it's capitalized for display → "Green wins! 🎉". */
  banner: (color: string) => `${color.charAt(0).toUpperCase()}${color.slice(1)} wins! 🎉`,
  /** Quiet hint under the headline — the popup dismisses on click. */
  hint: 'tap to dismiss',
} as const

/** A run of notice text, optionally tinted in a player's colour. */
export interface NoticeSegment {
  text: string
  /** If set, render this run in this player's colour (resolved via PLAYER_HEX). */
  color?: PlayerColor
}
/** A notice is a sequence of (optionally coloured) text runs. */
export type Notice = NoticeSegment[]

/** A one-segment, uncoloured notice. */
const plain = (text: string): Notice => [{ text }]

export const NOTICE = {
  /** Rolled a 6 (bonus roll) but it left no legal move — roll again anyway. */
  noMoveRollAgain: plain('No move — roll again'),
  /** Third 6 in a row — the streak penalty sends a piton home. */
  threeSixes: plain('Three 6s — sent home'),
  /** Roll left no legal move and wasn't a bonus — the turn passes. */
  noMovePass: plain('No move — pass'),
  /** A move landed on and captured an enemy piton; `color` is whose. The colour
   *  name is tinted in that player's colour → "Capture! (red)". */
  capture: (color: PlayerColor): Notice => [
    { text: 'Capture! (' },
    { text: color, color },
    { text: ')' },
  ],
  /** A move that earned another go (rolled a 6). */
  rollAgain: plain('Roll again'),
  /** The acting player just finished their last piton and won. */
  win: plain('Wins! 🎉'),

  // --- move descriptions (the "richer notice" turn log) --------------------
  // What a move actually did, derived from its from→to in useGame. One of these
  // describes every move; `moved` is the bland fallback shown only when nothing
  // more specific (a milestone or a capture) already covers it.
  /** A piton left the nest onto its (safe) start square. */
  leftNest: plain('Left the nest'),
  /** A piton turned off the shared track into its private home lane. */
  reachedHomeLane: plain('Reached Home Lane'),
  /** A piton reached HOME (the centre) — one more finished. */
  gotHome: plain('Got one Home!'),
  /** A plain advance along the track/lane, nothing else notable. */
  moved: plain('Moved'),
  /** A move that ended on a capture-safe square. */
  reachedSafe: plain('Reached safe square'),
  /** A piton vacated its own start square. */
  leftStart: plain('Left start square'),
}

/** Joiner between event fragments (e.g. "Capture! (red) · Roll again"). */
const NOTICE_SEPARATOR: NoticeSegment = { text: ' · ' }
/** Concatenate notice fragments, inserting the separator between them. */
export function joinNotice(fragments: Notice[]): Notice {
  return fragments.flatMap((frag, i) => (i === 0 ? frag : [NOTICE_SEPARATOR, ...frag]))
}
