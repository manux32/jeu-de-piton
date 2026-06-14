/**
 * The board's look-and-feel knob board — the one place the game's *appearance*
 * lives, so polishing the look means editing values here and watching the dev
 * server hot-reload, not hunting hardcoded hex through the components.
 *
 * Kept in `src/ui` — it's presentation, not rules. The engine names players by
 * `PlayerColor` ('red' | 'blue' | 'yellow' | 'green', in seating order); this
 * turns those names into concrete board hues and owns every non-player surface
 * colour too (board background, movement squares, HOME, strokes, notice text).
 *
 * Sections below:
 *  - COLOURS — player hues, the neutral board-surface colours, strokes, notices,
 *    and the per-role opacity/timing knobs that modulate the player hues.
 *  - VFX / TIMING — the flash/wash/pulse animation knobs.
 *  - THE CSS-VAR SEAM — `boardThemeVars`, for the subset of COLOURS/TIMING that
 *    CSS consumes (see below).
 *  - GEOMETRY — every board *size*: cell strokes, arrow shape, nest/hole/piton/
 *    ring radii, the die, and the in-board chrome. Grouped by the element each
 *    knob shapes (not by property), so tuning one feedback element means one
 *    block. Mind the unit legend at the top of that section — unlike the colour
 *    axis (all hex), these live in three different coordinate spaces.
 *
 * Two delivery paths, by necessity — a knob reaches the screen by whoever draws it:
 *  - Knobs that are plain SVG presentation attributes (a rect's fill, a stroke
 *    colour) are imported straight into the TSX that draws the element.
 *  - Knobs consumed by CSS — animation keyframes, or styling on the in-board HTML
 *    chrome (notices, title) — can't read TS, so they're surfaced as CSS custom
 *    properties via `boardThemeVars`, set once on the board's <svg> root and
 *    inherited by every descendant. This file stays the single source; the
 *    stylesheet only references `var(--…)`.
 */
import type { PlayerColor } from '../engine'

// ════════════════════════════════════════════════════════════════════════════
// COLOURS
// ════════════════════════════════════════════════════════════════════════════

// ── Player hues ─────────────────────────────────────────────────────────────
export const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#d24b40',
  blue: '#3d6fd0',
  yellow: '#e0a81e',
  green: '#3a9d4a',
}

/**
 * Mix a hex colour toward white. `amount` 0 = unchanged, 1 = white. Lets every
 * light variant be *derived* from the one `PLAYER_HEX` entry rather than kept as
 * a parallel hand-tuned map that has to grow with each new colour. Each role may
 * pass its own amount; they need not match.
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

// ── Neutral board surfaces (non-player) ─────────────────────────────────────
// The board's own colours, independent of who's playing. Tweak these to reskin
// the board without touching the player hues.
/** The board panel behind everything — the warm off-white the SVG sits on. */
export const BOARD_BG = '#faf8f2'
/** A normal (non-safe) movement square on the shared track. */
export const TRACK_FILL = '#ffffff'
/** The 12 safe squares (starts, mid-arms, lane mouths). Dark so it can't be
 *  mistaken for a blue player's home-lane cells. */
export const SAFE_FILL = '#1a1a1a'
/** The HOME block at the centre — the finish. */
export const HOME_FILL = '#f3e7ec'
/** The die-face background — the near-white the pips sit on. */
export const DIE_FACE_FILL = '#fdfcf8'
/** The empty nest holes — the near-white disc a waiting piton rests in. */
export const NEST_HOLE_FILL = '#fdfcf8'

// ── Strokes / outlines (neutral) ────────────────────────────────────────────
// Outline *colours* only; stroke widths are a geometry knob and live in the
// GEOMETRY section below. Player-hued strokes (nest box, halos) derive from
// PLAYER_HEX at the draw site and aren't knobs here.
/** Outline of a home-lane runway cell. */
export const LANE_STROKE = '#9a958c'
/** Outline of a shared-track square. */
export const TRACK_STROKE = '#8a857c'
/** Outline of the central HOME block. */
export const HOME_STROKE = '#c79bab'
/** Outline of a piton disc. */
export const PITON_STROKE = '#2b2b2b'
/** Outline that lifts a start-arrow off the dark safe square beneath it. */
export const START_ARROW_STROKE = '#fdfcf8'
/** Fill of the "Jeu de piton" title baked into the board (CSS-consumed). */
export const TITLE_FILL = '#9b96a3'

