/**
 * The Options menu window — the panel content of the DOM overlay GameBoard
 * centres over the board (`.options-overlay`; a plain DOM layer, not in the board
 * SVG — see cross-platform-ui.md). It is the single entry point to every game
 * option: the board shows one gear button, and tapping it opens this window.
 *
 * It holds NO state and no rules — it's a pure launcher. Each row fires a
 * callback that opens that option's own window (New Game, Dev tools) and closes
 * this one; Close just dismisses. To add a future option, add a label in
 * strings.OPTIONS and one more row here wired to its callback.
 */
import { type CSSProperties } from 'react'
import { OPTIONS_PANEL_BG, OPTIONS_WINDOW_SIZE } from './theme'
import { OPTIONS } from './strings'

interface Props {
  /** Open the New Game setup window (closes this menu first). */
  onNewGame: () => void
  /** Open the Game stats window (closes this menu first). */
  onStats: () => void
  /** Open the Game log window (closes this menu first). */
  onLog: () => void
  /** Open the Dev tools panel (closes this menu first). */
  onDev: () => void
  /** Dismiss the menu with no change. */
  onClose: () => void
}

export function OptionsMenu({ onNewGame, onStats, onLog, onDev, onClose }: Props) {
  return (
    <div
      className="options-panel"
      // One overall-size knob (base font in vmin); the rest of the layout is em
      // off it in index.css — mirrors the New Game window. See .options-panel.
      style={
        { '--options-bg': OPTIONS_PANEL_BG, fontSize: `${OPTIONS_WINDOW_SIZE}vmin` } as CSSProperties
      }
    >
      <div className="options-title">{OPTIONS.title}</div>

      {/* The menu items — one full-width row each, newest options appended. */}
      <div className="options-items">
        <button type="button" className="options-item" onClick={onNewGame}>
          {OPTIONS.newGame}
        </button>
        <button type="button" className="options-item" onClick={onStats}>
          {OPTIONS.stats}
        </button>
        <button type="button" className="options-item" onClick={onLog}>
          {OPTIONS.log}
        </button>
        <button type="button" className="options-item" onClick={onDev}>
          {OPTIONS.dev}
        </button>
      </div>

      <div className="options-actions">
        <button type="button" className="setup-pill" onClick={onClose}>
          {OPTIONS.close}
        </button>
      </div>
    </div>
  )
}
