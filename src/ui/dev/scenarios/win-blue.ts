import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** Blue one move from winning: 3 pitons home, the last on its lane with the
 *  exact roll to finish — click the HOME ring to fire the real win popup. */
const winBlue: DevScenario = {
  id: 'win-blue',
  label: 'WIN — blue',
  description: 'Blue: 3 pitons home, last on the lane rolled exact-HOME — click HOME to win.',
  build: () => {
    // Blue (seat 1): three finished, the fourth at lane step 5 (lane length 7,
    // so 2 short of HOME) with a rolled 2 ⇒ the finishing move is the only one.
    const game = place(createGame(JEU_DE_PITON, 4), {
      'blue-0': { kind: 'finished' },
      'blue-1': { kind: 'finished' },
      'blue-2': { kind: 'finished' },
      'blue-3': { kind: 'lane', step: 5 },
    })
    return {
      game: { ...game, turn: 1, lastRoll: 2, phase: 'awaiting-move' },
    }
  },
}

export default winBlue
