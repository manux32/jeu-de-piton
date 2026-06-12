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
import { buildLayout, destinationCell } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'

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
      viewBox={`0 0 ${layout.gridSize} ${layout.gridSize}`}
      role="img"
      aria-label="jeu de piton board"
    >
      <Board state={state} layout={layout} />

      {/* legal-move target markers — a hollow ring on each destination cell */}
      <g className="move-targets">
        {moves.map((m, i) => {
          const cell = destinationCell(m.to, state.turn, layout)
          return (
            <circle
              key={`target-${i}`}
              className="move-target"
              cx={cell.col + 0.5}
              cy={cell.row + 0.5}
              r={0.42}
              onClick={() => onPick(m)}
            />
          )
        })}
      </g>

      <Pitons state={state} layout={layout} moves={moves} onPick={onPick} />
    </svg>
  )
}
