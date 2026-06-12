/**
 * jeu-de-piton — rolling, legal-move generation, and applying a move.
 *
 * Pure TypeScript, no React/DOM. The turn loop is a small state machine over
 * `GameState.phase`:
 *
 *   awaiting-roll ──applyRoll(roll)──▶ awaiting-move ──applyMove(move)──▶ …
 *         ▲                  │ (no legal move)              │
 *         └──────────────────┴──────────────────────────────┘  (turn passes)
 *
 * Randomness is isolated in `rollDie` (the only impure-ish bit, and it takes an
 * injectable RNG); everything else is a pure function of `(state, number)` so
 * the rules are deterministic and fully testable.
 *
 * RUNG 2 of the engine-core ladder covers ENTRY only: a piton leaving the nest
 * onto its entry square. Movement for pitons already on the track or in a home
 * lane (the path-aware step, capture, the 6, win) lands in later rungs; the
 * extension points are marked below.
 */

import type { GameState, Move, PitonPosition } from './types'

/**
 * Roll a single die (1–6). `rng` returns a float in [0, 1) — defaults to
 * `Math.random`, but tests inject a stub for determinism.
 */
export function rollDie(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1
}

/** Is any piton (any owner) sitting on this absolute track square? */
function squareOccupied(state: GameState, square: number): boolean {
  return state.players.some((pl) =>
    pl.pitons.some((p) => p.position.kind === 'track' && p.position.square === square),
  )
}

/**
 * Every legal move for the current player given `roll`. Independent of `phase`
 * (other than returning none once the game is over), so it doubles as the query
 * `applyRoll` uses to decide whether a turn can be played.
 */
export function legalMoves(state: GameState, roll: number): Move[] {
  if (state.phase === 'game-over') return []

  const player = state.players[state.turn]
  const entryIndex = state.geometry.entryIndices[state.turn]
  const moves: Move[] = []

  // --- Entry: a nest piton onto its entry square --------------------------
  // The entry square is itself a safe square, so an occupant there can never be
  // captured and (no stacking) blocks entry entirely — regardless of owner.
  if (state.ruleset.entryRolls.includes(roll) && !squareOccupied(state, entryIndex)) {
    for (const piton of player.pitons) {
      if (piton.position.kind === 'nest') {
        moves.push({
          pitonId: piton.id,
          from: piton.position,
          to: { kind: 'track', square: entryIndex },
          captures: null,
        })
      }
    }
  }

  // --- Track / lane movement: added in rung 3 -----------------------------

  return moves
}

/**
 * Advance to the next player and reset to `awaiting-roll`. The consecutive
 * extra-turn streak resets when the turn changes hands. (Extra turns that keep
 * the turn with the same player land in rung 5; for now every move passes.)
 */
function passTurn(state: GameState): GameState {
  return {
    ...state,
    turn: (state.turn + 1) % state.players.length,
    phase: 'awaiting-roll',
    lastRoll: null,
    extraTurnStreak: 0,
  }
}

/**
 * Apply a roll in the `awaiting-roll` phase. If the roll has at least one legal
 * move, enter `awaiting-move` with the roll recorded. If it has none, the turn
 * is forfeited immediately (forced-move: passing is only allowed when nothing
 * can move) and play passes to the next player.
 */
export function applyRoll(state: GameState, roll: number): GameState {
  if (state.phase !== 'awaiting-roll') {
    throw new Error(`applyRoll requires phase 'awaiting-roll', got '${state.phase}'`)
  }
  if (legalMoves(state, roll).length === 0) {
    return passTurn(state)
  }
  return { ...state, lastRoll: roll, phase: 'awaiting-move' }
}

/** Immutably set the positions of the given pitons (by id). */
function setPositions(
  state: GameState,
  updates: Record<string, PitonPosition>,
): GameState {
  return {
    ...state,
    players: state.players.map((pl) => ({
      ...pl,
      pitons: pl.pitons.map((p) =>
        p.id in updates ? { ...p, position: updates[p.id] } : p,
      ),
    })),
  }
}

/**
 * Apply a chosen move and hand play on. Moves the piton to `move.to`, sends any
 * captured piton back to its nest, then passes the turn.
 *
 * Turn handoff here is provisional: the 6's extra turn + streak penalty (rung 5)
 * and win detection (rung 6) will hook in before `passTurn`.
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (state.phase !== 'awaiting-move') {
    throw new Error(`applyMove requires phase 'awaiting-move', got '${state.phase}'`)
  }
  const updates: Record<string, PitonPosition> = { [move.pitonId]: move.to }
  if (move.captures) updates[move.captures] = { kind: 'nest' }
  return passTurn(setPositions(state, updates))
}
