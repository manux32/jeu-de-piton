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

import {
  legalMoves,
  progressOf,
  type GameState,
  type Move,
  type PitonPosition,
} from '../engine'

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

/** A copy of `state` with one piton relocated — for hypothetical look-ahead. */
function withPitonAt(
  state: GameState,
  pitonId: string,
  to: PitonPosition,
): GameState {
  return {
    ...state,
    players: state.players.map((pl) => ({
      ...pl,
      pitons: pl.pitons.map((p) => (p.id === pitonId ? { ...p, position: to } : p)),
    })),
  }
}

/**
 * Could any rival capture the piton `pitonId` (at wherever it sits in `state`) on
 * their very next single roll? Asked by stepping into each other seat and running
 * the engine's own `legalMoves` for all six die faces, then looking for a move
 * that lands on this piton. Delegating to `legalMoves` (rather than re-deriving
 * the chase by hand) means every real rule is honoured for free: passing/blocking
 * (a piton screened by a blocker in the chase lane is NOT a threat), safe-square
 * immunity, the home-lane turn-off (a rival about to leave the ring can't reach
 * it), and even the start-square capture (a rival popping out of its nest onto its
 * own start to grab a piton parked there). The six faces span a rival's whole
 * reach — 1–5, plus a 6's twelve. `ownerSeat` is excluded since a piton is never
 * a threat to itself.
 */
function capturableNextRoll(
  state: GameState,
  ownerSeat: number,
  pitonId: string,
): boolean {
  for (let seat = 0; seat < state.players.length; seat++) {
    if (seat === ownerSeat) continue
    const rivalView = { ...state, turn: seat }
    for (let roll = 1; roll <= 6; roll++) {
      if (legalMoves(rivalView, roll).some((m) => m.captures === pitonId)) return true
    }
  }
  return false
}

/**
 * The shipped first brain — a fixed priority ladder, no lookahead:
 *
 *   1. REACH SAFETY OFF THE TRACK — a piton on the open track enters its home
 *      lane or goes straight HOME; gets it off the exposed ring.
 *   2. LEAVE A DANGEROUS START — vacate an opponent's start square while that
 *      opponent still has a nested piton (it could exit the nest onto its own
 *      start and capture us there — the one capture a start square doesn't shield).
 *   3. CAPTURE a lone enemy — sets an opponent right back.
 *   4. LEAVE THE NEST — get another piton into play.
 *   5. VACATE THE START SQUARE — move our piton off our own entry square so a
 *      nested piton can come out next turn; only while the nest isn't empty.
 *   6. REACH A SAFE SQUARE — land on a marked square, immune from capture. A
 *      *dangerous* start (an opponent's start whose owner still nests a piton) is
 *      marked safe yet isn't — the owner can pop out onto it and capture — so it
 *      does NOT qualify here; such a move falls through to a later tier.
 *   7. UN-CLOG THE HOME LANE — advance any piton already in the home lane (safe
 *      where it sits, so this is free progress that also clears the lane for
 *      pitons still to come). Most-advanced first, so a piton that can land HOME
 *      is preferred.
 *   8. DODGE A CAPTURE — a one-ply lookahead. Among the track pitons (leader
 *      first), if one is *currently* capturable by some rival next turn AND its
 *      single move this roll lands it on a square no rival can then reach, play
 *      that escape. Skips a piton that can't get clear (moving wouldn't help).
 *   9. otherwise ADVANCE THE LEADER — move the furthest-along piton.
 *
 * Cutting across the predicate tiers (1–7) is one *soft* avoidance: prefer not to
 * land on a *dangerous* start square (an opponent's start whose owner still has a
 * nested piton), but take one if a tier offers nothing else — the mirror of tier 2
 * on the landing side. The exception is tier 6, where the avoidance is *hard*: a
 * dangerous start is marked safe yet is the one square a "reach safety" move must
 * never pick, so it's excluded from the tier outright rather than merely
 * deprioritised. Tier 8 needs no guard: a dangerous-start landing is, by
 * definition, capturable next turn (the owner exits onto it), so
 * `capturableNextRoll` already rejects it as a non-escape.
 *
 * It walks tiers 1–7 top-down and plays the first that has any candidate; within
 * a tier it drops dangerous-start landings (unless that would leave none), then
 * picks the most-advanced piton, so even ties are deterministic. If none match it
 * tries the dodge (8), then falls back to advancing the leader (9). Good enough to
 * feel non-broken; deliberately not clever — a smarter Strategy replaces it
 * wholesale later, this file untouched.
 */
