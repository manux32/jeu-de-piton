/**
 * Composes the board: builds the screen layout from the engine geometry (once
 * per game) and renders the static <Board> with the <Pitons> overlay inside a
 * single SVG whose `viewBox` is the cell grid. This is the seam the interaction
 * loop (Milestone 4) will hook into — for now it only renders state.
 */
import { useMemo } from 'react'
import type { GameState } from '../engine'
import { buildLayout } from './layout'
import { Board } from './Board'
import { Pitons } from './Pitons'

interface Props {
  state: GameState
}

export function GameBoard({ state }: Props) {
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
      <Pitons state={state} layout={layout} />
    </svg>
  )
}
