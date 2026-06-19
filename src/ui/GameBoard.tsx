/**
 * Composes the board: builds the screen layout from the engine geometry (once
 * per game) and renders, inside a single SVG whose `viewBox` is the cell grid,
 * the static <Board>, the legal-move target markers, the <Pitons> overlay, and
 * all of the game's chrome — title, New Game controls, dice, and the per-nest
 * notices — overlaid in the four corners (see the 2026-06-13 decision: the board
 * is self-contained, no UI outside it). Each notice sits in the corner of the
 * player it concerns: the event line in the acting player's nest, the turn
 * prompt in the current player's. This is the interaction-loop seam (Milestone
 * 4): it takes the current player's `legalMoves` / die `face` + `rolling` /
 * `notice` / `noticeOwner` and the `onPick` / `onRoll` / `onNewGame` callbacks; it adds no
 * rules of its own (every decision is the engine's, made in App).
 */
import { useMemo, useState, type CSSProperties } from 'react'
import type { GameState, Move } from '../engine'
import { buildLayout, destinationCell, cellMid, cellStart } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'
import { DieFace } from './DieFace'
import { TITLE, PROMPT, DIE, WIN, type Notice } from './strings'
import {
  PLAYER_HEX,
  boardThemeVars,
  CTRL_SCALE,
  CTRL_W_CLOSED,
  CTRL_W_OPEN,
  CTRL_H,
  CTRL_INSET,
  DIE_SIZE,
  NEST_LAST_ROLL_DIE,
  NEST_LAST_ROLL_DIE_OFFSET_X,
  NEST_LAST_ROLL_DIE_OFFSET_Y,
  NEST_WASH_INSET,
  WIN_PANEL_BG,
  WIN_TEXT_SIZE,
  NOTICE_TEXT_SIZE,
  NOTICE_OFFSET_X,
  NOTICE_OFFSET_Y,
  NOTICE_WIDTH,
  NOTICE_MAX_LINES,
  NOTICE_DEBUG_OUTLINE,
  NOTICE_FONT_PX,
  NOTICE_LINE_HEIGHT,
  TITLE_FONT_SIZE,
  TITLE_TOP,
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
  notice: Notice | null
  /** Player the notice is about (defaults to the current player if omitted). */
  noticeOwner?: number | null
  /** The held die value (last roll), shown as a small die in the roller's nest
   *  once the turn has moved on. Differs from `face`, which carries the spin. */
  rolled: number | null
  /** Which player rolled `rolled` (see useGame.GameView.rolledBy). */
  rolledBy?: number | null
  onPick: (move: Move) => void
  onNewGame: (playerCount: number) => void
  /** Escape hatch: force the turn to the next player to unstick a wedged game.
   *  Sits behind the New Game disclosure so it can't be hit during normal play. */
  onForceNextTurn: () => void
  onRoll: () => void
}

