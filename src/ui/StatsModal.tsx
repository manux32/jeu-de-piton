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

  const capturesTotal = (s: PlayerStats) => s.regularCaptures + s.startCaptures
  const lossesTotal = (s: PlayerStats) =>
    s.lostToCapture + s.lostOnEnemyStart + s.lostToThreeSixes

  // Within any grouping, columns rank most pitons home → least, then most
  // captures → least as the tie-breaker; any further tie keeps seating order
  // (sort is stable). This is the "winner first" ordering the user asked for.
  const seats = state.players.map((_, i) => i)
  const byRank = (a: number, b: number) =>
    pitonsHome(b) - pitonsHome(a) || capturesTotal(stats[b]) - capturesTotal(stats[a])

  // In a team game (two seats share a team id) the columns are grouped by team —
  // the leading team's two members first, a vertical separator, then the other
  // team. "Leading" = the winner's team once decided, else most combined pitons
  // home (Team A breaks a tie). `teamSplit` is the column index the second team
  // starts at, where the separator is drawn; -1 (no split) in a free-for-all.
  const isTeamGame = new Set(state.teams).size < state.teams.length
  let order = [...seats].sort(byRank)
  let teamSplit = -1
  if (isTeamGame) {
    const winnerSeat =
      state.winner != null ? state.players.findIndex((p) => p.color === state.winner) : -1
    const winTeam = winnerSeat >= 0 ? state.teams[winnerSeat] : -1
    const teamScore = (t: number) =>
      state.teams.reduce((sum, tt, i) => (tt === t ? sum + pitonsHome(i) : sum), 0)
    const teamOrder = [...new Set(state.teams)]
      .sort((a, b) => a - b)
      .sort((a, b) => (b === winTeam ? 1 : 0) - (a === winTeam ? 1 : 0) || teamScore(b) - teamScore(a))
    const groups = teamOrder.map((t) => seats.filter((i) => state.teams[i] === t).sort(byRank))
    order = groups.flat()
    teamSplit = groups[0].length
  }

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
            {order.map((i, oi) => (
              <th
                key={i}
                className={`stats-player${oi === teamSplit ? ' stats-team-edge' : ''}`}
                style={{ color: PLAYER_HEX[state.players[i].color] }}
              >
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
              {order.map((i, oi) => (
                <td key={i} className={`stats-cell${oi === teamSplit ? ' stats-team-edge' : ''}`}>
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
