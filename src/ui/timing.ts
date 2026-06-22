/**
 * Live timing store — a runtime-overridable copy of the `_MS` motion durations.
 *
 * theme.ts owns the *defaults* (and stays the source of truth for them); but the
 * timer hooks (useDieRoll, useAiTurn) can't read a value that changes at runtime
 * from a plain `import` of a `const`. So they read it through the getters here,
 * and the Dev tools panel (TimingEditor) writes to this store to tweak the turn
 * rhythm on the fly — e.g. to speed an AI-vs-AI game up to a crawl or to no delay
 * at all. Edits are session-only: a page reload reseeds from the theme defaults.
 *
 * A master MULTIPLIER scales every duration *except* SPIN_TICK_MS — the spin's
 * refresh tick stays fixed so the die animates smoothly no matter how long (or
 * short) the overall spin is scaled to. Multiplier 0 ⇒ zero delay (instant play).
 */
import {
  SPIN_MS,
  SPIN_TICK_MS,
  HOLD_MS,
  AI_ROLL_DELAY_MS,
  AI_MOVE_DELAY_MS,
} from './theme'

/** The editable durations, by key. SPIN_TICK_MS rides along but is never scaled. */
export interface TimingBase {
  SPIN_MS: number
  SPIN_TICK_MS: number
  HOLD_MS: number
  AI_ROLL_DELAY_MS: number
  AI_MOVE_DELAY_MS: number
}

export const TIMING_DEFAULTS: TimingBase = {
  SPIN_MS,
  SPIN_TICK_MS,
  HOLD_MS,
  AI_ROLL_DELAY_MS,
  AI_MOVE_DELAY_MS,
}

export interface TimingState {
  base: TimingBase
  /** Master scale on every duration except SPIN_TICK_MS. 1 = defaults, 0 = none. */
  multiplier: number
}

// Replaced wholesale on every edit (immutable snapshots) so useSyncExternalStore
// can compare references cheaply.
let snapshot: TimingState = { base: { ...TIMING_DEFAULTS }, multiplier: 1 }

const listeners = new Set<() => void>()
function commit(next: TimingState) {
  snapshot = next
  for (const fn of listeners) fn()
}

export function subscribeTiming(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function getTimingSnapshot(): TimingState {
  return snapshot
}

export function setTimingMultiplier(multiplier: number) {
  commit({ ...snapshot, multiplier })
}
export function setTimingBase(key: keyof TimingBase, value: number) {
  commit({ ...snapshot, base: { ...snapshot.base, [key]: value } })
}
export function resetTiming() {
  commit({ base: { ...TIMING_DEFAULTS }, multiplier: 1 })
}

// ── Getters the timer hooks call at schedule time ───────────────────────────
// Each returns the effective duration (base × multiplier), except spinTickMs,
// which is multiplier-exempt by design.
export const spinMs = () => snapshot.base.SPIN_MS * snapshot.multiplier
export const holdMs = () => snapshot.base.HOLD_MS * snapshot.multiplier
export const aiRollDelayMs = () => snapshot.base.AI_ROLL_DELAY_MS * snapshot.multiplier
export const aiMoveDelayMs = () => snapshot.base.AI_MOVE_DELAY_MS * snapshot.multiplier
export const spinTickMs = () => snapshot.base.SPIN_TICK_MS
