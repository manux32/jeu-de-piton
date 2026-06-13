import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** Red rolled 3; the only legal move captures a lone blue on a non-safe square. */
const capture: DevScenario = {
  id: 'capture',
  label: 'Capture',
  description: 'Red rolled 3; clicking the lone blue disc on the destination should fire the capture.',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'track', square: 1 },
      'blue-0': { kind: 'track', square: 4 }, // sq 4 is NOT safe → capturable
    })
    return {
      game: { ...game, turn: 0, lastRoll: 3, phase: 'awaiting-move' },
      rolled: 3,
    }
  },
}

export default capture
