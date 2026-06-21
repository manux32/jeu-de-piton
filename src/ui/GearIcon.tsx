/**
 * A plain gear/cog glyph for the Options button — self-authored (the path is
 * computed here from a few radii), so there's no third-party asset or licence to
 * track. It fills `currentColor` and scales to its box; the button sets the size
 * and colour. No state, no rules — pure presentation.
 *
 * The silhouette is an N-tooth polygon (alternating tip/valley radii) with a
 * round hole punched in the hub via the `evenodd` fill rule.
 */
import type { CSSProperties } from 'react'

const CX = 12
const CY = 12
const TEETH = 8
const R_TIP = 11 // tooth-tip radius
const R_ROOT = 8.2 // valley radius between teeth
const R_HOLE = 3.6 // hub hole radius

/** Build the gear outline: for each tooth, rise to the tip, run flat across the
 *  tip, then fall back to the valley — a trapezoidal tooth. */
function gearOutline(): string {
  const step = (Math.PI * 2) / TEETH
  const q = step / 4
  const pt = (a: number, r: number) =>
    `${(CX + Math.cos(a) * r).toFixed(2)} ${(CY + Math.sin(a) * r).toFixed(2)}`
  const pts: string[] = []
  for (let k = 0; k < TEETH; k++) {
    const a = k * step
    pts.push(pt(a, R_ROOT), pt(a + q, R_TIP), pt(a + 2 * q, R_TIP), pt(a + 3 * q, R_ROOT))
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`
}

// The hub hole, as a full circle subpath (two half-circle arcs); evenodd makes it
// subtract from the body above.
const HOLE =
  `M ${CX - R_HOLE} ${CY} ` +
  `A ${R_HOLE} ${R_HOLE} 0 1 0 ${CX + R_HOLE} ${CY} ` +
  `A ${R_HOLE} ${R_HOLE} 0 1 0 ${CX - R_HOLE} ${CY} Z`

const GEAR_PATH = `${gearOutline()} ${HOLE}`

export function GearIcon({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d={GEAR_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}
