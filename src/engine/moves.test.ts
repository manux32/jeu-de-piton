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
    const moves = legalMoves(state, 5)
    // No nested piton may enter — the entry square is taken...
    expect(moves.every((m) => m.from.kind !== 'nest')).toBe(true)
    // ...though red-0 itself is now free to walk the track (rung 3).
    expect(moves).toEqual([
      {
        pitonId: 'red-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 5 },
        captures: null,
      },
    ])
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

describe('legalMoves — track movement (rung 3)', () => {
  /** Moves offered for a single piton id. */
  const forPiton = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).filter((m) => m.pitonId === id)

  it('walks a lone track piton forward by the die face', () => {
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    expect(forPiton(state, 3, 'red-0')).toEqual([
      {
        pitonId: 'red-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 3 },
        captures: null,
      },
    ])
  })

  it('moves a 6 by twelve squares (rollStepOverrides)', () => {
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    expect(forPiton(state, 6, 'red-0')[0].to).toEqual({ kind: 'track', square: 12 })
  })

  it('on a 5, offers both an entry and a track move', () => {
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 3 })
    const moves = legalMoves(state, 5)
    // Three nested pitons enter (entry square 0 is free)...
    expect(moves.filter((m) => m.from.kind === 'nest')).toHaveLength(3)
    // ...plus red-0 advances along the track.
    expect(forPiton(state, 5, 'red-0')[0].to).toEqual({ kind: 'track', square: 8 })
  })

  it('cannot pass one of its own pitons', () => {
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 2 })
    state = place(state, 'red-1', { kind: 'track', square: 4 })
    // red-0 + 5 would cross square 4 (ally) → blocked.
    expect(forPiton(state, 5, 'red-0')).toEqual([])
    // red-1 moving the other way is unobstructed.
    expect(forPiton(state, 5, 'red-1')[0].to).toEqual({ kind: 'track', square: 9 })
  })

  it('cannot land on one of its own pitons', () => {
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    state = place(state, 'red-1', { kind: 'track', square: 5 })
    expect(forPiton(state, 5, 'red-0')).toEqual([])
  })

  it('cannot pass an enemy sitting on a safe square', () => {
    // Square 7 is a safe square; an enemy there blocks all passage.
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 4 })
    state = place(state, 'blue-0', { kind: 'track', square: 7 })
    expect(forPiton(state, 5, 'red-0')).toEqual([])
  })

  it('passes freely over a lone enemy on a non-safe square', () => {
    // Square 6 is not safe — red walks straight over it.
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 4 })
    state = place(state, 'blue-0', { kind: 'track', square: 6 })
    expect(forPiton(state, 5, 'red-0')[0].to).toEqual({ kind: 'track', square: 9 })
  })

  it('keeps a piton that stays short of the lane mouth on the track', () => {
    // trackPathLength is 64; from square 60 a 3 keeps it on the track
    // (square 63 is an empty safe square — lane turn-off is exercised in rung 6).
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 60 })
    expect(forPiton(state, 3, 'red-0')[0].to).toEqual({ kind: 'track', square: 63 })
  })

  it('applyMove relocates a track piton and passes the turn', () => {
    const placed = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    const rolled = applyRoll(placed, 3)
    const move = legalMoves(rolled, 3).find((m) => m.pitonId === 'red-0')!
    const next = applyMove(rolled, move)
    expect(next.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'track',
      square: 3,
    })
    expect(next.turn).toBe(1)
    expect(next.phase).toBe('awaiting-roll')
  })
})

describe('legalMoves — capture (rung 4)', () => {
  const forPiton = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).filter((m) => m.pitonId === id)

  it('captures a lone enemy landed on off a safe square', () => {
    // Square 3 is not safe; red-0 + 3 lands exactly on blue-0 → capture.
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    state = place(state, 'blue-0', { kind: 'track', square: 3 })
    expect(forPiton(state, 3, 'red-0')).toEqual([
      {
        pitonId: 'red-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 3 },
        captures: 'blue-0',
      },
    ])
  })

  it('cannot capture an enemy standing on a safe square', () => {
    // Square 7 is safe; landing on blue-0 there is forbidden (it is immune).
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 2 })
    state = place(state, 'blue-0', { kind: 'track', square: 7 })
    expect(forPiton(state, 5, 'red-0')).toEqual([])
  })

  it('never "captures" an ally — landing on your own is just blocked', () => {
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    state = place(state, 'red-1', { kind: 'track', square: 3 })
    expect(forPiton(state, 3, 'red-0')).toEqual([])
  })

  it('applyMove sends the captured enemy back to its nest', () => {
    let placed = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    placed = place(placed, 'blue-0', { kind: 'track', square: 3 })
    const rolled = applyRoll(placed, 3)
    const move = legalMoves(rolled, 3).find((m) => m.captures === 'blue-0')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'track',
      square: 3,
    })
    expect(next.players[1].pitons.find((p) => p.id === 'blue-0')?.position).toEqual({
      kind: 'nest',
    })
  })
})

