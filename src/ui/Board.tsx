/**
 * Mostly-static board: the cross, the four colored home lanes, the nests, the
 * safe-square marks and HOME — all derived from the engine geometry via
 * `buildLayout` — plus the active player's corner wash (the one state-driven
 * bit: it reads `turn` to tint that player's corner quadrant as the whose-turn
 * cue). It reads engine state (geometry, colors, safe squares, turn) but holds
 * no rules and no piece positions; pitons render on top in <Pitons>. Coordinates
 * are in cell units, matching the parent SVG's `viewBox`.
 */
import type { GameState } from '../engine'
import { type BoardLayout, cellStart, cellSize, cellMid } from './layout'
import {
  PLAYER_HEX,
  LANE_FILL_OPACITY,
  NEST_BOX_FILL_OPACITY,
  NEST_FLASH,
  TRACK_FILL,
  SAFE_FILL,
  HOME_FILL,
  NEST_HOLE_FILL,
  START_ARROW_STROKE,
  LANE_STROKE,
  TRACK_STROKE,
  HOME_STROKE,
  // geometry
  LANE_STROKE_W,
  TRACK_STROKE_W,
  HOME_RX,
  HOME_STROKE_W,
  ARROW_LENGTH,
  ARROW_OFFSET_ALONG,
  ARROW_OFFSET_ACROSS,
  ARROW_WIDTH,
  ARROW_STROKE_W,
  NEST_BOX_PAD,
  NEST_BOX_STROKE_W,
  NEST_HOLE_R,
  NEST_HOLE_STROKE_W,
  NEST_WASH_RX,
  NEST_WASH_INSET,
} from './theme'

interface Props {
  state: GameState
  layout: BoardLayout
}

