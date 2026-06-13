/**
 * Composes the board: builds the screen layout from the engine geometry (once
 * per game) and renders the static <Board>, the legal-move target markers, and
 * the <Pitons> overlay inside a single SVG whose `viewBox` is the cell grid.
 * This is the interaction-loop seam (Milestone 4): it takes the current player's
 * `legalMoves` and an `onPick` callback and wires them down to <Pitons>; it adds
 * no rules of its own (the moves are computed by the engine in App).
 */
import { useMemo } from 'react'
import type { GameState, Move } from '../engine'
import { buildLayout, destinationCell, cellMid } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'
import { PLAYER_HEX } from './colors'

interface Props {
  state: GameState
  moves: Move[]
  rolled: number | null
  notice: string | null
  onPick: (move: Move) => void
  onNewGame: (playerCount: number) => void
  onRoll: () => void
}

// In-board HTML chrome (New Game controls, dice) lives in the SVG via
// foreignObject, authored at natural px then scaled into board units — so it
// reuses the page's .pill / .die styling rather than re-expressing it in viewBox
// units. Corners hug the board edge, inset by CTRL_INSET.
const CTRL_SCALE = 0.019
const CTRL_W = 200
const CTRL_H = 52
const CTRL_INSET = 0.4
const DICE_W = 150
const DICE_H = 56
const NOTICE_W = 360
const NOTICE_H = 70

export function GameBoard({
  state,
  moves,
  rolled,
  notice,
  onPick,
  onNewGame,
  onRoll,
}: Props) {
  const layout = useMemo(
    () => buildLayout(state.geometry, state.players.length),
    [state.geometry, state.players.length],
  )

  // Horizontal centre of the top-left (North-arm) nest area, derived from the
  // grid geometry so it holds regardless of which players are seated. Mirrors
  // the nest-placement maths in buildLayout (off = round(sideLen/2)+1).
  const centre = (layout.gridSize - 1) / 2
  const sideLen = (layout.gridSize - 3) / 2
  const nestOffset = Math.round(sideLen / 2) + 1
  const titleX = cellMid(centre - nestOffset, layout)
  const ctrlX = layout.extent - CTRL_INSET - CTRL_W * CTRL_SCALE
  const diceY = layout.extent - CTRL_INSET - DICE_H * CTRL_SCALE
  const noticeX = layout.extent - CTRL_INSET - NOTICE_W * CTRL_SCALE
  const noticeY = layout.extent - CTRL_INSET - NOTICE_H * CTRL_SCALE
  const over = state.phase === 'game-over'

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

      {/* New Game controls, top-right. Real HTML buttons mounted in the SVG via
          foreignObject, rendered at natural px and scaled into board units so
          they reuse the .pill styling and stay accessible. */}
      <g transform={`translate(${ctrlX}, ${CTRL_INSET}) scale(${CTRL_SCALE})`}>
        <foreignObject x={0} y={0} width={CTRL_W} height={CTRL_H}>
          <div
            className="board-controls"
            role="group"
            aria-label="new game — player count"
          >
            <span className="muted">New game</span>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={n === state.players.length ? 'pill pill-on' : 'pill'}
                aria-pressed={n === state.players.length}
                onClick={() => onNewGame(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </foreignObject>
      </g>

      {/* Dice, bottom-left. Same foreignObject-scaled-into-board-units trick:
          the rolled result and the Roll button, reusing .die / .pill styling. */}
      <g transform={`translate(${CTRL_INSET}, ${diceY}) scale(${CTRL_SCALE})`}>
        <foreignObject x={0} y={0} width={DICE_W} height={DICE_H}>
          <div className="board-dice">
            <span
              className="die"
              aria-label={rolled ? `rolled ${rolled}` : 'no roll yet'}
            >
              {rolled ?? '–'}
            </span>
            <button
              type="button"
              className="pill pill-on"
              onClick={onRoll}
              disabled={state.phase !== 'awaiting-roll'}
            >
              Roll
            </button>
          </div>
        </foreignObject>
      </g>

      {/* Notice line (capture / extra roll / forfeit / winner), bottom-right.
          Non-interactive text via foreignObject so it can wrap and right-align;
          click-through so it never swallows board clicks. */}
      <g transform={`translate(${noticeX}, ${noticeY}) scale(${CTRL_SCALE})`}>
        <foreignObject x={0} y={0} width={NOTICE_W} height={NOTICE_H}>
          <div
            className={over ? 'board-notice board-notice-win' : 'board-notice'}
            role="status"
            aria-live="polite"
          >
            {notice ?? ''}
          </div>
        </foreignObject>
      </g>

      {/* legal-move target markers — a hollow ring on each destination cell,
          tinted the moving player's color (via currentColor) so it doesn't read
          as the green player's mark */}
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

      <Pitons state={state} layout={layout} moves={moves} onPick={onPick} />
    </svg>
  )
}
