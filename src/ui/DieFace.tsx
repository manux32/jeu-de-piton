/**
 * A single die face drawn as native SVG in board units — a rounded square with
 * 1–6 pips laid out on the standard 3×3 grid. Purely presentational: it renders
 * a value at a centre/size and tints to a colour; interaction (the tap-to-roll
 * click target) is the caller's. This reuses the nest's pip recipe (a coloured
 * box of circles — see Board's nestSlots) so the die reads as a sibling of the
 * nests rather than a bolted-on widget.
 */

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
}

export function DieFace({ value, cx, cy, size, color }: Props) {
  const half = size / 2
  const step = size * 0.26 // pip grid spacing from centre
  const pipR = size * 0.085

  return (
    <g>
      <rect
        className="die-square"
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        rx={size * 0.18}
        fill="#fdfcf8"
        stroke={color}
        strokeWidth={size * 0.04}
      />
      {(PIPS[value] ?? PIPS[1]).map(([dx, dy], i) => (
        <circle
          key={i}
          cx={cx + dx * step}
          cy={cy + dy * step}
          r={pipR}
          fill={color}
        />
      ))}
    </g>
  )
}
