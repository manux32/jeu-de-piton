/**
 * Piton overlay: one disc per piton, placed at the screen cell its
 * `PitonPosition` maps to via `buildLayout`. Pure rendering of engine state —
 * it reads where each piton is and draws it; it never decides where a piton may
 * go. Which pitons are movable (and the move each one would make) is handed in
 * as `moves` from the engine's `legalMoves`; clicking one calls `onPick`.
 */
import type { GameState, Move, PitonPosition } from '../engine'
import type { BoardLayout, Cell } from './layout'
import { PLAYER_HEX } from './colors'

interface Props {
  state: GameState
  layout: BoardLayout
  /** Legal moves for the current player (empty unless awaiting a move). */
  moves: Move[]
  onPick: (move: Move) => void
}

/** Small fan-out offsets so several pitons sharing HOME don't fully overlap. */
const HOME_FAN: Cell[] = [
  { col: -0.45, row: -0.45 },
  { col: 0.45, row: -0.45 },
  { col: -0.45, row: 0.45 },
  { col: 0.45, row: 0.45 },
]

function cellFor(
  pos: PitonPosition,
  playerIndex: number,
  layout: BoardLayout,
  nestSlot: number,
  homeSlot: number,
): Cell {
  switch (pos.kind) {
    case 'nest':
      return layout.nestCells[playerIndex][nestSlot]
    case 'track':
      return layout.trackCells[pos.square]
    case 'lane':
      return layout.laneCells[playerIndex][pos.step]
    case 'finished': {
      const fan = HOME_FAN[homeSlot % HOME_FAN.length]
      return { col: layout.homeCell.col + fan.col, row: layout.homeCell.row + fan.row }
    }
  }
}

export function Pitons({ state, layout, moves, onPick }: Props) {
  const moveByPiton = new Map(moves.map((m) => [m.pitonId, m]))

  return (
    <g className="pitons">
      {state.players.flatMap((player, p) => {
        let nestSlot = 0
        let homeSlot = 0
        const hex = PLAYER_HEX[player.color]
        return player.pitons.map((piton) => {
          const slot =
            piton.position.kind === 'nest'
              ? nestSlot++
              : piton.position.kind === 'finished'
                ? homeSlot++
                : 0
          const cell = cellFor(
            piton.position,
            p,
            layout,
            piton.position.kind === 'nest' ? slot : 0,
            piton.position.kind === 'finished' ? slot : 0,
          )
          const move = moveByPiton.get(piton.id)
          const cx = cell.col + 0.5
          const cy = cell.row + 0.5
          return (
            <g key={piton.id}>
              {move && (
                <circle
                  className="piton-halo"
                  cx={cx}
                  cy={cy}
                  r={0.46}
                  fill="none"
                  stroke={hex}
                  strokeWidth={0.08}
                />
              )}
              <circle
                className={move ? 'piton piton-movable' : 'piton'}
                cx={cx}
                cy={cy}
                r={0.3}
                fill={hex}
                stroke="#2b2b2b"
                strokeWidth={0.05}
                onClick={move ? () => onPick(move) : undefined}
              />
            </g>
          )
        })
      })}
    </g>
  )
}
