/**
 * jeu-de-piton — AI move strategies.
 *
 * A *third* layer beside the engine and the UI: an AI here is a pure decision
 * policy. It reads engine state and the engine's own `legalMoves` list and
 * returns one of them — it never re-derives a rule, never touches the DOM, and
 * never mutates state. So it lives next to `src/engine/` (not inside it: the
 * engine owns the rules; a strategy only *chooses* among the moves the rules
 * already allow), and is unit-testable the same way.
 *
 * The whole decision surface of this game is a single question — "which legal
 * move do I play?" — because rolling is pure chance and entry/capture/finishing
 * all arrive pre-baked as items in the `Move` list. So a Strategy is just:
 *
 *     (state, moves) => Move
 *
 * This mirrors how a `Ruleset` makes rule variants swappable config rather than
 * code branches: a Strategy makes the *opponent* swappable. `randomStrategy` is
 * the trivial floor; `greedyStrategy` is the shipped first brain. A future
 * search-based AI is just another function of the same shape — no caller changes.
 */

import { progressOf, type GameState, type Move } from '../engine'

/**
 * An AI policy: pick one move from the engine-supplied legal list. `moves` is
 * assumed non-empty (the caller only consults a strategy in `awaiting-move`,
 * where at least one legal move exists by construction). Pure — the same inputs
 * always yield the same choice, except `randomStrategy`, whose RNG is injectable
 * for deterministic tests.
 */
export type Strategy = (state: GameState, moves: Move[]) => Move

/**
 * How far along its journey the piton making `move` currently sits (its `from`
 * progress). Used to rank candidate moves so the AI advances its *leading*
 * piton. A nest piton is off the journey line (`progressOf` → null); treat it as
 * −1 so a piton already on the board always outranks one still nested.
 */
function fromProgress(state: GameState, move: Move): number {
  const entryIndex = state.geometry.entryIndices[state.turn]
  return progressOf(move.from, entryIndex, state.geometry) ?? -1
}

/** The move whose piton is furthest along (ties broken by list order). */
function mostAdvanced(state: GameState, moves: Move[]): Move {
  return moves.reduce((best, m) =>
    fromProgress(state, m) > fromProgress(state, best) ? m : best,
  )
}

/**
 * The shipped first brain — a fixed priority ladder, no lookahead:
 *
 *   1. FINISH a piton (land on HOME) — the goal of the game.
 *   2. CAPTURE a lone enemy — sets an opponent right back.
 *   3. LEAVE THE NEST — get another piton into play.
 *   4. otherwise ADVANCE THE LEADER — move the furthest-along piton.
 *
 * It walks the tiers top-down and plays the first that has any candidate; within
 * a tier it picks the most-advanced piton, so even ties are deterministic (and
 * tier 4 is just that tie-break applied to every remaining move). Good enough to
 * feel non-broken; deliberately not clever — a smarter Strategy replaces it
 * wholesale later, this file untouched.
 */
export const greedyStrategy: Strategy = (state, moves) => {
  const tiers: Array<(m: Move) => boolean> = [
    (m) => m.to.kind === 'finished',
    (m) => m.captures != null,
    (m) => m.from.kind === 'nest',
    () => true,
  ]
  for (const tier of tiers) {
    const candidates = moves.filter(tier)
    if (candidates.length > 0) return mostAdvanced(state, candidates)
  }
  // Unreachable: the final tier matches every move, so `moves` non-empty ⇒ a
  // return above. Kept as a total-function guard.
  return moves[0]
}

/**
 * The trivial floor: pick any legal move uniformly at random. Exists both as the
 * simplest possible `Strategy` and to make the swappable-policy seam concrete.
 * `rng` returns a float in [0, 1) — defaults to `Math.random`, injectable for
 * deterministic tests (same convention as the engine's `rollDie`).
 */
export const randomStrategy =
  (rng: () => number = Math.random): Strategy =>
  (_state, moves) =>
    moves[Math.floor(rng() * moves.length)]
