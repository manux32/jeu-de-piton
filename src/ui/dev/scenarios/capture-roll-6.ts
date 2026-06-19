import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** To repro a notice bug when rolling a 6 and capturing a piton. */
const captureRoll6: DevScenario = {
  id: 'capture-roll-6',
  label: 'Capture - Roll 6',
  description: 'To repro a notice bug when rolling a 6 and capturing a piton.',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'track', square: 1 },
      'blue-0': { kind: 'track', square: 13 },
    })
    return {
      game: { ...game, turn: 0, lastRoll: 6, phase: 'awaiting-move' },
      rolled: 6,
    }
  },
}

export default captureRoll6
