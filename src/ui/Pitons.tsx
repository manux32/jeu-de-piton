/**
 * Piton overlay: one disc per piton, placed at the screen cell its
 * `PitonPosition` maps to via `buildLayout`. Pure rendering of engine state —
 * it reads where each piton is and draws it; it never decides where a piton may
 * go. Which pitons are movable (and the move each one would make) is handed in
 * as `moves` from the engine's `legalMoves`; clicking one calls `onPick`. A
 * capture move also makes its *target* enemy clickable, since that disc sits
 * over the destination marker and would otherwise swallow the click.
 */
import type { GameState, Move, PitonPosition } from '../engine'
import { type BoardLayout, type Cell, cellMid, cellStart } from './layout'
import { PLAYER_HEX } from './colors'

interface Props {
  state: GameState
  layout: BoardLayout
  /** Legal moves for the current player (empty unless awaiting a move). */
  moves: Move[]
  onPick: (move: Move) => void
}

/** Small fan-out within one player's HOME group so its pitons don't stack. */
const HOME_FAN: Cell[] = [
  { col: -0.32, row: -0.32 },
  { col: 0.32, row: -0.32 },
  { col: -0.32, row: 0.32 },
  { col: 0.32, row: 0.32 },
]

/**
 * Where player `playerIndex`'s `slot`-th finished piton sits: tucked into the
 * HOME corner toward that player's own NEST (the diagonal corner their nest
 * occupies), so each colour groups in its corner AND the horizontal mid-band of
 * HOME stays clear for the centred dice UI — then fanned within that group.
 */
function homeCluster(layout: BoardLayout, playerIndex: number, slot: number) {
  const { homeCell } = layout
  const nest = layout.nestSlots[playerIndex]
  const nestCx = nest.reduce((s, c) => s + c.cx, 0) / nest.length
  const nestCy = nest.reduce((s, c) => s + c.cy, 0) / nest.length
  // Diagonal direction from centre toward this player's nest corner (the nest
  // always sits off both axes, so both signs are non-zero).
  const dirCol = Math.sign(nestCx - cellMid(homeCell.col, layout))
  const dirRow = Math.sign(nestCy - cellMid(homeCell.row, layout))
  const homeHalf =
    (cellStart(homeCell.col + 2, layout) - cellStart(homeCell.col - 1, layout)) / 2
  const push = homeHalf - 0.95 // toward the player's corner, with a margin
  const fan = HOME_FAN[slot % HOME_FAN.length]
  return {
    cx: cellMid(homeCell.col, layout) + dirCol * push + fan.col,
    cy: cellMid(homeCell.row, layout) + dirRow * push + fan.row,
  }
}

/** Render-unit pixel centre for a piton at `pos`. `slot` disambiguates pitons
 * sharing a region (nest slots, or a player's HOME group). */
function centerFor(
  pos: PitonPosition,
  playerIndex: number,
  layout: BoardLayout,
  slot: number,
): { cx: number; cy: number } {
  const mid = (c: Cell) => ({ cx: cellMid(c.col, layout), cy: cellMid(c.row, layout) })
  switch (pos.kind) {
    case 'nest':
      return layout.nestSlots[playerIndex][slot]
    case 'track':
      return mid(layout.trackCells[pos.square])
    case 'lane':
      return mid(layout.laneCells[playerIndex][pos.step])
    case 'finished':
      return homeCluster(layout, playerIndex, slot)
  }
}

export function Pitons({ state, layout, moves, onPick }: Props) {
  const moveByPiton = new Map(moves.map((m) => [m.pitonId, m]))
  // A capture targets an ENEMY piton; let clicking that enemy fire the move too.
  const captureByPiton = new Map(
    moves.filter((m) => m.captures).map((m) => [m.captures as string, m]),
  )

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
          const ownMove = moveByPiton.get(piton.id)
          const captureMove = captureByPiton.get(piton.id)
          const clickMove = ownMove ?? captureMove
          const { cx, cy } = centerFor(piton.position, p, layout, slot)
          return (
            <g key={piton.id}>
              {ownMove && (
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
                className={
                  ownMove
                    ? 'piton piton-movable'
                    : captureMove
                      ? 'piton piton-target'
                      : 'piton'
                }
                cx={cx}
                cy={cy}
                r={0.3}
                fill={hex}
                stroke="#2b2b2b"
                strokeWidth={0.05}
                onClick={clickMove ? () => onPick(clickMove) : undefined}
              />
            </g>
          )
        })
      })}
    </g>
  )
}
