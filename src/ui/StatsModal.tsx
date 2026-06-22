/**
 * The Game stats window — the panel content of the DOM overlay GameBoard centres
 * over the board (`.stats-overlay`; a plain DOM layer, not in the board SVG — see
 * cross-platform-ui.md). Opened from the win popup ("Game stats" button) or any
 * time mid-game from the Options menu.
 *
 * It holds NO state and no rules: it just reads the live `GameState` (for pitons
 * home + player colours) and the per-seat `PlayerStats` tally (accumulated in
 * useGame), and lays them out as a table — one column per player, ordered most
 * pitons home → least. Totals (captures, losses) are derived here, not stored.
 */
import { type CSSProperties } from 'react'
import type { GameState } from '../engine'
import type { PlayerStats } from './useGame'
import { PLAYER_HEX, STATS_PANEL_BG, STATS_WINDOW_SIZE } from './theme'
import { STATS } from './strings'

interface Props {
  state: GameState
  /** Per-seat tally, indexed by player (same order as `state.players`). */
  stats: PlayerStats[]
  /** Dismiss the window. */
  onClose: () => void
}

/** One table row: a label, how it's styled (a section total, an indented detail,
 *  or a plain line), and the cell value for a given seat index. */
type Row = {
  label: string
  kind: 'plain' | 'section' | 'sub'
  value: (seat: number) => string | number
}

export function StatsModal({ state, stats, onClose }: Props) {
  const pitonsHome = (i: number) =>
    state.players[i].pitons.filter((p) => p.position.kind === 'finished').length
  const total = state.ruleset.pitonsPerPlayer

  // Players are columns, ranked most pitons home → least; ties keep seating order
  // (sort is stable). This is the "winner first" ordering the user asked for.
  const order = state.players.map((_, i) => i).sort((a, b) => pitonsHome(b) - pitonsHome(a))

  const capturesTotal = (s: PlayerStats) => s.regularCaptures + s.startCaptures
  const lossesTotal = (s: PlayerStats) =>
    s.lostToCapture + s.lostOnEnemyStart + s.lostToThreeSixes

  // The rows, top to bottom. The two `section` rows carry the running total of
  // the `sub` rows beneath them, so the breakdown reads at a glance.
  const rows: Row[] = [
    { label: STATS.pitonsHome, kind: 'plain', value: (i) => `${pitonsHome(i)} / ${total}` },
    { label: STATS.captures, kind: 'section', value: (i) => capturesTotal(stats[i]) },
    { label: STATS.capturesRegular, kind: 'sub', value: (i) => stats[i].regularCaptures },
    { label: STATS.capturesStart, kind: 'sub', value: (i) => stats[i].startCaptures },
    { label: STATS.losses, kind: 'section', value: (i) => lossesTotal(stats[i]) },
    { label: STATS.lostToCapture, kind: 'sub', value: (i) => stats[i].lostToCapture },
    { label: STATS.lostOnEnemyStart, kind: 'sub', value: (i) => stats[i].lostOnEnemyStart },
    { label: STATS.lostToThreeSixes, kind: 'sub', value: (i) => stats[i].lostToThreeSixes },
    { label: STATS.sixes, kind: 'plain', value: (i) => stats[i].sixesRolled },
  ]

  return (
    <div
      className="stats-panel"
      // One overall-size knob (base font in vmin); the rest of the layout is em
      // off it in index.css — mirrors the Options/New Game windows.
      style={{ '--stats-bg': STATS_PANEL_BG, fontSize: `${STATS_WINDOW_SIZE}vmin` } as CSSProperties}
    >
      <div className="stats-title">{STATS.title}</div>

      <table className="stats-table">
        <thead>
          <tr>
            <th className="stats-corner" />
            {order.map((i) => (
              <th key={i} className="stats-player" style={{ color: PLAYER_HEX[state.players[i].color] }}>
                {STATS.player(state.players[i].color)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`stats-row stats-row-${row.kind}`}>
              <th scope="row" className="stats-label">
                {row.label}
              </th>
              {order.map((i) => (
                <td key={i} className="stats-cell">
                  {row.value(i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="stats-actions">
        <button type="button" className="setup-pill" onClick={onClose}>
          {STATS.close}
        </button>
      </div>
    </div>
  )
}
