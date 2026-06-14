/**
 * The board's tuning knobs — the one place to change how the game *looks*.
 * Edit a value here and the dev server hot-reloads so you can see it; you should
 * almost never have to hunt for a colour or size inside the drawing code.
 *
 * This file is presentation only (no game rules). The engine knows players by a
 * colour name ('red' | 'blue' | 'yellow' | 'green', in seating order); this file
 * turns those names into actual colours and owns every other board colour and
 * size too.
 *
 * What's where:
 *  - COLOURS   — the player colours, every board surface/outline colour, and the
 *                corner-notice text colours.
 *  - MOTION    — the knobs for the things that pulse/flash/breathe, and how fast.
 *  - GEOMETRY  — every size: square shape, outlines, the nests, the pieces, the
 *                die, the move rings, the title, and the corner notices.
 *
 * A couple of effects are animated by the stylesheet (CSS), which can't read this
 * file. For just those, we hand the values over to CSS near the bottom
 * (`boardThemeVars`) — you still tune the value above; that just forwards it.
 */
import type { PlayerColor } from '../engine'

// ════════════════════════════════════════════════════════════════════════════
// COLOURS
// ════════════════════════════════════════════════════════════════════════════

// ── The four player colours ─────────────────────────────────────────────────
// One colour per player. Everything else a player "owns" (their lane, nest,
// pieces, halos) is derived from this single colour, so this is the only place
// to change a player's colour — and the place to add more colours later.
export const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#d24b40',
  blue: '#3d6fd0',
  yellow: '#e0a81e',
  green: '#3a9d4a',
}

