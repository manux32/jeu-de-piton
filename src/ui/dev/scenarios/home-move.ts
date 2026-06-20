import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** A red piton one lane-cell short of HOME, rolled 3 → the exact-HOME move. */
const homeMove: DevScenario = {
  id: 'home-move',
  label: 'HOME move',
  description: 'Red rolled 3 from lane step 4 → exact HOME: the target marker should be the larger, bolder, pulsing one.',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'lane', step: 4 }, // 3 short of HOME (lane length 7)
    })
    return {
      game: { ...game, turn: 0, lastRoll: 3, phase: 'awaiting-move' },
    }
  },
}

export default homeMove
