/**
 * Root of the dev-tools surface — the sidebar panel. App lazy-imports this module
 * only when the Dev toggle (rendered on the board, see GameBoard `devButton`) is
 * tapped, so the chunk (panel, scenario registry, scenario files, `dev.css`) is
 * fetched on demand even though it now ships in every build. Open/closed state is
 * App's; this just renders the panel. It owns no game state — it builds a
 * `GameView` from a scenario and hands it up via `onLoad` (App dispatches `load`).
 */
import type { GameView } from '../useGame'
import { DEV_SCENARIOS } from './registry'
import { DevPanel } from './DevPanel'
import './dev.css'

interface Props {
  view: GameView
  onLoad: (view: GameView) => void
  onClose: () => void
}

export default function DevTools({ view, onLoad, onClose }: Props) {
  return (
    <DevPanel
      view={view}
      scenarios={DEV_SCENARIOS}
      onLoad={onLoad}
      onClose={onClose}
    />
  )
}
