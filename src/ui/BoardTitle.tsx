/**
 * BoardTitle — the "Pitons" wordmark in the board's top-left corner.
 *
 * It's a small logo, not plain text: the two thematic letters are swapped for
 * icons — the "i" becomes a side-view pawn (a *piton*, the game's own piece) and
 * the "o" becomes a die (the game's other star). The rest stay as heading-font
 * letters so it still reads "Pitons" at a glance.
 *
 * Drawn as native SVG in board units — no foreignObject (see cross-platform-ui.md)
 * — so it scales with the board and behaves on iOS. Layout is deterministic: each
 * glyph gets a fixed cell width (TITLE_GLYPHS in theme.ts, in ems of the title
 * font size) and is centred in its cell, so nothing depends on measuring text.
 * All look/spacing knobs live in theme.ts under "The Pitons title wordmark".
 *
 * Pure presentation: no state, no rules. The whole group carries an aria-label so
 * screen readers still hear the title even though it's drawn as shapes.
 */
import { TITLE } from './strings'
import {
  TITLE_FONT_SIZE,
  TITLE_TOP,
  TITLE_BASELINE_RATIO,
  TITLE_KERN,
  TITLE_GLYPHS,
} from './theme'

/** Centre the wordmark on this board-unit x (the top-left nest centre). */
export function BoardTitle({ cx }: { cx: number }) {
  const F = TITLE_FONT_SIZE
  const cells = TITLE_GLYPHS.map((g) => g.w * TITLE_KERN * F)
  const totalW = cells.reduce((a, b) => a + b, 0)
  // Centre x of each glyph's cell: the running offset to a cell's left edge plus
  // half its width. Computed up front (no mutation during render) so the pen walk
  // stays a pure derivation of the cell widths.
  const centres = cells.map((w, i) => cells.slice(0, i).reduce((a, b) => a + b, 0) + w / 2)
  // Local space: baseline at y=0, x starts at 0. Translate the whole group so the
  // wordmark is centred on cx and its baseline sits TITLE_BASELINE_RATIO ems below
  // TITLE_TOP (so the glyph tops still hug TITLE_TOP, as the old text did).
  const baselineY = TITLE_TOP + TITLE_BASELINE_RATIO * F
  return (
    <g
      transform={`translate(${cx - totalW / 2}, ${baselineY})`}
      role="img"
      aria-label={TITLE}
    >
      {TITLE_GLYPHS.map((g, i) => {
        const gx = centres[i]
        if (g.kind === 'pawn') return <Pawn key={i} cx={gx} F={F} />
        if (g.kind === 'die') return <Die key={i} cx={gx} F={F} />
        return (
          <text key={i} className="board-title" x={gx} y={0} fontSize={F} textAnchor="middle">
            {g.char}
          </text>
        )
      })}
    </g>
  )
}

/**
 * The pawn that stands in for the "i": a clean side-view silhouette — a round
 * head (the i's dot) over a bell-shaped body that flares to a small plinth on the
 * baseline. Geometry is in ems of the title size, measured *up* from the baseline
 * (y=0), so it scales and aligns with the letters automatically.
 */
function Pawn({ cx, F }: { cx: number; F: number }) {
  const u = (em: number) => em * F
  const body = [
    `M ${cx - u(0.155)} 0`,
    `L ${cx - u(0.155)} ${-u(0.075)}`,
    `L ${cx - u(0.125)} ${-u(0.1)}`,
    `C ${cx - u(0.115)} ${-u(0.24)} ${cx - u(0.075)} ${-u(0.34)} ${cx - u(0.058)} ${-u(0.46)}`,
    `L ${cx + u(0.058)} ${-u(0.46)}`,
    `C ${cx + u(0.075)} ${-u(0.34)} ${cx + u(0.115)} ${-u(0.24)} ${cx + u(0.125)} ${-u(0.1)}`,
    `L ${cx + u(0.155)} ${-u(0.075)}`,
    `L ${cx + u(0.155)} 0`,
    'Z',
  ].join(' ')
  return (
    <g className="board-title-icon">
      <path d={body} />
      <circle cx={cx} cy={-u(0.565)} r={u(0.115)} />
    </g>
  )
}

/**
 * The die that stands in for the "o": a rounded square sitting on the baseline at
 * x-height (just like the letter it replaces), showing a five-pip face. The pips
 * are punched in the board's background colour so they read as holes. Geometry is
 * in ems of the title size.
 */
function Die({ cx, F }: { cx: number; F: number }) {
  const u = (em: number) => em * F
  const s = u(0.5) // x-height square
  const cy = -u(0.25) // die centre, above the baseline
  const off = u(0.135) // pip offset from centre
  const pips: [number, number][] = [
    [cx - off, cy - off],
    [cx + off, cy - off],
    [cx, cy],
    [cx - off, cy + off],
    [cx + off, cy + off],
  ]
  return (
    <g className="board-title-icon">
      <rect x={cx - s / 2} y={-s} width={s} height={s} rx={u(0.11)} />
      {pips.map(([px, py], i) => (
        <circle key={i} className="board-title-pip" cx={px} cy={py} r={u(0.052)} />
      ))}
    </g>
  )
}
