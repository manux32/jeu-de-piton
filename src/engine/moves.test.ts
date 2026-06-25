import { describe, it, expect } from 'vitest'
import { createGame } from './state'
import { JEU_DE_PITON } from './rulesets'
import { rollDie, legalMoves, applyRoll, applyMove, movingSeat } from './moves'
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
    expect(moves.map((m) => m.pitonId)).toEqual(['green-0', 'green-1', 'green-2', 'green-3'])
  })

  it('uses the current player\'s own entry square', () => {
    const state = { ...createGame(JEU_DE_PITON), turn: 1 }
    const moves = legalMoves(state, 5)
    expect(moves.every((m) => m.pitonId.startsWith('red'))).toBe(true)
    expect(moves[0].to).toEqual({ kind: 'track', square: 17 })
  })

  it('offers nothing for a non-entry roll while only nested (movement is rung 3)', () => {
    const state = createGame(JEU_DE_PITON)
    expect(legalMoves(state, 3)).toEqual([])
    expect(legalMoves(state, 6)).toEqual([])
  })

  it('blocks entry when the entry square is held by an ally (no stacking)', () => {
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    const moves = legalMoves(state, 5)
    // No nested piton may enter — the entry square is taken...
    expect(moves.every((m) => m.from.kind !== 'nest')).toBe(true)
    // ...though green-0 itself is now free to walk the track (rung 3).
    expect(moves).toEqual([
      {
        pitonId: 'green-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 5 },
        captures: null,
      },
    ])
  })

  it('captures a lone enemy on the OWN start square — the start-square exception', () => {
    // Square 0 is green's own start. It is safe to everyone but green, so an enemy
    // parked there is captured by green exiting the nest onto it (one move per
    // nested piton, each capturing red-0).
    const state = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    const moves = legalMoves(state, 5)
    expect(moves).toHaveLength(4)
    for (const move of moves) {
      expect(move.from).toEqual({ kind: 'nest' })
      expect(move.to).toEqual({ kind: 'track', square: 0 })
      expect(move.captures).toBe('red-0')
    }
  })

  it('keeps a start square safe to a non-owner who lands on it by movement', () => {
    // Square 17 is red's start. The exception is entry-only: green walking the
    // track onto it (green-0 at 14, +3) still hits the universal safe-square
    // immunity in resolveLanding — no capture, the landing is blocked.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 14 })
    state = place(state, 'red-0', { kind: 'track', square: 17 })
    expect(legalMoves(state, 3).filter((m) => m.pitonId === 'green-0')).toEqual([])
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
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    expect(forPiton(state, 3, 'green-0')).toEqual([
      {
        pitonId: 'green-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 3 },
        captures: null,
      },
    ])
  })

  it('moves a 6 by twelve squares (rollStepOverrides)', () => {
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    expect(forPiton(state, 6, 'green-0')[0].to).toEqual({ kind: 'track', square: 12 })
  })

  it('on a 5, offers both an entry and a track move', () => {
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 3 })
    const moves = legalMoves(state, 5)
    // Three nested pitons enter (entry square 0 is free)...
    expect(moves.filter((m) => m.from.kind === 'nest')).toHaveLength(3)
    // ...plus green-0 advances along the track.
    expect(forPiton(state, 5, 'green-0')[0].to).toEqual({ kind: 'track', square: 8 })
  })

  it('cannot pass one of its own pitons', () => {
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 2 })
    state = place(state, 'green-1', { kind: 'track', square: 4 })
    // green-0 + 5 would cross square 4 (ally) → blocked.
    expect(forPiton(state, 5, 'green-0')).toEqual([])
    // green-1 moving the other way is unobstructed.
    expect(forPiton(state, 5, 'green-1')[0].to).toEqual({ kind: 'track', square: 9 })
  })

  it('cannot land on one of its own pitons', () => {
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    state = place(state, 'green-1', { kind: 'track', square: 5 })
    expect(forPiton(state, 5, 'green-0')).toEqual([])
  })

  it('cannot pass an enemy sitting on a safe square', () => {
    // Square 7 is a safe square; an enemy there blocks all passage.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 4 })
    state = place(state, 'red-0', { kind: 'track', square: 7 })
    expect(forPiton(state, 5, 'green-0')).toEqual([])
  })

  it('passes freely over a lone enemy on a non-safe square', () => {
    // Square 6 is not safe — green walks straight over it.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 4 })
    state = place(state, 'red-0', { kind: 'track', square: 6 })
    expect(forPiton(state, 5, 'green-0')[0].to).toEqual({ kind: 'track', square: 9 })
  })

  it('keeps a piton that stays short of the lane mouth on the track', () => {
    // trackPathLength is 64; from square 60 a 3 keeps it on the track
    // (square 63 is an empty safe square — lane turn-off is exercised in rung 6).
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 60 })
    expect(forPiton(state, 3, 'green-0')[0].to).toEqual({ kind: 'track', square: 63 })
  })

  it('applyMove relocates a track piton and passes the turn', () => {
    const placed = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    const rolled = applyRoll(placed, 3)
    const move = legalMoves(rolled, 3).find((m) => m.pitonId === 'green-0')!
    const next = applyMove(rolled, move)
    expect(next.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
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
    // Square 3 is not safe; green-0 + 3 lands exactly on red-0 → capture.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    state = place(state, 'red-0', { kind: 'track', square: 3 })
    expect(forPiton(state, 3, 'green-0')).toEqual([
      {
        pitonId: 'green-0',
        from: { kind: 'track', square: 0 },
        to: { kind: 'track', square: 3 },
        captures: 'red-0',
      },
    ])
  })

  it('cannot capture an enemy standing on a safe square', () => {
    // Square 7 is safe; landing on red-0 there is forbidden (it is immune).
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 2 })
    state = place(state, 'red-0', { kind: 'track', square: 7 })
    expect(forPiton(state, 5, 'green-0')).toEqual([])
  })

  it('cannot capture an enemy on a safe square via the 12 either (a 6 moves 12)', () => {
    // The 6→12 only changes distance, not the landing rule: safe-square immunity
    // lives in resolveLanding, which never sees how far the piton came. Square 12
    // is safe; green-0 at 0 + 12 lands exactly on red-0 there → blocked, no capture.
    // (Transit 1..11 is clear — square 7 is safe but empty — so only the LANDING
    // rule can stop it.) The control below confirms the 12 *does* capture normally,
    // so this isn't a vacuous pass.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    state = place(state, 'red-0', { kind: 'track', square: 12 })
    expect(forPiton(state, 6, 'green-0')).toEqual([])
  })

  it('CAN capture a lone enemy 12 away on a non-safe square (the 12 control)', () => {
    // Square 13 is not safe; green-0 at 1 + 12 lands on red-0 → capture.
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 1 })
    state = place(state, 'red-0', { kind: 'track', square: 13 })
    expect(forPiton(state, 6, 'green-0')).toEqual([
      {
        pitonId: 'green-0',
        from: { kind: 'track', square: 1 },
        to: { kind: 'track', square: 13 },
        captures: 'red-0',
      },
    ])
  })

  it('never "captures" an ally — landing on your own is just blocked', () => {
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    state = place(state, 'green-1', { kind: 'track', square: 3 })
    expect(forPiton(state, 3, 'green-0')).toEqual([])
  })

  it('applyMove sends the captured enemy back to its nest', () => {
    let placed = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    placed = place(placed, 'red-0', { kind: 'track', square: 3 })
    const rolled = applyRoll(placed, 3)
    const move = legalMoves(rolled, 3).find((m) => m.captures === 'red-0')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'track',
      square: 3,
    })
    expect(next.players[1].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'nest',
    })
  })
})