// ── Notice text (CSS-consumed) ──────────────────────────────────────────────
// The per-nest message lines. Pinned (not theme-reactive) because the board is
// always light, so the near-black text stays legible even in page dark mode.
/** The event line — what just happened, in the acting player's corner. */
export const NOTICE_EVENT = '#2b2733'
/** The quieter turn-prompt ("Your turn" / "Pick a piton"). */
export const NOTICE_PROMPT = '#4a4456'
/** The win announcement — the boldest, darkest of the three. */
export const NOTICE_WIN = '#08060d'

// ── Per-role colour-opacity knobs ───────────────────────────────────────────
// How strongly each element's player hue reads. Opacity/timing axis only; sizes
// live with the geometry.

/** Home-lane runway: the player hue at a soft fill so the white track shows through. */
export const LANE_FILL_OPACITY = 0.45
/** Nest box backing: a fainter wash of the player hue behind the four holes. */
export const NEST_BOX_FILL_OPACITY = 0.18

/**
 * Whose-turn corner wash — the active player's hue washed over their corner
 * quadrant. `NEST_FLASH` picks the treatment: `false` holds a static opacity
 * (`WASH_STATIC`, the shipped default — lets the die be the only animated cue);
 * `true` "breathes" between `WASH_BREATHE_MIN`/`MAX` at `WASH_CADENCE_S`. The fill
 * is the player hue (set inline); these knobs are its opacity + rate. The wash is
 * a presence cue, not an action prompt, so it keeps its OWN cadence, independent
 * of the action-flash family below — the two need not, and by default don't, match.
 */
export const NEST_FLASH = false
export const WASH_STATIC = 0.3
export const WASH_BREATHE_MIN = 0.18
export const WASH_BREATHE_MAX = 0.42
export const WASH_CADENCE_S = 1.2

// ════════════════════════════════════════════════════════════════════════════
// VFX / TIMING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Action-pending flash family — the deliberate rule is *only elements awaiting an
 * action from a player flash*, and they share one cadence (`FLASH_CADENCE_S`) so
 * the board pulses as one. Two mechanisms, both fed from here:
 *  - a fill-colour *swell* toward the acting player's light tint
 *    (`FLASH_TINT_AMOUNT`) — currently just the die face while a roll is pending.
 *  - a plain *opacity pulse* (`PULSE_MIN`→`PULSE_MAX`) of a halo/marker stroked in
 *    the acting player's hue: the movable-piton halos, the capturable-enemy ring
 *    (`.move-target-capture` — the enlarged destination ring that lands on the
 *    enemy), and the HOME-reachable target.
 */
export const FLASH_TINT_AMOUNT = 0.55
export const FLASH_CADENCE_S = 1.2
export const PULSE_MIN = 0.35
export const PULSE_MAX = 0.9

// ════════════════════════════════════════════════════════════════════════════
// THE CSS-VAR SEAM
// ════════════════════════════════════════════════════════════════════════════

/**
 * The static (non-player-derived) colour knobs CSS consumes — board background,
 * title fill, the die-face rest state of the die-flash keyframe, and the three
 * notice colours. Constant, so kept out of the per-render function below.
 */
const STATIC_BOARD_VARS: Record<string, string> = {
  '--board-bg': BOARD_BG,
  '--title-fill': TITLE_FILL,
  '--die-face': DIE_FACE_FILL,
  '--notice-event': NOTICE_EVENT,
  '--notice-prompt': NOTICE_PROMPT,
  '--notice-win': NOTICE_WIN,
}

