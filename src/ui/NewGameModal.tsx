/**
 * The New Game setup window — the panel content of the DOM overlay GameBoard
 * centres over the board (`.setup-overlay`; a plain DOM layer, not in the board
 * SVG — see cross-platform-ui.md). It holds NO rules and no engine state: it
 * edits a local *draft* of the
 * next game's settings — player count, each seat's human/AI type, each seat's
 * colour — and only on "Start game" hands that draft back via `onStart`. Cancel
 * throws the draft away. The live game is untouched until then.
 *
 * Colours are the engine's player identity (piton ids / capture / win), so they
 * must stay distinct: picking a colour another seat holds *swaps* the two seats'
 * colours rather than duplicating. With only four colours a four-player game has
 * them all spoken for, so there every pick is a swap; with two or three seats
 * there are spare colours to take freely.
 */
import { useState, type CSSProperties } from 'react'
import { PLAYER_COLORS, type PlayerColor } from '../engine'
import { PLAYER_HEX, SETUP_PANEL_BG, SETUP_WINDOW_SIZE } from './theme'
import { SETUP } from './strings'

/** The next game's settings, as the setup window hands them back on Start. */
export interface GameSetup {
  /** Per-seat colour, in seat order; its length is the player count. Distinct. */
  colors: PlayerColor[]
  /** Which seats a human controls; every other seat is AI. */
  humanSeats: number[]
}

interface Props {
  /** The current game's per-seat colours, to pre-fill the draft. */
  colors: PlayerColor[]
  /** The seats a human currently controls, to pre-fill the type toggles. */
  humanSeats: number[]
  onCancel: () => void
  onStart: (setup: GameSetup) => void
}

/** Resize a per-seat array to `n` seats, filling new tail slots with `fill(i)`. */
function resize<T>(arr: T[], n: number, fill: (i: number) => T): T[] {
  if (n <= arr.length) return arr.slice(0, n)
  return [...arr, ...Array.from({ length: n - arr.length }, (_, k) => fill(arr.length + k))]
}

export function NewGameModal({ colors: initialColors, humanSeats, onCancel, onStart }: Props) {
  // Draft state, pre-filled from the live game. `colors.length` is the player
  // count; `humans[i]` is whether seat i is human (else AI).
  const [colors, setColors] = useState<PlayerColor[]>(initialColors)
  const [humans, setHumans] = useState<boolean[]>(
    initialColors.map((_, i) => humanSeats.includes(i)),
  )

  // Change the player count, growing/shrinking both per-seat arrays together.
  // Each new seat takes the first palette colour not already taken (tracked as we
  // add, so growing by several still stays distinct) and defaults to AI (the
  // common case is one human against AIs).
  const changeCount = (n: number) => {
    setColors((prev) => {
      if (n <= prev.length) return prev.slice(0, n)
      const next = [...prev]
      while (next.length < n) next.push(PLAYER_COLORS.find((c) => !next.includes(c))!)
      return next
    })
    setHumans((prev) => resize(prev, n, () => false))
  }

  // Pick a colour for a seat, keeping all seats' colours distinct: if another
  // seat already holds it, the two seats swap colours.
  const pickColor = (seat: number, color: PlayerColor) => {
    setColors((prev) => {
      if (prev[seat] === color) return prev
      const holder = prev.indexOf(color)
      const next = [...prev]
      if (holder !== -1) next[holder] = prev[seat]
      next[seat] = color
      return next
    })
  }

  const toggleType = (seat: number) =>
    setHumans((prev) => prev.map((h, i) => (i === seat ? !h : h)))

  const start = () =>
    onStart({ colors, humanSeats: humans.flatMap((h, i) => (h ? [i] : [])) })

  const count = colors.length

  return (
    <div
      className="setup-panel"
      // The one overall-size knob: base font in vmin; everything else is em off it
      // (see .setup-panel in index.css). The board is ~100 vmin, so the window
      // keeps a stable fraction of the board across screens.
      style={
        { '--setup-bg': SETUP_PANEL_BG, fontSize: `${SETUP_WINDOW_SIZE}vmin` } as CSSProperties
      }
    >
      <div className="setup-title">{SETUP.title}</div>

      {/* Player count */}
      <div className="setup-row setup-count">
        <span className="setup-rowlabel">{SETUP.players}</span>
        <div className="setup-group">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={n === count ? 'setup-pill setup-pill-on' : 'setup-pill'}
              aria-pressed={n === count}
              onClick={() => changeCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* One row per seat: type toggle + colour swatches */}
      <div className="setup-seats">
        {colors.map((c, seat) => (
          <div className="setup-row setup-seat" key={seat}>
            <button
              type="button"
              className="setup-pill setup-type"
              onClick={() => toggleType(seat)}
              aria-label={`${SETUP.seat(seat + 1)} — ${humans[seat] ? SETUP.human : SETUP.ai}`}
            >
              {humans[seat] ? SETUP.human : SETUP.ai}
            </button>
            <div className="setup-group setup-swatches">
              {PLAYER_COLORS.map((pc) => (
                <button
                  key={pc}
                  type="button"
                  className={pc === c ? 'setup-swatch setup-swatch-on' : 'setup-swatch'}
                  style={{ '--swatch': PLAYER_HEX[pc] } as CSSProperties}
                  aria-label={pc}
                  aria-pressed={pc === c}
                  onClick={() => pickColor(seat, pc)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar: nothing takes effect until Start game */}
      <div className="setup-actions">
        <button type="button" className="setup-pill" onClick={onCancel}>
          {SETUP.cancel}
        </button>
        <button type="button" className="setup-pill setup-pill-go" onClick={start}>
          {SETUP.start}
        </button>
      </div>
    </div>
  )
}
