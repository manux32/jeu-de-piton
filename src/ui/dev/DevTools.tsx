/**
 * Root of the DEV-ONLY tools surface. App lazy-imports this module *only* under
 * `import.meta.env.DEV`, so in a production build the dynamic import is dead and
 * Rollup never emits this chunk — pulling the panel, the scenario registry, the
 * scenario files, and `dev.css` out of the shipped bundle entirely.
 *
 * Holds the open/closed state and the floating "Dev" toggle; delegates the actual
 * tools to <DevPanel>. It owns no game state — it builds a `GameView` from a
 * scenario and hands it up via `onLoad` (App dispatches the `load` action).
 */
import { useState } from 'react'
import type { GameView } from '../useGame'
import { DEV_SCENARIOS } from './registry'
import { DevPanel } from './DevPanel'
import './dev.css'

interface Props {
  view: GameView
  onLoad: (view: GameView) => void
}

export default function DevTools({ view, onLoad }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className="pill dev-toggle" onClick={() => setOpen(true)}>
        Dev
      </button>
    )
  }

  return (
    <DevPanel
      view={view}
      scenarios={DEV_SCENARIOS}
      onLoad={onLoad}
      onClose={() => setOpen(false)}
    />
  )
}
