import { describe, it, expect } from 'vitest'
import { createGame } from './state'
import { JEU_DE_PITON } from './rulesets'
import { progressOf, finishProgress } from './board'

describe('JEU_DE_PITON ruleset', () => {
  it('encodes the confirmed cabin rules', () => {
    expect(JEU_DE_PITON.diceCount).toBe(1)
    expect(JEU_DE_PITON.entryRolls).toEqual([5])
    expect(JEU_DE_PITON.trackLength).toBe(68)
    expect(JEU_DE_PITON.laneLength).toBe(7)
    expect(JEU_DE_PITON.pitonsPerPlayer).toBe(4)
    expect(JEU_DE_PITON.rollStepOverrides).toEqual({ 6: 12 })
    expect(JEU_DE_PITON.extraTurnOn).toBe(6)
    expect(JEU_DE_PITON.exactHomeEntry).toBe(true)
    expect(JEU_DE_PITON.forcedMove).toBe(true)
    expect(JEU_DE_PITON.maxPerSquare).toBe(1)
    expect(JEU_DE_PITON.alliesBlockPassage).toBe(true)
    expect(JEU_DE_PITON.safeSquaresBlockPassage).toBe(true)
  })

  it('pins the 12 safe squares — 3 per arm (start/+7/+12), repeating every 17', () => {
    expect(JEU_DE_PITON.safeSquares).toEqual([
      0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63,
    ])
    // The pattern is the four entries each offset by {0, 7, 12}.
    const expected = [0, 17, 34, 51].flatMap((e) => [0, 7, 12].map((o) => e + o))
    expect([...JEU_DE_PITON.safeSquares].sort((a, b) => a - b)).toEqual(
      [...expected].sort((a, b) => a - b),
    )
  })
})

describe('createGame — opening state', () => {
  it('seats the ruleset default of 4 players, 4 pitons each, all in the nest', () => {
    const state = createGame(JEU_DE_PITON)
    expect(state.players).toHaveLength(4)
    expect(state.players.map((p) => p.color)).toEqual(['green', 'red', 'blue', 'yellow'])
    for (const player of state.players) {
      expect(player.pitons).toHaveLength(4)
      for (const piton of player.pitons) {
        expect(piton.position).toEqual({ kind: 'nest' })
        expect(piton.owner).toBe(player.color)
      }
    }
  })

  it('gives each piton a stable, owner-scoped id', () => {
    const state = createGame(JEU_DE_PITON)
    expect(state.players[0].pitons.map((p) => p.id)).toEqual([
      'green-0',
      'green-1',
      'green-2',
      'green-3',
    ])
    expect(state.players[1].pitons.map((p) => p.id)).toEqual([
      'red-0',
      'red-1',
      'red-2',
      'red-3',
    ])
  })

  it('opens with player 0 to roll and no winner', () => {
    const state = createGame(JEU_DE_PITON)
    expect(state.turn).toBe(0)
    expect(state.phase).toBe('awaiting-roll')
    expect(state.lastRoll).toBeNull()
    expect(state.extraTurnStreak).toBe(0)
    expect(state.winner).toBeNull()
  })

  it('resolves and carries the board geometry from the ruleset', () => {
    const state = createGame(JEU_DE_PITON)
    expect(state.geometry.trackLength).toBe(68)
    expect(state.geometry.laneLength).toBe(7)
    // homeEntryOffset 4 → lane mouth 5 before own start; HOME at progress 71.
    expect(state.geometry.trackPathLength).toBe(64)
    expect(finishProgress(state.geometry)).toBe(71)
    expect(state.geometry.entryIndices).toEqual([0, 17, 34, 51])
  })

  it('every piton starts off the progress line (in the nest)', () => {
    const state = createGame(JEU_DE_PITON)
    for (let i = 0; i < state.players.length; i++) {
      const entry = state.geometry.entryIndices[i]
      for (const piton of state.players[i].pitons) {
        expect(progressOf(piton.position, entry, state.geometry)).toBeNull()
      }
    }
  })

  it('honors a player-count override, seating 2 players on opposite arms', () => {
    const state = createGame(JEU_DE_PITON, 2)
    expect(state.players.map((p) => p.color)).toEqual(['green', 'red'])
    expect(state.geometry.entryIndices).toEqual([0, 34])
  })

  it('rejects player counts outside 2–4', () => {
    expect(() => createGame(JEU_DE_PITON, 1)).toThrow(/2–4/)
    expect(() => createGame(JEU_DE_PITON, 5)).toThrow(/2–4/)
  })

  it('defaults every seat to its own team (free-for-all)', () => {
    expect(createGame(JEU_DE_PITON).teams).toEqual([0, 1, 2, 3])
    expect(createGame(JEU_DE_PITON, 2).teams).toEqual([0, 1])
  })

  it('carries an explicit team assignment (2v2)', () => {
    const state = createGame(JEU_DE_PITON, 4, undefined, [0, 1, 0, 1])
    expect(state.teams).toEqual([0, 1, 0, 1])
  })

  it('rejects a teams array whose length is not the player count', () => {
    expect(() => createGame(JEU_DE_PITON, 4, undefined, [0, 1, 0])).toThrow(/teams must have 4/)
  })
})
