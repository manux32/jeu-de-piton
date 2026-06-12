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

export function Board({ state, layout }: Props) {
  const safe = new Set(state.ruleset.safeSquares)
  const entryOf = new Map<number, string>() // track index → owner color hex
  state.geometry.entryIndices.forEach((idx, p) => {
    if (p < state.players.length) entryOf.set(idx, PLAYER_HEX[state.players[p].color])
  })

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

      {/* shared track */}
      {layout.trackCells.map((c, i) => {
        const entryHex = entryOf.get(i)
        return (
          <g key={`track-${i}`}>
            <rect
              x={c.col}
              y={c.row}
              width={1}
              height={1}
              fill={entryHex ?? '#ffffff'}
              fillOpacity={entryHex ? 0.35 : 1}
              stroke="#8a857c"
              strokeWidth={0.03}
            />
            {safe.has(i) && (
              <circle
                cx={c.col + 0.5}
                cy={c.row + 0.5}
                r={0.34}
                fill="none"
                stroke="#7a756c"
                strokeWidth={0.06}
              />
            )}
          </g>
        )
      })}

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
