import { describe, it, expect } from 'vitest'
import {
  createGame,
  legalMoves,
  JEU_DE_PITON,
  type GameState,
  type Move,
  type PitonPosition,
} from '../engine'
import { greedyStrategy, randomStrategy } from './strategy'

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

describe('greedyStrategy — priority ladder', () => {
  it('prefers FINISHING over every other move', () => {
    // red-0 at lane step 6 finishes on a 1; red-1 mid-track could also move, and
    // a 1 is not an entry roll so no nest move competes — finish must win.
    let s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'lane', step: 6 })
    s = place(s, 'red-1', { kind: 'track', square: 20 })
    const moves = legalMoves(s, 1)
    expect(greedyStrategy(s, moves).to).toEqual({ kind: 'finished' })
  })

  it('prefers CAPTURING when nothing finishes', () => {
    // red-0 + 3 lands on lone blue-0 (square 3, not safe) → capture; red-1 also
    // has a plain move available. Capture must be chosen.
    let s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 0 })
    s = place(s, 'red-1', { kind: 'track', square: 20 })
    s = place(s, 'blue-0', { kind: 'track', square: 3 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.captures).toBe('blue-0')
  })

  it('LEAVES THE NEST when nothing finishes or captures', () => {
    // A 5 with red-0 already on the track: entry moves (from nest) compete with
    // red-0 advancing. No finish, no capture → leave-nest wins.
    const s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 20 })
    const chosen = greedyStrategy(s, legalMoves(s, 5))
    expect(chosen.from).toEqual({ kind: 'nest' })
  })

  it('falls back to ADVANCING THE LEADER (most-advanced piton)', () => {
    // Two pitons on the track, no finish/capture/entry available on a 3 — the AI
    // moves the one furthest along (red-1 at square 30 over red-0 at square 5).
    let s = place(createGame(JEU_DE_PITON), 'red-0', { kind: 'track', square: 5 })
    s = place(s, 'red-1', { kind: 'track', square: 30 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('red-1')
  })

  it('breaks within-tier ties by most-advanced piton', () => {
    // Two capture moves on a 3: red-0 (square 5) takes blue at 8, red-1 (square
    // 30) takes yellow at 33. Both capture → the leader (red-1) is chosen.
    let s = createGame(JEU_DE_PITON, 4)
    s = place(s, 'red-0', { kind: 'track', square: 5 })
    s = place(s, 'red-1', { kind: 'track', square: 30 })
    s = place(s, 'blue-0', { kind: 'track', square: 8 })
    s = place(s, 'yellow-0', { kind: 'track', square: 33 })
    const moves = legalMoves(s, 3)
    expect(moves.filter((m) => m.captures != null).length).toBe(2) // guard the setup
    expect(greedyStrategy(s, moves).pitonId).toBe('red-1')
  })

  it('always returns one of the supplied legal moves', () => {
    const s = createGame(JEU_DE_PITON)
    const moves = legalMoves(s, 5)
    expect(moves).toContain(greedyStrategy(s, moves))
  })
})

describe('randomStrategy', () => {
  it('picks the move the injected RNG points at', () => {
    const s = createGame(JEU_DE_PITON)
    const moves: Move[] = legalMoves(s, 5)
    expect(moves.length).toBeGreaterThan(1) // four entry moves on a 5
    // rng 0 → first, ~0.99 → last.
    expect(randomStrategy(() => 0)(s, moves)).toBe(moves[0])
    expect(randomStrategy(() => 0.999)(s, moves)).toBe(moves[moves.length - 1])
  })

  it('only ever returns a supplied move', () => {
    const s = createGame(JEU_DE_PITON)
    const moves = legalMoves(s, 5)
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      expect(moves).toContain(randomStrategy(() => r)(s, moves))
    }
  })
})