describe('the 6 — extra turn & streak penalty (rung 5)', () => {
  const moveFor = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).find((m) => m.pitonId === id)!

  it('keeps the turn with the same player and bumps the streak on a 6', () => {
    const placed = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    const rolled = applyRoll(placed, 6)
    const next = applyMove(rolled, moveFor(rolled, 6, 'green-0'))

    expect(next.turn).toBe(0) // same player rolls again
    expect(next.phase).toBe('awaiting-roll')
    expect(next.extraTurnStreak).toBe(1)
    expect(next.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'track',
      square: 12, // a 6 moved twelve
    })
  })

  it('resets the streak and passes the turn on a non-6 after two 6s', () => {
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    s = applyMove(applyRoll(s, 6), moveFor(applyRoll(s, 6), 6, 'green-0')) // → sq 12, streak 1
    s = applyMove(applyRoll(s, 6), moveFor(applyRoll(s, 6), 6, 'green-0')) // → sq 24, streak 2
    expect(s.extraTurnStreak).toBe(2)
    expect(s.turn).toBe(0)

    s = applyMove(applyRoll(s, 3), moveFor(applyRoll(s, 3), 3, 'green-0')) // a 3 ends the run
    expect(s.turn).toBe(1)
    expect(s.extraTurnStreak).toBe(0)
    expect(s.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'track',
      square: 27,
    })
  })

  it('penalizes the 3rd consecutive 6: not played, leading track piton nested, turn passes', () => {
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 10 })
    s = place(s, 'green-1', { kind: 'track', square: 3 })
    s = { ...s, extraTurnStreak: 2 } // two 6s already played this turn

    const next = applyRoll(s, 6)

    // The most-advanced track piton (green-0, further along) goes back to the nest...
    expect(next.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'nest',
    })
    // ...the trailing one is untouched, and the 6 is never played (turn passes).
    expect(next.players[0].pitons.find((p) => p.id === 'green-1')?.position).toEqual({
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

  it('an unplayable 6 still grants another roll and bumps the streak', () => {
    // Fresh game: every piton is nested and a 6 is not an entry roll, so the 6
    // has no legal move — yet the player keeps the turn and rolls again.
    const next = applyRoll(createGame(JEU_DE_PITON), 6)

    expect(next.turn).toBe(0) // same player rolls again
    expect(next.phase).toBe('awaiting-roll')
    expect(next.lastRoll).toBeNull() // nothing was played
    expect(next.extraTurnStreak).toBe(1)
    expect(next.players[0].pitons.every((p) => p.position.kind === 'nest')).toBe(true)
  })

  it('counts unplayable 6s toward the streak — a third one fires the penalty', () => {
    // green-0 sits where +12 overshoots HOME (square 60, progress 60) and the rest
    // are nested, so every 6 this turn is unplayable. The first two still grant a
    // bonus roll; the third trips the lose-leading penalty all the same.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 60 })

    s = applyRoll(s, 6) // unplayable → streak 1, same player
    expect(s.extraTurnStreak).toBe(1)
    expect(s.turn).toBe(0)

    s = applyRoll(s, 6) // unplayable → streak 2, same player
    expect(s.extraTurnStreak).toBe(2)
    expect(s.turn).toBe(0)

    s = applyRoll(s, 6) // third 6 → penalty: leading track piton nested, turn passes
    expect(s.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'nest',
    })
    expect(s.turn).toBe(1)
    expect(s.extraTurnStreak).toBe(0)
  })

  it('an unplayable non-6 still forfeits the turn', () => {
    // A 4 with everyone nested has no move and is no bonus face → turn passes.
    const next = applyRoll(createGame(JEU_DE_PITON), 4)
    expect(next.turn).toBe(1)
    expect(next.extraTurnStreak).toBe(0)
  })
})

