/**
 * DEV-ONLY: turn the live view into the *source* of a scenario file, byte-shaped
 * like the hand-written ones under `scenarios/`. Pure (no DOM, no Node) so it
 * unit-tests cleanly; the "save as scenario" flow POSTs the result to the
 * dev-only Vite middleware (see vite.config.ts), which writes `<id>.ts`.
 *
 * Shape rules (docs/STATUS.md S3 note): a `place({…})` position map that skips
 * nest-default pitons; turn/lastRoll/phase set on the spread; `extraTurnStreak`
 * emitted only when non-zero (it defaults to 0). Only the *current* player's roll
 * is captured (as the scalar `rolled`); per-seat history isn't reproduced — a
 * scenario tests one board state. The `description` line is the picker tooltip
 * only (loaded scenarios carry no notices — see scenario.ts).
 */
import type { PitonPosition } from '../../engine'
import type { GameView } from '../useGame'

/** kebab-case slug usable as both the scenario id and the filename stem. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** kebab → camelCase, for the `const <name>: DevScenario` binding. */
const camel = (slug: string) =>
  slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** Single-quoted TS string literal, matching the repo's quote style. */
const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function positionLiteral(pos: PitonPosition): string {
  switch (pos.kind) {
    case 'track':
      return `{ kind: 'track', square: ${pos.square} }`
    case 'lane':
      return `{ kind: 'lane', step: ${pos.step} }`
    case 'finished':
      return `{ kind: 'finished' }`
    case 'nest':
      return `{ kind: 'nest' }`
  }
}

export interface ScenarioMeta {
  /** Picker label; slugified into the id + filename. */
  name: string
  /** One line: the picker tooltip. */
  description: string
}

export function serializeScenario(view: GameView, meta: ScenarioMeta): string {
  const { game } = view
  const id = slugify(meta.name)
  const varName = camel(id) || 'scenario'

  const placed = game.players
    .flatMap((pl) => pl.pitons)
    .filter((p) => p.position.kind !== 'nest')
    .map((p) => `      ${q(p.id)}: ${positionLiteral(p.position)},`)
    .join('\n')
  const placeBlock = placed ? `{\n${placed}\n    }` : '{}'

  const streak =
    game.extraTurnStreak !== 0 ? `, extraTurnStreak: ${game.extraTurnStreak}` : ''
  const gameSpread =
    `{ ...game, turn: ${game.turn}, lastRoll: ${game.lastRoll ?? 'null'}, ` +
    `phase: '${game.phase}'${streak} }`

  // Guard the JSDoc against an accidental comment-close in the description.
  const doc = meta.description.replace(/\*\//g, '* /')

  return `import { createGame, JEU_DE_PITON } from '../../../engine'
import { place, type DevScenario } from '../scenario'

/** ${doc} */
const ${varName}: DevScenario = {
  id: ${q(id)},
  label: ${q(meta.name.trim())},
  description: ${q(meta.description.trim())},
  build: () => {
    const game = place(createGame(JEU_DE_PITON, ${game.players.length}), ${placeBlock})
    return {
      game: ${gameSpread},
      rolled: ${view.rolls[game.turn] ?? 'null'},
    }
  },
}

export default ${varName}
`
}
