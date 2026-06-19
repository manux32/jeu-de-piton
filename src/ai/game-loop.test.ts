import { describe, it, expect } from 'vitest'
import {
  createGame,
  rollDie,
  legalMoves,
  applyRoll,
  applyMove,
  JEU_DE_PITON,
  type GameState,
} from '../engine'
import { greedyStrategy, type Strategy } from './strategy'

/**
 * A seeded RNG (mulberry32) so a "play a whole game" run is deterministic and
 * reproducible — same seed, same game, every CI run.
 */
function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Drive a full game with every seat played by `strategy` — the synchronous,
 * React-free twin of the useAiTurn loop (roll → pick → repeat). Returns the final
 * state plus how many steps it took, or throws if it blows the step budget
 * (which would mean the loop can't make progress — the wedge we want to catch).
 */
function playOut(
  strategy: Strategy,
  rng: () => number,
  playerCount = 4,
  maxSteps = 100_000,
): { state: GameState; steps: number } {
  let state = createGame(JEU_DE_PITON, playerCount)
  let steps = 0
  while (state.phase !== 'game-over') {
    if (steps++ > maxSteps) {
      throw new Error(`game did not finish within ${maxSteps} steps — wedged?`)
    }
    if (state.phase === 'awaiting-roll') {
      state = applyRoll(state, rollDie(rng))
    } else {
      const moves = legalMoves(state, state.lastRoll!)
      state = applyMove(state, strategy(state, moves))
    }
  }
  return { state, steps }
}

describe('greedyStrategy — full self-played games', () => {
  // A handful of seeds: each must terminate with exactly one winner whose four
  // pitons are all HOME. This exercises the whole engine+strategy stack the way
  // an all-AI ([] humanSeats) game does, and would surface a non-progressing loop.
  it.each([1, 7, 42, 1337, 99999])('finishes a 4-player game (seed %i)', (seed) => {
    const { state, steps } = playOut(greedyStrategy, seededRng(seed))

    expect(state.phase).toBe('game-over')
    expect(state.winner).not.toBeNull()
    expect(steps).toBeLessThan(100_000)

    const winner = state.players.find((p) => p.color === state.winner)!
    expect(winner.pitons.every((pt) => pt.position.kind === 'finished')).toBe(true)
    // Exactly one player can have all four home (the game stops on the first).
    const allHome = state.players.filter((p) =>
      p.pitons.every((pt) => pt.position.kind === 'finished'),
    )
    expect(allHome).toHaveLength(1)
  })

  it('also finishes 2- and 3-player games', () => {
    for (const count of [2, 3]) {
      const { state } = playOut(greedyStrategy, seededRng(2026), count)
      expect(state.phase).toBe('game-over')
      expect(state.winner).not.toBeNull()
    }
  })
})
