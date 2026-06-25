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
    // green-0 at lane step 6 finishes on a 1; green-1 mid-track could also move, and
    // a 1 is not an entry roll so no nest move competes — finish must win.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 6 })
    s = place(s, 'green-1', { kind: 'track', square: 20 })
    const moves = legalMoves(s, 1)
    expect(greedyStrategy(s, moves).to).toEqual({ kind: 'finished' })
  })

  it('prefers CAPTURING when nothing finishes', () => {
    // green-0 + 3 lands on lone red-0 (square 3, not safe) → capture; green-1 also
    // has a plain move available. Capture must be chosen.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    s = place(s, 'green-1', { kind: 'track', square: 20 })
    s = place(s, 'red-0', { kind: 'track', square: 3 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.captures).toBe('red-0')
  })

  it('LEAVES THE NEST when nothing finishes or captures', () => {
    // A 5 with green-0 already on the track: entry moves (from nest) compete with
    // green-0 advancing. No finish, no capture → leave-nest wins.
    const s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 20 })
    const chosen = greedyStrategy(s, legalMoves(s, 5))
    expect(chosen.from).toEqual({ kind: 'nest' })
  })

  it('VACATES THE START SQUARE over advancing the leader, while a piton waits in the nest', () => {
    // No finish/capture, and a 3 is not an entry roll (entry is 5) so no nest
    // move competes. green-0 sits on green's own start (square 0); green-1 is further
    // along at 30. green-2/green-3 are still nested, so freeing the start outranks
    // moving the leader — green-0 is chosen despite green-1 being more advanced.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    s = place(s, 'green-1', { kind: 'track', square: 30 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.from).toEqual({ kind: 'track', square: 0 })
  })

  it('does NOT prioritise vacating the start square when the nest is empty', () => {
    // Same start-square piton (green-0 at 0), but all four pitons are on the track
    // now — nothing waits in the nest, so freeing the start buys nothing and the
    // tier is skipped. The AI falls through to advancing the leader (green-3 at 40).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 0 })
    s = place(s, 'green-1', { kind: 'track', square: 10 })
    s = place(s, 'green-2', { kind: 'track', square: 30 })
    s = place(s, 'green-3', { kind: 'track', square: 40 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-3')
  })

  it('REACHES A SAFE SQUARE over advancing the leader', () => {
    // No finish/capture/entry/start-vacate in play. green-0 at 4 + 3 lands on the
    // marked safe square 7; green-1 is the leader at 30 (+3 → 33, not safe). The
    // safe landing wins even though green-1 is further along.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 4 })
    s = place(s, 'green-1', { kind: 'track', square: 30 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.to).toEqual({ kind: 'track', square: 7 })
  })

  it('falls back to ADVANCING THE LEADER (most-advanced piton)', () => {
    // Two pitons on the track, no finish/capture/entry available on a 3 — the AI
    // moves the one furthest along (green-1 at square 30 over green-0 at square 5).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 5 })
    s = place(s, 'green-1', { kind: 'track', square: 30 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-1')
  })

  it('breaks within-tier ties by most-advanced piton', () => {
    // Two capture moves on a 3: green-0 (square 5) takes red at 8, green-1 (square
    // 30) takes blue at 33. Both capture → the leader (green-1) is chosen.
    let s = createGame(JEU_DE_PITON, 4)
    s = place(s, 'green-0', { kind: 'track', square: 5 })
    s = place(s, 'green-1', { kind: 'track', square: 30 })
    s = place(s, 'red-0', { kind: 'track', square: 8 })
    s = place(s, 'blue-0', { kind: 'track', square: 33 })
    const moves = legalMoves(s, 3)
    expect(moves.filter((m) => m.captures != null).length).toBe(2) // guard the setup
    expect(greedyStrategy(s, moves).pitonId).toBe('green-1')
  })

  it('RUSHES a track piton off the ring into its home lane, over capturing', () => {
    // green-0 at track 63 (one short of the lane mouth at progress 64) enters its
    // home lane on a 1; green-1 + 1 could instead capture lone red-0 at 6. Getting
    // off the exposed ring (tier 1) now outranks the capture (tier 3).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 63 })
    s = place(s, 'green-1', { kind: 'track', square: 5 })
    s = place(s, 'red-0', { kind: 'track', square: 6 })
    const moves = legalMoves(s, 1)
    expect(moves.some((m) => m.captures === 'red-0')).toBe(true) // guard the setup
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.to).toEqual({ kind: 'lane', step: 0 })
  })

  it('LEAVES a dangerous opponent start square, over capturing', () => {
    // green-0 sits on blue's start (square 34); blue still has nested pitons, so
    // blue could exit the nest onto 34 next turn and capture green-0. Vacating it
    // (tier 2) beats green-1's available capture of red-0 (tier 3).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 34 })
    s = place(s, 'green-1', { kind: 'track', square: 5 })
    s = place(s, 'red-0', { kind: 'track', square: 6 })
    const moves = legalMoves(s, 1)
    expect(moves.some((m) => m.captures === 'red-0')).toBe(true) // guard the setup
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.from).toEqual({ kind: 'track', square: 34 })
  })

  it('avoids LANDING on a dangerous start when another safe square is reachable', () => {
    // Both candidates reach a marked safe square on a 1: green-1 (leader, 33→34) and
    // green-0 (6→7). But square 34 is blue's start and blue is nested — a trap.
    // The within-tier avoidance drops it, so the less-advanced green-0→7 is chosen.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 6 })
    s = place(s, 'green-1', { kind: 'track', square: 33 })
    const moves = legalMoves(s, 1)
    expect(moves.some((m) => m.to.kind === 'track' && m.to.square === 34)).toBe(true)
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.to).toEqual({ kind: 'track', square: 7 })
  })

  it('does NOT treat a dangerous start as a safe square, even when it is the only one reachable', () => {
    // green-0 at 33 + 1 lands on square 34 — a marked safe square, but it's blue's
    // start and blue is still nested, so blue can pop out onto it and capture.
    // It's the ONLY safe-square landing on a 1 (green-1 at 30 → 31 isn't safe). Tier 6
    // must skip it rather than parking there; the AI falls through to advancing the
    // leader, which also shuns the trap — so green-1 moves instead.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 33 })
    s = place(s, 'green-1', { kind: 'track', square: 30 })
    const moves = legalMoves(s, 1)
    expect(moves.some((m) => m.to.kind === 'track' && m.to.square === 34)).toBe(true) // guard the setup
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-1')
    expect(chosen.to).toEqual({ kind: 'track', square: 31 })
  })

  it('deprioritises FINISHING FROM THE LANE below rushing a track piton to safety', () => {
    // green-0 in the home lane (step 6) finishes on a 1; green-1 at track 63 instead
    // enters the lane. The lane piton is already safe, so getting green-1 off the
    // exposed ring (tier 1) outranks the lane move / finish (tier 7).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 6 })
    s = place(s, 'green-1', { kind: 'track', square: 63 })
    const moves = legalMoves(s, 1)
    expect(moves.some((m) => m.to.kind === 'finished')).toBe(true) // guard the setup
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-1')
    expect(chosen.to).toEqual({ kind: 'lane', step: 0 })
  })

  it('UN-CLOGS THE HOME LANE — advances a lane piton (not just finishing) over the leader', () => {
    // green-0 sits in the lane at step 2; a 3 walks it to step 5 (no finish). green-1
    // is the track leader at 40. Advancing the safe lane piton to clear the lane
    // (tier 7) outranks moving the more-advanced track leader (tier 9).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 2 })
    s = place(s, 'green-1', { kind: 'track', square: 40 })
    const moves = legalMoves(s, 3)
    expect(moves.some((m) => m.to.kind === 'finished')).toBe(false) // guard: not a finish
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.to).toEqual({ kind: 'lane', step: 5 })
  })

  it('keeps UN-CLOGGING THE LANE above dodging a capture threat', () => {
    // green-1 on the track at 10 is chased by red-0 at 7 (a 3 lands red on 10) and
    // could dodge to 13; but green-0 has a lane move (step 2 → 5). The lane tier (7)
    // fires first, so the lane piton moves and the endangered track piton is left.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'lane', step: 2 })
    s = place(s, 'green-1', { kind: 'track', square: 10 })
    s = place(s, 'red-0', { kind: 'track', square: 7 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-0')
  })

  it('DODGES A CAPTURE — escapes a chased piton to a threat-free square', () => {
    // green-0 at 10 is capturable next turn by red-0 at 7 (red + 3 → 10). A 3 walks
    // green-0 to 13, which no rival can reach (red would need a 6-step, which the die
    // never gives). green-1 (leader at 40) isn't threatened, so the dodge picks green-0.
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 10 })
    s = place(s, 'green-1', { kind: 'track', square: 40 })
    s = place(s, 'red-0', { kind: 'track', square: 7 })
    const moves = legalMoves(s, 3)
    expect(moves.some((m) => m.captures != null)).toBe(false) // guard: no capture tier
    const chosen = greedyStrategy(s, moves)
    expect(chosen.pitonId).toBe('green-0')
    expect(chosen.to).toEqual({ kind: 'track', square: 13 })
  })

  it('does NOT dodge when the move stays within capture range — falls back to the leader', () => {
    // green-0 at 20 is chased by red-0 at 18 (two behind): red + 2 → 20 now, and
    // red + 5 → 23 after the move — so walking green-0 to 23 on a 3 escapes nothing.
    // With no real escape the AI falls through to advancing the leader (green-1 at 40).
    let s = place(createGame(JEU_DE_PITON), 'green-0', { kind: 'track', square: 20 })
    s = place(s, 'green-1', { kind: 'track', square: 40 })
    s = place(s, 'red-0', { kind: 'track', square: 18 })
    const chosen = greedyStrategy(s, legalMoves(s, 3))
    expect(chosen.pitonId).toBe('green-1')
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
