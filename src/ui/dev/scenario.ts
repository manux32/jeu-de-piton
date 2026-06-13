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
 * Geometry reminder (JEU_DE_PITON, 4 players): entry squares {0,17,34,51};
 * trackLength 68, laneLength 7, so a lane piton at step 4 is 3 short of HOME.
 * Safe squares {0,7,12,17,24,29,34,41,46,51,58,63}.
 */
import type { GameState, PitonPosition } from '../../engine'
import type { GameView } from '../useGame'

export interface DevScenario {
  /** Stable slug, also the filename stem. */
  id: string
  /** Short label shown in the picker. */
  label: string
  /**
   * One line describing what the scenario sets up / what to look at. Single
   * source of truth: shown as the picker tooltip *and* stamped onto the HUD as
   * the `notice` when loaded (see `loadScenario`). Scenarios therefore don't set
   * a notice themselves — `build` returns board state only.
   */
  description: string
  build: () => Omit<GameView, 'notice'>
}

/**
 * Turn a scenario into a loadable view: its board state plus a HUD notice
 * derived from `description`. The `Dev:` prefix marks the banner as synthetic so
 * it reads differently from a real gameplay notice.
 */
export function loadScenario(s: DevScenario): GameView {
  return { ...s.build(), notice: `Dev: ${s.description}` }
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
