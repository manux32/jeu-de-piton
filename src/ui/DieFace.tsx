/**
 * A single die face drawn as native SVG in board units — a rounded square with
 * 1–6 pips laid out on the standard 3×3 grid. Purely presentational: it renders
 * a value at a centre/size and tints to a colour; interaction (the tap-to-roll
 * click target) is the caller's. This reuses the nest's pip recipe (a coloured
 * box of circles — see Board's nestSlots) so the die reads as a sibling of the
 * nests rather than a bolted-on widget.
 */
import {
  DIE_FACE_FILL,
  DIE_PIP_STEP,
  DIE_PIP_R,
  DIE_CORNER_RX,
  DIE_STROKE_W,
  DIE_PROMPT_TEXT,
  DIE_PROMPT_OFFSET_X,
} from './theme'

// Which of the 3×3 grid cells carry a pip for each value, in units of the grid
// step (cols/rows at −1, 0, +1 from centre). Standard western die pip layout.
const PIPS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
}

interface Props {
  /** Pip count to show, 1–6. */
  value: number
  /** Centre of the die in board (viewBox) units. */
  cx: number
  cy: number
  /** Side length of the square in board units. */
  size: number
  /** Tint for the border and pips (the acting player's colour). */
  color: string
  /** When set, the face shows this text (e.g. a "Roll" prompt) instead of pips. */
  label?: string
}

export function DieFace({ value, cx, cy, size, color, label }: Props) {
  const half = size / 2
  const step = size * DIE_PIP_STEP // pip grid spacing from centre
  const pipR = size * DIE_PIP_R

  return (
    <g>
      <rect
        className="die-square"
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        rx={size * DIE_CORNER_RX}
        fill={DIE_FACE_FILL}
        stroke={color}
        strokeWidth={size * DIE_STROKE_W}
      />
      {label != null ? (
        <text
          className="die-label"
          x={cx + size * DIE_PROMPT_OFFSET_X}
          y={cy}
          fontSize={size * DIE_PROMPT_TEXT}
          fill={color}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label}
        </text>
      ) : (
        (PIPS[value] ?? PIPS[1]).map(([dx, dy], i) => (
          <circle
            key={i}
            cx={cx + dx * step}
            cy={cy + dy * step}
            r={pipR}
            fill={color}
          />
        ))
      )}
    </g>
  )
}
