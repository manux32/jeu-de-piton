/**
 * Player colors and the per-role *appearance* knobs that modulate them — the one
 * place the board's colour story lives. The engine names players by `PlayerColor`
 * ('red' | 'blue' | 'yellow' | 'green', in seating order); this turns those names
 * into concrete board hues and decides how light/opaque each role reads. Kept in
 * `src/ui` — it's presentation, not rules.
 *
 * Scope: this owns *colour* — hue, lightening, opacity, and the timing of the
 * colour-driven flash/wash animations. It deliberately does NOT own board
 * *geometry* (cell sizes, piton radius, stroke widths, arrow shape); those are a
 * separate axis that lives with the layout (see layout.ts and the inline size
 * constants in Board/Pitons), and are slated for their own centralization pass.
 *
 * Two delivery paths, by necessity:
 *  - Knobs that are plain SVG presentation attributes (a rect's fill-opacity) are
 *    imported straight into the TSX that draws the element.
 *  - Knobs consumed by CSS *animations* (keyframes can't read TS) are surfaced as
 *    CSS custom properties via `boardThemeVars`, set once on the board's <svg>
 *    root and inherited by every animated element. `colors.ts` stays the single
 *    source; the stylesheet only references `var(--…)`.
 */
import type { PlayerColor } from '../engine'

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

// ── Per-role colour knobs ───────────────────────────────────────────────────
// Single source of truth for how each element's player hue reads. The values
// here are the colour/opacity/timing axis only; sizes live with the geometry.

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
export const NEST_FLASH = true
export const WASH_STATIC = 0.3
export const WASH_BREATHE_MIN = 0.18
export const WASH_BREATHE_MAX = 0.42
export const WASH_CADENCE_S = 1.2

/**
 * Action-pending flash family — the deliberate rule is *only elements awaiting an
 * action from a player flash*, and they share one cadence (`FLASH_CADENCE_S`) so
 * the board pulses as one. Two mechanisms, both fed from here:
 *  - a fill-colour *swell* toward the acting player's light tint
 *    (`FLASH_TINT_AMOUNT`) — currently just the die face while a roll is pending.
 *  - a plain *opacity pulse* (`PULSE_MIN`→`PULSE_MAX`) of a halo/marker stroked in
 *    the acting player's hue: the movable-piton halos, the capturable-enemy halo
 *    (same halo, drawn around the enemy in the capturing player's colour), and the
 *    HOME-reachable target.
 */
export const FLASH_TINT_AMOUNT = 0.55
export const FLASH_CADENCE_S = 1.2
export const PULSE_MIN = 0.35
export const PULSE_MAX = 0.9

/**
 * The CSS-var seam: the colour knobs that CSS animations consume, surfaced as
 * custom properties to set on the board <svg> root (they inherit to every
 * animated descendant). `activeHex` is the acting player's hue — the swell
 * target is derived from it here so the stylesheet needs no colour data. Returns
 * a plain string map; the caller casts to `CSSProperties` (React types don't
 * model arbitrary `--*` keys).
 */
export function boardThemeVars(activeHex: string): Record<string, string> {
  return {
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
