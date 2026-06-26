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
import type { StrategyId } from '../ai/strategy'

export const TITLE = 'Pitons'

export const DIE = {
  /** Shown on the centre die when it's a player's turn to roll (in place of pips). */
  rollPrompt: 'Roll',
  /** Shown on the tiny current-sub-turn notice die in a nest (in place of pips) —
   *  a single glyph, because the word "Roll" is illegible at that size. */
  rollGlyph: '!',
} as const

export const PROMPT = {
  /** Current player still has to roll (the first roll of their turn). */
  awaitingRoll: 'Your turn!',
  /** Current player rolled a 6 and is rolling again — shown in place of
   *  `awaitingRoll` on the bonus roll, so "Roll again" lives only on the live
   *  (current) sub-turn, never on the finished rows above it. */
  rollAgain: 'Roll again!',
  /** Roll is in; current player must now move a piton. */
  awaitingMove: 'Pick a piton',
} as const

/** Copy for the Options menu — the single board button (a gear) that is the one
 *  way into the game's options. It opens a small window listing the options as
 *  rows; each opens its own window. New options get a label here + a row in
 *  OptionsMenu. */
export const OPTIONS = {
  /** Accessible name for the gear button on the board (it shows no text). */
  button: 'Options',
  /** The Options window's heading. */
  title: 'Options',
  /** The menu rows, each opening its sub-window. */
  newGame: 'New game',
  stats: 'Game stats',
  log: 'Game log',
  dev: 'Dev tools',
  /** Bottom-bar button that dismisses the Options window with no change. */
  close: 'Close',
} as const

/** Copy for the Game stats window — a per-player scoreboard, opened from the win
 *  popup or the Options menu. Players are columns (ordered most pitons home →
 *  least); these label the rows. Totals are derived in the UI, not stored. */
export const STATS = {
  /** The window's heading. */
  title: 'Game stats',
  /** Column header for one seat — its capitalized colour name ("Red"). */
  player: (color: string) => `${color.charAt(0).toUpperCase()}${color.slice(1)}`,
  /** Row: how many of this seat's pitons reached HOME (shown as "n / total"). */
  pitonsHome: 'Pitons home',
  /** Section + its two sub-rows: captures this seat MADE. */
  captures: 'Captures',
  capturesRegular: 'Regular',
  /** Deeper sub-row under "Regular": how many of those track captures were of the
   *  seat's own teammate's pitons. Regular-2v2 only (friendly 2v2 can't). */
  capturesTeammate: 'of teammate',
  capturesStart: 'On start square',
  /** Section + its three sub-rows: this seat's pitons sent back. */
  losses: 'Pitons lost',
  lostToCapture: 'Captured',
  /** Deeper sub-row under "Captured": how many of those losses were to the seat's
   *  own teammate. Mirror of `capturesTeammate`; regular-2v2 only. */
  lostToTeammate: 'by teammate',
  lostOnEnemyStart: "On enemy's start",
  lostToThreeSixes: 'Triple-6 penalty',
  /** Row: total 6s this seat rolled. */
  sixes: '6s rolled',
  /** Bottom-bar button that closes the window. */
  close: 'Close',
} as const

/** Copy for the Game log window — the full per-turn history, grouped round →
 *  player, each player's block showing that seat's finished notice stack (the same
 *  die + outcome rows their nest showed). Opened from the Options menu. */
export const LOG = {
  /** The window's heading. */
  title: 'Game log',
  /** A round header — `n` is the 1-based round (one full pass round the table). */
  round: (n: number) => `Round ${n}`,
  /** A player block's label — its capitalized colour name ("Red"). */
  player: (color: string) => `${color.charAt(0).toUpperCase()}${color.slice(1)}`,
  /** Suffix on a player block's label, in a 2v2 game, once that seat has all its
   *  own pitons home and is now spending its turns on its teammate's pitons. */
  playingForTeammate: '(playing for teammate)',
  /** Shown before anyone has completed a turn (the log is empty at the deal). */
  empty: 'No turns played yet.',
  /** Bottom-bar button that closes the window. */
  close: 'Close',
} as const

/** Copy for the New Game setup window (per-seat human/AI + colour, opened from
 *  the Options menu; nothing takes effect until "Start game"). */
export const SETUP = {
  /** The window's heading. */
  title: 'New game',
  /** Label beside the 2/3/4 player-count picker. */
  players: 'Players',
  /** Label beside the two 2v2 mode pills (their own row, below the count). */
  teamsLabel: 'Teams',
  /** The official 2v2 pill — 4 seats in two teams; partners play a normal game
   *  against each other until one finishes (then takes over the partner). */
  teams: '2v2',
  /** The "friendly" 2v2 pill — same teams, but partners are full allies the whole
   *  game (can't capture or pass each other). */
  teamsFriendly: '2v2 friendly',
  /** The two states of a seat's type toggle. */
  human: 'Human',
  ai: 'AI',
  /** A seat's row label — `n` is the 1-based seat number ("Player 1"). */
  seat: (n: number) => `Player ${n}`,
  /** Accessible label for a seat's colour picker (`n` is the 1-based seat). */
  colorPicker: (n: number) => `Player ${n} colour`,
  /** Accessible label for an AI seat's difficulty picker. */
  strategyPicker: (n: number) => `Player ${n} AI level`,
  /** Human-facing names for the AI strategies — the display side of the ai
   *  layer's strategy ids (see ai/strategy.ts STRATEGY_BY_ID). Rename freely;
   *  the ai code keys off the ids, not these words. */
  strategyLabels: { easy: 'Easy', hard: 'Hard' } as Record<StrategyId, string>,
  /** The bottom-bar buttons: discard the draft vs. apply it and deal a new game. */
  cancel: 'Cancel',
  start: 'Start game',
} as const

/** Copy for 2v2 team identity — a team id (0, 1) maps to a display name. Seats
 *  sharing a team id are partners. Used by the New Game seat-row headers, the
 *  board nest labels, and the win banner. */
export const TEAM = {
  /** Display name for a team id: 0 → "Team A", 1 → "Team B". */
  name: (teamId: number) => `Team ${String.fromCharCode(65 + teamId)}`,
  /** Compact tag for a team id, prefixed to a player in the log: 0 → "[A]". */
  tag: (teamId: number) => `[${String.fromCharCode(65 + teamId)}]`,
} as const

export const WIN = {
  /** Free-for-all announcement. `color` is the engine's lowercase colour name
   *  (e.g. 'green'); it's capitalized for display → "Green wins! 🎉". */
  banner: (color: string) => `${color.charAt(0).toUpperCase()}${color.slice(1)} wins! 🎉`,
  /** 2v2 announcement — the winning *team*, with its two members' colours listed
   *  separately beneath (see GameBoard). `team` is a TEAM.name string. */
  teamBanner: (team: string) => `${team} wins! 🎉`,
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
  /** Rolled a 6 (bonus roll) but it left no legal move. The "roll again" half
   *  isn't said here — it's carried by the live prompt below (PROMPT.rollAgain),
   *  so this finished row stays short and never repeats "roll again". */
  noMove: plain('No move'),
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
  reachedSafe: plain('Got to safe square'),
  /** A piton vacated its own start square. */
  leftStart: plain('Left start square'),
}

/** Joiner between event fragments (e.g. "Capture! (red) · Roll again"). */
const NOTICE_SEPARATOR: NoticeSegment = { text: ' · ' }
/** Concatenate notice fragments, inserting the separator between them. */
export function joinNotice(fragments: Notice[]): Notice {
  return fragments.flatMap((frag, i) => (i === 0 ? frag : [NOTICE_SEPARATOR, ...frag]))
}
