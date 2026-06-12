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
