import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** All players' pitons HOME */
const homeAll: DevScenario = {
  id: 'home-all',
  label: 'HOME ALL',
  description: 'All players\' pitons HOME',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'finished' },
      'red-1': { kind: 'finished' },
      'red-2': { kind: 'finished' },
      'red-3': { kind: 'finished' },
      'blue-0': { kind: 'finished' },
      'blue-1': { kind: 'finished' },
      'blue-2': { kind: 'finished' },
      'blue-3': { kind: 'finished' },
      'yellow-0': { kind: 'finished' },
      'yellow-1': { kind: 'finished' },
      'yellow-2': { kind: 'finished' },
      'yellow-3': { kind: 'finished' },
      'green-0': { kind: 'finished' },
      'green-1': { kind: 'finished' },
      'green-2': { kind: 'finished' },
      'green-3': { kind: 'finished' },
    })
    return {
      game: { ...game, turn: 0, lastRoll: null, phase: 'awaiting-roll' },
      rolled: null,
    }
  },
}

export default homeAll
