/**
 * Static board: the cross, the four colored home lanes, the nests, the safe-
 * square marks and HOME — all derived from the engine geometry via `buildLayout`.
 * It reads engine state (geometry, colors, safe squares) but holds no rules and
 * no piece positions; pitons render on top in <Pitons>. Coordinates are in cell
 * units, matching the parent SVG's `viewBox`.
 */
import type { GameState } from '../engine'
import type { BoardLayout } from './layout'
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
            x={c.col}
            y={c.row}
            width={1}
            height={1}
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
          x={c.col}
          y={c.row}
          width={1}
          height={1}
          fill={safe.has(i) ? SAFE_FILL : '#ffffff'}
          stroke="#8a857c"
          strokeWidth={0.03}
        />
      ))}

      {/* nests */}
      {layout.nestCells.map((slots, p) => {
        const hex = PLAYER_HEX[state.players[p].color]
        const cols = slots.map((s) => s.col)
        const rows = slots.map((s) => s.row)
        const x = Math.min(...cols)
        const y = Math.min(...rows)
        const w = Math.max(...cols) - x + 1
        const h = Math.max(...rows) - y + 1
        return (
          <g key={`nest-${p}`}>
            <rect
              x={x - 0.3}
              y={y - 0.3}
              width={w + 0.6}
              height={h + 0.6}
              rx={0.5}
              fill={hex}
              fillOpacity={0.18}
              stroke={hex}
              strokeWidth={0.08}
            />
            {slots.map((s, n) => (
              <circle
                key={`slot-${p}-${n}`}
                cx={s.col + 0.5}
                cy={s.row + 0.5}
                r={0.36}
                fill="#fdfcf8"
                stroke={hex}
                strokeWidth={0.05}
              />
            ))}
          </g>
        )
      })}

      {/* HOME */}
      <rect
        x={layout.homeCell.col - 1}
        y={layout.homeCell.row - 1}
        width={3}
        height={3}
        rx={0.4}
        fill="#f3e7ec"
        stroke="#c79bab"
        strokeWidth={0.06}
      />
      <text
        x={layout.homeCell.col + 0.5}
        y={layout.homeCell.row + 0.5}
        fontSize={0.5}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#a8617e"
      >
        HOME
      </text>
    </g>
  )
}
