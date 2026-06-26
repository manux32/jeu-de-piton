/**
 * Composes the board: builds the screen layout from the engine geometry (once
 * per game) and renders, inside a single SVG whose `viewBox` is the cell grid,
 * the static <Board>, the legal-move target markers, the <Pitons> overlay, and
 * all of the game's chrome — title, New Game controls, dice, and the per-nest
 * notices — overlaid in the four corners (see the 2026-06-13 decision: the board
 * is self-contained, no UI outside it). Each nest shows its own player's pinned
 * last-action notice + last-roll die (`notices[p]` / `rolls[p]`, held until that
 * seat's turn comes round again), while the current player's nest shows the live
 * turn prompt. This is the interaction-loop seam (Milestone 4): it takes the
 * current player's `legalMoves` / die `face` + `rolling` / the per-seat `notices`
 * + `rolls` and the `onPick` / `onRoll` / `onNewGame` / `onOpenDev` callbacks; it
 * adds no rules of its own (every decision is the engine's, made in App).
 */
import { Fragment, useMemo, useState, type CSSProperties } from 'react'
import { type GameState, type Move, seatOfPiton } from '../engine'
import { buildLayout, destinationCell, cellMid, cellStart } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'
import { Trajectories } from './Trajectories'
import { DieFace } from './DieFace'
import { GearIcon } from './GearIcon'
import { BoardTitle } from './BoardTitle'
import { NoticeRow } from './NoticeRow'
import { PROMPT, WIN, OPTIONS, TEAM, type Notice } from './strings'
import { GLYPHS, type Glyph } from './glyphs'
import type { TurnEntry, PlayerStats, CompletedTurn } from './useGame'
import { NewGameModal, type GameSetup } from './NewGameModal'
import { OptionsMenu } from './OptionsMenu'
import { StatsModal } from './StatsModal'
import { LogModal } from './LogModal'
import type { StrategyId } from '../ai/strategy'
import {
  PLAYER_HEX,
  boardThemeVars,
  CTRL_SCALE,
  CTRL_SIZE,
  CTRL_X,
  CTRL_Y,
  GEAR_SHARE,
  GEAR_COLOR,
  CTRL_BORDER_COLOR,
  DIE_SIZE,
  WIN_PANEL_BG,
  WIN_WINDOW_SIZE,
  NOTICE_TEXT_SIZE,
  NOTICE_OFFSET_X,
  NOTICE_OFFSET_Y,
  NOTICE_WIDTH,
  NOTICE_MAX_LINES,
  NOTICE_DEBUG_OUTLINE,
  NOTICE_FONT_PX,
  NOTICE_LINE_HEIGHT,
  MOVE_TARGET_R,
  MOVE_TARGET_STROKE_W,
  CAPTURE_TARGET_R,
  CAPTURE_TARGET_STROKE_W,
  HOME_TARGET_R,
  HOME_TARGET_STROKE_W,
} from './theme'

interface Props {
  state: GameState
  moves: Move[]
  /** Die face to display — resolved by the roll sequencer (spin → settle). */
  face: number
  /** True while a roll is animating; the die is non-interactive then. */
  rolling: boolean
  /** Per-seat turn log (indexed by player): the sub-turns each seat completed,
   *  shown as stacked die+notice rows in that player's nest until their turn comes
   *  round again. See useGame.GameView. */
  log: TurnEntry[][]
  /** Per-seat running tally for the whole game (indexed by player) — shown in the
   *  Game stats window, opened from the win popup or the Options menu. */
  stats: PlayerStats[]
  /** Append-only full-game history (every completed turn, oldest first) — shown in
   *  the Game log window, opened from the Options menu. */
  history: CompletedTurn[]
  /** The seats a human controls (the rest are AI) — passed through to pre-fill
   *  the New Game setup window's per-seat type toggles. */
  humanSeats: number[]
  /** Each seat's AI difficulty (seat-indexed) — pre-fills the New Game window's
   *  per-seat strategy pickers. */
  seatStrategies: StrategyId[]
  onPick: (move: Move) => void
  /** Apply a new game from the setup window: per-seat colours + which seats are
   *  human. Fired only when the player presses "Start game". */
  onNewGame: (setup: GameSetup) => void
  onRoll: () => void
  /** Open the dev-tools panel — fired by the Dev tools row of the Options menu.
   *  GameBoard keeps no dependency on the dev tooling itself (App owns the panel);
   *  this just signals App to mount it. */
  onOpenDev: () => void
}

