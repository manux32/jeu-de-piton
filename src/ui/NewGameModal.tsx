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
import { SETUP, TEAM } from './strings'
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
  /** Per-seat team id (seats sharing an id are partners). Identity `[0,1,2,…]` is
   *  a free-for-all; `[0,1,0,1]` is the 2v2 mode. Parallel to `colors`. */
  teams: number[]
  /** The 2v2 partnership style: `false` = official "2v2" (partners play against
   *  each other until one finishes); `true` = "2v2 friendly" (partners are full
   *  allies). Irrelevant in a free-for-all. See `GameState.partnersAreAllies`. */
  partnersAreAllies: boolean
}

interface Props {
  /** The current game's per-seat colours, to pre-fill the draft. */
  colors: PlayerColor[]
  /** The seats a human currently controls, to pre-fill the type toggles. */
  humanSeats: number[]
  /** The current per-seat AI difficulty, to pre-fill the strategy pickers. */
  strategies: StrategyId[]
  /** The current per-seat team ids, to pre-fill the 2v2 toggle. */
  teams: number[]
  /** The current partnership style, to pre-fill which 2v2 pill is lit. */
  partnersAreAllies: boolean
  onCancel: () => void
  onStart: (setup: GameSetup) => void
}

/** A free-for-all's team ids for `n` seats: every seat its own team. */
const freeForAll = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
/** The 2v2 partnership: seats 1&3 vs 2&4 (0-based 0&2 vs 1&3). Always 4 seats. */
const TWO_V_TWO = [0, 1, 0, 1]

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
  teams: initialTeams,
  partnersAreAllies: initialPartnersAreAllies,
  onCancel,
  onStart,
}: Props) {
  // Draft state, pre-filled from the live game. `colors.length` is the player
  // count; `humans[i]` is whether seat i is human (else AI); `strategies[i]` is
  // seat i's AI difficulty (kept even for human seats, so toggling back restores);
  // `teams[i]` is seat i's team id (identity = free-for-all, [0,1,0,1] = 2v2).
  const [colors, setColors] = useState<PlayerColor[]>(initialColors)
  const [humans, setHumans] = useState<boolean[]>(
    initialColors.map((_, i) => humanSeats.includes(i)),
  )
  const [strategies, setStrategies] = useState<StrategyId[]>(initialStrategies)
  const [teams, setTeams] = useState<number[]>(initialTeams)
  // The 2v2 partnership style (only meaningful when `isTeam`): false = official
  // "2v2", true = "2v2 friendly". See GameState.partnersAreAllies.
  const [partnersAreAllies, setPartnersAreAllies] = useState(initialPartnersAreAllies)

  // A team game is one where two seats share a team id (only 2v2 today). In a
  // free-for-all every id is distinct, so this is false and all the team chrome
  // (the 2v2 pill highlight, the Team A/B headers) stays off.
  const isTeam = new Set(teams).size < teams.length

  // Resize every per-seat array to `n` seats and set the team layout in one go —
  // the count pills and the 2v2 pill both route through here so the arrays never
  // drift apart. Each new seat takes the first default colour not already taken
  // (tracked as we add, so growing by several stays distinct), defaults to AI (the
  // common case is one human against AIs), and to the harder AI.
  const applyCount = (n: number, nextTeams: number[]) => {
    setColors((prev) => {
      if (n <= prev.length) return prev.slice(0, n)
      const next = [...prev]
      while (next.length < n) next.push(PLAYER_COLORS.find((c) => !next.includes(c))!)
      return next
    })
    setHumans((prev) => resize(prev, n, () => false))
    setStrategies((prev) => resize(prev, n, () => 'hard'))
    setTeams(nextTeams)
  }

  // A plain count pick is always a free-for-all; a 2v2 pill forces 4 seats split
  // into the two partnerships. Picking any count clears 2v2, and vice versa, so the
  // count and 2v2 pills read as one mutually-exclusive choice. The two 2v2 pills
  // share the team layout and differ only in the partnership *style* (allies = the
  // friendly mode); switching between them keeps the 4 seats, just re-lighting.
  const changeCount = (n: number) => applyCount(n, freeForAll(n))
  const enable2v2 = (allies: boolean) => {
    applyCount(4, TWO_V_TWO)
    setPartnersAreAllies(allies)
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
    onStart({
      colors,
      humanSeats: humans.flatMap((h, i) => (h ? [i] : [])),
      strategies,
      teams,
      partnersAreAllies,
    })

  const count = colors.length

  // In a team game, the seats grouped by team in team-id order — each group is one
  // Team A/B block of seats. Derived straight from the draft `teams`.
  const teamGroups = Array.from(new Set(teams)).map((team) => ({
    team,
    seats: teams.flatMap((t, i) => (t === team ? [i] : [])),
  }))

  // One seat's controls — the human/AI toggle, the colour picker, and (AI only)
  // the difficulty picker. Pulled out so both the flat list and the team-grouped
  // layout render an identical row. Three fixed grid columns — type | colour |
  // strategy — so every seat's controls line up and the colour picker never shifts
  // (the strategy column is reserved even on human rows, where it sits empty).
  const seatRow = (seat: number) => (
    <div className="setup-row setup-seat" key={seat}>
      <button
        type="button"
        className="setup-pill setup-type"
        onClick={() => toggleType(seat)}
        aria-label={`${SETUP.seat(seat + 1)} — ${humans[seat] ? SETUP.human : SETUP.ai}`}
      >
        {humans[seat] ? SETUP.human : SETUP.ai}
      </button>
      <Dropdown
        value={colors[seat]}
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
  )

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

      {/* The game-mode choice, over two rows so the longer "2v2 friendly" pill
          doesn't crowd the count row (and re-trip the iPad font-width overflow —
          see cross-platform-ui.md). Row 1: the 2/3/4 free-for-all counts. Row 2:
          the two 2v2 pills (official vs friendly). Exactly one pill across both
          rows is "on" — a plain count when not a team game, else one of the 2v2
          modes by `partnersAreAllies`. */}
      <div className="setup-row setup-count">
        <span className="setup-rowlabel">{SETUP.players}</span>
        <div className="setup-group">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={n === count && !isTeam ? 'setup-pill setup-pill-on' : 'setup-pill'}
              aria-pressed={n === count && !isTeam}
              onClick={() => changeCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="setup-row setup-count">
        <span className="setup-rowlabel">{SETUP.teamsLabel}</span>
        <div className="setup-group">
          <button
            type="button"
            className={isTeam && !partnersAreAllies ? 'setup-pill setup-pill-on' : 'setup-pill'}
            aria-pressed={isTeam && !partnersAreAllies}
            onClick={() => enable2v2(false)}
          >
            {SETUP.teams}
          </button>
          <button
            type="button"
            className={isTeam && partnersAreAllies ? 'setup-pill setup-pill-on' : 'setup-pill'}
            aria-pressed={isTeam && partnersAreAllies}
            onClick={() => enable2v2(true)}
          >
            {SETUP.teamsFriendly}
          </button>
        </div>
      </div>

      {/* One row per seat: the human/AI toggle, a colour picker, and — for AI
          seats only — a difficulty picker. In a free-for-all the rows are a plain
          list in seat order; in 2v2 they're regrouped under Team A/B headers (so
          partners read together even though they sit on alternating seats). */}
      <div className="setup-seats">
        {isTeam
          ? teamGroups.map((group) => (
              <div className="setup-teamgroup" key={group.team}>
                <div className="setup-teamhead">{TEAM.name(group.team)}</div>
                {group.seats.map((seat) => seatRow(seat))}
              </div>
            ))
          : colors.map((_, seat) => seatRow(seat))}
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
