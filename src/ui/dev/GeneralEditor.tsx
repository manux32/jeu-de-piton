/**
 * DEV-ONLY General section — at the top of the Dev tools panel. Live on/off
 * switches for the two move-trajectory features (the dashed origin→destination
 * lines): the live preview of where each movable piton can go, and the persisted
 * lines of previous players' moves.
 *
 * Reads/writes the live trajectory store via useSyncExternalStore (src/ui/
 * trajectorySettings.ts); the board's <Trajectories> layer reflects each change
 * immediately. Edits are session-only — a reload reseeds from the theme defaults
 * (SHOW_MOVABLE_TRAJECTORIES / PERSIST_MOVE_TRAJECTORIES). The lines' *look*
 * (stroke, dash, opacity, offset) stays in theme.ts; only the switches are here.
 */
import { useSyncExternalStore } from 'react'
import {
  subscribeTrajectory,
  getTrajectorySnapshot,
  setShowMovable,
  setPersistPrevious,
} from '../trajectorySettings'

export function GeneralEditor() {
  const { showMovable, persistPrevious } = useSyncExternalStore(
    subscribeTrajectory,
    getTrajectorySnapshot,
  )

  return (
    <section className="dev-section">
      <span className="dev-label">General</span>

      <label className="dev-check">
        <input
          type="checkbox"
          checked={showMovable}
          onChange={(e) => setShowMovable(e.target.checked)}
        />
        Show movable-piton trajectories
      </label>

      <label className="dev-check">
        <input
          type="checkbox"
          checked={persistPrevious}
          onChange={(e) => setPersistPrevious(e.target.checked)}
        />
        Persist pitons' trajectories
      </label>
    </section>
  )
}