// In-board HTML chrome (the Options gear button, per-nest notices) lives in the
// SVG via foreignObject, authored at natural px then scaled into board units — so
// it reuses the page's .pill / .nest-notice styling rather than re-expressing it
// in viewBox units. (The die is the exception: native SVG drawn directly in board
// units — see DieFace.) The corner chrome (title, Options) is centred
// horizontally on its corner's nest cluster (see nestX in the body) and
// vertically inset from the board edge by CTRL_Y (and nudged by CTRL_X). The
// single Options gear button (a square CTRL_SIZE px) is the one way into the
// game's options:
// it opens OptionsMenu — a plain DOM overlay OVER the board (NOT inside this SVG;
// iOS Safari mis-centres foreignObject content — see cross-platform-ui.md + the
// overlay blocks at the end of the return) — whose rows open the New Game setup
// window and the Dev tools panel.
//
// Every size knob this file draws with — title, chrome, die, the move rings, and
// the notices — lives in theme.ts (GEOMETRY).

// Notices and the New Game button are both shrunk HTML, but with INDEPENDENT
// scales so tuning one never touches the other. The button uses CTRL_SCALE; a
// notice uses `noticeScale`, derived so its text lands at NOTICE_TEXT_SIZE board
// units (the px font it's built at, NOTICE_FONT_PX, cancels out — it only affects
// crispness).
const noticeScale = NOTICE_TEXT_SIZE / NOTICE_FONT_PX
// The invisible box the text sits in, in the px space it's built at (the <g> below
// scales it to board units). Both dimensions are DERIVED from the theme knobs, so
// tuning is math-free: width is NOTICE_WIDTH squares converted back to px; height
// is exactly NOTICE_MAX_LINES whole lines tall, so overflow always clips on a line
// boundary (never a half-line sliver).
const NEST_NOTICE_W = NOTICE_WIDTH / noticeScale
const NEST_NOTICE_H = NOTICE_MAX_LINES * NOTICE_FONT_PX * NOTICE_LINE_HEIGHT

