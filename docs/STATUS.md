# jeu-de-piton — status

> **Fast-moving tracker — skim at session start.** Keep it short: *current state,
> next steps, live open questions, dev quick-ref* only. Durable material lives
> elsewhere — don't let it pile up here:
> - architecture / vision → [architecture.md](architecture.md)
> - rules → [rules-and-lineage.md](rules-and-lineage.md) · board geometry →
>   [board-model.md](board-model.md)
> - *why* a past choice was made → [decisions.md](decisions.md) (append new
>   decisions there, not here)
>
> Maintain: when a milestone closes or a fact gets pinned, move the detail to the
> right reference doc and leave only a one-line pointer here.

## Where we are
**Playable hot-seat, polished.** Milestones 1–4 done (scaffold · engine core ·
SVG board · interaction loop), plus several M6 look-and-feel items (rectangular
cells, HOME grouping/highlight, capture-click). 70 engine tests green, build +
lint clean. `src/ui/` is rules-free — every decision comes from the engine via
`rollDie`/`applyRoll`/`legalMoves`/`applyMove`.

## Build checklist
- ✅ **M1** scaffold — Vite + React + TS, own repo.
- ✅ **M2** engine core — state model, path-aware moves, capture, the 6, lane +
  exact HOME + win. (`src/engine/`, Vitest.)
- ✅ **M3** SVG board render — `buildLayout` index→screen map; `<GameBoard>` →
  `<Board>` + `<Pitons>`. (`src/ui/`.)
- ✅ **M4** interaction loop — `useGame` reducer, roll → highlight legal moves →
  click-to-move, `<Hud>` (turn / capture / extra-roll / forfeit / winner).
- ⬜ **M5** variant layer.
- ⬜ **M6** polish backlog.

## Next session — pick one
- **M5 — variant layer.** The cabin ruleset already ships as the `Ruleset` and
  the engine is variant-agnostic, so this is mostly *proving* a second variant
  (e.g. canonical Parcheesi) drops in with **no UI change**. Likely a
  ruleset-picker in the header beside the player-count pills.
- **M6 — polish backlog:**
  - ✅ **Rectangular cells** (2026-06-12) — render-only non-uniform spacing
    (`ARM_WIDTH_SCALE`, currently 1.9). See [board-model.md](board-model.md).
  - ✅ **Capture-click fix** (2026-06-12) — clicking the *enemy* disc of a capture
    move now fires the move (its disc used to swallow the click over the target
    marker). In [`Pitons.tsx`](../src/ui/Pitons.tsx).
  - ✅ **HOME grouping** (2026-06-12) — finished pitons cluster per-colour against
    the HOME edge facing their own arm, instead of piling up at centre.
  - ✅ **HOME-move highlight** (2026-06-12) — a HOME-bound move shows a larger,
    bolder, pulsing target marker.
  - **Forfeit-notice wart** (2026-06-12) — the HUD notice describes the player
    who *just rolled* ("Red rolled 3 — no legal move, turn passes") while the
    turn indicator already shows the **next** player; momentarily confusing. No
    engine bug. Candidate fix: gate the handoff behind an explicit "Pass/Continue"
    click (an `awaitingPass` view flag in `useGame`). Deferred — accept as-is.
  - **HOME-corner (vs edge) clustering** — finished pitons currently group on the
    cardinal HOME *edge* facing each arm; a diagonal-corner variant was floated.
    Minor, deferred.

## Open rule details
- **Enemy on a player's start square** (awaiting the friend, 2026-06-12) — does an
  enemy sitting on your start/entry square block you from coming out, or may you
  capture it *despite* the square being safe? **Engine today: it blocks entry and
  is immune** (start is a safe square; `legalMoves` refuses entry onto any occupied
  entry square, and capture on a safe square is forbidden). Revisit once confirmed.
- *Everything else confirmed as of 2026-06-12.* Unplayable-1st/2nd-6 closed (bonus
  roll + counts toward three-in-a-row). No capture/HOME bonuses; entry on a 5 is
  not forced.

## Dev scenario tooling (dev builds only)
A right-hand **Dev** panel (floating "Dev" toggle, top-right) loads doctored
board situations for validating UI/interaction fixes without playing up to them.
- Scenarios are **one file each** under [`src/ui/dev/scenarios/`](../src/ui/dev/scenarios/),
  auto-discovered via `import.meta.glob` ([`registry.ts`](../src/ui/dev/registry.ts)) —
  add a file, it shows up in the picker. Shared `DevScenario` type + `place()`
  helper in [`scenario.ts`](../src/ui/dev/scenario.ts). A scenario carries a single
  `description` (one concept — was split into `hint`+`notice`, merged 2026-06-13):
  it's the picker tooltip *and*, via `loadScenario`, the HUD `notice` on load
  (`Dev:`-prefixed). `build()` returns board state only; it no longer sets a notice.
- All dev surface is lazy-imported behind `import.meta.env.DEV` via
  [`DevTools.tsx`](../src/ui/dev/DevTools.tsx), so the whole chunk (panel,
  scenarios, `dev.css`) **never ships** — verified: prod bundle byte-identical to
  pre-tooling. The engine stays untouched; scenarios dispatch a `load` action
  ([`useGame.ts`](../src/ui/useGame.ts)) carrying a full `GameView`.
- The panel also has a **state editor** ([`StateEditor.tsx`](../src/ui/dev/StateEditor.tsx)):
  a knob form (NOT spatial board-editing — pivoted there 2026-06-12) over the same
  fields a scenario sets — turn, pending roll (→ phase), `extraTurnStreak`, and
  each piton's position (collapsible per-colour groups + per-player Nest-all /
  Home-all). It's a controlled reflection of the live `GameView`; edits dispatch
  `load`; the board mirrors the result. Runs no engine transitions, so illegal
  setups are allowed on purpose.
- **Save as scenario** (S3, 2026-06-13): the "Save as scenario" form
  ([`SaveScenario.tsx`](../src/ui/dev/SaveScenario.tsx)) takes a name + description,
  serializes the live view to scenario-file source
  ([`serialize.ts`](../src/ui/dev/serialize.ts), pure + unit-tested) and POSTs it to
  a **dev-only Vite middleware** (`apply: 'serve'`, [`vite.config.ts`](../vite.config.ts))
  that writes `scenarios/<id>.ts`. The glob then surfaces it on the next HMR pass
  (page reloads → board resets, new scenario sits unloaded in the picker — accepted).
  Middleware guards: id slug-validated, path confined to `scenarios/`, no overwrite
  (409). Output mirrors the hand-written files: `place({…})` skipping nest-default
  pitons, `turn`/`lastRoll`/`phase`, `extraTurnStreak` only when non-zero.
- **Plan (3 sessions):** ✅ S1 panel + file-based scenarios + load dropdown.
  ✅ S2 knob-based state editor. ✅ S3 save-as-scenario (above). **Dev tooling
  complete.**

## Dev quick-ref
- `npm test` (engine), `npm run build` (type-check + build), `npm run dev` (UI,
  port 5173 — see CLAUDE.md session-start policy).
- Eyeball a layout/render change **without** the dev server: throwaway Vitest that
  builds the layout (or `renderToStaticMarkup`s `<GameBoard>` with a doctored
  state) to an SVG in `references/`, then `node scripts/render-board.mjs <in.svg>
  <out.png>`. Delete the artifacts after.