/**
 * The CSS-var seam: every colour knob CSS reads, surfaced as custom properties to
 * set on the board <svg> root (they inherit to every descendant). The static
 * surface/notice colours plus the player-*derived* animation knobs — `activeHex`
 * is the acting player's hue, and the flash swell target is derived from it here
 * so the stylesheet needs no colour data. Returns a plain string map; the caller
 * casts to `CSSProperties` (React types don't model arbitrary `--*` keys).
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
// GEOMETRY
// ════════════════════════════════════════════════════════════════════════════
//
// Every board *size*, in one place. Grouped by the element each knob shapes
// (function-grouping), not by property — so tuning one visual element is one
// block, the way the feedback rings/halo read as a unit on screen.
//
// UNIT LEGEND — geometry is NOT unit-homogeneous the way colour is (every colour
// is just a hex); these numbers live in three coordinate spaces, so don't compare
// a `0.4` to a `168` across groups:
//   • CELL UNITS (the default, untagged) — viewBox space, 1.0 = one board cell.
//     Radii, stroke widths, rx, pads, gaps. This is what the SVG draws in.
//   • [ratio] — a dimensionless fraction of some reference length (the cell
//     half-size for the arrow; the die's own `size` for the die internals), so
//     the element scales as a unit. Tagged per knob.
//   • [px] — chrome authored in natural pixels inside a <foreignObject>, then
//     scaled into cell units by CTRL_SCALE (the px→cell bridge). A `168` [px] is
//     far smaller on screen than a cell-unit `168` would be.

// ── Board surfaces (the static cross + central HOME block) ──────────────────
export const LANE_STROKE_W = 0.02
export const TRACK_STROKE_W = 0.03
export const HOME_RX = 0.4
export const HOME_STROKE_W = 0.06

// ── Start-arrow shape ───────────────────────────────────────────────────────
// LENGTH/OFFSET_*/WIDTH are [ratio] of the start cell's half-size, resolved
// along/across travel — four independent knobs (see Board's draw site for how
// the apex/base are built). The stroke that lifts the arrow off the dark safe
// square is a plain cell-unit width.
export const ARROW_LENGTH = 0.7        // [ratio] apex distance from base, along travel
export const ARROW_OFFSET_ALONG = -0.95 // [ratio] base offset along travel (signed)
export const ARROW_OFFSET_ACROSS = 0.63 // [ratio] base offset across travel (signed)
export const ARROW_WIDTH = 0.3         // [ratio] half the base width across travel
export const ARROW_STROKE_W = 0.04

// ── Nest (player corner: box, holes, whose-turn wash) ───────────────────────
export const NEST_BOX_PAD = 0.8        // box margin beyond the outer hole centres
export const NEST_BOX_RX = 0.5
export const NEST_BOX_STROKE_W = 0.08
export const NEST_HOLE_R = 0.36
export const NEST_HOLE_STROKE_W = 0.05
export const NEST_WASH_RX = 0.6        // whose-turn corner wash rounding
export const NEST_WASH_INSET = 0.15    // wash inset from the quadrant edges

// ── Piton disc, its movable-halo, and the finished-piton HOME cluster ───────
export const PITON_R = 0.3
export const PITON_STROKE_W = 0.05
export const PITON_HALO_R = 0.46
export const PITON_HALO_STROKE_W = 0.08
export const HOME_FAN_SPREAD = 0.32    // ± fan offset within a finished group
export const HOME_CLUSTER_MARGIN = 0.95 // inset of the group from HOME's edge

// ── Die (overall size in cell units; internals are [ratio] of that size) ────
// The die is drawn natively in board units and scales as a unit from DIE_SIZE —
// every internal proportion is a fraction of it (see DieFace).
export const DIE_SIZE = 2.0
export const DIE_PIP_STEP = 0.26       // [ratio] pip-grid spacing from centre
export const DIE_PIP_R = 0.085         // [ratio] pip radius
export const DIE_CORNER_RX = 0.18      // [ratio] rounded-square corner
export const DIE_STROKE_W = 0.04       // [ratio] border width

// ── Legal-move target rings (plain / capture / home) ────────────────────────
// The renderer's size choice for each destination marker; colour, dash, and the
// pulse animation are CSS (.move-target*). Capture is bigger so it rings the
// enemy disc; home is biggest — the prize.
export const MOVE_TARGET_R = 0.42
export const MOVE_TARGET_STROKE_W = 0.06
export const CAPTURE_TARGET_R = 0.55
export const CAPTURE_TARGET_STROKE_W = 0.1
export const HOME_TARGET_R = 2.2
export const HOME_TARGET_STROKE_W = 0.12

// ── In-board title (native SVG text, in cell units) ─────────────────────────
export const TITLE_FONT_SIZE = 0.6
export const TITLE_TOP = 0.5           // top inset (y, with hanging baseline)

// ── In-board HTML chrome: New Game controls + per-nest notices ──────────────
// Authored at the [px] sizes below inside a <foreignObject>, then wrapped in
// `scale(CTRL_SCALE)` to land in cell units — CTRL_SCALE is the px→cell bridge.
// The disclosure box widens (CLOSED→OPEN) so the 2/3/4 picker fits; INSET/GAP are
// cell-unit placements (top inset of the controls; gap above a notice line).
export const CTRL_SCALE = 0.019        // [bridge] px → cell units
export const CTRL_W_CLOSED = 112       // [px]
export const CTRL_W_OPEN = 264         // [px]
export const CTRL_H = 52               // [px]
export const CTRL_INSET = 0.4          // top inset, cell units
export const NEST_NOTICE_W = 168       // [px]
export const NEST_NOTICE_H = 48        // [px]
export const NEST_NOTICE_GAP = 0.55    // gap above the notice, cell units
