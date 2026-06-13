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
  onPick: (move: Move) => void
  onNewGame: (playerCount: number) => void
}

// New Game controls live inside the SVG (foreignObject), authored at natural px
// then scaled into board units — so they reuse the page's .pill styling rather
// than re-expressing it in viewBox units. Top-right corner, hugging the edge.
const CTRL_SCALE = 0.019
const CTRL_W = 200
const CTRL_H = 52
const CTRL_INSET = 0.4

export function GameBoard({ state, moves, onPick, onNewGame }: Props) {
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
            xmlns="http://www.w3.org/1999/xhtml"
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