export const greedyStrategy: Strategy = (state, moves) => {
  const entryIndex = state.geometry.entryIndices[state.turn]
  const { safeSquares } = state.ruleset
  const hasNestPiton = state.players[state.turn].pitons.some(
    (p) => p.position.kind === 'nest',
  )
  // Start squares of *other* players who still hold a nested piton: each can
  // exit the nest straight onto it and capture whoever sits there next turn.
  const dangerousStarts = new Set(
    state.players.flatMap((player, seat) =>
      seat !== state.turn &&
      player.pitons.some((p) => p.position.kind === 'nest')
        ? [state.geometry.entryIndices[seat]]
        : [],
    ),
  )
  const landsOnDangerousStart = (m: Move) =>
    m.to.kind === 'track' && dangerousStarts.has(m.to.square)
  const tiers: Array<(m: Move) => boolean> = [
    (m) =>
      m.from.kind === 'track' &&
      (m.to.kind === 'lane' || m.to.kind === 'finished'),
    (m) => m.from.kind === 'track' && dangerousStarts.has(m.from.square),
    (m) => m.captures != null,
    (m) => m.from.kind === 'nest',
    (m) =>
      hasNestPiton && m.from.kind === 'track' && m.from.square === entryIndex,
    (m) =>
      m.to.kind === 'track' &&
      safeSquares.includes(m.to.square) &&
      !landsOnDangerousStart(m),
    (m) => m.from.kind === 'lane',
  ]
  for (const tier of tiers) {
    const candidates = moves.filter(tier)
    if (candidates.length === 0) continue
    // Prefer not landing on a dangerous start; fall back to all if that empties.
    const safe = candidates.filter((m) => !landsOnDangerousStart(m))
    return mostAdvanced(state, safe.length > 0 ? safe : candidates)
  }

  // Tier 8 — DODGE A CAPTURE. Past the predicate tiers, every remaining move is a
  // track→track step (nest/lane/safety/capture cases all already returned). Take
  // the most-advanced piton first; if it's capturable next turn and its one move
  // this roll lands it where no rival can reach, escape there.
  for (const move of [...moves].sort((a, b) => fromProgress(state, b) - fromProgress(state, a))) {
    if (move.from.kind !== 'track') continue // defensive; all are track here
    if (!capturableNextRoll(state, state.turn, move.pitonId)) continue
    const after = withPitonAt(state, move.pitonId, move.to)
    if (!capturableNextRoll(after, state.turn, move.pitonId)) return move
  }

  // Tier 9 — ADVANCE THE LEADER (the default). Same dangerous-start avoidance.
  const safe = moves.filter((m) => !landsOnDangerousStart(m))
  return mostAdvanced(state, safe.length > 0 ? safe : moves)
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

/**
 * The selectable AI strategies, by stable id, in the order a picker should list
 * them (easiest first). This is the indirection seam the New Game window picks
 * through: the UI stores an id per AI seat and asks `STRATEGY_BY_ID` for the
 * policy to run, so swapping which brain "Easy"/"Hard" map to — or adding a
 * third rung — happens here, with no UI change.
 *
 * The *display labels* deliberately live in the UI layer (`strings.ts`), not
 * here: this layer owns the policies and their ids; renaming "Easy"/"Hard" (or
 * translating them) never touches the ai code.
 */
export const STRATEGY_IDS = ['easy', 'hard'] as const
export type StrategyId = (typeof STRATEGY_IDS)[number]

export const STRATEGY_BY_ID: Record<StrategyId, Strategy> = {
  easy: randomStrategy(),
  hard: greedyStrategy,
}