describe('legalMoves — lane, exact HOME & win (rung 6)', () => {
  const forPiton = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).filter((m) => m.pitonId === id)

  // Geometry: trackPathLength 64, laneLength 7 → lane steps 0..6 (progress
  // 64..70), HOME at progress 71. Red (player 0) enters at square 0.

  it('turns off the track into the home lane', () => {
    // Square 60 is progress 60; a 5 → progress 65 → lane step 1.
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 60 })
    expect(forPiton(state, 5, 'green-0')).toEqual([
      {
        pitonId: 'green-0',
        from: { kind: 'track', square: 60 },
        to: { kind: 'lane', step: 1 },
        captures: null,
      },
    ])
  })

  it('advances a piton already inside its lane', () => {
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 1 })
    expect(forPiton(state, 3, 'green-0')[0].to).toEqual({ kind: 'lane', step: 4 })
  })

  it('reaches HOME by exact count', () => {
    // Lane step 6 is progress 70; a 1 lands exactly on HOME (progress 71).
    const state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 6 })
    expect(forPiton(state, 1, 'green-0')[0].to).toEqual({ kind: 'finished' })
  })

  it('offers no move that would overshoot HOME', () => {
    // From lane step 6 (progress 70) a 2 overshoots HOME (progress 72) → illegal.
    const fromLane = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 6 })
    expect(forPiton(fromLane, 2, 'green-0')).toEqual([])
    // From the track too: square 60 (progress 60) + a 6 (twelve) → progress 72.
    const fromTrack = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 60 })
    expect(forPiton(fromTrack, 6, 'green-0')).toEqual([])
  })

  it('cannot pass one of its own pitons inside the lane', () => {
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 1 })
    state = place(state, 'green-1', { kind: 'lane', step: 3 })
    // green-0 + 3 would cross lane step 3 (ally) → blocked.
    expect(forPiton(state, 3, 'green-0')).toEqual([])
    // green-1 advancing deeper is unobstructed (→ lane step 5).
    expect(forPiton(state, 2, 'green-1')[0].to).toEqual({ kind: 'lane', step: 5 })
  })

  it('cannot land on one of its own pitons inside the lane', () => {
    let state = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 2 })
    state = place(state, 'green-1', { kind: 'lane', step: 4 })
    expect(forPiton(state, 2, 'green-0')).toEqual([]) // would land on green-1
  })

  it('applyMove finishes a lone piton and passes the turn', () => {
    const placed = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 6 })
    const rolled = applyRoll(placed, 1)
    const move = legalMoves(rolled, 1).find((m) => m.pitonId === 'green-0')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'green-0')?.position).toEqual({
      kind: 'finished',
    })
    expect(next.winner).toBeNull()
    expect(next.phase).toBe('awaiting-roll')
    expect(next.turn).toBe(1) // others still nested — turn passes
  })

  it('declares the winner when the last piton comes HOME — even off a 6', () => {
    let s = createGame(JEU_DE_PITON)
    s = place(s, 'green-0', { kind: 'finished' })
    s = place(s, 'green-1', { kind: 'finished' })
    s = place(s, 'green-2', { kind: 'finished' })
    s = place(s, 'green-3', { kind: 'track', square: 59 }) // progress 59 + 12 = HOME

    const rolled = applyRoll(s, 6)
    const move = legalMoves(rolled, 6).find((m) => m.pitonId === 'green-3')!
    const next = applyMove(rolled, move)

    expect(next.players[0].pitons.find((p) => p.id === 'green-3')?.position).toEqual({
      kind: 'finished',
    })
    expect(next.winner).toBe('green')
    expect(next.phase).toBe('game-over')
    // A winning move ends the game; the 6 grants no further roll.
    expect(legalMoves(next, 5)).toEqual([])
  })
})

