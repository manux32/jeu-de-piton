/**
 * jeu-de-piton — engine domain model
 *
 * This is the pure rules core: plain TypeScript, no React/DOM imports, ever.
 * Everything here is data + pure functions over it (in board.ts / state.ts /
 * moves.ts), so the whole thing is unit-testable without rendering anything.
 *
 * These types are load-bearing: they back the implemented engine (Milestone 2)
 * and are the contract the UI reads via `src/engine/index.ts`. The `Ruleset`
 * knobs below are what make rule variants config, not code branches.
 */

import type { BoardGeometry } from './board'

/**
 * A player's identity colour. The first four are the default seat colours (one
 * per arm of the cross); the rest are extra colours a seat can be switched to in
 * New Game. A game still seats at most four players — more colours just widens
 * the *choice*, not the player count. (`black` and `white` are intentionally
 * held back: black vanishes on the near-black safe squares, white on the
 * near-white nest holes and die face — each needs a rendering tweak first. See
 * decisions.md.)
 */
export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green' | 'orange' | 'purple'

/**
 * Where a single piton currently sits.
 *  - `nest`     : in its starting circle, not yet on the track (needs an entry roll)
 *  - `track`    : on the shared loop, at absolute index `square`
 *  - `lane`     : on this player's private home column, at index `step`
 *  - `finished` : reached HOME (the centre)
 */
export type PitonPosition =
  | { kind: 'nest' }
  | { kind: 'track'; square: number }
  | { kind: 'lane'; step: number }
  | { kind: 'finished' }

export interface Piton {
  id: string
  owner: PlayerColor
  position: PitonPosition
}

/**
 * A single legal move the current player may choose: take piton `pitonId` from
 * `from` to `to`. `captures` is the id of an opponent piton sent back to its
 * nest by landing on it, or `null`. `from` is informational (handy for the UI
 * and for reading tests); applying a move only needs `pitonId`, `to`, and
 * `captures`.
 */
export interface Move {
  pitonId: string
  from: PitonPosition
  to: PitonPosition
  captures: string | null
}

/**
 * A Ruleset is the swappable config that makes "change the rules per game" work.
 * Canonical Parcheesi is one Ruleset; the cabin's "jeu de piton" house rules
 * become another, filled in once we collect them. The engine reads these knobs;
 * the UI never needs to know which variant is active.
 */
export interface Ruleset {
  id: string
  label: string
  /** 2–4 in the classic board; we let the player pick within this range. */
  playerCount: number
  pitonsPerPlayer: number
  /** How many dice are rolled per turn (Parcheesi: 2; jeu de piton: 1). */
  diceCount: number
  /** Die faces that let a piton leave the nest (Parcheesi/ours: [5]). */
  entryRolls: number[]
  /** Full shared-loop square count (cabin board: 68). */
  trackLength: number
  /** Length of each player's private home column. */
  laneLength: number
  /**
   * Squares trimmed from a full lap before a piton turns into its home lane:
   * `trackPathLength = trackLength - homeEntryOffset`. Cabin board: 4 — the lane
   * mouth sits 5 squares before a player's own start (confirmed from the board:
   * a roll of 12 from your start lands on the next player's lane entry).
   */
  homeEntryOffset: number

  // --- movement distance -----------------------------------------------------
  /**
   * Overrides how far a given roll moves a piton, decoupling the die face from
   * the step count. jeu de piton: `{ 6: 12 }` (a 6 moves twelve). Faces absent
   * from the map move their face value. Data, not a function, to keep variants
   * declarative.
   */
  rollStepOverrides: Record<number, number>
  /** Must land on HOME by exact count; an overshoot is an illegal move. */
  exactHomeEntry: boolean
  /**
   * If any legal move exists for the roll, the player MUST play one — passing is
   * not allowed (true for both canonical and ours). Drives the HOME-overshoot
   * case: if a piton can't use the number, another that can is forced instead.
   */
  forcedMove: boolean

