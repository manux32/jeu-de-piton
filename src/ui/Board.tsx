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
import { PLAYER_HEX, LANE_FILL_OPACITY, NEST_BOX_FILL_OPACITY, NEST_FLASH } from './colors'

interface Props {
  state: GameState
  layout: BoardLayout
}

/** Fill for the 12 safe squares (starts, mid-arms, home-lane mouths). Black so
 * it can't be mistaken for a blue player's home-lane cells. */
const SAFE_FILL = '#1a1a1a'

/**
 * Start-arrow shape — four independent knobs, each a fraction of the start
 * cell's half-size resolved along/across the direction of travel. Tweak freely.
 * The BASE is the anchor: changing the length grows/shrinks the apex out from a
 * fixed base; the two offsets slide the whole (un-skewed) arrow around the cell.
 *   ARROW_LENGTH       — apex distance from the base, along travel (1 = half the
 *                        cell length, 2 = the full cell length).
 *   ARROW_OFFSET_ALONG — base position along travel from the cell centre
 *                        (signed: + toward the leading edge, − toward trailing).
 *   ARROW_OFFSET_ACROSS— base position across travel from the cell centre
 *                        (signed: slides the arrow sideways within the cell).
 *   ARROW_WIDTH        — half the base width across the cell (1 = full width).
 */
const ARROW_LENGTH = 0.7
const ARROW_OFFSET_ALONG = -0.95
const ARROW_OFFSET_ACROSS = 0.63
const ARROW_WIDTH = 0.3

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
            stroke="#9a958c"
            strokeWidth={0.02}
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
          fill={safe.has(i) ? SAFE_FILL : '#ffffff'}
          stroke="#8a857c"
          strokeWidth={0.03}
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
            stroke="#fdfcf8"
            strokeWidth={0.04}
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
        // (colors.ts) to make it breathe. See docs/decisions.md (2026-06-13).
        const active = p === state.turn
        const minCx = Math.min(...slots.map((s) => s.cx))
        const maxCx = Math.max(...slots.map((s) => s.cx))
        const minCy = Math.min(...slots.map((s) => s.cy))
        const maxCy = Math.max(...slots.map((s) => s.cy))
        const pad = 0.8 // box margin beyond the outer hole centres
        const x = minCx - pad
        const y = minCy - pad
        const w = maxCx - minCx + pad * 2
        const h = maxCy - minCy + pad * 2

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
        const inset = 0.15

        return (
          <g key={`nest-${p}`}>
            {active && (
              <rect
                className={NEST_FLASH ? 'nest-active-wash' : 'nest-active-wash-static'}
                x={qx0 + inset}
                y={qy0 + inset}
                width={qx1 - qx0 - inset * 2}
                height={qy1 - qy0 - inset * 2}
                rx={0.6}
                fill={hex}
              />
            )}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={0.5}
              fill={hex}
              fillOpacity={NEST_BOX_FILL_OPACITY}
              stroke={hex}
              strokeWidth={0.08}
            />
            {slots.map((s, n) => (
              <circle
                key={`slot-${p}-${n}`}
                cx={s.cx}
                cy={s.cy}
                r={0.36}
                fill="#fdfcf8"
                stroke={hex}
                strokeWidth={0.05}
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
        rx={0.4}
        fill="#f3e7ec"
        stroke="#c79bab"
        strokeWidth={0.06}
      />
    </g>
  )
}