describe('the 6 — extra turn & streak penalty (rung 5)', () => {
  const moveFor = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).find((m) => m.pitonId === id)!

  it('keeps the turn with the same player and bumps the streak on a 6', () => {
    const placed = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    const rolled = applyRoll(placed, 6)
    const next = applyMove(rolled, moveFor(rolled, 6, 'red-0'))

    expect(next.turn).toBe(0) // same player rolls again
    expect(next.phase).toBe('awaiting-roll')
    expect(next.extraTurnStreak).toBe(1)
    expect(next.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'track',
      square: 12, // a 6 moved twelve
    })
  })

  it('resets the streak and passes the turn on a non-6 after two 6s', () => {
    let s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    s = applyMove(applyRoll(s, 6), moveFor(applyRoll(s, 6), 6, 'red-0')) // → sq 12, streak 1
    s = applyMove(applyRoll(s, 6), moveFor(applyRoll(s, 6), 6, 'red-0')) // → sq 24, streak 2
    expect(s.extraTurnStreak).toBe(2)
    expect(s.turn).toBe(0)

    s = applyMove(applyRoll(s, 3), moveFor(applyRoll(s, 3), 3, 'red-0')) // a 3 ends the run
    expect(s.turn).toBe(1)
    expect(s.extraTurnStreak).toBe(0)
    expect(s.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'track',
      square: 27,
    })
  })

  it('penalizes the 3rd consecutive 6: not played, leading track piton nested, turn passes', () => {
    let s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 10 })
    s = place(s, 'red-1', { kind: 'track', square: 3 })
    s = { ...s, extraTurnStreak: 2 } // two 6s already played this turn

    const next = applyRoll(s, 6)

    // The most-advanced track piton (red-0, further along) goes back to the nest...
    expect(next.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'nest',
    })
    // ...the trailing one is untouched, and the 6 is never played (turn passes).
    expect(next.players[0].pitons.find((p) => p.id === 'red-1')?.position).toEqual({
      kind: 'track',
      square: 3,
    })
    expect(next.turn).toBe(1)
    expect(next.phase).toBe('awaiting-roll')
    expect(next.extraTurnStreak).toBe(0)
  })

  it('penalty with no track piton to lose just passes the turn', () => {
    // All pitons still nested; the 3rd 6 simply forfeits with nothing to lose.
    const s = { ...createGame(JEU_DE_PITON), extraTurnStreak: 2 }
    const next = applyRoll(s, 6)

    expect(next.turn).toBe(1)
    expect(next.players[0].pitons.every((p) => p.position.kind === 'nest')).toBe(true)
  })
})

describe('legalMoves — lane, exact HOME & win (rung 6)', () => {
  const forPiton = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).filter((m) => m.pitonId === id)

  // Geometry: trackPathLength 64, laneLength 7 → lane steps 0..6 (progress
  // 64..70), HOME at progress 71. Red (player 0) enters at square 0.

  it('turns off the track into the home lane', () => {
    // Square 60 is progress 60; a 5 → progress 65 → lane step 1.
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 60 })
    expect(forPiton(state, 5, 'red-0')).toEqual([
      {
        pitonId: 'red-0',
        from: { kind: 'track', square: 60 },
        to: { kind: 'lane', step: 1 },
        captures: null,
      },
    ])
  })

  it('advances a piton already inside its lane', () => {
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 1 })
    expect(forPiton(state, 3, 'red-0')[0].to).toEqual({ kind: 'lane', step: 4 })
  })

  it('reaches HOME by exact count', () => {
    // Lane step 6 is progress 70; a 1 lands exactly on HOME (progress 71).
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 6 })
    expect(forPiton(state, 1, 'red-0')[0].to).toEqual({ kind: 'finished' })
  })

  it('offers no move that would overshoot HOME', () => {
    // From lane step 6 (progress 70) a 2 overshoots HOME (progress 72) → illegal.
    const fromLane = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 6 })
    expect(forPiton(fromLane, 2, 'red-0')).toEqual([])
    // From the track too: square 60 (progress 60) + a 6 (twelve) → progress 72.
    const fromTrack = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 60 })
    expect(forPiton(fromTrack, 6, 'red-0')).toEqual([])
  })

  it('cannot pass one of its own pitons inside the lane', () => {
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 1 })
    state = place(state, 'red-1', { kind: 'lane', step: 3 })
    // red-0 + 3 would cross lane step 3 (ally) → blocked.
    expect(forPiton(state, 3, 'red-0')).toEqual([])
    // red-1 advancing deeper is unobstructed (→ lane step 5).
    expect(forPiton(state, 2, 'red-1')[0].to).toEqual({ kind: 'lane', step: 5 })
  })

  it('cannot land on one of its own pitons inside the lane', () => {
    let state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 2 })
    state = place(state, 'red-1', { kind: 'lane', step: 4 })
    expect(forPiton(state, 2, 'red-0')).toEqual([]) // would land on red-1
  })

  it('applyMove finishes a lone piton and passes the turn', () => {
    const placed = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 6 })
    const rolled = applyRoll(placed, 1)
    const move = legalMoves(rolled, 1).find((m) => m.pitonId === 'red-0')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'finished',
    })
    expect(next.winner).toBeNull()
    expect(next.phase).toBe('awaiting-roll')
    expect(next.turn).toBe(1) // others still nested — turn passes
  })

  it('declares the winner when the last piton comes HOME — even off a 6', () => {
    let s = createGame(JEU_DE_PITON)
    s = place(s, 'red-0', { kind: 'finished' })
    s = place(s, 'red-1', { kind: 'finished' })
    s = place(s, 'red-2', { kind: 'finished' })
    s = place(s, 'red-3', { kind: 'track', square: 59 }) // progress 59 + 12 = HOME

    const rolled = applyRoll(s, 6)
    const move = legalMoves(rolled, 6).find((m) => m.pitonId === 'red-3')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'red-3')?.position).toEqual({
      kind: 'finished',
    })
    expect(next.winner).toBe('red')
    expect(next.phase).toBe('game-over')
    // A winning move ends the game; the 6 grants no further roll.
    expect(legalMoves(next, 5)).toEqual([])
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
