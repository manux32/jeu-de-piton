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
**Playable hot-seat, polished — and all chrome now lives *on the board*.**
Milestones 1–4 done (scaffold · engine core · SVG board · interaction loop),
plus several M6 look-and-feel items (rectangular cells, HOME grouping/highlight,
capture-click). 75 tests green (70 engine + 5 dev-tool serializer), build + lint
clean. `src/ui/` is rules-free — every decision comes from the engine via
`rollDie`/`applyRoll`/`legalMoves`/`applyMove`.

The HUD/header are **gone**: title, New Game controls, dice (result + Roll), and
the notice line are rendered inside the board SVG (title as `<text>`; the rest as
`<foreignObject>` HTML scaled into board units), and whose-turn is shown by
washing the active player's corner quadrant in their colour. See the 2026-06-13
decision-log entries for the *why* (foreignObject scaling, light-theme pinning).

As of the **2026-06-13 fill/centre/disclosure pass**: the board is now
**uncapped** and fills the viewport (*the board is the game*); the title / New
Game / notice are **centred horizontally on their corner's nest** (via
`BoardLayout.nestCentres`); and **New Game is a disclosure toggle** — collapsed to
one button until clicked, then the 2/3/4 picker (choosing collapses it).

As of the **2026-06-13 dice-centre/nest-centre pass** (this session): the **dice
moved to the dead centre of the board, over HOME** — rolling is the core act, so
it owns the middle (1.5× via `DICE_SCALE`, painted over the HOME band, which lost
its "HOME" label; legal-move targets paint *last* so a HOME-bound ring stays
clickable on top of the die). Finished pitons now **tuck into their nest corners**
(`Pitons.homeCluster` aims at the nest), clearing the centre. And the **nests are
centred in their corner quadrants** — `buildLayout` positions nest holes in
**render units** (`nestSlots`; `nestCentres` is now render-unit and *is* the
quadrant centre), replacing integer `nestCells` + the `round(sideLen/2)+1` offset.

## Build checklist
- ✅ **M1** scaffold — Vite + React + TS, own repo.
- ✅ **M2** engine core — state model, path-aware moves, capture, the 6, lane +
  exact HOME + win. (`src/engine/`, Vitest.)
- ✅ **M3** SVG board render — `buildLayout` index→screen map; `<GameBoard>` →
  `<Board>` + `<Pitons>`. (`src/ui/`.)
- ✅ **M4** interaction loop — `useGame` reducer, roll → highlight legal moves →
  click-to-move. (The old `<Hud>` is retired; its turn/dice/notice now render
  inside the board — see 2026-06-13.)
- ⬜ **M5** variant layer.
- ⬜ **M6** polish backlog.

## Next session — pick one
- **Chrome size tuning (the one piece of "chrome polish" still open).** Now that
  the board fills the screen, the on-board chrome scales up with it (sized in
  board units, `CTRL_SCALE = 0.019` in [GameBoard.tsx](../src/ui/GameBoard.tsx);
  the centred dice is `DICE_SCALE = CTRL_SCALE × 1.5`), so on a big monitor the
  pills / dice / notice can read oversized. Candidate fixes: lower the scales, or
  size the chrome from viewport rather than board units so it stays constant as the
  board grows. Needs an eyeball at real size first. (Placement — incl. the dice at
  centre — disclosure, and nest centring are **done** — see M6 below.)
