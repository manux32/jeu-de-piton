/**
 * The Game log window — the panel content of the DOM overlay GameBoard centres
 * over the board (`.log-overlay`; a plain DOM layer, not in the board SVG — see
 * cross-platform-ui.md). Opened from the Options menu.
 *
 * It holds NO state and no rules: it reads the append-only `history` (every
 * completed turn, accumulated in useGame) and lays it out as a vertical,
 * scrollable scroll — grouped Round → Player → that seat's finished sub-turn
 * stack. Each stack row is the SAME die + outcome line the board notice showed
 * (rendered via the shared NoticeRow), so a log entry reads exactly like a nest
 * notice. Only finished turns are in `history`, so the in-progress turn never
 * appears — the log is "previous turns" by construction.
 */
import { type CSSProperties } from 'react'
import type { GameState } from '../engine'
import type { CompletedTurn } from './useGame'
import { NoticeRow } from './NoticeRow'
import { PLAYER_HEX, LOG_PANEL_BG, LOG_WINDOW_SIZE } from './theme'
import { LOG, TEAM } from './strings'

interface Props {
  state: GameState
  /** Append-only full-game history (every completed turn, oldest first). */
  history: CompletedTurn[]
  /** Dismiss the window. */
  onClose: () => void
}

export function LogModal({ state, history, onClose }: Props) {
  // Group the flat turn list into rounds (one full pass round the table). A round
  // begins whenever the seat index doesn't advance from the previous turn — play
  // has wrapped back toward the first seat. This only needs seat order to climb
  // within a round (round-robin turn passing guarantees it), so it's robust to a
  // skipped seat without storing a round number on each turn.
  const rounds: CompletedTurn[][] = []
  for (const turn of history) {
    const cur = rounds[rounds.length - 1]
    if (!cur || turn.seat <= cur[cur.length - 1].seat) rounds.push([turn])
    else cur.push(turn)
  }

  // In a team game (two seats share a team id) each turn is tagged with its
  // team — "[A]" before the colour — so the alternating sides read at a glance;
  // turns stay in true play order. A free-for-all has no tags.
  const isTeamGame = new Set(state.teams).size < state.teams.length

  return (
    <div
      className="log-panel"
      // One overall-size knob (base font in vmin); the rest of the layout is em
      // off it in index.css — mirrors the Options/Stats windows.
      style={{ '--log-bg': LOG_PANEL_BG, fontSize: `${LOG_WINDOW_SIZE}vmin` } as CSSProperties}
    >
      <div className="log-title">{LOG.title}</div>

      <div className="log-scroll">
        {rounds.length === 0 ? (
          <div className="log-empty">{LOG.empty}</div>
        ) : (
          rounds.map((round, ri) => (
            <div key={ri} className="log-round">
              <div className="log-round-head">{LOG.round(ri + 1)}</div>
              {round.map((turn, ti) => {
                const color = state.players[turn.seat].color
                const hex = PLAYER_HEX[color]
                return (
                  <div key={ti} className="log-turn">
                    <div className="log-player" style={{ color: hex }}>
                      {isTeamGame && (
                        <span className="log-team-tag">{TEAM.tag(state.teams[turn.seat])}</span>
                      )}
                      {LOG.player(color)}
                    </div>
                    <div className="log-notice">
                      {turn.entries.map((e, ei) => (
                        <NoticeRow key={ei} die={e.die} content={e.notice} dieColor={hex} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="log-actions">
        <button type="button" className="setup-pill" onClick={onClose}>
          {LOG.close}
        </button>
      </div>
    </div>
  )
}
