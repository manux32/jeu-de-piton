/**
 * Player colors for the UI. The engine names players by `PlayerColor`
 * ('red' | 'blue' | 'yellow' | 'green', in seating order); this is the one place
 * those names become concrete board hues. Kept in `src/ui` — it's presentation,
 * not rules.
 */
import type { PlayerColor } from '../engine'

export const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#d24b40',
  blue: '#3d6fd0',
  yellow: '#e0a81e',
  green: '#3a9d4a',
}

// Lighter tints of each player hue, used where a colour needs to read as a soft
// highlight rather than the solid mark — currently the die-square flash, which
// pulses the white face toward the acting player's light tint (a gentler cue
// than dimming the whole die). One step toward white from PLAYER_HEX.
export const PLAYER_HEX_LIGHT: Record<PlayerColor, string> = {
  red: '#f0a8a1',
  blue: '#a6c0ee',
  yellow: '#f2d585',
  green: '#9bd6a6',
}
