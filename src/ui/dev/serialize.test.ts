import { describe, it, expect } from 'vitest'
import { createGame, JEU_DE_PITON } from '../../engine'
import { place } from './scenario'
import { serializeScenario, slugify } from './serialize'
import type { GameView } from '../useGame'

describe('slugify', () => {
  it('kebab-cases names and trims junk', () => {
    expect(slugify('Two captures!')).toBe('two-captures')
    expect(slugify('  HOME move  ')).toBe('home-move')
    expect(slugify('a---b')).toBe('a-b')
  })
})

describe('serializeScenario', () => {
  const view = (game: GameView['game'], rolled: number | null): GameView => ({
    game,
    rolled,
    notice: null,
  })

  it('emits a place map, skips nest-default pitons, and sets turn/roll/phase', () => {
    const game = place(createGame(JEU_DE_PITON, 4), {
      'red-0': { kind: 'track', square: 1 },
      'blue-0': { kind: 'track', square: 4 },
    })
    const src = serializeScenario(
      view({ ...game, turn: 0, lastRoll: 3, phase: 'awaiting-move' }, 3),
      { name: 'Capture test', description: 'click the blue disc' },
    )

    expect(src).toContain("id: 'capture-test'")
    expect(src).toContain("label: 'Capture test'")
    expect(src).toContain("description: 'click the blue disc'")
    expect(src).toContain("'red-0': { kind: 'track', square: 1 }")
    expect(src).toContain("'blue-0': { kind: 'track', square: 4 }")
    expect(src).toContain('turn: 0, lastRoll: 3, phase: \'awaiting-move\'')
    expect(src).toContain('rolled: 3')
    // nest-default pitons (red-1.., the other colours' lot) are omitted
    expect(src).not.toContain("kind: 'nest'")
    expect(src).not.toContain("'red-1'")
    // streak defaults to 0 → not emitted
    expect(src).not.toContain('extraTurnStreak')
  })

  it('emits extraTurnStreak only when non-zero', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const zero = serializeScenario(view({ ...game, extraTurnStreak: 0 }, null), {
      name: 'a',
      description: 'd',
    })
    const two = serializeScenario(view({ ...game, extraTurnStreak: 2 }, null), {
      name: 'a',
      description: 'd',
    })
    expect(zero).not.toContain('extraTurnStreak')
    expect(two).toContain('extraTurnStreak: 2')
  })

  it('represents an awaiting-roll snapshot with null roll', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const src = serializeScenario(
      view({ ...game, turn: 1, lastRoll: null, phase: 'awaiting-roll' }, null),
      { name: 'idle', description: 'nothing rolled' },
    )
    expect(src).toContain("lastRoll: null, phase: 'awaiting-roll'")
    expect(src).toContain('rolled: null')
    // empty place map when every piton sits in its nest
    expect(src).toContain('place(createGame(JEU_DE_PITON, 4), {})')
  })

  it('escapes single quotes in the description', () => {
    const game = createGame(JEU_DE_PITON, 4)
    const src = serializeScenario(view(game, null), {
      name: 'x',
      description: "it's safe",
    })
    expect(src).toContain("description: 'it\\'s safe'")
  })
})
