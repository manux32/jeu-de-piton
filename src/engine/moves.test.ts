import { describe, it, expect } from 'vitest'
import { createGame } from './state'
import { JEU_DE_PITON } from './rulesets'
import { rollDie, legalMoves, applyRoll, applyMove } from './moves'
import type { GameState, PitonPosition } from './types'

/** Test helper: return a copy of `state` with one piton repositioned. */
function place(state: GameState, pitonId: string, position: PitonPosition): GameState {
  const next = structuredClone(state)
  for (const player of next.players) {
    for (const piton of player.pitons) {
      if (piton.id === pitonId) piton.position = position
    }
  }
  return next
}

describe('rollDie', () => {
  it('maps an injected RNG into the 1–6 face range', () => {
    expect(rollDie(() => 0)).toBe(1)
    expect(rollDie(() => 0.5)).toBe(4)
    expect(rollDie(() => 0.9999)).toBe(6)
  })
})

describe('legalMoves — entry (rung 2)', () => {
  it('offers an entry move per nested piton when a 5 is rolled', () => {
    const state = createGame(JEU_DE_PITON)
    const moves = legalMoves(state, 5)
    expect(moves).toHaveLength(4)
    for (const move of moves) {
      expect(move.from).toEqual({ kind: 'nest' })
      expect(move.to).toEqual({ kind: 'track', square: 0 })
      expect(move.captures).toBeNull()
    }
    expect(moves.map((m) => m.pitonId)).toEqual(['red-0', 'red-1', 'red-2', 'red-3'])
  })

  it('uses the current player\'s own entry square', () => {
    const state = { ...createGame(JEU_DE_PITON), turn: 1 }
    const moves = legalMoves(state, 5)
    expect(moves.every((m) => m.pitonId.startsWith('blue'))).toBe(true)
    expect(moves[0].to).toEqual({ kind: 'track', square: 17 })
  })

  it('offers nothing for a non-entry roll while only nested (movement is rung 3)', () => {
    const state = createGame(JEU_DE_PITON)
    expect(legalMoves(state, 3)).toEqual([])
    expect(legalMoves(state, 6)).toEqual([])
  })

  it('blocks entry when the entry square is held by an ally (no stacking)', () => {
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    expect(legalMoves(state, 5)).toEqual([])
  })

  it('blocks entry when an enemy sits on the (safe) entry square — no capture', () => {
    const state = place(createGame(JEU_DE_PITON), 'blue-0', { kind: 'track', square: 0 })
    expect(legalMoves(state, 5)).toEqual([])
  })

  it('returns nothing once the game is over', () => {
    const state: GameState = { ...createGame(JEU_DE_PITON), phase: 'game-over' }
    expect(legalMoves(state, 5)).toEqual([])
  })
})

describe('applyRoll', () => {
  it('enters awaiting-move and records the roll when a move exists', () => {
    const state = applyRoll(createGame(JEU_DE_PITON), 5)
    expect(state.phase).toBe('awaiting-move')
    expect(state.lastRoll).toBe(5)
    expect(state.turn).toBe(0)
  })

  it('forfeits the turn immediately when the roll has no legal move', () => {
    const state = applyRoll(createGame(JEU_DE_PITON), 3)
    expect(state.phase).toBe('awaiting-roll')
    expect(state.lastRoll).toBeNull()
    expect(state.turn).toBe(1)
  })

  it('rejects a roll outside the awaiting-roll phase', () => {
    const mid = applyRoll(createGame(JEU_DE_PITON), 5)
    expect(() => applyRoll(mid, 5)).toThrow(/awaiting-roll/)
  })
})

describe('applyMove — entry', () => {
  it('places the piton on its entry square and passes the turn', () => {
    const rolled = applyRoll(createGame(JEU_DE_PITON), 5)
    const [entry] = legalMoves(rolled, 5)
    const next = applyMove(rolled, entry)

    const red0 = next.players[0].pitons.find((p) => p.id === 'red-0')
    expect(red0?.position).toEqual({ kind: 'track', square: 0 })
    expect(next.turn).toBe(1)
    expect(next.phase).toBe('awaiting-roll')
    expect(next.lastRoll).toBeNull()
  })

  it('leaves every other piton untouched', () => {
    const rolled = applyRoll(createGame(JEU_DE_PITON), 5)
    const [entry] = legalMoves(rolled, 5)
    const next = applyMove(rolled, entry)

    const stillNested = next.players
      .flatMap((p) => p.pitons)
      .filter((p) => p.id !== 'red-0')
    expect(stillNested.every((p) => p.position.kind === 'nest')).toBe(true)
  })

  it('does not mutate the input state', () => {
    const rolled = applyRoll(createGame(JEU_DE_PITON), 5)
    const before = structuredClone(rolled)
    const [entry] = legalMoves(rolled, 5)
    applyMove(rolled, entry)
    expect(rolled).toEqual(before)
  })

  it('rejects a move outside the awaiting-move phase', () => {
    const fresh = createGame(JEU_DE_PITON)
    const move = legalMoves(fresh, 5)[0]
    expect(() => applyMove(fresh, move)).toThrow(/awaiting-move/)
  })
})