describe('2v2 teams', () => {
  // Seats 0 (green) & 2 (blue) are one team; 1 (red) & 3 (yellow) the other.
  const team2v2 = () => createGame(JEU_DE_PITON, 4, undefined, [0, 1, 0, 1])
  const forPiton = (state: GameState, roll: number, id: string) =>
    legalMoves(state, roll).filter((m) => m.pitonId === id)

  it('treats a teammate as an ally — no capture on landing', () => {
    // green-0 + 3 lands on partner blue-0 at square 3 → blocked (no stacking, no
    // capturing a partner). The control: the same landing on an enemy (red) IS a
    // capture, so the block is the teammate rule, not geometry.
    let ally = place(team2v2(), 'green-0', { kind: 'track', square: 0 })
    ally = place(ally, 'blue-0', { kind: 'track', square: 3 })
    expect(forPiton(ally, 3, 'green-0')).toEqual([])

    let enemy = place(team2v2(), 'green-0', { kind: 'track', square: 0 })
    enemy = place(enemy, 'red-0', { kind: 'track', square: 3 })
    expect(forPiton(enemy, 3, 'green-0')[0].captures).toBe('red-0')
  })

  it('cannot pass through a teammate (partners block like your own)', () => {
    // blue-0 (partner) sits mid-path on a non-safe square; green-0 + 5 would cross
    // it → blocked, exactly as if it were green's own piton.
    let s = place(team2v2(), 'green-0', { kind: 'track', square: 2 })
    s = place(s, 'blue-0', { kind: 'track', square: 4 })
    expect(forPiton(s, 5, 'green-0')).toEqual([])
  })

  it('does not end the game when only one team member is all HOME', () => {
    // green brings its last piton HOME, but partner blue still has pitons out, so
    // the team isn't done — play continues, no winner.
    let s = team2v2()
    s = place(s, 'green-0', { kind: 'finished' })
    s = place(s, 'green-1', { kind: 'finished' })
    s = place(s, 'green-2', { kind: 'finished' })
    s = place(s, 'green-3', { kind: 'lane', step: 6 }) // a 1 finishes green
    s = place(s, 'blue-0', { kind: 'track', square: 40 }) // partner still out

    const rolled = applyRoll(s, 1)
    const next = applyMove(rolled, legalMoves(rolled, 1).find((m) => m.pitonId === 'green-3')!)

    expect(next.players[0].pitons.every((p) => p.position.kind === 'finished')).toBe(true)
    expect(next.phase).not.toBe('game-over')
    expect(next.winner).toBeNull()
  })

  it('a finished seat spends its turn moving its partner\'s pitons', () => {
    // green is entirely HOME on green's turn; it takes over blue (the partner) and
    // enters a blue piton on YELLOW's start square (34), not green's (0).
    let s = team2v2()
    for (const id of ['green-0', 'green-1', 'green-2', 'green-3']) s = place(s, id, { kind: 'finished' })

    expect(movingSeat(s)).toBe(2)
    const moves = legalMoves(s, 5)
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.every((m) => m.pitonId.startsWith('blue'))).toBe(true)
    expect(moves[0].to).toEqual({ kind: 'track', square: 34 })
  })

  it('ends the game and wins when the whole TEAM is HOME', () => {
    // green all HOME; partner blue has its last piton a step from HOME. green is on
    // the clock but moves blue's piton — finishing it completes the team.
    let s = team2v2()
    for (const id of ['green-0', 'green-1', 'green-2', 'green-3']) s = place(s, id, { kind: 'finished' })
    for (const id of ['blue-0', 'blue-1', 'blue-2']) s = place(s, id, { kind: 'finished' })
    s = place(s, 'blue-3', { kind: 'lane', step: 6 })

    const rolled = applyRoll(s, 1)
    const next = applyMove(rolled, legalMoves(rolled, 1).find((m) => m.pitonId === 'blue-3')!)

    expect(next.phase).toBe('game-over')
    expect(next.winner).toBe('blue') // the moving seat's colour; the UI reads its team
  })

  it('movingSeat stays the seat on the clock in a free-for-all', () => {
    // Default identity teams: a finished seat has no partner to take over.
    let s = createGame(JEU_DE_PITON)
    for (const id of ['green-0', 'green-1', 'green-2', 'green-3']) s = place(s, id, { kind: 'finished' })
    expect(movingSeat(s)).toBe(0)
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

    const red0 = next.players[0].pitons.find((p) => p.id === 'green-0')
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
      .filter((p) => p.id !== 'green-0')
    expect(stillNested.every((p) => p.position.kind === 'nest')).toBe(true)
  })

  it('does not mutate the input state', () => {
    const rolled = applyRoll(createGame(JEU_DE_PITON), 5)
    const before = structuredClone(rolled)
    const [entry] = legalMoves(rolled, 5)
    applyMove(rolled, entry)
    expect(rolled).toEqual(before)
  })

  it('start-square capture: exactly one piton leaves the nest, enemy goes home', () => {
    // Several capture-on-entry moves are offered (one per nested piton), but
    // applying one brings out ONLY that piton — the rest stay nested.
    const placed = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    const rolled = applyRoll(placed, 5)
    const move = legalMoves(rolled, 5).find((m) => m.captures === 'red-0')!
    const next = applyMove(rolled, move)

    const redOut = next.players[0].pitons.filter((p) => p.position.kind !== 'nest')
    expect(redOut).toHaveLength(1)
    expect(redOut[0].position).toEqual({ kind: 'track', square: 0 })
    expect(next.players[1].pitons.find((p) => p.id === 'red-0')?.position).toEqual({
      kind: 'nest',
    })
  })

  it('rejects a move outside the awaiting-move phase', () => {
    const fresh = createGame(JEU_DE_PITON)
    const move = legalMoves(fresh, 5)[0]
    expect(() => applyMove(fresh, move)).toThrow(/awaiting-move/)
  })
})