export function Board({ state, layout }: Props) {
  const safe = new Set(state.ruleset.safeSquares)

  return (
    <g className="board">
      {/* home lanes — each player's private runway, tinted their color */}
      {layout.laneCells.map((lane, p) => {
        const hex = PLAYER_HEX[state.players[p].color]
        return lane.map((c, s) => (
          <rect
            key={`lane-${p}-${s}`}
            x={cellStart(c.col, layout)}
            y={cellStart(c.row, layout)}
            width={cellSize(c.col, layout)}
            height={cellSize(c.row, layout)}
            fill={hex}
            fillOpacity={LANE_FILL_OPACITY}
            stroke={LANE_STROKE}
            strokeWidth={LANE_STROKE_W}
          />
        ))
      })}

      {/* shared track — safe squares filled, others plain */}
      {layout.trackCells.map((c, i) => (
        <rect
          key={`track-${i}`}
          x={cellStart(c.col, layout)}
          y={cellStart(c.row, layout)}
          width={cellSize(c.col, layout)}
          height={cellSize(c.row, layout)}
          fill={safe.has(i) ? SAFE_FILL : TRACK_FILL}
          stroke={TRACK_STROKE}
          strokeWidth={TRACK_STROKE_W}
        />
      ))}

      {/* start-square ownership arrows — a colored triangle on each player's
          start square, pointing the way the piton travels (CCW along the track),
          with its base resting on the square's trailing ("bottom") edge. That
          gives two cues in one mark: whose square it is, and which way play runs.
          The black safe fill stays beneath: the square is still safe, but only
          *for its owner*, who can even exit the nest onto it to capture an enemy
          sitting there. Travel is axis-aligned, so the arrows never tilt; the
          trailing edge is screen-bottom for the south arm and its rotation for
          the rest. */}
      {state.players.map((player, p) => {
        const s = state.geometry.entryIndices[p]
        const cell = layout.trackCells[s]
        const next = layout.trackCells[(s + 1) % layout.trackCells.length]
        const cx = cellMid(cell.col, layout)
        const cy = cellMid(cell.row, layout)
        // Unit vector along travel (toward the next track cell) and across it.
        const tx = cellMid(next.col, layout) - cx
        const ty = cellMid(next.row, layout) - cy
        const len = Math.hypot(tx, ty) || 1
        const ux = tx / len
        const uy = ty / len
        const px = -uy
        const py = ux
        // Cell half-extents resolved along/across travel (axis-aligned, so each
        // picks out one of the cell's two dimensions).
        const cw = cellSize(cell.col, layout)
        const ch = cellSize(cell.row, layout)
        const alongHalf = (Math.abs(ux) * cw + Math.abs(uy) * ch) / 2
        const acrossHalf = (Math.abs(px) * cw + Math.abs(py) * ch) / 2
        // Anchor the base (slid from the cell centre by the two offsets), then
        // grow the apex out from it along travel by the arrow's length.
        const bx =
          cx + ux * alongHalf * ARROW_OFFSET_ALONG + px * acrossHalf * ARROW_OFFSET_ACROSS
        const by =
          cy + uy * alongHalf * ARROW_OFFSET_ALONG + py * acrossHalf * ARROW_OFFSET_ACROSS
        const ax = bx + ux * alongHalf * ARROW_LENGTH
        const ay = by + uy * alongHalf * ARROW_LENGTH
        const hb = acrossHalf * ARROW_WIDTH
        return (
          <polygon
            key={`start-arrow-${p}`}
            points={`${ax},${ay} ${bx + px * hb},${by + py * hb} ${bx - px * hb},${by - py * hb}`}
            fill={PLAYER_HEX[player.color]}
            stroke={START_ARROW_STROKE}
            strokeWidth={ARROW_STROKE_W}
            strokeLinejoin="round"
          />
        )
      })}

      {/* nests — render-unit hole centres, each cluster centred in its corner
          quadrant (see layout.nestSlots / nestCentres) */}
      {layout.nestSlots.map((slots, p) => {
        const hex = PLAYER_HEX[state.players[p].color]
        // The player to act gets their whole corner quadrant — the blank board
        // region between two arms, behind the nest — washed in their colour as the
        // whose-turn cue. It ships as a static highlight; flip NEST_FLASH
        // (theme.ts) to make it breathe. See docs/decisions.md (2026-06-13).
        const active = p === state.turn
        const minCx = Math.min(...slots.map((s) => s.cx))
        const maxCx = Math.max(...slots.map((s) => s.cx))
        const minCy = Math.min(...slots.map((s) => s.cy))
        const maxCy = Math.max(...slots.map((s) => s.cy))
        // A circle (not a square) encloses the four holes, so the cluster reads
        // as a nest rather than a die's 4-face. Centred on the hole cluster, with
        // radius reaching from that centre out to the corner holes plus the pad.
        const nestCx = (minCx + maxCx) / 2
        const nestCy = (minCy + maxCy) / 2
        const nestR =
          Math.hypot((maxCx - minCx) / 2, (maxCy - minCy) / 2) + NEST_BOX_PAD

        // Which corner quadrant this nest sits in (between the two arms), bounded
        // by the board edge and the near edge of each adjacent arm. The arms span
        // the three central rows/cols (centre-1 … centre+1); the cluster centre
        // vs the board centre tells us the corner.
        const { col: cc, row: cr } = layout.homeCell
        const onLeft = (minCx + maxCx) / 2 < cellMid(cc, layout)
        const onTop = (minCy + maxCy) / 2 < cellMid(cr, layout)
        const qx0 = onLeft ? 0 : cellStart(cc + 2, layout)
        const qx1 = onLeft ? cellStart(cc - 1, layout) : layout.extent
        const qy0 = onTop ? 0 : cellStart(cr + 2, layout)
        const qy1 = onTop ? cellStart(cr - 1, layout) : layout.extent
        const inset = NEST_WASH_INSET

        return (
          <g key={`nest-${p}`}>
            {active && (
              <rect
                className={NEST_FLASH ? 'nest-active-wash' : 'nest-active-wash-static'}
                x={qx0 + inset}
                y={qy0 + inset}
                width={qx1 - qx0 - inset * 2}
                height={qy1 - qy0 - inset * 2}
                rx={NEST_WASH_RX}
                fill={hex}
              />
            )}
            <circle
              cx={nestCx}
              cy={nestCy}
              r={nestR}
              fill={hex}
              fillOpacity={NEST_BOX_FILL_OPACITY}
              stroke={hex}
              strokeWidth={NEST_BOX_STROKE_W}
            />
            {slots.map((s, n) => (
              <circle
                key={`slot-${p}-${n}`}
                cx={s.cx}
                cy={s.cy}
                r={NEST_HOLE_R}
                fill={NEST_HOLE_FILL}
                stroke={hex}
                strokeWidth={NEST_HOLE_STROKE_W}
              />
            ))}
          </g>
        )
      })}

      {/* HOME — the central fat 3×3 band. The "HOME" label was removed so the
          centred dice UI owns this space cleanly (this session's decision);
          finished pitons tuck into the corners (see Pitons homeCluster). */}
      <rect
        x={cellStart(layout.homeCell.col - 1, layout)}
        y={cellStart(layout.homeCell.row - 1, layout)}
        width={cellStart(layout.homeCell.col + 2, layout) - cellStart(layout.homeCell.col - 1, layout)}
        height={cellStart(layout.homeCell.row + 2, layout) - cellStart(layout.homeCell.row - 1, layout)}
        rx={HOME_RX}
        fill={HOME_FILL}
        stroke={HOME_STROKE}
        strokeWidth={HOME_STROKE_W}
      />
    </g>
  )
}
