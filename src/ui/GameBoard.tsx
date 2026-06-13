/**
 * Composes the board: builds the screen layout from the engine geometry (once
 * per game) and renders, inside a single SVG whose `viewBox` is the cell grid,
 * the static <Board>, the legal-move target markers, the <Pitons> overlay, and
 * all of the game's chrome — title, New Game controls, dice, and the per-nest
 * notices — overlaid in the four corners (see the 2026-06-13 decision: the board
 * is self-contained, no UI outside it). Each notice sits in the corner of the
 * player it concerns: the event line in the acting player's nest, the turn
 * prompt in the current player's. This is the interaction-loop seam (Milestone
 * 4): it takes the current player's `legalMoves` / `rolled` / `notice` /
 * `noticeOwner` and the `onPick` / `onRoll` / `onNewGame` callbacks; it adds no
 * rules of its own (every decision is the engine's, made in App).
 */
import { useMemo, useState } from 'react'
import type { GameState, Move } from '../engine'
import { buildLayout, destinationCell, cellMid, cellStart } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'
import { DieFace } from './DieFace'
import { PLAYER_HEX } from './colors'

interface Props {
  state: GameState
  moves: Move[]
  rolled: number | null
  notice: string | null
  /** Player the notice is about (defaults to the current player if omitted). */
  noticeOwner?: number | null
  onPick: (move: Move) => void
  onNewGame: (playerCount: number) => void
  onRoll: () => void
}

// In-board HTML chrome (New Game controls, dice, per-nest notices) lives in the
// SVG via foreignObject, authored at natural px then scaled into board units —
// so it reuses the page's .pill / .die / .nest-notice styling rather than
// re-expressing it in viewBox units. The corner chrome (title, New Game) is
// centred horizontally on its corner's nest cluster (see nestX in the body) and
// vertically inset from the board edge by CTRL_INSET.
const CTRL_SCALE = 0.019
// New Game is a disclosure: a single "New game" toggle when collapsed, the
// toggle plus the 2/3/4 picker when open. The box widens when open so the
// content always fits; either way it's centred on the nest, so it grows
// symmetrically about the nest centre.
const CTRL_W_CLOSED = 112
const CTRL_W_OPEN = 264
const CTRL_H = 52
const CTRL_INSET = 0.4
// The die is drawn natively in board units (see DieFace), centred over HOME. A
// touch under the 3×3 HOME band so it owns the centre without crowding the arms.
const DIE_SIZE = 2.0
// Per-nest notice: a short line tucked just inside a player's own corner nest,
// authored in px then scaled into board units like the other chrome. Narrow on
// purpose — messages are kept terse so they fit a corner without crowding it.
const NEST_NOTICE_W = 168
const NEST_NOTICE_H = 48
// Gap below the cluster's lowest hole before the notice line, in board units.
const NEST_NOTICE_GAP = 0.55

export function GameBoard({
  state,
  moves,
  rolled,
  notice,
  noticeOwner,
  onPick,
  onNewGame,
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
  const canRoll = state.phase === 'awaiting-roll'
  // Resting face shows the last value rolled; a fresh game (no roll yet) shows 1.
  const dieValue = rolled ?? 1
  const dieColor = PLAYER_HEX[state.players[state.turn].color]
  const over = state.phase === 'game-over'

  // Per-nest notices: each message sits in the corner of the player it concerns.
  // The *event* line (what just happened) belongs to the player who acted —
  // `noticeOwner`, falling back to the current player for dev-loaded notices; the
  // *turn prompt* belongs to whoever is now to act. When the same player owns
  // both (e.g. a bonus 6 keeps the turn), the event line wins — it's the more
  // specific message. Each nest therefore shows at most one line.
  const eventOwner = notice == null ? null : noticeOwner ?? state.turn
  const prompt =
    state.phase === 'awaiting-roll'
      ? 'Your turn'
      : state.phase === 'awaiting-move'
        ? 'Pick a piton'
        : null
  // Anchor the notice at the BOTTOM of the player's corner quadrant — the washed
  // area the nest sits in (same bounds as Board's whose-turn wash) — so it always
  // clears the nest's holes/box. Centred horizontally on the nest cluster, its
  // box dropped to the quadrant's lower edge, inset slightly so it isn't flush.
  const nestNotice = (p: number) => {
    const slots = layout.nestSlots[p]
    const cx = slots.reduce((a, s) => a + s.cx, 0) / slots.length
    const cy = slots.reduce((a, s) => a + s.cy, 0) / slots.length
    const { row: cr } = layout.homeCell
    const onTop = cy < cellMid(cr, layout)
    const qy1 = onTop ? cellStart(cr - 1, layout) : layout.extent
    const boxH = NEST_NOTICE_H * CTRL_SCALE
    const x = cx - (NEST_NOTICE_W * CTRL_SCALE) / 2
    const y = qy1 - boxH - NEST_NOTICE_GAP
    return { x, y }
  }

  return (
    <svg
      className="game-board"
      viewBox={`0 0 ${layout.extent} ${layout.extent}`}
      role="img"
      aria-label="jeu de piton board"
    >
      <Board state={state} layout={layout} />

      {/* Game title, baked into the board's top-left corner so it scales with
          the board and needs no chrome outside it. Non-interactive. */}
      <text
        className="board-title"
        x={titleX}
        y={0.5}
        fontSize={0.6}
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        Jeu de piton
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
          </div>
        </foreignObject>
      </g>

      {/* Per-nest notices: each player's corner shows the message that concerns
          them — the event line in the acting player's nest, the turn prompt in
          the current player's nest (event wins if one player owns both). Terse
          text via foreignObject; click-through so it never swallows board clicks. */}
      {state.players.map((_, p) => {
        const isEvent = p === eventOwner
        const text = isEvent ? notice : p === state.turn ? prompt : null
        if (!text) return null
        const { x, y } = nestNotice(p)
        const cls = isEvent
          ? over
            ? 'nest-notice nest-notice-win'
            : 'nest-notice'
          : 'nest-notice nest-notice-prompt'
        return (
          <g
            key={`notice-${p}`}
            transform={`translate(${x}, ${y}) scale(${CTRL_SCALE})`}
          >
            <foreignObject x={0} y={0} width={NEST_NOTICE_W} height={NEST_NOTICE_H}>
              <div className={cls} role="status" aria-live="polite">
                {text}
              </div>
            </foreignObject>
          </g>
        )
      })}

      <Pitons state={state} layout={layout} moves={moves} onPick={onPick} />

      {/* The die, dead centre over HOME — painted after Pitons so it sits on top
          of any finished pitons clustered in the corners. Drawn natively in board
          units (DieFace), tinted to the acting player's colour like the nests.
          The whole face is the roll button: tap it to roll when it's roll time.
          The move-target markers are painted *after* this (below) so a HOME-bound
          target stays visible and clickable on top of the die. */}
      <g
        onClick={canRoll ? onRoll : undefined}
        style={{ cursor: canRoll ? 'pointer' : 'default' }}
        role="button"
        aria-label={rolled ? `rolled ${rolled}, roll again` : 'roll the die'}
      >
        <DieFace value={dieValue} cx={dieCentre} cy={dieCentre} size={DIE_SIZE} color={dieColor} />
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
          return (
            <circle
              key={`target-${i}`}
              className={home ? 'move-target move-target-home' : 'move-target'}
              cx={cellMid(cell.col, layout)}
              cy={cellMid(cell.row, layout)}
              r={home ? 0.85 : 0.42}
              onClick={() => onPick(m)}
            />
          )
        })}
      </g>
    </svg>
  )
}
