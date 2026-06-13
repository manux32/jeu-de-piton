/**
 * jeu-de-piton — board coordinate & indexing model
 *
 * Pure TypeScript, no React/DOM (see the engine architecture rule in CLAUDE.md).
 *
 * This module pins down the ONE thing every other piece of engine logic needs:
 * how a piton's location on the cross-shaped board is numbered, and how to move
 * along it. Movement, capture, blocking and win-detection are all expressed in
 * terms of the helpers here, so the rest of the engine never does index
 * arithmetic by hand.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * The progress-coordinate model (the keystone)
 * ──────────────────────────────────────────────────────────────────────────
 * Every piton's whole journey is a single monotonic integer line — its
 * `progress` — running from "just stepped out of the nest" to "reached HOME":
 *
 *   progress:  0 ........... P-1 │ P ......... P+L-1 │ P+L
 *              └─ shared track ──┘ └─ private lane ──┘  └ HOME (finished)
 *              ▲ entry square                ▲ last lane cell
 *
 *   where  P = trackPathLength  (shared-track squares traversed)
 *          L = laneLength       (private home-lane cells)
 *
 * - A piton in the `nest` is OFF this line (no progress) until an entry roll
 *   places it on its entry square at progress 0.
 * - For progress in [0, P): the piton is on the SHARED track, at absolute
 *   square `(entryIndex + progress) mod trackLength`. Every player walks the
 *   same physical ring, just starting from a different entry square — which is
 *   exactly why captures between players fall out naturally: two pitons collide
 *   iff their absolute squares are equal.
 * - For progress in [P, P+L): the piton is in its OWN private lane, at lane
 *   step `progress - P`. Lanes are not shared, so they're indexed per-player.
 * - progress === P+L: HOME / finished. With exact-home entry, a piton must land
 *   *exactly* here; a roll that would carry it past is simply not a legal move.
 *
 * Travel DIRECTION (cabin variant runs counter-clockwise, canonical clockwise)
 * is deliberately NOT modelled here: the engine always advances by increasing
 * progress, and the SVG layer maps index → screen position. See the decision
 * log in docs/STATUS.md.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Geometry of the confirmed cabin board (standard Selchow & Righter Parcheesi)
 * ──────────────────────────────────────────────────────────────────────────
 * trackLength 68, laneLength 7, four arms 17 squares apart. The four entry
 * squares are therefore at absolute indices {0, 17, 34, 51}; a game uses a
 * subset of these four physical seats (see `entrySeats`).
 *
 * `trackPathLength` (how far a piton walks the ring before turning into its
 * lane) = `trackLength - homeEntryOffset`. `homeEntryOffset` is PINNED at 4
 * (confirmed 2026-06-12 from the board: a roll of 12 from your start lands on the
 * next player's lane entry), so the lane mouth sits 5 squares before a player's
 * own start and `trackPathLength` is 64. See docs/rules-and-lineage.md.
 */

import type { PitonPosition } from './types'

/** Resolved, self-consistent geometry the rest of the engine indexes against. */
export interface BoardGeometry {
  /** Shared-loop square count (cabin board: 68). */
  trackLength: number
  /** Private home-lane cell count per player (cabin board: 7). */
  laneLength: number
  /**
   * Shared-track squares a piton traverses before turning into its home lane.
   * `trackLength - homeEntryOffset`. With offset 0 this is a full lap and the
   * lane mouth is the square just before the entry square.
   */
  trackPathLength: number
  /** Absolute entry/start square for each player, by player index. */
  entryIndices: number[]
}

/**
 * The four physical arm seats of the standard board, as absolute track indices.
 * A game seats its players at a fair subset of these (opposite seats for 2P).
 */
export function entrySeats(playerCount: number, trackLength: number): number[] {
  if (trackLength % 4 !== 0) {
    throw new Error(
      `entrySeats assumes a 4-arm board; trackLength ${trackLength} is not divisible by 4`,
    )
  }
  if (playerCount < 1 || playerCount > 4) {
    throw new Error(`playerCount must be 1–4, got ${playerCount}`)
  }
  const arm = trackLength / 4 // 17 on the cabin board
  const seats = [0, arm, 2 * arm, 3 * arm]
  // Seat 2 players on opposite arms so neither has a positional advantage.
  if (playerCount === 2) return [seats[0], seats[2]]
  return seats.slice(0, playerCount)
}

/**
 * Build the resolved geometry for a board.
 * @param homeEntryOffset squares before the entry square at which the lane
 *   mouth sits; 0 = full lap (default, see module header).
 */
export function makeGeometry(
  trackLength: number,
  laneLength: number,
  playerCount: number,
  homeEntryOffset = 0,
): BoardGeometry {
  if (homeEntryOffset < 0 || homeEntryOffset >= trackLength) {
    throw new Error(`homeEntryOffset out of range: ${homeEntryOffset}`)
  }
  return {
    trackLength,
    laneLength,
    trackPathLength: trackLength - homeEntryOffset,
    entryIndices: entrySeats(playerCount, trackLength),
  }
}

/** Progress value at which a piton is HOME (the exact-landing target). */
export function finishProgress(geo: BoardGeometry): number {
  return geo.trackPathLength + geo.laneLength
}

/**
 * Map a piton's stored position to its scalar progress along the journey line,
 * or `null` if it is in the nest (off the line). Inverse of `positionAt`.
 */
export function progressOf(
  position: PitonPosition,
  entryIndex: number,
  geo: BoardGeometry,
): number | null {
  switch (position.kind) {
    case 'nest':
      return null
    case 'track': {
      const p = (position.square - entryIndex + geo.trackLength) % geo.trackLength
      return p
    }
    case 'lane':
      return geo.trackPathLength + position.step
    case 'finished':
      return finishProgress(geo)
  }
}

/**
 * Map a scalar progress back to a stored position. Inverse of `progressOf`.
 * Returns `null` for an out-of-range progress (i.e. an overshoot past HOME),
 * which callers treat as an illegal landing.
 */
export function positionAt(
  progress: number,
  entryIndex: number,
  geo: BoardGeometry,
): PitonPosition | null {
  if (progress < 0) return null
  if (progress < geo.trackPathLength) {
    return { kind: 'track', square: (entryIndex + progress) % geo.trackLength }
  }
  if (progress < geo.trackPathLength + geo.laneLength) {
    return { kind: 'lane', step: progress - geo.trackPathLength }
  }
  if (progress === finishProgress(geo)) {
    return { kind: 'finished' }
  }
  return null
}

/**
 * The absolute shared-track square a piton occupies, or `null` if it is in the
 * nest, a private lane, or finished (none of which collide across players).
 * The convenient form for capture/occupancy checks on the shared ring.
 */
export function trackSquareOf(position: PitonPosition): number | null {
  return position.kind === 'track' ? position.square : null
}
