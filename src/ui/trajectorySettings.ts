/**
 * Live, session-only toggles for the two move-trajectory features — a runtime
 * mirror of the `SHOW_MOVABLE_TRAJECTORIES` / `PERSIST_MOVE_TRAJECTORIES` bools.
 *
 * theme.ts owns the *defaults* (and stays the source of truth); but the board's
 * <Trajectories> layer can't react to a `const` import flipping at runtime, so it
 * reads these through the store and the Dev tools panel's General section writes
 * to it — letting either feature be toggled on the fly without editing theme.ts
 * and reloading. Edits are session-only: a page reload reseeds from the defaults.
 *
 * Mirrors the timing store (src/ui/timing.ts): immutable snapshots so
 * useSyncExternalStore can compare references cheaply. (The look knobs — stroke,
 * dash, opacity, offset — stay plain theme.ts constants; only the two on/off
 * switches are live-tunable, since those are what you flick while playtesting.)
 */
import { SHOW_MOVABLE_TRAJECTORIES, PERSIST_MOVE_TRAJECTORIES } from './theme'

export interface TrajectorySettings {
  /** Feature 1: draw a line from each movable piton to where it would land. */
  showMovable: boolean
  /** Feature 2: keep previous players' move lines on the board until their turn. */
  persistPrevious: boolean
}

export const TRAJECTORY_DEFAULTS: TrajectorySettings = {
  showMovable: SHOW_MOVABLE_TRAJECTORIES,
  persistPrevious: PERSIST_MOVE_TRAJECTORIES,
}

let snapshot: TrajectorySettings = { ...TRAJECTORY_DEFAULTS }

const listeners = new Set<() => void>()
function commit(next: TrajectorySettings) {
  snapshot = next
  for (const fn of listeners) fn()
}

export function subscribeTrajectory(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function getTrajectorySnapshot(): TrajectorySettings {
  return snapshot
}

export function setShowMovable(showMovable: boolean) {
  commit({ ...snapshot, showMovable })
}
export function setPersistPrevious(persistPrevious: boolean) {
  commit({ ...snapshot, persistPrevious })
}
