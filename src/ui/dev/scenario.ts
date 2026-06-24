/**
 * DEV-ONLY scenario plumbing shared by every file under `scenarios/`.
 *
 * A scenario is a doctored `GameView` that drops the running app straight into a
 * specific board situation, so look-and-feel / interaction fixes can be
 * validated without playing a real game up to that point. This is a UI dev aid,
 * NOT engine logic: a scenario never re-implements a rule — it starts from a real
 * `createGame` state, nudges a few piton positions with `place`, and (for the
 * awaiting-move ones) sets `lastRoll` + `phase` so the engine's own `legalMoves`
 * lights up the move under test the instant the scenario loads.
 *
 * The whole dev tooling is gated behind `import.meta.env.DEV` at the call site,
 * so it dead-code-eliminates out of production builds.
 *
 * Geometry reminder (JEU_DE_PITON, 4 players): trackLength 68 → entry squares
 * {0,17,34,51} (arms 17 apart); trackPathLength 64 (ring squares walked before
 * the lane); laneLength 7, so a lane piton at step 4 is 3 short of HOME.
 * Safe squares {0,7,12,17,24,29,34,41,46,51,58,63}.
 */
import type { GameState, PitonPosition } from '../../engine'
import { emptyStats, type GameView } from '../useGame'

export interface DevScenario {
  /** Stable slug, also the filename stem. */
  id: string
  /** Short label shown in the picker. */
  label: string
  /**
   * One line describing what the scenario sets up / what to look at. Shown only
   * as the picker tooltip in the dev panel — deliberately NOT stamped into any
   * board notice, so a loaded scenario shows the same notices a real game would
   * (letting notice changes be tested in place). The turn log starts empty (no
   * sub-turns completed yet); the centre die shows the pending roll straight off
   * `game.lastRoll` once you set `phase: 'awaiting-move'`.
   */
  description: string
  /** The doctored board state to drop into. */
  build: () => { game: GameView['game'] }
}

/**
 * Turn a scenario into a loadable view: its board state with an empty turn log,
 * so the board reads exactly as a real game in that state would (the real
 * gameplay rows then appear as you act from it).
 */
export function loadScenario(s: DevScenario): GameView {
  const { game } = s.build()
  return {
    game,
    log: game.players.map(() => []),
    stats: game.players.map(() => emptyStats()),
    history: [],
  }
}

/** Immutably override a few pitons' positions on a freshly-built game. */
export function place(
  game: GameState,
  positions: Record<string, PitonPosition>,
): GameState {
  return {
    ...game,
    players: game.players.map((pl) => ({
      ...pl,
      pitons: pl.pitons.map((p) =>
        p.id in positions ? { ...p, position: positions[p.id] } : p,
      ),
    })),
  }
}