export function GameBoard({
  state,
  moves,
  face,
  rolling,
  log,
  stats,
  history,
  humanSeats,
  seatStrategies,
  onPick,
  onNewGame,
  onRoll,
  onOpenDev,
}: Props) {
  const layout = useMemo(
    () => buildLayout(state.geometry, state.players.length),
    [state.geometry, state.players.length],
  )

  // Options menu + New Game setup window (view-local state, no rules). The gear
  // button opens the Options menu; its rows open the New Game window (setupOpen)
  // or signal App to mount the Dev panel (onOpenDev). Nothing touches the live
  // game until the player presses "Start game" in the New Game window.
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  // The Game stats window — opened from the win popup or the Options menu, closed
  // by its own Close button. Independent of the win popup's dismissed state, so it
  // can be reopened any time during a game.
  const [statsOpen, setStatsOpen] = useState(false)
  // The Game log window — the full per-turn history, opened from the Options menu,
  // closed by its own Close button. Independent of the other windows.
  const [logOpen, setLogOpen] = useState(false)
  // The Options gear is a single square button, so its box is just CTRL_SIZE.
  const ctrlW = CTRL_SIZE

  // Each corner's chrome centres horizontally on that corner's nest cluster,
  // read straight from the layout (no re-derived geometry). Corner→nest mapping
  // per BoardLayout.nestCentres: [1] top-left, [0] top-right, [2] bottom-left,
  // [3] bottom-right. Vertical anchoring is unchanged — title hugs the top; only
  // X is centred. (Per-nest notices anchor themselves separately — see below.)
  // A foreignObject box is centred by offsetting its left edge half its scaled
  // width left of the nest centre (the inner flex is justify-content:center).
  const nestX = (corner: number) => layout.nestCentres[corner].cx
  const titleX = nestX(1)
  const ctrlX = nestX(0) - (ctrlW * CTRL_SCALE) / 2 + CTRL_X
  // The die sits at the dead centre of the board, over the HOME area — rolling is
  // the core gameplay act, so it earns the middle (see this session's decision).
  // Painted last (below) so it sits on top of any finished pitons; the HOME-bound
  // move-target ring is painted after it again, so that stays clickable on top.
  const dieCentre = layout.extent / 2
  // Clicks roll only when it's roll time and no roll is already animating.
  const canRoll = state.phase === 'awaiting-roll' && !rolling
  const dieColor = PLAYER_HEX[state.players[state.turn].color]
  // Die feedback: when a roll is pending the white face flashes toward the
  // player's light tint to invite the tap; once the roll is done and the die
  // isn't actionable (awaiting a move, or game over) it dims. It stays plain —
  // full opacity, no flash — while a roll is animating.
  const dieClass = canRoll
    ? 'board-die board-die-ready'
    : rolling
      ? 'board-die'
      : 'board-die board-die-idle'
  const over = state.phase === 'game-over'

  // Win popup: shown over the board centre at game-over, dismissed on click. We
  // remember the exact game-over state we dismissed (reference equality) so the
  // popup stays gone for this game but re-arms on the next win — a new game is a
  // fresh state object, and a finished game never mutates again.
  const [dismissedWin, setDismissedWin] = useState<GameState | null>(null)
  const showWin = over && state.winner != null && dismissedWin !== state

  // The winning seat, for the special win styling (state.winner is a colour, not
  // an index; -1 when no win). Only this nest gets the win look at game-over —
  // other seats may still show a lingering past-turn line in the quiet style.
  const winnerSeat =
    over && state.winner != null
      ? state.players.findIndex((pl) => pl.color === state.winner)
      : -1
  // 2v2 vs free-for-all: a team game is one where two seats share a team id. The
  // win popup announces the winning *team* (the winner's team) and lists its two
  // members' colours; a free-for-all keeps the single-colour banner.
  const isTeamGame = new Set(state.teams).size < state.teams.length
  const winTeam = winnerSeat >= 0 ? state.teams[winnerSeat] : -1
  const winMembers = state.players.filter((_, i) => state.teams[i] === winTeam)
  // Anchor the notice at the BOTTOM of the player's corner quadrant — the washed
  // area the nest sits in (same bounds as Board's whose-turn wash) — so it always
  // clears the nest's holes/box. Centred horizontally on the nest cluster, then
  // nudged by the NOTICE_OFFSET_* knobs (Y up from the quadrant's lower edge).
  const nestNotice = (p: number) => {
    const slots = layout.nestSlots[p]
    const cx = slots.reduce((a, s) => a + s.cx, 0) / slots.length
    const cy = slots.reduce((a, s) => a + s.cy, 0) / slots.length
    const { row: cr } = layout.homeCell
    const onTop = cy < cellMid(cr, layout)
    const qy1 = onTop ? cellStart(cr - 1, layout) : layout.extent
    const boxH = NEST_NOTICE_H * noticeScale
    const x = cx - (NEST_NOTICE_W * noticeScale) / 2 + NOTICE_OFFSET_X
    const y = qy1 - boxH - NOTICE_OFFSET_Y
    return { x, y }
  }

  // The rows to draw in seat p's nest, oldest first: one per logged sub-turn (its
  // die + outcome notice), plus a trailing prompt row for the current player. The
  // prompt row carries a die too — a "Roll" label before they roll, the rolled
  // pips while they pick — so every row has a die and their text lines up. Empty ⇒
  // nothing to draw. The CSS column packs rows to the bottom (newest nearest the
  // nest) and clips the oldest off the top if they overflow the box.
  // `current` marks the live row — the one the prompt sits on this sub-turn — so
  // the render can centre it on the nest while finished rows stay left-aligned.
  type NestRow = { die: number | null; glyph: Glyph | null; content: Notice | string; current?: boolean }
  const nestRows = (p: number): NestRow[] => {
    const rows: NestRow[] = log[p].map((e) => ({ die: e.die, glyph: null, content: e.notice }))
    if (!over && p === state.turn) {
      if (state.phase === 'awaiting-roll') {
        // "Roll again" (vs "Your turn!") whenever this seat already has finished
        // sub-turns this turn — i.e. it's a bonus roll off a 6, not the first
        // roll. So "roll again" shows only on the live row, never on the rows
        // above it. (The log is wiped at handover, so a non-empty log here always
        // means the streak is still the same seat's.) The die shows a big single
        // glyph (GLYPHS.glyph, "!") — the word "Roll" is illegible at notice size.
        const bonus = log[p].length > 0
        rows.push({
          die: null,
          glyph: GLYPHS.glyph,
          content: bonus ? PROMPT.rollAgain : PROMPT.awaitingRoll,
          current: true,
        })
      } else if (state.phase === 'awaiting-move') {
        rows.push({ die: state.lastRoll, glyph: null, content: PROMPT.awaitingMove, current: true })
      }
    }
    return rows
  }

  return (
    <>
    <svg
      className="game-board"
      viewBox={`0 0 ${layout.extent} ${layout.extent}`}
      role="img"
      aria-label="jeu de piton board"
      // Colour knobs the CSS animations read (flash tint/cadence, wash, pulse),
      // derived from the acting player's hue. Set once here; inherited by every
      // animated descendant. Single source: theme.ts.
      style={boardThemeVars(dieColor) as CSSProperties}
    >
      <Board state={state} layout={layout} />

      {/* Game title, baked into the board's top-left corner so it scales with
          the board and needs no chrome outside it. A small "Pitons" wordmark
          (the "i" is a pawn, the "o" a die) — see BoardTitle. Non-interactive. */}
      <BoardTitle cx={titleX} />

      {/* Options button, top-right — a single gear that is the one way into the
          game's options. It opens the Options menu (New game, Dev tools, …) over
          the board. A real HTML button mounted in the SVG via foreignObject,
          rendered at natural px and scaled into board units so it reuses .pill
          styling and stays accessible. */}
      <g transform={`translate(${ctrlX}, ${CTRL_Y}) scale(${CTRL_SCALE})`}>
        <foreignObject x={0} y={0} width={ctrlW} height={CTRL_SIZE}>
          <div className="board-controls">
            <button
              type="button"
              className={optionsOpen ? 'pill pill-icon pill-on' : 'pill pill-icon'}
              aria-haspopup="dialog"
              aria-expanded={optionsOpen}
              aria-label={OPTIONS.button}
              title={OPTIONS.button}
              onClick={() => setOptionsOpen(true)}
              // Size + look from theme knobs (the button is a square CTRL_SIZE px;
              // the gear takes GEAR_SHARE of that, the rest is padding). The gear
              // inherits `color` via currentColor; the border reads --ctrl-border.
              style={
                {
                  width: `${CTRL_SIZE}px`,
                  height: `${CTRL_SIZE}px`,
                  color: GEAR_COLOR,
                  '--ctrl-border': CTRL_BORDER_COLOR,
                } as CSSProperties
              }
            >
              <GearIcon
                className="pill-gear"
                style={{ width: `${CTRL_SIZE * GEAR_SHARE}px`, height: `${CTRL_SIZE * GEAR_SHARE}px` }}
              />
            </button>
          </div>
        </foreignObject>
      </g>

      {/* Per-nest turn log: each player's corner shows its own stacked sub-turn
          rows (a small die + its outcome notice), the current player's nest
          ending in the live turn prompt. One foreignObject per nest holds a flex
          column of rows; the inline die scales with the text. Click-through so it
          never swallows board clicks. */}
      {state.players.map((_, p) => {
        const rows = nestRows(p)
        if (rows.length === 0) return null
        const { x, y } = nestNotice(p)
        // Colour by WHOSE nest this is, not by what the rows say: the current
        // player (state.turn) gets the visible colour, anyone showing lingering
        // past-turn rows gets the quiet one. A player on a 6-streak stays
        // `state.turn`, so their rows stay "current". The winner is the one
        // exception — only their nest gets the win look at game-over.
        const cls =
          p === winnerSeat
            ? 'nest-notice nest-notice-win'
            : p === state.turn
              ? 'nest-notice nest-notice-current'
              : 'nest-notice nest-notice-previous'
        const dieColor = PLAYER_HEX[state.players[p].color]
        return (
          <g
            key={`notice-${p}`}
            transform={`translate(${x}, ${y}) scale(${noticeScale})`}
          >
            <foreignObject x={0} y={0} width={NEST_NOTICE_W} height={NEST_NOTICE_H}>
              <div className={cls} role="status" aria-live="polite">
                {rows.map((row, ri) => (
                  <NoticeRow
                    key={ri}
                    die={row.die}
                    glyph={row.glyph}
                    content={row.content}
                    current={row.current}
                    dieColor={dieColor}
                  />
                ))}
              </div>
            </foreignObject>
            {/* Dev knob: trace the box the rows sit in so its extents are visible
                while tuning the notice knobs. Same units as the foreignObject, so
                it scales with it. */}
            {NOTICE_DEBUG_OUTLINE && (
              <rect
                x={0}
                y={0}
                width={NEST_NOTICE_W}
                height={NEST_NOTICE_H}
                fill="rgba(255, 0, 255, 0.08)"
                stroke="#ff00ff"
                strokeWidth={1}
                pointerEvents="none"
              />
            )}
          </g>
        )
      })}

      {/* Dashed move-trajectory lines (live preview + persisted history) — drawn
          UNDER the pitons/rings/die as a background guide. Non-interactive; gated
          by the two TRAJECTORY bools in theme.ts. */}
      <Trajectories state={state} layout={layout} moves={moves} log={log} />

      <Pitons state={state} layout={layout} moves={moves} onPick={onPick} />

      {/* The die, dead centre over HOME — painted after Pitons so it sits on top
          of any finished pitons clustered in the corners. Drawn natively in board
          units (DieFace), tinted to the acting player's colour like the nests.
          The whole face is the roll button: tap it to roll when it's roll time.
          The move-target markers are painted *after* this (below) so a HOME-bound
          target stays visible and clickable on top of the die. */}
      <g
        className={dieClass}
        onClick={canRoll ? onRoll : undefined}
        role="button"
        aria-label={rolling ? 'rolling the die' : canRoll ? 'roll the die' : `die showing ${face}`}
      >
        <DieFace
          value={face}
          cx={dieCentre}
          cy={dieCentre}
          size={DIE_SIZE}
          color={dieColor}
          label={canRoll ? GLYPHS.roll : undefined}
        />
      </g>

      {/* legal-move target markers — a tinted ring on each destination cell, in
          the moving player's colour (via currentColor). Painted LAST so every
          target sits on top of the pieces and the centred dice — in particular a
          HOME-bound target lands over the die, where it must stay obvious and
          clickable to finish a piton. */}
      <g className="move-targets" style={{ color: PLAYER_HEX[state.players[state.turn].color] }}>
        {moves.map((m, i) => {
          // The ring sits on the OWNER's lane/home — which is the partner's arm,
          // not the clock's, when a finished 2v2 seat plays a partner's piton.
          const cell = destinationCell(m.to, seatOfPiton(state, m.pitonId), layout)
          // A HOME-bound move is the big prize — flag it with a larger, bolder,
          // pulsing marker so players don't miss the chance to finish a piton.
          const home = m.to.kind === 'finished'
          // A capture's target square IS the enemy's, so this ring lands on them:
          // enlarge it and let it pulse (in sync with the capturing piton's halo —
          // both start when moves appear) as the "you can take this" cue.
          const capture = m.captures != null
          const cls = home
            ? 'move-target move-target-home'
            : capture
              ? 'move-target move-target-capture'
              : 'move-target'
          const r = home ? HOME_TARGET_R : capture ? CAPTURE_TARGET_R : MOVE_TARGET_R
          const strokeWidth = home
            ? HOME_TARGET_STROKE_W
            : capture
              ? CAPTURE_TARGET_STROKE_W
              : MOVE_TARGET_STROKE_W
          return (
            <circle
              key={`target-${i}`}
              className={cls}
              cx={cellMid(cell.col, layout)}
              cy={cellMid(cell.row, layout)}
              r={r}
              strokeWidth={strokeWidth}
              onClick={() => onPick(m)}
            />
          )
        })}
      </g>

    </svg>

    {/* Win popup + New Game window are plain DOM overlays layered OVER the board,
        not HTML inside the SVG — iOS Safari mis-centres foreignObject content (see
        cross-platform-ui.md). Each is a viewport-fixed, flex-centred layer; their
        open state (dismissedWin / setupOpen) still lives here in GameBoard. */}

    {/* Win popup — a content-sized panel announcing the winner. The overlay is
        click-through, so the New Game button on the board behind it stays live;
        tap the panel (away from the Game stats button) to dismiss and inspect the
        final board. The panel is a div, not a button, so it can hold its own
        button — the stats button stops the click from also dismissing. */}
    {showWin && state.winner != null && (
      <div className="win-overlay">
        <div
          className="win-panel"
          onClick={() => setDismissedWin(state)}
          // Two looks, by game type: a free-for-all tints the panel (border, headline,
          // stats button) in the winner's hue via --win-color; a 2v2 leaves --win-color
          // unset so the CSS falls back to the neutral window palette, and only the two
          // team members' names below carry colour.
          style={
            {
              ...(isTeamGame ? {} : { '--win-color': PLAYER_HEX[state.winner] }),
              '--win-bg': WIN_PANEL_BG,
              fontSize: `${WIN_WINDOW_SIZE}vmin`,
            } as CSSProperties
          }
        >
          <span>
            {isTeamGame ? WIN.teamBanner(TEAM.name(winTeam)) : WIN.banner(state.winner)}
          </span>
          {/* 2v2: the winning team's two members, each in its own colour, under the
              team headline. (Free-for-all already names the colour in the banner.) */}
          {isTeamGame && (
            <span className="win-team">
              {winMembers.map((m, i) => (
                <Fragment key={m.color}>
                  {i > 0 && <span className="win-team-sep"> · </span>}
                  <span style={{ color: PLAYER_HEX[m.color] }}>
                    {m.color.charAt(0).toUpperCase() + m.color.slice(1)}
                  </span>
                </Fragment>
              ))}
            </span>
          )}
          <button
            type="button"
            className="win-stats"
            onClick={(e) => {
              e.stopPropagation()
              setStatsOpen(true)
            }}
          >
            {OPTIONS.stats}
          </button>
          <span className="win-hint">{WIN.hint}</span>
        </div>
      </div>
    )}

    {/* Options menu — the single window the gear button opens; its rows launch
        each option's own window. A DOM overlay (scrim) like the New Game window;
        its rows close it as they open the next window (New Game) or signal App to
        mount the Dev panel. */}
    {optionsOpen && (
      <div className="options-overlay">
        <OptionsMenu
          onNewGame={() => {
            setOptionsOpen(false)
            setSetupOpen(true)
          }}
          onStats={() => {
            setOptionsOpen(false)
            setStatsOpen(true)
          }}
          onLog={() => {
            setOptionsOpen(false)
            setLogOpen(true)
          }}
          onDev={() => {
            setOptionsOpen(false)
            onOpenDev()
          }}
          onClose={() => setOptionsOpen(false)}
        />
      </div>
    )}

    {/* Game stats window — a per-player scoreboard, opened from the win popup or
        the Options menu. A DOM overlay (scrim) like the others; its Close button
        is the only way out, so it can sit over the win popup and return to it. */}
    {statsOpen && (
      <div className="stats-overlay">
        <StatsModal state={state} stats={stats} onClose={() => setStatsOpen(false)} />
      </div>
    )}

    {/* Game log window — the full per-turn history (round → player → that seat's
        finished notice stack), opened from the Options menu. A DOM overlay (scrim)
        like the others; its own Close button is the only way out. */}
    {logOpen && (
      <div className="log-overlay">
        <LogModal state={state} history={history} onClose={() => setLogOpen(false)} />
      </div>
    )}

    {/* New Game setup window — its scrim overlay sits above the win popup, so you
        can start a fresh game from the win screen. Cancel/Start both close it;
        only Start applies the draft. */}
    {setupOpen && (
      <div className="setup-overlay">
        <NewGameModal
          colors={state.players.map((p) => p.color)}
          humanSeats={humanSeats}
          strategies={seatStrategies}
          teams={state.teams}
          partnersAreAllies={state.partnersAreAllies}
          onCancel={() => setSetupOpen(false)}
          onStart={(setup) => {
            onNewGame(setup)
            setSetupOpen(false)
          }}
        />
      </div>
    )}
    </>
  )
}
