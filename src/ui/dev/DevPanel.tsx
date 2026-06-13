/**
 * DEV-ONLY tools sidebar. Session 1 houses the scenario picker: a dropdown of
 * the auto-discovered scenarios plus a Load button that dispatches the chosen
 * scenario's view into the game (via `onLoad`). It holds no rules and no game
 * state of its own — it just builds a `GameView` and hands it up. Later sessions
 * grow this panel with the board-state editor and "save as scenario".
 *
 * Rendered only under `import.meta.env.DEV` (see App.tsx), so it never ships.
 */
import { useState } from 'react'
import type { GameView } from '../useGame'
import type { DevScenario } from './scenario'

interface Props {
  scenarios: DevScenario[]
  onLoad: (view: GameView) => void
  onClose: () => void
}

export function DevPanel({ scenarios, onLoad, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? '')
  const selected = scenarios.find((s) => s.id === selectedId)

  return (
    <aside className="dev-panel" aria-label="dev tools">
      <div className="dev-panel-head">
        <h2 className="dev-panel-title">Dev tools</h2>
        <button
          type="button"
          className="pill"
          onClick={onClose}
          aria-label="close dev tools"
        >
          ✕
        </button>
      </div>

      <section className="dev-section">
        <label className="dev-label" htmlFor="dev-scenario">
          Scenario
        </label>
        <div className="dev-row">
          <select
            id="dev-scenario"
            className="dev-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pill pill-on"
            disabled={!selected}
            onClick={() => selected && onLoad(selected.build())}
          >
            Load
          </button>
        </div>
        {selected && <p className="dev-hint">{selected.hint}</p>}
      </section>
    </aside>
  )
}
