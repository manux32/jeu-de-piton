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
 * RUNG 3 adds PLAIN TRACK MOVEMENT: a piton already on the shared track walks
 * `step` squares (a 6 moves 12 via `rollStepOverrides`), respecting the cabin
 * passing rules — allies block passage, an occupied safe square blocks all
 * passage, and no square may hold two pitons. RUNG 4 adds CAPTURE: landing
 * exactly on a lone enemy off a safe square is legal and sends it back to its
 * nest (`Move.captures`); an ally or a safe enemy still blocks the landing.
 * RUNG 5 wires up THE 6's turn consequences: rolling the `extraTurnOn` face
 * keeps the turn with the same player (an extra roll) and bumps the streak,
 * until the `extraTurnStreakLimit`th consecutive one — which is "not played" at
 * all: `applyRoll` pre-empts it, nesting the player's most-advanced track piton
 * (`lose-leading`) and passing the turn. RUNG 6 closes the journey: a piton may
 * turn off the shared track into its OWN private home lane, advance there, and
 * reach HOME by exact count (an overshoot is no move — `exactHomeEntry`). Lanes
 * are private, so only the mover's own pitons block in them — no enemies, no
 * captures, no safe squares. When all of a player's pitons are HOME, `applyMove`
 * ends the game (winner set, no extra turn even off a 6). Earlier rung 2 covers
 * ENTRY (nest → entry square).
 *
 * TEAMS (2v2) layer cleanly on top via `GameState.teams` and `movingSeat`. The
 * win condition is the whole TEAM home, and a seat whose own pitons are all HOME
 * spends its turns moving its partner's pitons — both always team-aware
 * (`sameTeam`). Whether a teammate is also an ally *for movement* (no capture, no
 * passing through, blocks like your own) is the partnership *style*
 * (`GameState.partnersAreAllies`, the `movementAlly` predicate): the "friendly"
 * mode says yes; the official mode says no — partners play a normal game against
 * each other until one finishes. A free-for-all is the special case where each
 * seat is its own team, so both predicates collapse to "same seat" and every
 * function here behaves exactly as before.
 */

import type { GameState, Move, PitonPosition } from './types'
import { positionAt, progressOf } from './board'

/**
 * Roll a single die (1–6). `rng` returns a float in [0, 1) — defaults to
 * `Math.random`, but tests inject a stub for determinism.
 */
export function rollDie(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1
}

/** The piton (its owner index + id) sitting on absolute track `square`, or null. */
function pitonOnSquare(
  state: GameState,
  square: number,
): { player: number; id: string } | null {
  for (let i = 0; i < state.players.length; i++) {
    const here = state.players[i].pitons.find(
      (p) => p.position.kind === 'track' && p.position.square === square,
    )
    if (here) return { player: i, id: here.id }
  }
  return null
}

/** Seat that owns the piton with `pitonId`, or -1 if none. A piton's owner is
 *  fixed by its colour and never changes — distinct from the seat *playing* it,
 *  which differs when a finished 2v2 seat moves a partner's piton. The UI needs
 *  this to draw the move on the OWNER's arm (home lane / nest), not the clock's. */
export function seatOfPiton(state: GameState, pitonId: string): number {
  return state.players.findIndex((pl) => pl.pitons.some((pt) => pt.id === pitonId))
}

/** Do seats `a` and `b` share a team? In a free-for-all every seat is its own
 *  team, so this is just `a === b`. Used for the *team* rules — takeover and the
 *  win condition — which are team-aware in every 2v2 mode. */
function sameTeam(state: GameState, a: number, b: number): boolean {
  return state.teams[a] === state.teams[b]
}

/** Are seats `a` and `b` allies *for movement* — i.e. does b's piton block/shield
 *  a (no capture, no passing through, blocks like your own)? Your own seat always
 *  is; a teammate is only in the "2v2 friendly" mode (`partnersAreAllies`). In the
 *  official 2v2 mode partners are enemies for movement, so this is just `a === b`
 *  there — and in a free-for-all it always is, leaving the solo rules untouched. */
function movementAlly(state: GameState, a: number, b: number): boolean {
  if (!sameTeam(state, a, b)) return false
  return a === b || state.partnersAreAllies
}

/** Are all of seat `s`'s own pitons HOME? */
function seatFinished(state: GameState, s: number): boolean {
  return state.players[s].pitons.every((p) => p.position.kind === 'finished')
}

