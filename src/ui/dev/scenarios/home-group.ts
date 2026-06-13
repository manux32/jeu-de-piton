import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** Several colours with finished pitons, to eyeball the per-colour HOME clustering. */
const homeGroup: DevScenario = {
  id: 'home-group',
  label: 'HOME group',
  description: 'Finished pitons should cluster per colour against the HOME edge facing each arm, fanned (not piled at centre).',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'finished' },
      'red-1': { kind: 'finished' },
      'red-2': { kind: 'finished' },
      'red-3': { kind: 'track', square: 10 },
      'blue-0': { kind: 'finished' },
      'blue-1': { kind: 'finished' },
      'yellow-0': { kind: 'finished' },
      'green-0': { kind: 'finished' },
      'green-1': { kind: 'finished' },
    })
    return {
      game: { ...game, turn: 0, lastRoll: null, phase: 'awaiting-roll' },
      rolled: null,
    }
  },
}

export default homeGroup