- **M5 — variant layer.** The cabin ruleset already ships as the `Ruleset` and
  the engine is variant-agnostic, so this is mostly *proving* a second variant
  (e.g. canonical Parcheesi) drops in with **no UI change**. Likely a
  ruleset-picker in the board's top-right New Game controls beside the
  player-count pills.
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
  - ✅ **Viewport-fit / no page scrollbar** (2026-06-13) — the game column is
    sized to the viewport so the document never scrolls; `#root` clips the
    residual. *Why* → [decisions.md](decisions.md). (Reserve since dropped to
    56px now that chrome is on-board — see next item.)
  - ✅ **Chrome moved onto the board** (2026-06-13) — title / New Game / dice /
    notice all render inside the board SVG; whose-turn = active player's corner
    wash; HUD + header deleted; reserve 190px→56px. *Why* (foreignObject scaled
    into board units, light-theme pinning) → [decisions.md](decisions.md).
  - ✅ **Fill the screen** (2026-06-13) — board uncapped (dropped the 820px board
    / 860px shell / 1126px `#root` caps); it now fills the viewport, bounded only
    by available width and `100svh − 56px` reserve. *Why* → [decisions.md](decisions.md).
  - ✅ **Chrome centred on nests + `nestCentres` exposed** (2026-06-13) — title /
    New Game / notice each centre horizontally on their corner's nest cluster via
    `buildLayout`'s `nestCentres` (per-arm, count-independent). *(The dice later
    left the nest for the board centre — see below.)*
  - ✅ **New Game disclosure** (2026-06-13) — top-right control collapsed to one
    "New game" toggle; click reveals the 2/3/4 picker; choosing collapses it.
    View-local `useState`, box widens when open (still centred on the nest).
  - ✅ **Dice at the board centre** (2026-06-13) — the dice (die value + Roll)
    moved from the bottom-left nest to **dead centre over HOME** (1.5× via
    `DICE_SCALE`); HOME label removed; legal-move targets paint *last* so a
    HOME-bound ring stays clickable over the die. *Why* → [decisions.md](decisions.md).
  - ✅ **Nests centred in their quadrants** (2026-06-13) — each nest's 2×2 sits
    centred in its corner area; holes positioned in render units (`nestSlots` /
    render-unit `nestCentres`) since the quadrant centre is a cell boundary.
  - ✅ **HOME-corner clustering** (2026-06-13) — finished pitons now tuck
    diagonally toward each player's **nest corner** (was: the cardinal HOME edge),
    which also clears the board centre for the dice. (`Pitons.homeCluster`.)
  - **Forfeit-notice wart** (2026-06-12) — the notice describes the player
    who *just rolled* ("Red rolled 3 — no legal move, turn passes") while the
    turn cue (now the corner wash) already shows the **next** player; momentarily
    confusing. No
    engine bug. Candidate fix: gate the handoff behind an explicit "Pass/Continue"
    click (an `awaitingPass` view flag in `useGame`). Deferred — accept as-is.

## Open rule details
- **Enemy on a player's start square** (awaiting the friend, 2026-06-12) — does an
  enemy sitting on your start/entry square block you from coming out, or may you
  capture it *despite* the square being safe? **Engine today: it blocks entry and
  is immune** (start is a safe square; `legalMoves` refuses entry onto any occupied
  entry square, and capture on a safe square is forbidden). Revisit once confirmed.
- *Everything else confirmed as of 2026-06-12.* Unplayable-1st/2nd-6 closed (bonus
  roll + counts toward three-in-a-row). No capture/HOME bonuses; entry on a 5 is
  not forced.

## Dev scenario tooling (dev builds only) — complete
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
  [`scenario.ts`](../src/ui/dev/scenario.ts). Each carries one `description` (picker
  tooltip + `Dev:`-prefixed notice via `loadScenario`); `build()` returns board
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

*Why* the rig is shaped this way (knob-not-board editor, lazy-not-dead-branched,
the two parameter-merge calls) → [decisions.md](decisions.md) (2026-06-12 + -13).

## Dev quick-ref
- `npm test` (engine), `npm run build` (type-check + build), `npm run dev` (UI,
  port 5173 — see CLAUDE.md session-start policy).
- Eyeball a layout/render change **without** the dev server: throwaway Vitest that
  builds the layout (or `renderToStaticMarkup`s `<GameBoard>` with a doctored
  state) to an SVG in `references/`, then `node scripts/render-board.mjs <in.svg>
  <out.png>`. Delete the artifacts after.
