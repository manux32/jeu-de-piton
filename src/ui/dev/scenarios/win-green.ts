import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** Green one move from winning: 3 pitons home, the last on its lane with the
 *  exact roll to finish — click the HOME ring to fire the real win popup. */
const winGreen: DevScenario = {
  id: 'win-green',
  label: 'WIN — green',
  description: 'Green: 3 pitons home, last on the lane rolled exact-HOME — click HOME to win.',
  build: () => {
    // Green (seat 3): three finished, the fourth at lane step 4 (lane length 7,
    // so 3 short of HOME) with a rolled 3 ⇒ the finishing move is the only one.
    const game = place(createGame(JEU_DE_PITON, 4), {
      'green-0': { kind: 'finished' },
      'green-1': { kind: 'finished' },
      'green-2': { kind: 'finished' },
      'green-3': { kind: 'lane', step: 4 },
    })
    return {
      game: { ...game, turn: 3, lastRoll: 3, phase: 'awaiting-move' },
      rolled: 3,
    }
  },
}

export default winGreen