/**
 * Which seat's pitons the player on the clock actually moves this turn. Normally
 * its own — but once all of its own pitons are HOME, it takes over its (still
 * unfinished) teammate's pitons: the partnership tempo rule, where a finished
 * player keeps rolling on the team's behalf, so the team effectively gets two
 * turns per lap on what's left. With no teams (each seat its own team) the loop
 * finds no teammate, so this is always `state.turn` and every rule below stays
 * the solo rule. A whole team being HOME is game-over, so the final fallback
 * (return `turn`) only ever yields a seat that has no legal move anyway.
 */
export function movingSeat(state: GameState): number {
  const { turn } = state
  if (!seatFinished(state, turn)) return turn
  for (let s = 0; s < state.players.length; s++) {
    if (s !== turn && sameTeam(state, s, turn) && !seatFinished(state, s)) return s
  }
  return turn
}

/**
 * Is one of seat `seat`'s own pitons sitting at lane cell `step`? Lanes are
 * private (one per arm), so this is the only occupancy that matters inside a home
 * lane — no enemy or teammate can be there, and there are no safe squares or
 * captures in-lane. `seat` is the piton's owner (the `movingSeat`), not
 * necessarily the seat on the clock.
 */
function ownPitonAtLaneStep(state: GameState, seat: number, step: number): boolean {
  return state.players[seat].pitons.some(
    (p) => p.position.kind === 'lane' && p.position.step === step,
  )
}

/** How many squares `roll` advances a piton (face value unless overridden). */
function rollStep(state: GameState, roll: number): number {
  return state.ruleset.rollStepOverrides[roll] ?? roll
}

/**
 * Walk the squares a piton *crosses* moving from progress `p0` (exclusive) to
 * `p1` (exclusive of the destination) and report whether the cabin passing
 * rules forbid passing through any of them. The landing square `p1` itself is
 * judged separately by `resolveLanding` — this is only about transit.
 *
 *  - an ALLY crossed en route → blocked (you may not pass your own piton, and a
 *    teammate counts as your own — partners are one side);
 *  - an occupied SAFE square crossed en route → blocked (it blocks everyone);
 *  - a lone enemy on a non-safe square en route → passed freely.
 *
 * Crossed progress beyond the shared track (`>= trackPathLength`) lies in the
 * mover's PRIVATE home lane: only the mover's own piton can sit there and it
 * still blocks passage; enemies, teammates, and safe squares don't exist in-lane.
 * `seat` is the moving piton's owner (the `movingSeat`).
 */
function passageBlocked(
  state: GameState,
  seat: number,
  entryIndex: number,
  p0: number,
  p1: number,
): boolean {
  const { trackLength, trackPathLength } = state.geometry
  const { safeSquares } = state.ruleset
  for (let k = p0 + 1; k < p1; k++) {
    if (k >= trackPathLength) {
      // private lane cell — blocked only by your own piton already there
      if (ownPitonAtLaneStep(state, seat, k - trackPathLength)) return true
      continue
    }
    const square = (entryIndex + k) % trackLength
    const occupant = pitonOnSquare(state, square)
    if (occupant === null) continue
    if (movementAlly(state, occupant.player, seat)) return true // can't pass own/ally
    if (safeSquares.includes(square)) return true // occupied safe square blocks all
    // else: a lone enemy on a non-safe square — pass freely
  }
  return false
}

/**
 * Decide what landing on the destination position means. Returns the move's
 * `captures` value (a piton id, or null for an empty landing) when the landing
 * is legal, or `'blocked'` when it isn't.
 *
 * On the shared TRACK:
 *  - empty square → legal, no capture;
 *  - a movement ALLY (own, or a teammate in "2v2 friendly") → blocked (no
 *    stacking, and you never capture an ally — they're one side);
 *  - an enemy on a SAFE square → blocked (immune — no capture there); in the
 *    official 2v2 a teammate is an enemy here, so a teammate on a safe square
 *    blocks the same way (the rule's "can't pass a partner on a safe square");
 *  - a lone enemy off a safe square → capture (its id), if capture is enabled.
 *
 * In the private home LANE: blocked only by your own piton already on that cell
 * (no enemies, no captures). Reaching HOME (`finished`) is always clear — any
 * number of a player's pitons may rest there. `seat` is the moving piton's owner.
 */
