import { describe, it, expect } from 'vitest'
import { createGame, JEU_DE_PITON } from '../../engine'
import { place } from './scenario'
import { serializeScenario, slugify } from './serialize'
import { emptyStats, type GameView } from '../useGame'

describe('slugify', () => {
  it('kebab-cases names and trims junk', () => {
    expect(slugify('Two captures!')).toBe('two-captures')
    expect(slugify('  HOME move  ')).toBe('home-move')
    expect(slugify('a---b')).toBe('a-b')
  })
})

describe('serializeScenario', () => {
  // A scenario captures one board state with an empty turn log; the pending roll
  // lives on game.lastRoll (no separate scalar is emitted).
  const view = (game: GameView['game']): GameView => ({
    game,
    log: game.players.map(() => []),
    stats: game.players.map(() => emptyStats()),
    history: [],
  })

  it('emits a place map, skips nest-default pitons, and sets turn/roll/phase', () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'track', square: 1 },
      'blue-0': { kind: 'track', square: 4 },
    })
    const src = serializeScenario(
      view({ ...game, turn: 0, lastRoll: 3, phase: 'awaiting-move' }),
      { name: 'Capture test', description: 'click the blue disc' },
    )

    expect(src).toContain("id: 'capture-test'")
    expect(src).toContain("label: 'Capture test'")
    expect(src).toContain("description: 'click the blue disc'")
    expect(src).toContain("'red-0': { kind: 'track', square: 1 }")
    expect(src).toContain("'blue-0': { kind: 'track', square: 4 }")
    expect(src).toContain('turn: 0, lastRoll: 3, phase: \'awaiting-move\'')
    // nest-default pitons (red-1.., the other colours' lot) are omitted
    expect(src).not.toContain("kind: 'nest'")
    expect(src).not.toContain("'red-1'")
    // streak defaults to 0 → not emitted
    expect(src).not.toContain('extraTurnStreak')
  })

  it('emits extraTurnStreak only when non-zero', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const zero = serializeScenario(view({ ...game, extraTurnStreak: 0 }), {
      name: 'a',
      description: 'd',
    })
    const two = serializeScenario(view({ ...game, extraTurnStreak: 2 }), {
      name: 'a',
      description: 'd',
    })
    expect(zero).not.toContain('extraTurnStreak')
    expect(two).toContain('extraTurnStreak: 2')
  })

  it('represents an awaiting-roll snapshot with null roll', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const src = serializeScenario(
      view({ ...game, turn: 1, lastRoll: null, phase: 'awaiting-roll' }),
      { name: 'idle', description: 'nothing rolled' },
    )
    expect(src).toContain("lastRoll: null, phase: 'awaiting-roll'")
    // empty place map when every piton sits in its nest
    expect(src).toContain('place(createGame(JEU_DE_PITON, 4), {})')
  })

  it('escapes single quotes in the description', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const src = serializeScenario(view(game), {
      name: 'x',
      description: "it's safe",
    })
    expect(src).toContain("description: 'it\\'s safe'")
  })
})
