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
import { ALL_PLAYER_COLORS, PLAYER_COLORS, type PlayerColor } from '../engine'
import { STRATEGY_IDS, type StrategyId } from '../ai/strategy'
import {
  PLAYER_HEX,
  SETUP_PALETTE_SWATCH_SIZE,
  SETUP_PANEL_BG,
  SETUP_SWATCH_SIZE,
  SETUP_WINDOW_SIZE,
} from './theme'
import { SETUP } from './strings'
import { Dropdown } from './Dropdown'

/** The next game's settings, as the setup window hands them back on Start. */
export interface GameSetup {
  /** Per-seat colour, in seat order; its length is the player count. Distinct. */
  colors: PlayerColor[]
  /** Which seats a human controls; every other seat is AI. */
  humanSeats: number[]
  /** Per-seat AI difficulty, in seat order (parallel to `colors`). Only used for
   *  the AI seats; a seat a human controls keeps its value but ignores it. */
  strategies: StrategyId[]
}

interface Props {
  /** The current game's per-seat colours, to pre-fill the draft. */
  colors: PlayerColor[]
  /** The seats a human currently controls, to pre-fill the type toggles. */
  humanSeats: number[]
  /** The current per-seat AI difficulty, to pre-fill the strategy pickers. */
  strategies: StrategyId[]
  onCancel: () => void
  onStart: (setup: GameSetup) => void
}

// The colour and strategy options are the same for every seat, so build them
// once. A colour option is a bare swatch (its name is the accessible label); a
// strategy option is just its display word.
const COLOR_OPTIONS = ALL_PLAYER_COLORS.map((pc) => ({
  value: pc,
  label: pc,
  node: <span className="swatch" style={{ '--swatch': PLAYER_HEX[pc] } as CSSProperties} />,
}))
const STRATEGY_OPTIONS = STRATEGY_IDS.map((id) => ({
  value: id,
  label: SETUP.strategyLabels[id],
  node: SETUP.strategyLabels[id],
}))

/** Resize a per-seat array to `n` seats, filling new tail slots with `fill(i)`. */
function resize<T>(arr: T[], n: number, fill: (i: number) => T): T[] {
  if (n <= arr.length) return arr.slice(0, n)
  return [...arr, ...Array.from({ length: n - arr.length }, (_, k) => fill(arr.length + k))]
}

export function NewGameModal({
  colors: initialColors,
  humanSeats,
  strategies: initialStrategies,
  onCancel,
  onStart,
}: Props) {
  // Draft state, pre-filled from the live game. `colors.length` is the player
  // count; `humans[i]` is whether seat i is human (else AI); `strategies[i]` is
  // seat i's AI difficulty (kept even for human seats, so toggling back restores).
  const [colors, setColors] = useState<PlayerColor[]>(initialColors)
  const [humans, setHumans] = useState<boolean[]>(
    initialColors.map((_, i) => humanSeats.includes(i)),
  )
  const [strategies, setStrategies] = useState<StrategyId[]>(initialStrategies)

  // Change the player count, growing/shrinking every per-seat array together.
  // Each new seat takes the first default seat colour not already taken (tracked
  // as we add, so growing by several stays distinct), defaults to AI (the common
  // case is one human against AIs), and defaults to the harder AI.
  const changeCount = (n: number) => {
    setColors((prev) => {
      if (n <= prev.length) return prev.slice(0, n)
      const next = [...prev]
      while (next.length < n) next.push(PLAYER_COLORS.find((c) => !next.includes(c))!)
      return next
    })
    setHumans((prev) => resize(prev, n, () => false))
    setStrategies((prev) => resize(prev, n, () => 'hard'))
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

  const pickStrategy = (seat: number, id: StrategyId) =>
    setStrategies((prev) => prev.map((s, i) => (i === seat ? id : s)))

  const start = () =>
    onStart({ colors, humanSeats: humans.flatMap((h, i) => (h ? [i] : [])), strategies })

  const count = colors.length

  return (
    <div
      className="setup-panel"
      // The one overall-size knob: base font in vmin; everything else is em off it
      // (see .setup-panel in index.css). The board is ~100 vmin, so the window
      // keeps a stable fraction of the board across screens.
      style={
        {
          '--setup-bg': SETUP_PANEL_BG,
          '--setup-swatch-size': `${SETUP_SWATCH_SIZE}em`,
          '--setup-palette-swatch-size': `${SETUP_PALETTE_SWATCH_SIZE}em`,
          fontSize: `${SETUP_WINDOW_SIZE}vmin`,
        } as CSSProperties
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

      {/* One row per seat: the human/AI toggle, a colour picker, and — for AI
          seats only — a difficulty picker. */}
      <div className="setup-seats">
        {colors.map((c, seat) => (
          <div className="setup-row setup-seat" key={seat}>
            {/* Three fixed grid columns — type | colour | strategy — so every
                seat's controls line up vertically and nothing shifts. The
                strategy column is reserved even on human rows (where it's empty),
                keeping the colour picker in the same column throughout. */}
            <button
              type="button"
              className="setup-pill setup-type"
              onClick={() => toggleType(seat)}
              aria-label={`${SETUP.seat(seat + 1)} — ${humans[seat] ? SETUP.human : SETUP.ai}`}
            >
              {humans[seat] ? SETUP.human : SETUP.ai}
            </button>
            <Dropdown
              value={c}
              options={COLOR_OPTIONS}
              onChange={(color) => pickColor(seat, color)}
              ariaLabel={SETUP.colorPicker(seat + 1)}
              className="setup-pick-color"
              menuClassName="dropdown-menu-swatches"
            />
            {!humans[seat] && (
              <Dropdown
                value={strategies[seat]}
                options={STRATEGY_OPTIONS}
                onChange={(id) => pickStrategy(seat, id)}
                ariaLabel={SETUP.strategyPicker(seat + 1)}
                className="setup-pick-strategy"
              />
            )}
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
