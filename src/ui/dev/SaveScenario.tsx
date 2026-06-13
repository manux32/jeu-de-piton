/**
 * DEV-ONLY "save as scenario" form (Session 3). Serializes the current view to a
 * scenario file via `serializeScenario` and POSTs it to the dev-only Vite
 * middleware (see vite.config.ts), which writes it under `scenarios/`. HMR then
 * reloads the page and the new file appears in the picker — so this form's job is
 * only to name + describe the snapshot and fire the write.
 *
 * Holds no rules and no game state of its own; it just reads the live `view`.
 */
import { useState } from 'react'
import type { GameView } from '../useGame'
import { serializeScenario, slugify } from './serialize'

export function SaveScenario({ view }: { view: GameView }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const id = slugify(name)

  const save = async () => {
    setStatus(null)
    const source = serializeScenario(view, { name, description })
    try {
      const res = await fetch('/__save-scenario', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, source }),
      })
      const data = (await res.json()) as { path?: string; error?: string }
      setStatus(
        res.ok
          ? { ok: true, msg: `Saved ${data.path}` }
          : { ok: false, msg: data.error ?? `HTTP ${res.status}` },
      )
    } catch (e) {
      setStatus({ ok: false, msg: String(e) })
    }
  }

  return (
    <section className="dev-section">
      <span className="dev-label">Save as scenario</span>
      <input
        className="dev-text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="dev-text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="dev-row">
        <button type="button" className="pill pill-on" disabled={!id} onClick={save}>
          Save
        </button>
        {id && <span className="muted">{id}.ts</span>}
      </div>
      {status && <p className={status.ok ? 'dev-hint' : 'dev-error'}>{status.msg}</p>}
      <p className="dev-hint">
        Writes a file under <code>scenarios/</code>; HMR reloads the page and it
        joins the picker.
      </p>
    </section>
  )
}
