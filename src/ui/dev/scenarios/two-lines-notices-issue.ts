import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** To repro a case where a notice spans over 2 lines. */
const TwoLinesNoticesIssue: DevScenario = {
  id: '2-lines-notices-issue',
  label: '2 lines notices issue',
  description: 'To repro a case where a notice spans over 2 lines.',
  build: () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-3': { kind: 'track', square: 0 },
      'blue-0': { kind: 'track', square: 18 },
    })
    return {
      game: { ...game, turn: 0, lastRoll: 6, phase: 'awaiting-move' },
    }
  },
}

export default TwoLinesNoticesIssue
