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
import { PLAYER_HEX } from './colors'

interface Props {
  state: GameState
  layout: BoardLayout
}

/** Fill for the 12 safe squares (starts, mid-arms, home-lane mouths). Black so
 * it can't be mistaken for a blue player's home-lane cells. */
const SAFE_FILL = '#1a1a1a'

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
            fillOpacity={0.45}
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

      {/* nests — render-unit hole centres, each cluster centred in its corner
          quadrant (see layout.nestSlots / nestCentres) */}
      {layout.nestSlots.map((slots, p) => {
        const hex = PLAYER_HEX[state.players[p].color]
        // The player to act gets their whole corner quadrant — the blank board
        // region between two arms, behind the nest — washed in their colour. A
        // big, obvious "whose turn" cue that doesn't reuse the piton pulse halo.
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
                x={qx0 + inset}
                y={qy0 + inset}
                width={qx1 - qx0 - inset * 2}
                height={qy1 - qy0 - inset * 2}
                rx={0.6}
                fill={hex}
                fillOpacity={0.28}
              />
            )}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={0.5}
              fill={hex}
              fillOpacity={0.18}
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
