/**
 * Dashed move-trajectory lines, drawn UNDER the pitons as a background guide
 * (never interactive — `pointer-events: none` throughout). Two independent
 * features, each gated by a theme bool:
 *
 *  • SHOW_MOVABLE_TRAJECTORIES — the *live preview*: while the current player is
 *    choosing a move, a line runs from each movable piton to where it would land,
 *    so you can see which piton can go where (alongside the move rings).
 *  • PERSIST_MOVE_TRAJECTORIES — the *history*: every move already played this
 *    round stays on the board in the mover's colour (dimmer), until that seat's
 *    turn comes round again — same "pinned until your turn" lifecycle as the nest
 *    notices, since both ride the per-seat turn log (see useGame).
 *
 * A line FOLLOWS the track and turns with it: it's a polyline through the centre
 * of every square the piton crosses, reconstructed from the engine's own
 * progress model (`progressOf`/`positionAt`) — never re-deriving a rule, just
 * mapping a known from→to onto screen cells. A small dot marks each move's
 * origin. Each seat's lines are nudged a touch off the others
 * (TRAJECTORY_PLAYER_OFFSET) so two pitons crossing the same square don't draw on
 * top of one another.
 */
import { useSyncExternalStore } from 'react'
import type { GameState, Move, PitonPosition } from '../engine'
import { progressOf, positionAt, seatOfPiton } from '../engine'
import { type BoardLayout, cellMid } from './layout'
import type { TurnEntry } from './useGame'
import { subscribeTrajectory, getTrajectorySnapshot } from './trajectorySettings'
import {
  PLAYER_HEX,
  TRAJECTORY_STROKE_W,
  TRAJECTORY_DASH,
  TRAJECTORY_GAP,
  TRAJECTORY_OPACITY,
  TRAJECTORY_HISTORY_OPACITY,
  TRAJECTORY_PLAYER_OFFSET,
  TRAJECTORY_DOT_R,
} from './theme'

interface Props {
  state: GameState
  layout: BoardLayout
  /** Legal moves for the current player — the live-preview source (empty unless
   *  it's their turn to pick). */
  moves: Move[]
  /** Per-seat turn log — the history source; each entry's optional `move` carries
   *  the geometry of a played sub-turn. */
  log: TurnEntry[][]
}

type Pt = { x: number; y: number }

/**
 * Shift a polyline sideways by `dist` along its own perpendicular — like a lane
 * offset on a road, so each seat rides its own parallel track and lines sharing a
 * square pull apart whatever their direction (a single fixed nudge can't: it only
 * separates lines running across it, not along it). Interior vertices use the
 * mitre of their two segments so the offset line stays continuous through the
 * board's 90° corners. `dist` 0 (or a degenerate line) is returned unchanged.
 */
function offsetPolyline(pts: Pt[], dist: number): Pt[] {
  if (dist === 0 || pts.length < 2) return pts
  // Unit left-hand normal of each segment (consistent side ⇒ ordered lanes).
  const normals: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    const len = Math.hypot(dx, dy) || 1
    normals.push({ x: -dy / len, y: dx / len })
  }
  return pts.map((p, i) => {
    if (i === 0) return { x: p.x + normals[0].x * dist, y: p.y + normals[0].y * dist }
    if (i === pts.length - 1) {
      const n = normals[i - 1]
      return { x: p.x + n.x * dist, y: p.y + n.y * dist }
    }
    // Mitre: average the adjacent normals and lengthen by 1/cos(half-angle) so the
    // two offset segments meet exactly. (90° turns ⇒ factor √2, no blow-up.)
    const ax = normals[i - 1].x + normals[i].x
    const ay = normals[i - 1].y + normals[i].y
    const m = Math.hypot(ax, ay) || 1
    const ux = ax / m
    const uy = ay / m
    const cos = ux * normals[i].x + uy * normals[i].y
    const scale = cos !== 0 ? 1 / cos : 1
    return { x: p.x + ux * scale * dist, y: p.y + uy * scale * dist }
  })
}

/** Screen centre of a piton position for player `p` (nest → the nest cluster's
 *  centre; finished → HOME). */