/**
 * Lighten a colour toward white. `amount` 0 = unchanged, 1 = full white. Lets the
 * lighter shades (e.g. the die's flash) be computed from the one player colour
 * above instead of kept as a second hand-picked list. Each spot can ask for its
 * own amount.
 */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
  return (
    '#' +
    ch
      .map((c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'))
      .join('')
  )
}

// ── The board's own colours (not tied to any player) ────────────────────────
// Change these to re-skin the board without touching the player colours.
/** The warm off-white behind the whole board. */
export const BOARD_BG = '#faf8f2'
/** A normal (non-safe) square on the main track. */
export const TRACK_FILL = '#ffffff'
/** The 12 safe squares (starts, mid-arms, lane mouths). Dark on purpose so they
 *  can't be mistaken for the blue player's lane. */
export const SAFE_FILL = '#1a1a1a'
/** The big block in the very centre — the finish. */
export const HOME_FILL = '#f3e7ec'
/** The face of the die (the near-white the pips sit on). */
export const DIE_FACE_FILL = '#fdfcf8'
/** The empty nest holes — the near-white disc a waiting piece sits in. */
export const NEST_HOLE_FILL = '#fdfcf8'

// ── Outline (border) colours ────────────────────────────────────────────────
// Just the colours here; how *thick* each outline is lives in GEOMETRY below.
// (Outlines drawn in a player's own colour — nest border, halos — come straight
//  from PLAYER_HEX, so there's no separate knob for those.)
/** Border of a home-lane square. */
export const LANE_STROKE = '#9a958c'
/** Border of a main-track square. */
export const TRACK_STROKE = '#8a857c'
/** Border of the centre finish block. */
export const HOME_STROKE = '#c79bab'
/** Border of a playing piece. */
export const PITON_STROKE = '#2b2b2b'
/** Thin outline that lifts a start-arrow off the dark safe square under it. */
export const START_ARROW_STROKE = '#fdfcf8'
/** Colour of the "Jeu de piton" title on the board. */
export const TITLE_FILL = '#9b96a3'

// ── Corner-notice text colours ──────────────────────────────────────────────
// The short lines in each player's corner. (Their size/position are notice knobs
// in GEOMETRY below — search "corner notices".) Fixed dark colours, not theme-
// reactive, because the board is always light so they stay readable either way.
/** The "what just happened" line, in the corner of whoever acted. */
export const NOTICE_EVENT = '#2b2733'
/** The quieter prompt ("Your turn" / "Pick a piece"). */
export const NOTICE_PROMPT = '#4a4456'
/** The win announcement — the boldest/darkest of the three. */
export const NOTICE_WIN = '#08060d'

// ── How strongly a player's colour shows through ────────────────────────────
// These are see-through amounts (0 = invisible, 1 = solid), not sizes.
/** Home-lane fill: the player's colour at a soft wash so the white shows through. */
export const LANE_FILL_OPACITY = 0.45
/** Nest backing: a fainter wash of the player's colour behind the four holes. */
export const NEST_BOX_FILL_OPACITY = 0.18

/**
 * Whose-turn corner glow — the active player's colour washed over their corner.
 * `NEST_FLASH` picks the style:
 *   • false (current) — a steady glow at `WASH_STATIC` (lets the die be the only
 *     thing that moves).
 *   • true — the glow "breathes" between `WASH_BREATHE_MIN` and `_MAX`, taking
 *     `WASH_CADENCE_S` seconds per breath.
 * NOTE: while `NEST_FLASH` is false, the three breathe knobs below do nothing —
 * flip it to true to see them. The breathing keeps its own speed on purpose; it's
 * a calm "you're up" presence, separate from the action flashes in MOTION.
 */
export const NEST_FLASH = false
export const WASH_STATIC = 0.3
export const WASH_BREATHE_MIN = 0.18
export const WASH_BREATHE_MAX = 0.42
export const WASH_CADENCE_S = 1.2

// ════════════════════════════════════════════════════════════════════════════
// MOTION  (the things that flash / pulse, and how fast)
// ════════════════════════════════════════════════════════════════════════════

/**
 * The "it's waiting on you" flashes. Only things that need an action from you
 * flash, and they share one speed (`FLASH_CADENCE_S`) so the board pulses as one.
 * Two looks, both tuned here:
 *   • a colour *swell* toward the player's lighter shade (`FLASH_TINT_AMOUNT`) —
 *     right now just the die face while you still have to tap to roll.
 *   • a gentle fade in/out (`PULSE_MIN`→`PULSE_MAX`) of the markers drawn in the
 *     player's colour: the halos around movable pieces, the ring on a capturable
 *     enemy, and the HOME-finish ring.
 * NOTE: `FLASH_TINT_AMOUNT` is only visible in the brief moment when it's your
 * turn and you haven't rolled yet.
 */
export const FLASH_TINT_AMOUNT = 0.55
export const FLASH_CADENCE_S = 1.2
export const PULSE_MIN = 0.35
export const PULSE_MAX = 0.9

// ════════════════════════════════════════════════════════════════════════════
// Handing a few values to the stylesheet (CSS)
// ════════════════════════════════════════════════════════════════════════════
// The animated effects above are run by CSS, which can't read this file, so we
// forward the handful of values it needs here. You don't tune anything in this
// block — change the named knobs above; this just passes them along.

/**
 * Internal: the corner-notice text is built at this many screen pixels, then
 * shrunk down to `NOTICE_TEXT_SIZE` (see GEOMETRY). Because it's shrunk to a fixed
 * target, this number only affects crispness, not the size you see — leave it.
 * Lives here (not with the notice knobs) so CSS can read it just below.
 */
export const NOTICE_FONT_PX = 18

/** Constant values CSS needs (don't change in play) — board colour, title, the
 *  die's resting face colour, the notice colours, and the notice text resolution. */
const STATIC_BOARD_VARS: Record<string, string> = {
  '--board-bg': BOARD_BG,
  '--title-fill': TITLE_FILL,
  '--die-face': DIE_FACE_FILL,
  '--notice-event': NOTICE_EVENT,
  '--notice-prompt': NOTICE_PROMPT,
  '--notice-win': NOTICE_WIN,
  '--notice-font-px': `${NOTICE_FONT_PX}px`,
}

/**
 * Forwards every value CSS reads to the board, as CSS custom properties set once
 * on the board's <svg> (they flow down to everything inside). The colour swell
 * target is computed from `activeHex` (the current player's colour) here so the
 * stylesheet needs no colour maths. Returns a plain map; the caller casts it.
 */
export function boardThemeVars(activeHex: string): Record<string, string> {
  return {
    ...STATIC_BOARD_VARS,
    '--flash-tint': tint(activeHex, FLASH_TINT_AMOUNT),
    '--flash-cadence': `${FLASH_CADENCE_S}s`,
    '--pulse-min': `${PULSE_MIN}`,
    '--pulse-max': `${PULSE_MAX}`,
    '--wash-static': `${WASH_STATIC}`,
    '--wash-breathe-min': `${WASH_BREATHE_MIN}`,
    '--wash-breathe-max': `${WASH_BREATHE_MAX}`,
    '--wash-cadence': `${WASH_CADENCE_S}s`,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GEOMETRY  (every size)
// ════════════════════════════════════════════════════════════════════════════
//
// Grouped by the thing each knob shapes, so tuning one element means one block.
//
// ABOUT THE NUMBERS — sizes here aren't all in the same unit (colours are easy:
// they're all just colours; sizes aren't). Three kinds, so don't compare a 0.4 to
// a 168 across groups:
//   • CELLS (the default, untagged) — 1.0 = one board square. Almost everything
//     is in this unit: radii, outline thickness, gaps, offsets. Half a square is
//     0.5, and so on.
//   • [share] — a fraction of something else (the square's half-width for the
//     arrow; the die's own size for the die's insides), so the part scales with
//     its parent. Tagged per knob.
//   • [px] — a couple of HTML bits (the New Game button) are built at normal
//     screen pixels and then shrunk onto the board. Those numbers are in pixels,
//     a totally different scale — a "112" there is small on screen.

// ── Board squares: shape ────────────────────────────────────────────────────
// How fat the squares are ACROSS each arm of the cross. 1 = perfect squares;
// higher = wider rectangles (the reference board is near 1.6). This only stretches
// the across-the-arm direction; the length along the arm is always one square.
// (Lives here as a look knob, but it actually drives the board layout in
//  layout.ts — that's why it's the one size that reshapes the whole board.)
export const SQUARE_WIDTH = 1.9

// ── Board squares: outlines + the centre finish block ──────────────────────
export const LANE_STROKE_W = 0.02   // home-lane square border thickness
export const TRACK_STROKE_W = 0.03  // main-track square border thickness
export const HOME_RX = 0.4          // corner rounding of the centre finish block
export const HOME_STROKE_W = 0.06   // border thickness of the centre finish block

// ── Start arrows (the little triangle on each player's start square) ────────
// The first four are a [share] of the square's half-size, resolved along/across
// the way the piece travels — four independent dials (the drawing code in
// Board.tsx builds the triangle from them).
export const ARROW_LENGTH = 0.7         // [share] how far the tip reaches, along travel
export const ARROW_OFFSET_ALONG = -0.95 // [share] slide the base along travel (+/-)
export const ARROW_OFFSET_ACROSS = 0.63 // [share] slide the base sideways (+/-)
export const ARROW_WIDTH = 0.3          // [share] half the base width
export const ARROW_STROKE_W = 0.04      // thin outline around the triangle

// ── Nests (each player's corner: the box, the 4 holes, the whose-turn glow) ──
export const NEST_BOX_PAD = 0.8        // how far the box extends past the outer holes
export const NEST_BOX_RX = 0.5         // corner rounding of the box
export const NEST_BOX_STROKE_W = 0.08  // box border thickness
export const NEST_HOLE_R = 0.36        // radius of each empty hole
export const NEST_HOLE_STROKE_W = 0.05 // hole border thickness
export const NEST_WASH_RX = 0.6        // corner rounding of the whose-turn glow
export const NEST_WASH_INSET = 0.15    // how far the glow sits in from the corner edges

// ── Playing pieces (the disc, its "you can move me" halo, finished pieces) ──
export const PITON_R = 0.3              // radius of a piece
export const PITON_STROKE_W = 0.05      // piece border thickness
export const PITON_HALO_R = 0.46        // radius of the halo around a movable piece
export const PITON_HALO_STROKE_W = 0.08 // halo ring thickness
export const HOME_FAN_SPREAD = 0.32     // how far apart finished pieces fan in a corner
export const HOME_CLUSTER_MARGIN = 0.95 // how far the finished group sits from HOME's edge

// ── The die (overall size, then its insides as a [share] of that size) ──────
// The whole die scales from DIE_SIZE; everything inside is a fraction of it.
export const DIE_SIZE = 2.0          // side length of the die square
export const DIE_PIP_STEP = 0.26     // [share] spacing of the pips from centre
export const DIE_PIP_R = 0.085       // [share] pip radius
export const DIE_CORNER_RX = 0.18    // [share] rounded corners
export const DIE_STROKE_W = 0.04     // [share] border thickness

// ── Move rings (shown on every square you can move to, after you roll) ──────
// Three sizes, by what the move is. R = how wide the ring · STROKE_W = how thick.
export const MOVE_TARGET_R = 0.42        // normal landing spot
export const MOVE_TARGET_STROKE_W = 0.06
export const CAPTURE_TARGET_R = 0.55     // landing on an enemy — bigger, circles them
export const CAPTURE_TARGET_STROKE_W = 0.1
export const HOME_TARGET_R = 2.2         // reaching HOME to finish — biggest, the prize
export const HOME_TARGET_STROKE_W = 0.12

// ── The "Jeu de piton" title on the board ───────────────────────────────────
export const TITLE_FONT_SIZE = 0.6   // text height
export const TITLE_TOP = 0.5         // distance down from the top edge

// ── Corner notices (the "Your turn" / capture / win lines) ──────────────────
// Colour them with NOTICE_EVENT / NOTICE_PROMPT / NOTICE_WIN up in COLOURS.
export const NOTICE_TEXT_SIZE = 0.342 // text height, in squares (bigger = bigger text)
export const NOTICE_OFFSET_X = 0      // nudge sideways from centred (+ = right)
export const NOTICE_OFFSET_Y = 0.55   // how far up from the bottom of the corner

// ── New Game button (built as HTML at [px] sizes, then shrunk onto the board) ─
// CTRL_SCALE is the shrink factor (pixels → squares). The button widens from
// CLOSED to OPEN so the 2/3/4 picker fits; INSET is how far down from the top it
// sits. These size the New Game control only — notices have their own knobs above.
export const CTRL_SCALE = 0.019      // shrink factor: button pixels → board squares
export const CTRL_W_CLOSED = 112     // [px] button width, collapsed
export const CTRL_W_OPEN = 264       // [px] button width, with the 2/3/4 picker open
export const CTRL_H = 52             // [px] button height
export const CTRL_INSET = 0.4        // distance down from the top edge
