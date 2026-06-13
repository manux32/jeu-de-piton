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
the turn notices are rendered inside the board SVG (title as `<text>`; the rest as
`<foreignObject>` HTML scaled into board units), and whose-turn is shown by
**gently pulsing** the active player's corner quadrant wash in their colour. See
the 2026-06-13 decision-log entries for the *why* (foreignObject scaling,
light-theme pinning, the pulse-vs-static reversal).

As of the **2026-06-13 fill/centre/disclosure pass**: the board is now
**uncapped** and fills the viewport (*the board is the game*); the title / New
Game / notice are **centred horizontally on their corner's nest** (via
`BoardLayout.nestCentres`); and **New Game is a disclosure toggle** — collapsed to
one button until clicked, then the 2/3/4 picker (choosing collapses it).

As of the **2026-06-13 dice-centre/nest-centre pass**: the **dice
moved to the dead centre of the board, over HOME** — rolling is the core act, so
it owns the middle (1.5× via `DICE_SCALE`, painted over the HOME band, which lost
its "HOME" label; legal-move targets paint *last* so a HOME-bound ring stays
clickable on top of the die). Finished pitons now **tuck into their nest corners**
(`Pitons.homeCluster` aims at the nest), clearing the centre. And the **nests are
centred in their corner quadrants** — `buildLayout` positions nest holes in
**render units** (`nestSlots`; `nestCentres` is now render-unit and *is* the
quadrant centre), replacing integer `nestCells` + the `round(sideLen/2)+1` offset.

As of the **2026-06-13 turn-clarity pass**: two cues make
"whose turn" unmistakable. The active player's corner **wash now pulses** (a
gentle ~1.5s breathe — `.nest-active-wash` in [index.css](../src/index.css),
distinguished from the piton/home *alarm* pulse by a far shallower opacity swing,
not by cadence). And the single corner notice **split into two per-nest lines**:
the **event line** (`Capture!` / `Roll again` / `No move — pass` / `Three 6s —
sent home` / `Wins! 🎉`) sits in the **acting** player's nest, a quieter italic
**turn prompt** (`Your turn` / `Pick a piton`) in the **current** player's — both
anchored to the bottom of their corner quadrant. The reducer now tags each notice
with a `noticeOwner` (still pure before/after observation). Messages went terse
and dropped player names (the colour-coded corner identifies the player). **This
retires the forfeit-notice wart** below.

As of the **2026-06-13 start-square ownership pass** (this session): the friend
**resolved the "enemy on your start square" question** — it's an **exception**: a
start square is safe to *everyone but its owner*, who may exit the nest (on a 5)
right onto it to **capture** an enemy parked there. The board now shows this with a
per-start **ownership arrow** — a triangle in the owner's colour over the (kept)
black safe fill that *also* points the way play travels (two cues in one: whose
square + flow direction); shape via four base-anchored `ARROW_*` knobs in
[Board.tsx](../src/ui/Board.tsx). **The engine still encodes the old fully-safe
behaviour** — implementing the owner-exception is a fresh next-session item (below).

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
- **Implement the start-square exception in the engine (new, 2026-06-13).** The
  rule is confirmed and the board already marks it, but `legalMoves` still treats a
  start square as fully safe: it refuses nest-entry onto an occupied entry square
  and forbids capture on safe squares. Teach it that a player's **own** start
  square is *not* safe to them — entry onto it (on a 5) captures a lone enemy there
  — while staying safe to everyone else and for the other two safe kinds (+7, +12).
  Engine + tests; **no UI change** (the marker's already drawn). Detail →
  [rules-and-lineage.md](rules-and-lineage.md).
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
  - ✅ **Turn-clarity cues** (2026-06-13) — the whose-turn wash pulses, and the
    notice split into per-nest event line (acting player) + turn prompt (current
    player), each in its owner's corner. `noticeOwner` added to `GameView`. *Why*
    → [decisions.md](decisions.md).
  - ✅ **Start-square ownership arrows** (2026-06-13) — each start square carries a
    triangle in the owner's colour pointing the way play travels (ownership +
    direction in one mark); four base-anchored `ARROW_*` knobs in
    [`Board.tsx`](../src/ui/Board.tsx). Marks the now-confirmed start-square
    exception (engine impl still pending — see "Next session"). *Why* →
    [decisions.md](decisions.md).
  - ✅ **Forfeit-notice wart** (2026-06-12, **resolved 2026-06-13**) — the notice
    used to describe the player who *just rolled* while the turn cue showed the
    **next** player; momentarily confusing. The deferred `awaitingPass`-gate fix
    proved unnecessary: the per-nest notice split (above) **spatially separates**
    the two, so the just-acted message sits in the acting player's own corner —
    nothing left to confuse.

## Open rule details
- ~~Enemy on a player's start square~~ — **RESOLVED 2026-06-13** (the friend): it's
  an **exception** — a start square is safe to everyone *but its owner*, who may
  exit the nest onto it to capture an enemy there. Visual cue shipped (ownership
  arrows); **engine change still pending** — see "Next session". Detail →
  [rules-and-lineage.md](rules-and-lineage.md).
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
