/**
 * jeu-de-piton — board layout (index → screen geometry)
 *
 * The engine deliberately models the board as ABSTRACT indices (track square
 * 0…trackLength-1, lane step 0…laneLength-1 per player, nests, HOME) and knows
 * nothing about pixels or which way is "up". This module — the UI's, not the
 * engine's — is the single place that turns those indices into positions on the
 * cross, so every SVG component reads from one source of truth.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * The grid
 * ──────────────────────────────────────────────────────────────────────────
 * The standard Parcheesi cross drops cleanly onto a square grid. Each arm is
 * three columns wide — two outer TRACK columns plus a middle HOME-LANE column —
 * and `sideLen` cells long, where
 *
 *     sideLen   = (trackLength / 4 - 1) / 2          // cabin board: 8
 *     gridSize  = 2 * sideLen + 3                    // cabin board: 19
 *     centre    = (gridSize - 1) / 2                 // cabin board: 9
 *
 * Coordinates here are in *cell units* (origin top-left, +x right, +y down), so
 * an SVG with `viewBox="0 0 gridSize gridSize"` maps a cell `{col,row}` to the
 * square `[col,row]…[col+1,row+1]`; a piece sits at the cell centre
 * `{col + 0.5, row + 0.5}`. Pixel sizing is the renderer's choice.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * The track ring
 * ──────────────────────────────────────────────────────────────────────────
 * One arm contributes `2*sideLen + 1` track cells: out along the bottom side
 * column to the tip, across the tip-middle cell (the U-turn), back along the top
 * side column. Rotating that quadrant by 90° three times (`rotate`, below) tiles
 * the whole `trackLength`-cell ring. The ring is then phase-shifted by
 * `RING_SHIFT` so that engine track index 0 lands on a sensible start square
 * (just inside a tip), with each player's home lane falling on their own arm.
 *
 * Direction of travel (the cabin runs counter-clockwise) is purely this layer's
 * concern; the engine only ever advances by increasing index. See the decision
 * log in docs/STATUS.md.
 */

import type { BoardGeometry } from '../engine'

/** A cell on the board grid, in cell units (not pixels). */
export interface Cell {
  col: number
  row: number
}

/** Everything a renderer needs to place the board and the pieces on it. */
export interface BoardLayout {
  /** Side length of the square grid, in cells (cabin board: 19). */
  gridSize: number
  /** Absolute track square index → its grid cell. Length = `trackLength`. */
  trackCells: Cell[]
  /** Per player index: their private home-lane cells, step 0 (mouth) → last. */
  laneCells: Cell[][]
  /** Per player index: the nest slots holding their pitons (one per piton). */
  nestCells: Cell[][]
  /** Centre cell of the board — HOME / the finish. */
  homeCell: Cell
}

/**
 * Rotate a cell 90° clockwise on screen about the board centre, `times` times.
 * On a y-down grid `(x,y) → (-y, x)` advances counter-clockwise as seen on
 * screen; we use its inverse direction to tile arms East → North → West → South.
 */
function rotate(local: Cell, centre: number, times: number): Cell {
  let { col: x, row: y } = { col: local.col - centre, row: local.row - centre }
  for (let i = 0; i < times; i++) {
    // (x, y) → (y, -x): maps the East arm onto the North arm, etc.
    const nx = y
    const ny = -x
    x = nx
    y = ny
  }
  return { col: x + centre, row: y + centre }
}

/**
 * Phase that lands the engine's track indices on the right physical cells: each
 * player's home-lane MOUTH (start − 5) on their arm's tip-middle cell, their
 * START three cells up their right-hand side column, and every safe-square mark
 * on its true cell. Pinned against the reference board (the player whose start
 * is index 0 has it 3 squares up their right column). Mod one arm (`quadrant`).
 */
const SAFE_PHASE = 13

/**
 * Whole-arm rotation of the *seating*, added on top of `SAFE_PHASE`. Because the
 * board is 4-fold symmetric, rotating by a multiple of `quadrant` keeps every
 * safe square / lane / mouth in place but changes which arm each player sits on.
 * 3 places player 0 (index 0 — the first player, and the solo player vs. future
 * AI) at the **South** arm, so a 2-player game (entries 0 & 34) is North–South.
 */
const SEAT_ROTATION = 3

/**
 * Build the screen layout for a game with the given resolved geometry and player
 * count. Pure geometry — no engine state, no colors, no pixels.
 */
export function buildLayout(
  geometry: BoardGeometry,
  playerCount: number,
): BoardLayout {
  const { trackLength, laneLength, entryIndices } = geometry
  const quadrant = trackLength / 4
  const sideLen = (quadrant - 1) / 2
  const gridSize = 2 * sideLen + 3
  const centre = (gridSize - 1) / 2
  const ringShift = SAFE_PHASE + SEAT_ROTATION * quadrant

  // --- one arm's track quadrant, in absolute grid cells (East arm) -----------
  // Local x runs 2…sideLen+1 (just outside the centre block, out to the tip).
  const base: Cell[] = []
  const tip = sideLen + 1
  for (let x = 2; x <= tip; x++) base.push({ col: centre + x, row: centre + 1 }) // bottom, outward
  base.push({ col: centre + tip, row: centre }) // tip middle (the U-turn)
  for (let x = tip; x >= 2; x--) base.push({ col: centre + x, row: centre - 1 }) // top, inward

  // --- tile the quadrant into the full ring, then phase-shift -----------------
  const ring: Cell[] = []
  for (let q = 0; q < 4; q++) {
    for (const c of base) ring.push(rotate(c, centre, q))
  }
  const trackCells: Cell[] = []
  for (let i = 0; i < trackLength; i++) {
    trackCells.push(ring[(i + ringShift) % trackLength])
  }

  // --- per-player lanes and nests, on each player's own arm -------------------
  // A player's arm is the quadrant their (shifted) entry cell falls in.
  const laneCells: Cell[][] = []
  const nestCells: Cell[][] = []
  for (let p = 0; p < playerCount; p++) {
    const entryRing = (entryIndices[p] + ringShift) % trackLength
    const armRot = Math.floor(entryRing / quadrant)

    // Lane: middle column of the East arm (step 0 at the mouth near the tip,
    // last step nearest centre), rotated onto the player's arm.
    const lane: Cell[] = []
    for (let s = 0; s < laneLength; s++) {
      const localCol = centre + (sideLen - s)
      lane.push(rotate({ col: localCol, row: centre }, centre, armRot))
    }
    laneCells.push(lane)

    // Nest: a 2×2 cluster in the corner adjacent to the player's START column.
    // For the East arm the start is on the top (north) side column, so the nest
    // sits in the top-right corner; rotation carries it onto each player's arm.
    const off = Math.round(sideLen / 2) + 1
    const cMid = centre + off // right side
    const rMid = centre - off // start (top) side
    const slots = [
      { col: cMid - 1, row: rMid - 1 },
      { col: cMid + 1, row: rMid - 1 },
      { col: cMid - 1, row: rMid + 1 },
      { col: cMid + 1, row: rMid + 1 },
    ]
    nestCells.push(slots.map((s) => rotate(s, centre, armRot)))
  }

  return {
    gridSize,
    trackCells,
    laneCells,
    nestCells,
    homeCell: { col: centre, row: centre },
  }
}
