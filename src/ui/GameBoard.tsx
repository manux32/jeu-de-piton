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
}

export function GameBoard({ state, moves, onPick }: Props) {
  const layout = useMemo(
    () => buildLayout(state.geometry, state.players.length),
    [state.geometry, state.players.length],
  )

  return (
    <svg
      className="game-board"
      viewBox={`0 0 ${layout.extent} ${layout.extent}`}
      role="img"
      aria-label="jeu de piton board"
    >
      <Board state={state} layout={layout} />

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
