# Dev scenario tooling

> Reference — **read when touching the dev rig** (`src/ui/dev/`), not every
> session. The rig is feature-complete. *Why* it's shaped this way (knob-not-board
> editor, lazy-not-dead-branched, the parameter-merge calls) lives in the
> 2026-06-12 / -13 entries of [decisions.md](decisions.md). Current status +
> day-to-day commands stay in [STATUS.md](STATUS.md).

A right-hand **Dev** panel (floating "Dev" toggle, top-right) drops the app into
doctored board situations to validate UI/interaction fixes without playing up to
them. The whole surface is one lazy `import()` behind `import.meta.env.DEV`
([`DevTools.tsx`](../src/ui/dev/DevTools.tsx)), so it dead-code-eliminates out of
prod (no chunk emitted; byte-identical to pre-tooling). Engine stays untouched —
scenarios dispatch a `load` action ([`useGame.ts`](../src/ui/useGame.ts)) carrying
a full `GameView`. Three pieces:

- **Scenario picker** — scenarios are one file each under
  [`scenarios/`](../src/ui/dev/scenarios/), auto-discovered via `import.meta.glob`
  ([`registry.ts`](../src/ui/dev/registry.ts)); `DevScenario` + `place()` in
  [`scenario.ts`](../src/ui/dev/scenario.ts). Each carries one `description` — the
  **picker tooltip only**. A loaded scenario carries **no** notice, so the board
  reads exactly as a real game in that state would (real gameplay notices then
  appear as you act — letting notice changes be tested in place); `loadScenario`
  also defaults `rolledBy` to the current player so the last-roll nest die behaves
  normally. `build()` returns board state only.
- **State editor** ([`StateEditor.tsx`](../src/ui/dev/StateEditor.tsx)) — a knob
  form (not a spatial board editor) over the fields a scenario sets (turn, pending
  roll→phase, `extraTurnStreak`, per-piton position). Controlled reflection of the
  live `GameView`; runs no engine transitions, so illegal setups are allowed on
  purpose.
- **Save as scenario** ([`SaveScenario.tsx`](../src/ui/dev/SaveScenario.tsx)) —
  name + description → [`serialize.ts`](../src/ui/dev/serialize.ts) (pure, unit-
  tested) → POST to a dev-only Vite middleware (`apply: 'serve'`,
  [`vite.config.ts`](../vite.config.ts)) that writes `scenarios/<id>.ts`; the glob
  picks it up on the next HMR pass (page reloads, new scenario sits unloaded —
  accepted). Guards: slug id, path confined to `scenarios/`, no overwrite (409).

## Eyeballing a render without the dev server
Throwaway Vitest that builds the layout (or `renderToStaticMarkup`s `<GameBoard>`
with a doctored state) to an SVG in `references/`, then `node
scripts/render-board.mjs <in.svg> <out.png>`. Delete the artifacts after.