  // --- extra turns & their penalty ------------------------------------------
  /** Roll that grants another turn (Parcheesi: doubles; ours: 6); null = never. */
  extraTurnOn: number | null
  /**
   * Consecutive extra-turn rolls allowed before a penalty triggers on the next
   * one (jeu de piton: 3 — the third 6 in a row is penalized). null = no cap.
   */
  extraTurnStreakLimit: number | null
  /**
   * What happens when the streak limit is hit.
   *  - 'none'         : nothing special (just no further extra turn)
   *  - 'lose-leading' : the offending roll is not played; instead the player
   *                     loses the piton closest to entering its home column
   *                     (most-advanced piton still on the shared track) back to
   *                     the nest. Pitons already in a home lane are immune.
   */
  streakPenalty: 'none' | 'lose-leading'

  // --- occupancy, capture & blocking ----------------------------------------
  /** Max pitons (any owner) permitted on one square. Parcheesi: 2; ours: 1. */
  maxPerSquare: number
  /** Landing exactly on a lone opponent sends it back to its nest. */
  captureEnabled: boolean
  /** Track indices that are safe from capture (drawn as marked squares). */
  safeSquares: number[]
  /**
   * Passing rules — why move validation is PATH-based, not destination-only.
   * The engine must scan every square a piton crosses, not just its landing
   * square, whenever either of these is true.
   */
  /** A piton may not move past (or onto) one of its OWN pitons. ours: true. */
  alliesBlockPassage: boolean
  /** A piton on a safe square blocks ALL passage through it. ours: true. */
  safeSquaresBlockPassage: boolean
}

export interface PlayerState {
  color: PlayerColor
  pitons: Piton[]
}

export type Phase = 'awaiting-roll' | 'awaiting-move' | 'game-over'

export interface GameState {
  ruleset: Ruleset
  /**
   * Resolved board geometry for this game, derived once from the ruleset +
   * player count at `createGame` so move generation never recomputes it.
   */
  geometry: BoardGeometry
  players: PlayerState[]
  /**
   * Team membership by seat: `teams[i]` is the team id of seat `i`. Seats sharing
   * an id are partners (the 2v2 setup is `[0, 1, 0, 1]` — seats 1&3 vs 2&4). In a
   * normal free-for-all every seat is its own team (`[0, 1, 2, …]`), which makes
   * "same team" collapse to "same seat" — so every team-aware rule (ally vs
   * enemy, win = the whole team HOME, a finished seat playing its partner's
   * pitons) degrades exactly to the solo rules. See `movingSeat` in moves.ts.
   */
  teams: number[]
  /**
   * The 2v2 partnership *style*. `true` (the "2v2 friendly" mode) makes a teammate
   * a full ally for movement: you can't capture, pass through, or land on a
   * partner's piton — it blocks you like your own. `false` (the official "2v2"
   * mode) makes partners play a normal game against each other — captures and
   * passing a teammate are allowed (a teammate on a safe square still blocks, like
   * any enemy) — right up until one of them is all HOME, after which the
   * finished-partner takeover and the team win condition still apply. It rides
   * alongside `teams` because both come from the one New Game partnership choice;
   * it only bites when two seats share a team, so a free-for-all ignores it
   * entirely. The *movement* split is `movementAlly`; takeover and win stay on
   * `sameTeam` (always team-aware). See moves.ts.
   */
  partnersAreAllies: boolean
  /** Index into `players` whose turn it is. */
  turn: number
  /** Result of the most recent die roll, if one is pending a move. */
  lastRoll: number | null
  /**
   * Count of consecutive extra-turn rolls (e.g. 6s) by the current player this
   * turn sequence. Drives `extraTurnStreakLimit` / `streakPenalty`; resets when
   * the turn passes to the next player.
   */
  extraTurnStreak: number
  phase: Phase
  winner: PlayerColor | null
}