// In-board HTML chrome (New Game controls, per-nest notices) lives in the SVG
// via foreignObject, authored at natural px then scaled into board units — so it
// reuses the page's .pill / .nest-notice styling rather than re-expressing it in
// viewBox units. (The die is the exception: native SVG drawn directly in board
// units — see DieFace.) The corner chrome (title, New Game) is centred
// horizontally on its corner's nest cluster (see nestX in the body) and
// vertically inset from the board edge by CTRL_INSET. New Game is a disclosure:
// the box widens (CTRL_W_CLOSED→CTRL_W_OPEN) so the 2/3/4 picker fits, growing
// symmetrically about the nest centre.
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
  notice,
  noticeOwner,
  rolled,
  rolledBy,
  onPick,
  onNewGame,
  onForceNextTurn,
  onRoll,
}: Props) {
  const layout = useMemo(
    () => buildLayout(state.geometry, state.players.length),
    [state.geometry, state.players.length],
  )

  // New Game picker disclosure (view-local state, no rules): collapsed to a
  // single toggle until the player opens it; choosing a count collapses it.
  const [pickerOpen, setPickerOpen] = useState(false)
  const ctrlW = pickerOpen ? CTRL_W_OPEN : CTRL_W_CLOSED

  // Each corner's chrome centres horizontally on that corner's nest cluster,
  // read straight from the layout (no re-derived geometry). Corner→nest mapping
  // per BoardLayout.nestCentres: [1] top-left, [0] top-right, [2] bottom-left,
  // [3] bottom-right. Vertical anchoring is unchanged — title hugs the top; only
  // X is centred. (Per-nest notices anchor themselves separately — see below.)
  // A foreignObject box is centred by offsetting its left edge half its scaled
  // width left of the nest centre (the inner flex is justify-content:center).
  const nestX = (corner: number) => layout.nestCentres[corner].cx
  const titleX = nestX(1)
  const ctrlX = nestX(0) - (ctrlW * CTRL_SCALE) / 2
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

  // Per-nest notices: each message sits in the corner of the player it concerns.
  // The *event* line (what just happened) belongs to the player who acted —
  // `noticeOwner`, falling back to the current player for dev-loaded notices; the
  // *turn prompt* belongs to whoever is now to act. When the same player owns
  // both (e.g. a bonus 6 keeps the turn), the event line wins — it's the more
  // specific message. Each nest therefore shows at most one line.
  const eventOwner = notice == null ? null : noticeOwner ?? state.turn
  const prompt =
    state.phase === 'awaiting-roll'
      ? PROMPT.awaitingRoll
      : state.phase === 'awaiting-move'
        ? PROMPT.awaitingMove
        : null
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

  // The last completed roll, shown as a small die in the roller's nest. Shown
  // whenever the centre die isn't already showing that value as pips: once the
  // turn has moved on, OR when the roller kept the turn and is back to rolling
  // (a 6 — `awaiting-roll`, centre now showing the "Roll" prompt) where it backs
  // up the "Roll again" notice. While the roller is mid-move (`awaiting-move`,
  // centre showing the pips) it stays hidden, so the value never appears twice.
  // The value is the held `rolled` (not `face`, which carries the spin). It's
  // left-aligned to the roller's whose-turn highlight quadrant (same left edge as
  // Board's wash) and sits on the notice's vertical line — far enough left that it
  // clears the centred notice text without crowding it.
  const lastRollMark =
    rolled != null &&
    rolledBy != null &&
    (rolledBy !== state.turn || state.phase === 'awaiting-roll')
      ? (() => {
          const { y } = nestNotice(rolledBy)
          // The notice text bottom-aligns in its band (CSS .nest-notice
          // align-items: flex-end), so its line sits at the band's bottom edge.
          // Centre the die on that line (one text line tall, line-height 1.25),
          // then apply the fine vertical nudge knob.
          const bandBottom = y + NEST_NOTICE_H * noticeScale
          const textCentreY = bandBottom - (NOTICE_TEXT_SIZE * 1.25) / 2
          const slots = layout.nestSlots[rolledBy]
          const clusterCx = slots.reduce((a, s) => a + s.cx, 0) / slots.length
          const onLeft = clusterCx < cellMid(layout.homeCell.col, layout)
          const washLeft =
            (onLeft ? 0 : cellStart(layout.homeCell.col + 2, layout)) + NEST_WASH_INSET
          return {
            value: rolled,
            cx: washLeft + NEST_LAST_ROLL_DIE_OFFSET_X + NEST_LAST_ROLL_DIE / 2,
            cy: textCentreY + NEST_LAST_ROLL_DIE_OFFSET_Y,
            color: PLAYER_HEX[state.players[rolledBy].color],
          }
        })()
      : null

  return (
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
          the board and needs no chrome outside it. Non-interactive. */}
      <text
        className="board-title"
        x={titleX}
        y={TITLE_TOP}
        fontSize={TITLE_FONT_SIZE}
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        {TITLE}
      </text>

      {/* New Game, top-right — a disclosure: the "New game" toggle alone until
          opened, then the 2/3/4 picker (choosing collapses it). Real HTML
          buttons mounted in the SVG via foreignObject, rendered at natural px
          and scaled into board units so they reuse .pill styling and stay
          accessible. */}
      <g transform={`translate(${ctrlX}, ${CTRL_INSET}) scale(${CTRL_SCALE})`}>
        <foreignObject x={0} y={0} width={ctrlW} height={CTRL_H}>
          <div
            className="board-controls"
            role="group"
            aria-label="new game — player count"
          >
            <button
              type="button"
              className={pickerOpen ? 'pill pill-on' : 'pill'}
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
            >
              New game
            </button>
            {pickerOpen &&
              [2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={
                    n === state.players.length ? 'pill pill-on' : 'pill'
                  }
                  aria-pressed={n === state.players.length}
                  onClick={() => {
                    onNewGame(n)
                    setPickerOpen(false)
                  }}
                >
                  {n}
                </button>
              ))}
            {/* Escape hatch, right of the count picker: force the turn on to
                unstick a wedged game. Tucked behind the New Game disclosure (and
                styled apart from the count pills) so it's never a play-time
                mis-tap. See the stuck-turn bug in the STATUS backlog. */}
            {pickerOpen && (
              <button
                type="button"
                className="pill pill-skip"
                aria-label="force the turn to the next player (unstick a wedged game)"
                onClick={() => {
                  onForceNextTurn()
                  setPickerOpen(false)
                }}
              >
                Skip turn
              </button>
            )}
          </div>
        </foreignObject>
      </g>

      {/* Per-nest notices: each player's corner shows the message that concerns
          them — the event line in the acting player's nest, the turn prompt in
          the current player's nest (event wins if one player owns both). Terse
          text via foreignObject; click-through so it never swallows board clicks. */}
      {state.players.map((_, p) => {
        const isEvent = p === eventOwner
        // The event line is a coloured-segment Notice; the turn prompt is plain
        // text. Both render in the same band — pick whichever this nest owns.
        const content = isEvent ? notice : p === state.turn ? prompt : null
        if (!content) return null
        const { x, y } = nestNotice(p)
        // Colour by WHOSE nest this is, not by the kind of message: the current
        // player (state.turn) gets the visible colour, the player who acted last
        // turn gets the quiet one. A player on a 6-streak stays `state.turn`, so
        // their line stays "current". The won game is the one exception.
        const cls =
          isEvent && over
            ? 'nest-notice nest-notice-win'
            : p === state.turn
              ? 'nest-notice nest-notice-current'
              : 'nest-notice nest-notice-previous'
        return (
          <g
            key={`notice-${p}`}
            transform={`translate(${x}, ${y}) scale(${noticeScale})`}
          >
            <foreignObject x={0} y={0} width={NEST_NOTICE_W} height={NEST_NOTICE_H}>
              <div className={cls} role="status" aria-live="polite">
                {/* One inner span so the flex container centres a SINGLE item: the
                    tinted runs then flow as inline text (spaces + wrapping intact)
                    instead of each segment becoming its own flex item. */}
                <span>
                  {typeof content === 'string'
                    ? content
                    : content.map((seg, i) => (
                        <span
                          key={i}
                          style={seg.color ? { color: PLAYER_HEX[seg.color] } : undefined}
                        >
                          {seg.text}
                        </span>
                      ))}
                </span>
              </div>
            </foreignObject>
            {/* Dev knob: trace the box the text sits in so its extents are
                visible while tuning the notice knobs. Same units as the
                foreignObject, so it scales with it. */}
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

      {/* The last completed roll, as a small die in the roller's nest (left of
          their notice) — shown only once the turn has moved on, so it never
          duplicates the centre die the roller was reading while they acted. */}
      {lastRollMark && (
        <DieFace
          value={lastRollMark.value}
          cx={lastRollMark.cx}
          cy={lastRollMark.cy}
          size={NEST_LAST_ROLL_DIE}
          color={lastRollMark.color}
        />
      )}

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
          label={canRoll ? DIE.rollPrompt : undefined}
        />
      </g>

      {/* legal-move target markers — a tinted ring on each destination cell, in
          the moving player's colour (via currentColor). Painted LAST so every
          target sits on top of the pieces and the centred dice — in particular a
          HOME-bound target lands over the die, where it must stay obvious and
          clickable to finish a piton. */}
      <g className="move-targets" style={{ color: PLAYER_HEX[state.players[state.turn].color] }}>
        {moves.map((m, i) => {
          const cell = destinationCell(m.to, state.turn, layout)
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

      {/* Win popup — painted last so it sits on top of everything. A content-
          sized panel centred over the board (the full-board foreignObject is just
          a centring frame; it's click-through, so the New Game button behind it
          stays live). Tap the panel to dismiss and inspect the final board. */}
      {showWin && state.winner != null && (
        <foreignObject x={0} y={0} width={layout.extent} height={layout.extent}>
          <div className="win-overlay">
            <button
              type="button"
              className="win-panel"
              onClick={() => setDismissedWin(state)}
              style={
                {
                  '--win-color': PLAYER_HEX[state.winner],
                  '--win-bg': WIN_PANEL_BG,
                  fontSize: WIN_TEXT_SIZE,
                } as CSSProperties
              }
            >
              <span>{WIN.banner(state.winner)}</span>
              <span className="win-hint">{WIN.hint}</span>
            </button>
          </div>
        </foreignObject>
      )}
    </svg>
  )
}
