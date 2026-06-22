/**
 * DEV-ONLY timing editor. A live form over the `_MS` motion durations
 * (src/ui/timing.ts) — the die-roll spin/hold and the AI's roll/move pacing —
 * so the turn rhythm can be retuned on the fly without editing theme.ts and
 * reloading. Handy for speeding an AI-vs-AI game up to a watchable pace, or down
 * to no delay at all (master 0×).
 *
 * It reads the live store via useSyncExternalStore and writes straight back; the
 * timer hooks pick up each change on their next roll/turn. Edits are session-only
 * — a reload reseeds from the theme defaults. The master multiplier scales every
 * duration except the spin's refresh tick (SPIN_TICK_MS), which stays fixed.
 */
import { useSyncExternalStore } from 'react'
import {
  type TimingBase,
  TIMING_DEFAULTS,
  subscribeTiming,
  getTimingSnapshot,
  setTimingBase,
  setTimingMultiplier,
  resetTiming,
} from '../timing'

// Plain-language labels for the editable durations, in display order. The four
// scaled ones first; SPIN_TICK_MS is shown last, flagged as multiplier-exempt.
const SCALED: { key: keyof TimingBase; label: string }[] = [
  { key: 'SPIN_MS', label: 'Spin duration' },
  { key: 'HOLD_MS', label: 'Result hold' },
  { key: 'AI_ROLL_DELAY_MS', label: 'AI roll delay' },
  { key: 'AI_MOVE_DELAY_MS', label: 'AI move delay' },
]

const num = (v: string) => Math.max(0, Math.round(Number(v) || 0))

export function TimingEditor() {
  const { base, multiplier } = useSyncExternalStore(subscribeTiming, getTimingSnapshot)
  const scaled = multiplier !== 1

  return (
    <section className="dev-section">
      <span className="dev-label">Timing</span>

      <div className="dev-timing-row">
        <label className="dev-timing-name" htmlFor="dev-timing-master">
          Master&nbsp;×
        </label>
        <input
          id="dev-timing-master"
          type="range"
          className="dev-slider"
          min={0}
          max={3}
          step={0.05}
          value={multiplier}
          onChange={(e) => setTimingMultiplier(Number(e.target.value))}
        />
        <input
          type="number"
          className="dev-num"
          min={0}
          step={0.05}
          value={multiplier}
          onChange={(e) => setTimingMultiplier(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>

      {SCALED.map(({ key, label }) => (
        <div key={key} className="dev-timing-row">
          <label className="dev-timing-name" htmlFor={`dev-timing-${key}`}>
            {label}
          </label>
          <input
            id={`dev-timing-${key}`}
            type="number"
            className="dev-num"
            min={0}
            step={50}
            value={base[key]}
            onChange={(e) => setTimingBase(key, num(e.target.value))}
          />
          <span className="dev-timing-eff muted">
            {scaled ? `→ ${Math.round(base[key] * multiplier)}` : 'ms'}
          </span>
        </div>
      ))}

      <div className="dev-timing-row">
        <label className="dev-timing-name" htmlFor="dev-timing-SPIN_TICK_MS">
          Spin tick
        </label>
        <input
          id="dev-timing-SPIN_TICK_MS"
          type="number"
          className="dev-num"
          min={1}
          step={10}
          value={base.SPIN_TICK_MS}
          onChange={(e) => setTimingBase('SPIN_TICK_MS', Math.max(1, num(e.target.value)))}
        />
        <span className="dev-timing-eff muted">not&nbsp;×</span>
      </div>

      <div className="dev-row">
        <button type="button" className="pill" onClick={resetTiming}>
          Reset to defaults
        </button>
      </div>
      <p className="dev-hint">
        Live, session-only overrides of the motion timings (ms). Master scales all
        except the spin tick; 0× = no delay. Defaults: spin {TIMING_DEFAULTS.SPIN_MS},
        hold {TIMING_DEFAULTS.HOLD_MS}, AI {TIMING_DEFAULTS.AI_ROLL_DELAY_MS}/
        {TIMING_DEFAULTS.AI_MOVE_DELAY_MS}.
      </p>
    </section>
  )
}