function resolveLanding(
  state: GameState,
  seat: number,
  dest: PitonPosition,
): string | null | 'blocked' {
  if (dest.kind === 'finished') return null // HOME — always reachable
  if (dest.kind === 'lane') {
    return ownPitonAtLaneStep(state, seat, dest.step) ? 'blocked' : null
  }
  if (dest.kind === 'nest') return null // unreachable as a destination here
  const square = dest.square
  const occupant = pitonOnSquare(state, square)
  if (occupant === null) return null
  if (movementAlly(state, occupant.player, seat)) return 'blocked' // own/ally piton
  if (state.ruleset.safeSquares.includes(square)) return 'blocked' // enemy is safe
  if (!state.ruleset.captureEnabled) return 'blocked'
  return occupant.id // capture the lone enemy
}

/**
 * Every legal move for the current player given `roll`. Independent of `phase`
 * (other than returning none once the game is over), so it doubles as the query
 * `applyRoll` uses to decide whether a turn can be played.
 */
export function legalMoves(state: GameState, roll: number): Move[] {
  if (state.phase === 'game-over') return []

  // Whose pitons this turn moves: the seat's own, or — once they're all HOME —
  // its teammate's (the partnership tempo rule). All the journey arithmetic below
  // (entry square, lane, capture/passing allies) is relative to THIS seat.
  const seat = movingSeat(state)
  const player = state.players[seat]
  const entryIndex = state.geometry.entryIndices[seat]
  const moves: Move[] = []

  // --- Entry: a nest piton onto its entry square --------------------------
  // The start-square exception: a start square is safe to everyone BUT its
  // owner, so the owner may exit the nest (on an entry roll) straight onto it.
  // A movement ally already there blocks entry (no stacking); a lone enemy is CAPTURED
  // (the square shields it from every OTHER player, but never from its owner);
  // an empty square is a plain entry. The square stays universally safe in
  // `resolveLanding` for everyone who lands on it by *movement* — the owner only
  // ever touches its own start at this entry moment, never via a lap. See
  // docs/rules-and-lineage.md.
  if (state.ruleset.entryRolls.includes(roll)) {
    const occupant = pitonOnSquare(state, entryIndex)
    const entryCaptures: string | null | 'blocked' =
      occupant === null
        ? null
        : movementAlly(state, occupant.player, seat) || !state.ruleset.captureEnabled
          ? 'blocked'
          : occupant.id
    if (entryCaptures !== 'blocked') {
      for (const piton of player.pitons) {
        if (piton.position.kind === 'nest') {
          moves.push({
            pitonId: piton.id,
            from: piton.position,
            to: { kind: 'track', square: entryIndex },
            captures: entryCaptures,
          })
        }
      }
    }
  }

  // --- Movement: a piton already out walks `step` along its journey line ----
  // `step` decouples die face from distance (a 6 moves 12). The walk covers both
  // the shared track and the piton's own home lane; `positionAt` maps the target
  // progress to a track square, a lane cell, HOME (`finished`), or `null` for an
  // overshoot past HOME — which, under `exactHomeEntry`, is simply not a move.
  const step = rollStep(state, roll)
  for (const piton of player.pitons) {
    if (piton.position.kind !== 'track' && piton.position.kind !== 'lane') continue
    const p0 = progressOf(piton.position, entryIndex, state.geometry)!
    const p1 = p0 + step
    const dest = positionAt(p1, entryIndex, state.geometry)
    if (dest === null) continue // overshoot past HOME → illegal (exact-home entry)
    if (passageBlocked(state, seat, entryIndex, p0, p1)) continue

    const captures = resolveLanding(state, seat, dest)
    if (captures === 'blocked') continue

    moves.push({ pitonId: piton.id, from: piton.position, to: dest, captures })
  }

  return moves
}

/**
 * Is `roll` the penalized streak roll — the `extraTurnStreakLimit`th consecutive
 * extra-turn face — under a `lose-leading` ruleset? Such a roll is "not played":
 * `applyRoll` resolves the penalty instead of generating any move. (`'none'`
 * penalty variants instead just stop granting further extra turns; that is
 * handled in `grantsExtraTurn`, not here.)
 */
function penalizedStreakRoll(state: GameState, roll: number): boolean {
  const { extraTurnOn, extraTurnStreakLimit, streakPenalty } = state.ruleset
  return (
    streakPenalty === 'lose-leading' &&
    extraTurnOn !== null &&
    extraTurnStreakLimit !== null &&
    roll === extraTurnOn &&
    state.extraTurnStreak + 1 >= extraTurnStreakLimit
  )
}

/**
 * Send the moving seat's most-advanced piton still on the shared track back to
 * its nest (the `lose-leading` penalty). Pitons in the home lane or finished are
 * immune, so only `kind: 'track'` pitons are eligible; if the seat has none out,
 * this is a no-op. (When a finished player is rolling on its teammate's behalf,
 * the `movingSeat` is the teammate, so it's the teammate's leader that's lost.)
 */
