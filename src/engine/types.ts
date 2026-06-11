/**
 * jeu-de-piton — engine domain model (DRAFT)
 *
 * This is the pure rules core: plain TypeScript, no React/DOM imports, ever.
 * Everything here is data + (eventually) pure functions over it, so the whole
 * thing is unit-testable without rendering anything.
 *
 * These types are a first sketch to make the architecture concrete — expect to
 * refine them when we actually build the engine next session. Nothing here is
 * load-bearing yet.
 */

/** One of the (up to) four corners / sides of the cross board. */
export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green'

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
  /** Die faces that let a piton leave the nest (Parcheesi: [5]). */
  entryRolls: number[]
  /** Squares on the shared loop before turning into a home lane. */
  trackLength: number
  /** Length of each player's private home column. */
  laneLength: number
  /** Roll that grants another turn (Parcheesi: 6); null = never. */
  extraTurnOn: number | null
  /** Landing exactly on an opponent sends it back to its nest. */
  captureEnabled: boolean
  /** Track indices that are safe from capture (drawn as marked squares). */
  safeSquares: number[]
}

export interface PlayerState {
  color: PlayerColor
  pitons: Piton[]
}

export type Phase = 'awaiting-roll' | 'awaiting-move' | 'game-over'

export interface GameState {
  ruleset: Ruleset
  players: PlayerState[]
  /** Index into `players` whose turn it is. */
  turn: number
  /** Result of the most recent die roll, if one is pending a move. */
  lastRoll: number | null
  phase: Phase
  winner: PlayerColor | null
}