function posCentre(pos: PitonPosition, p: number, layout: BoardLayout): Pt {
  switch (pos.kind) {
    case 'track': {
      const c = layout.trackCells[pos.square]
      return { x: cellMid(c.col, layout), y: cellMid(c.row, layout) }
    }
    case 'lane': {
      const c = layout.laneCells[p][pos.step]
      return { x: cellMid(c.col, layout), y: cellMid(c.row, layout) }
    }
    case 'finished': {
      const c = layout.homeCell
      return { x: cellMid(c.col, layout), y: cellMid(c.row, layout) }
    }
    case 'nest': {
      const slots = layout.nestSlots[p]
      return {
        x: slots.reduce((a, s) => a + s.cx, 0) / slots.length,
        y: slots.reduce((a, s) => a + s.cy, 0) / slots.length,
      }
    }
  }
}

/** The polyline that follows the track from a move's origin to its destination,
 *  cell centre by cell centre, with the per-seat separation nudge applied. `p`
 *  is the piton's OWNER seat — all private geometry (entry, home lane, nest) is
 *  read off that arm, not off whichever seat played the move. */
function pathPoints(
  from: PitonPosition,
  to: PitonPosition,
  p: number,
  state: GameState,
  layout: BoardLayout,
): Pt[] {
  const entry = state.geometry.entryIndices[p]
  const toProg = progressOf(to, entry, state.geometry)
  if (toProg == null) return []
  const fromProg = progressOf(from, entry, state.geometry)

  const pts: Pt[] = []
  // A nest origin is off the progress line — start the line at the nest itself,
  // then walk the on-track portion (which begins at the entry square, progress 0).
  if (from.kind === 'nest') pts.push(posCentre(from, p, layout))
  for (let pr = fromProg ?? 0; pr <= toProg; pr++) {
    const pos = positionAt(pr, entry, state.geometry)
    if (pos) pts.push(posCentre(pos, p, layout))
  }

  // Each seat rides its own lane, the lanes spread symmetrically about the true
  // path (seat 0 furthest one way … last seat the other), so no two ever coincide.
  const count = state.players.length
  const lane = (p - (count - 1) / 2) * TRAJECTORY_PLAYER_OFFSET
  return offsetPolyline(pts, lane)
}

function Line({ pts, color, opacity }: { pts: Pt[]; color: string; opacity: number }) {
  if (pts.length < 2) return null
  const origin = pts[0]
  return (
    <g opacity={opacity} pointerEvents="none">
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={TRAJECTORY_STROKE_W}
        strokeDasharray={`${TRAJECTORY_DASH} ${TRAJECTORY_GAP}`}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={origin.x} cy={origin.y} r={TRAJECTORY_DOT_R} fill={color} />
    </g>
  )
}

export function Trajectories({ state, layout, moves, log }: Props) {
  // Live, session-only feature toggles (seeded from the theme defaults; flicked
  // in the Dev tools General section). See trajectorySettings.
  const { showMovable, persistPrevious } = useSyncExternalStore(
    subscribeTrajectory,
    getTrajectorySnapshot,
  )

  const previews =
    showMovable && state.phase === 'awaiting-move'
      ? moves.map((m, i) => ({
          key: `preview-${i}`,
          // Geometry follows the piton's owner; colour stays the seat on the clock.
          pts: pathPoints(m.from, m.to, seatOfPiton(state, m.pitonId), state, layout),
          color: PLAYER_HEX[state.players[state.turn].color],
          opacity: TRAJECTORY_OPACITY,
        }))
      : []

  const history = persistPrevious
    ? state.players.flatMap((player, p) =>
        log[p]
          .filter((e) => e.move)
          .map((e, i) => ({
            key: `hist-${p}-${i}`,
            // `p` keys the log by the PLAYING seat (→ colour); the geometry
            // follows the recorded owner, which differs for a partner's piton.
            pts: pathPoints(e.move!.from, e.move!.to, e.move!.owner, state, layout),
            color: PLAYER_HEX[player.color],
            opacity: TRAJECTORY_OPACITY * TRAJECTORY_HISTORY_OPACITY,
          })),
      )
    : []

  return (
    <g className="trajectories">
      {[...history, ...previews].map((t) => (
        <Line key={t.key} pts={t.pts} color={t.color} opacity={t.opacity} />
      ))}
    </g>
  )
}
