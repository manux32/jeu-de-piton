/**
 * DEV-ONLY tools sidebar. Hosts the scenario picker (a dropdown of the
 * auto-discovered scenarios + a Load button) and the <StateEditor> knob form
 * below it. It holds no rules and no game state of its own — it builds a
 * `GameView` and hands it up via `onLoad` (App dispatches the `load` action).
 *
 * Rendered only under `import.meta.env.DEV` (see App.tsx), so it never ships.
 */
import { useState } from 'react'
import type { GameView } from '../useGame'
import { loadScenario, type DevScenario } from './scenario'
import { StateEditor } from './StateEditor'
import { GeneralEditor } from './GeneralEditor'
import { TimingEditor } from './TimingEditor'
import { SaveScenario } from './SaveScenario'

interface Props {
  view: GameView
  scenarios: DevScenario[]
  onLoad: (view: GameView) => void
  onClose: () => void
}

export function DevPanel({ view, scenarios, onLoad, onClose }: Props) {
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

      <GeneralEditor />

      <TimingEditor />

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
            onClick={() => selected && onLoad(loadScenario(selected))}
          >
            Load
          </button>
        </div>
        {selected && <p className="dev-hint">{selected.description}</p>}
      </section>

      <StateEditor view={view} onChange={onLoad} />
      <SaveScenario view={view} />
    </aside>
  )
}
