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
import type { Glyph } from './glyphs'

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
  /** When set, the face shows this baked label glyph (e.g. the "Roll" prompt)
   *  instead of pips. It's pre-traced outline geometry, not live text — see
   *  glyphs.ts — so it renders pixel-identically on every platform with no
   *  system-font substitution or per-font centring drift. */
  label?: Glyph
  /** Label size as a [share] of die size (the em-scale applied to the em=1 glyph).
   *  Defaults to DIE_PROMPT_TEXT (tuned for the centre die's "Roll"); the tiny
   *  notice die overrides it larger for its single-glyph prompt. */
  labelSize?: number
  /** Label horizontal nudge as a [share] of die size (+ = right). Defaults to
   *  DIE_PROMPT_OFFSET_X. The glyph is already bbox-centred, so this is just an
   *  optical fine-tune escape hatch. */
  labelOffsetX?: number
  /** Label vertical nudge as a [share] of die size (− = up). Defaults to 0 — the
   *  glyph is already bbox-centred; optical fine-tune escape hatch. */
  labelOffsetY?: number
}

export function DieFace({ value, cx, cy, size, color, label, labelSize, labelOffsetX, labelOffsetY }: Props) {
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
        // Scale the em=1 glyph by (size × share), then translate its bbox centre
        // onto the die centre (+ optional optical nudge). Transforms apply
        // right-to-left: recentre on the bbox, scale, then move to the die.
        <path
          className="die-label"
          d={label.d}
          fill={color}
          transform={
            `translate(${cx + size * (labelOffsetX ?? DIE_PROMPT_OFFSET_X)}, ${cy + size * (labelOffsetY ?? 0)})` +
            ` scale(${size * (labelSize ?? DIE_PROMPT_TEXT)})` +
            ` translate(${-label.cx}, ${-label.cy})`
          }
        />
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