function loseLeadingTrackPiton(state: GameState): GameState {
  const seat = movingSeat(state)
  const entryIndex = state.geometry.entryIndices[seat]
  let leadId: string | null = null
  let leadProgress = -1
  for (const piton of state.players[seat].pitons) {
    if (piton.position.kind !== 'track') continue
    const prog = progressOf(piton.position, entryIndex, state.geometry)!
    if (prog > leadProgress) {
      leadProgress = prog
      leadId = piton.id
    }
  }
  return leadId === null ? state : setPositions(state, { [leadId]: { kind: 'nest' } })
}

/**
 * Does `roll` earn another turn? True when it is the `extraTurnOn` face and the
 * streak cap has not been reached. (For the `lose-leading` variant the capped
 * roll never reaches here — `applyRoll` intercepts it — so the cap guard only
 * bites under a `'none'` penalty.) Used both for a *played* extra-turn face and
 * for an *unplayable* one — an unplayable 6 still grants the bonus roll and
 * still counts toward the streak, exactly like a played 6.
 */
function rollGrantsExtraTurn(state: GameState, roll: number): boolean {
  const { extraTurnOn, extraTurnStreakLimit } = state.ruleset
  if (extraTurnOn === null || roll !== extraTurnOn) return false
  if (extraTurnStreakLimit !== null && state.extraTurnStreak + 1 >= extraTurnStreakLimit) {
    return false
  }
  return true
}

/**
 * Advance to the next player and reset to `awaiting-roll`. The consecutive
 * extra-turn streak resets when the turn changes hands.
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
 * Apply a roll in the `awaiting-roll` phase.
 *
 *  - A penalized streak roll (the 3rd consecutive 6) is "not played": resolve
 *    the `lose-leading` penalty and pass the turn — no move is offered.
 *  - Otherwise, if the roll has a legal move, enter `awaiting-move` with the
 *    roll recorded.
 *  - If it has none, the turn is normally forfeited (forced-move: passing is
 *    only allowed when nothing can move) — UNLESS the roll itself grants a bonus
 *    turn (an unplayable 6): the player keeps the turn and rolls again, and the
 *    6 still counts toward the streak, just as a played 6 would.
 */
export function applyRoll(state: GameState, roll: number): GameState {
  if (state.phase !== 'awaiting-roll') {
    throw new Error(`applyRoll requires phase 'awaiting-roll', got '${state.phase}'`)
  }
  if (penalizedStreakRoll(state, roll)) {
    return passTurn(loseLeadingTrackPiton(state))
  }
  if (legalMoves(state, roll).length === 0) {
    if (rollGrantsExtraTurn(state, roll)) {
      return {
        ...state,
        phase: 'awaiting-roll',
        lastRoll: null,
        extraTurnStreak: state.extraTurnStreak + 1,
      }
    }
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
 * captured piton back to its nest, then: if that brought every piton of the
 * mover's whole TEAM HOME the game ends (winner recorded — a winning move never
 * also grants another roll, even off a 6); otherwise the same player either keeps
 * the turn (an extra roll, if the roll just played earns one — a 6) or passes it
 * on. (In a free-for-all the "team" is the single seat, so the win is just "all
 * my pitons home" as before.)
 */
export function applyMove(state: GameState, move: Move): GameState {
  if (state.phase !== 'awaiting-move') {
    throw new Error(`applyMove requires phase 'awaiting-move', got '${state.phase}'`)
  }
  const seat = movingSeat(state)
  const updates: Record<string, PitonPosition> = { [move.pitonId]: move.to }
  if (move.captures) updates[move.captures] = { kind: 'nest' }
  const moved = setPositions(state, updates)

  // Win: every piton of the moving seat's whole team is HOME → game over, no
  // further play. The winner is recorded as the moving seat's colour; the UI
  // resolves the winning *team* from it via `teams`.
  const teamHome = moved.players.every(
    (pl, i) => !sameTeam(moved, i, seat) || pl.pitons.every((p) => p.position.kind === 'finished'),
  )
  if (teamHome) {
    return {
      ...moved,
      phase: 'game-over',
      winner: moved.players[seat].color,
      lastRoll: null,
    }
  }

  if (state.lastRoll !== null && rollGrantsExtraTurn(state, state.lastRoll)) {
    return {
      ...moved,
      phase: 'awaiting-roll',
      lastRoll: null,
      extraTurnStreak: state.extraTurnStreak + 1,
    }
  }
  return passTurn(moved)
}
