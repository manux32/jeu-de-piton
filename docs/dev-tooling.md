# Dev scenario tooling

> Reference — **read when touching the dev rig** (`src/ui/dev/`), not every
> session. The rig is feature-complete. *Why* it's shaped this way (knob-not-board
> editor, lazy-not-dead-branched, the parameter-merge calls) lives in the
> 2026-06-12 / -13 entries of [decisions.md](decisions.md). Current status +
> day-to-day commands stay in [STATUS.md](STATUS.md).

A right-hand **Dev** panel drops the app into doctored board situations to validate
UI/interaction fixes without playing up to them. It's opened from the **Dev tools**
row of the board's **Options** menu (the gear button → `OptionsMenu`), which calls
GameBoard's `onOpenDev` callback; App ([`App.tsx`](../src/App.tsx)) mounts the panel.
(Earlier it was a standalone board button, and before that a fixed-position floating
toggle — both gone.) The whole surface is one lazy `import()` ([`DevTools.tsx`](../src/ui/dev/DevTools.tsx)) —
**no longer gated behind `import.meta.env.DEV`: it now ships in *every* build** (incl.
the deployed PWA) so mobile/iPad issues can be driven from scenarios on-device. The
chunk stays lazy (fetched only when the Dev tools row is tapped), so it adds nothing
to the normal load. *(A proper on/off gate is a later nicety; for now it's always on,
publicly — pure client-side state editing, no security surface.)* Engine stays
untouched —
scenarios dispatch a `load` action ([`useGame.ts`](../src/ui/useGame.ts)) carrying
a full `GameView`. Three pieces:

- **Scenario picker** — scenarios are one file each under
  [`scenarios/`](../src/ui/dev/scenarios/), auto-discovered via `import.meta.glob`
  ([`registry.ts`](../src/ui/dev/registry.ts)); `DevScenario` + `place()` in
  [`scenario.ts`](../src/ui/dev/scenario.ts). Each carries one `description` — the
  **picker tooltip only**. A loaded scenario starts with an **empty turn log**, so
  the board reads exactly as a real game in that state would (real gameplay rows
  then appear as you act — letting notice changes be tested in place); the centre
  die shows the pending roll straight off `game.lastRoll`. `build()` returns board
  state only.
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

## Screenshotting the live app (UI in view-state)
For UI the static render can't reach — modals, hover/selected states,
mid-interaction — screenshot the **running** app with
[`scripts/screenshot.mjs`](../scripts/screenshot.mjs). It drives the system
Edge/Chrome via `playwright-core` (a dev dep; no browser download), so the dev
server must be up first (`npm run dev`). It can click through to a state by
accessible name before shooting:

```
NODE_OPTIONS=--use-system-ca node scripts/screenshot.mjs \
  --out references/new-game.png --click "New game"
```

`--click` is repeatable (runs in order); `--out` defaults to scratch
`references/shot.png`; `--size WxH` / `--path <route>` / `--wait <ms>` round it
out. Output is scratch — delete it after, like the SVG renders above. Handy for
self-checking a board-unit-vs-px sizing change without a manual eyeball.
