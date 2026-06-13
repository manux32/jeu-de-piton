# Decision log

> Durable, append-only rationale log (ADR-style) — **read when revisiting *why* a
> past choice was made**, not every session. Newest entry first.
>
> **Maintain:** when a real decision is made (architecture, rules, a pinned
> value, a non-obvious tradeoff), prepend a dated bullet here. Keep it to *why*,
> not blow-by-blow status — status belongs in [STATUS.md](STATUS.md), and the
> resulting facts belong in their reference doc ([architecture.md](architecture.md),
> [rules-and-lineage.md](rules-and-lineage.md), [board-model.md](board-model.md)).
> Don't duplicate git history — capture reasoning a commit message wouldn't.

- **2026-06-13** — **Start squares are safe *only for their owner*; marked with a
  colored "ownership arrow".** The friend resolved the long-open "enemy on your
  start square" question: it is an **exception** to the safe-square rule. An enemy
  parked on your start/entry square does **not** block you and is **not** immune to
  *you* — you may bring a piton out of the nest (on a 5) right onto your start and
  **capture** it. So a start square is safe to everyone *except the player who owns
  it*; the other two safe kinds (mid-arm +7, home-mouth +12) stay universally safe.
  **The engine still encodes the old "fully safe" behaviour** (`legalMoves` refuses
  entry onto any occupied entry square, and capture on a safe square is forbidden)
  — teaching it the owner-exception is now a tracked next step; this session shipped
  only the **visual** cue. *Visual choice:* each start square gets a triangle in the
  owner's colour, laid over the (kept) black safe fill, so the square still reads
  "safe" but now shows *whose*. The triangle **points the way play travels** (CCW
  along the track) rather than nest→start — packing two cues into one mark
  (ownership *and* flow direction) for free; travel is axis-aligned so the arrows
  never tilt, and the base rests on the trailing ("bottom") edge (screen-bottom for
  the south arm, its rotation for the rest). Shape is four independent knobs in
  [Board.tsx](../src/ui/Board.tsx) — `ARROW_LENGTH` / `ARROW_OFFSET_ALONG` /
  `ARROW_OFFSET_ACROSS` / `ARROW_WIDTH` — deliberately **base-anchored** (resizing
  length grows the apex from a fixed base) after a first cut tangled size with
  position (apex and base both keyed off centre, so the length knob could only ever
  budge ~10% of the height).
- **2026-06-13** — **Whose-turn wash now *pulses*; the notice split into two
  per-nest lines.** Goal (user): make "whose turn is it" unmistakable to every
  player at a glance. Two changes. (1) **The active player's corner wash now
  breathes** — a gentle opacity pulse (`.nest-active-wash` / `@keyframes
  nest-breathe`), settled at 1.5s. This **reverses an earlier call of mine** (the
  chrome-on-board entry below argued the wash should be static, "*not* a pulse,"
  to keep the pulsing-halo vocabulary exclusive to movable pitons). The reversal:
  a flashing corner is the strongest possible whose-turn cue, and the conflict it
  worried about is avoided by **keeping the two pulses distinguishable by
  amplitude, not cadence** — the wash uses a far shallower opacity swing
  (0.18↔0.42 around the static 0.28) than the piton/home alarm pulse (0.35↔0.9),
  so a large area pulsing *every* turn reads as calm presence, not alarm, even at
  the same 1.x-second rate. (2) **The single bottom-right notice became two
  per-nest lines**, each rendered in the corner of the player it concerns: the
  **event line** (what just happened — `Capture!`, `Roll again`, `No move — pass`,
  `Three 6s — sent home`, `Wins! 🎉`) sits in the **acting** player's nest; a
  quieter italic **turn prompt** (`Your turn` / `Pick a piton`) sits in the
  **current** player's nest. Both anchor to the **bottom of the player's corner
  quadrant** (same bounds as the wash) so they clear the nest holes. The reducer
  now carries which player a notice is about — a new `noticeOwner` on `GameView`,
  still derived purely by *observing* before/after state (it's just the roller /
  `prev.turn`), so the engine/UI split holds; when one player owns both lines (a
  bonus 6 that keeps the turn) the event line wins, so a corner never doubles up.
  Because each message now lives in its owner's **colour-coded** corner, the text
  **dropped the player's name and the die value** and went terse — the location
  identifies the player, the centred die shows the value. **This retires the
  long-standing "forfeit-notice wart"** (the notice describing the *previous*
  player while the cue showed the *next*): the two are now spatially separated, so
  there's nothing to confuse. The deferred `awaitingPass` gate is no longer needed.
- **2026-06-13** — **Dice moved to the board centre (over HOME); finished pitons
  tuck into nest corners; nests centred in their quadrants.** Rolling is the core
  gameplay act, so the dice (die value + Roll) earns the **dead centre** of the
  board over the HOME band — not the bottom-left nest where it sat. To make the
  centre clean: the **"HOME" label was dropped** (the dice owns that space), and
  finished pitons now **cluster diagonally toward each player's own nest corner**
  (`Pitons.homeCluster` aims at the nest, not the cardinal HOME edge), which clears
  the horizontal mid-band the die bar occupies. The dice is **painted after the
  pieces** but the **legal-move target markers paint last of all** — so a
  HOME-bound target stays visible *and clickable* over the die (the die `<span>`
  is `pointer-events:none`, only Roll captures). Sized 1.5× the corner chrome
  (`DICE_SCALE`) to own the middle. Show-on-roll / hide-on-move was considered and
  **declined** — with the label gone and pitons in the corners the centre is clean
  enough that a persistent die reads better (and keeps the last roll visible while
  you move). **Separately, nests are now centred in their corner quadrants.** They
  sat ~½ cell toward the board centre; the honest fix can't be integer-cell,
  because a quadrant centre lands on a **cell boundary** and a gapped 2×2 centred
  on a boundary needs half-cell positions. So nest holes are positioned in
  **render units** inside `buildLayout` (`BoardLayout.nestSlots`, plus
  `nestCentres` is now render-unit and *is* the quadrant centre), replacing the
  integer `nestCells` + the `round(sideLen/2)+1` offset. Spacing/size/box are
  unchanged — only the cluster shifts; the chrome that reads `nestCentres` followed
  automatically. Did **both axes** (the offset was a symmetric diagonal, so
  horizontal-only would leave an equal vertical asymmetry).
- **2026-06-13** — **Board uncapped to fill the screen; chrome centred on nests;
  New Game became a disclosure.** Three follow-ons to the chrome-on-board move
  below. (1) **Fill the screen — uncapped.** The prior entry deferred raising the
  `820px`/`860px` caps as "a width question"; the user's call resolved it simply:
  *the board is the game*, so **remove the caps entirely** (the 820px board, 860px
  `.board-shell`, 1126px `#root`). The board stays square and is now bounded only
  by available width (`width:100%`) and viewport height (`max-width: 100svh −
  56px`); on a landscape monitor height binds, so it fills top-to-bottom. (2)
  **Chrome centred on each corner's nest.** `buildLayout` now computes each arm's
  nest-cluster centre once and exposes `BoardLayout.nestCentres` (indexed by arm
  rotation: `[0]` TR, `[1]` TL, `[2]` BL, `[3]` BR — **player-count-independent**,
  so placement is identical across 2/3/4 players). Title / New Game / dice / notice
  read it to centre **horizontally** (vertical anchoring unchanged). This retired a
  duplicated `round(sideLen/2)+1` nest-offset formula that was mirrored in
  `buildLayout` and `GameBoard.titleX` — the dedupe the entry below flagged. (3)
  **New Game → disclosure**, the "real HTML wanted a popover" the chrome entry
  anticipated: a single "New game" toggle until clicked, then the 2/3/4 picker
  (choosing collapses it). State is **view-local `useState` in GameBoard** — not
  rules, so the engine/UI split holds; the foreignObject box widens when open
  (`CTRL_W_CLOSED`→`OPEN`) so it always fits while staying centred on the nest.
  *Knock-on, still open:* chrome is sized in **board units** (`CTRL_SCALE`), so a
  bigger board scales it up — size tuning is the remaining chrome-polish item (see
  STATUS).
- **2026-06-13** — **All board chrome moved *inside* the board SVG; the HUD is
  retired.** Goal (user): the board *is* the game — self-contained, nothing
  outside it. Title → SVG `<text>` (top-left, viewBox units so it scales for
  free). New Game controls (top-right), dice (bottom-left), and the notice
  (bottom-right) → **real HTML in `<foreignObject>`, authored at natural px then
  scaled into board units** via a wrapping `<g transform="scale(…)">`. *Why this
  shape:* inside a foreignObject, CSS `px` equal SVG user units, so the page's
  15px `.pill`/`.die` styling would render gigantic — the scale-down lets us
  **reuse the existing CSS untouched** and keep accessible HTML buttons.
  Rejected alternatives: re-expressing pill styling in tiny viewBox units (CSS
  churn); SVG-native `<rect>`+`<text>` buttons (lose a11y, and the *planned*
  "New Game → disclosure popover" wants real HTML). **Whose-turn** became the
  active player's **corner-quadrant colour wash** (the blank board region
  between two arms, behind the nest), *not* a halo — the pulsing halo is already
  the movable-piton vocabulary; derived from nest position so it holds across
  player counts. **foreignObject gotcha pinned:** the board is always light but
  the controls inherit the page `color-scheme`, so in dark mode pill numbers /
  die value / the win-notice render near-white and vanish — the in-board chrome
  is **pinned to fixed light-theme colours** (`.board-controls`/`.board-dice`/
  `.board-notice` in [index.css](../src/index.css)). With the header + HUD gone,
  the viewport reserve drops **190px → 56px** (shell padding only), so the board
  grows to fill height up to the `820px`/`860px` caps (raising *those* to truly
  fill a tall viewport is deferred — it's a width question, the board is square).
  Supersedes the reserve figure in the entry below; `#root overflow:hidden` and
  the rest of that rationale still stand.
- **2026-06-13** — **Game column fits the viewport; the game never
  document-scrolls.** `#root` is `height: 100svh; overflow: hidden` and the board
  caps its own height at `calc(100svh - 190px)` ([index.css](../src/index.css)).
  The 190px reserves the chrome above the board (shell padding + header + HUD) —
  the HUD's *always-present notice line* is the slice a naive budget forgot, and it
  was tipping the column past 100svh into a whole-page scrollbar (most visible with
  a `Dev:` scenario notice showing). `overflow: hidden` is deliberate
  belt-and-suspenders: the board is *sized* to fit so nothing should clip, but if
  the budget is ever off it trims a few px rather than reintroducing a document
  scrollbar. The Dev panel is exempt — it's `position: fixed`, so `#root`'s clip
  doesn't reach it and it keeps its own `overflow-y: auto`, the one place a
  scrollbar is wanted. Don't remove `overflow: hidden` or shrink the 190px without
  re-measuring the chrome.
- **2026-06-13** — **Dev rig S3 done (save-as-scenario); two parameter-merge
  calls.** The "Save as scenario" form serializes the live `GameView` to
  scenario-file source ([`serialize.ts`](../src/ui/dev/serialize.ts), pure +
  unit-tested) and POSTs it to a **dev-only Vite middleware** (`apply: 'serve'`, so
  it has no presence in a prod build) that writes `scenarios/<id>.ts`; the
  `import.meta.glob` registry surfaces it on the next HMR pass. Two redundancy
  decisions worth the ink: (1) **Merged a scenario's `hint`+`notice` into one
  `description`** — they were the *same concept* (a one-line description) duplicated
  across two surfaces (picker tooltip vs HUD banner), so `build()` now returns board
  state only and `loadScenario` stamps the `Dev:`-prefixed notice from the single
  `description`. (2) **Deliberately did *not* merge `id` and `label`** — superficially
  similar, but they are *different* concepts (a slug-constrained machine id that is
  also the filename, vs free display text), so they can't be one string. The genuine
  redundancy is `id`-equals-filename; the clean fix would be to derive `id` from the
  glob path and drop the field. Declined as not worth the churn for a dev tool: the
  serializer keeps them in sync for generated files, and a hand-edited drift is
  harmless (`id` is only a React key / lookup, never the discovery mechanism). Easy
  to revisit if it ever bites. Prod still dead-code-eliminates the whole dev surface
  (no chunk emitted) — S3 didn't perturb the byte-identical-to-pre-tooling property.
- **2026-06-12** — **Dev scenario rig: knob editor, not a board editor; lazy-only,
  not dead-branched.** Validating look-and-feel fixes (capture-click, HOME
  grouping/highlight) meant reaching exact states tedious to play to, so we built a
  dev-only rig under [`src/ui/dev/`](../src/ui/dev/) that injects a doctored
  `GameView` through a new `load` reducer action (engine untouched; scenarios are
  just `createGame` + `place()` position tweaks). Two decisions worth the ink:
  (1) **Pivoted from a spatial board editor to a knob form** ([`StateEditor.tsx`](../src/ui/dev/StateEditor.tsx))
  on user preference — it's far less code (no `Board.tsx` reverse-mapping / edit
  mode) and doubles as living documentation of *which* `GameState` fields actually
  drive the game (turn, pending-roll→phase, `extraTurnStreak`, per-piton position).
  (2) **The whole dev surface must be a single lazy `import()` gated by
  `import.meta.env.DEV`** ([`DevTools.tsx`](../src/ui/dev/DevTools.tsx) + its own
  `dev.css`). The naïve `import.meta.env.DEV && <Panel/>` dead-branch did **not**
  tree-shake — the static imports + the `import.meta.glob` scenario registry kept
  ~2 kB of JS and the dev CSS anchored in the production bundle. The lazy-chunk
  pattern makes prod byte-identical to pre-tooling; don't reintroduce a static dev
  import. Scenarios are **one file each** auto-discovered via `import.meta.glob`, so
  the planned S3 "save as scenario" is just writing a new file into `scenarios/`.
- **2026-06-12** — **Rectangular cells are render-only, not a grid change.** The
  reference board's cells are wider across an arm than along it. Rather than make
  the *logical* grid non-uniform (which would entangle the 90° rotation tiling and
  every engine-index↔cell mapping), `buildLayout` keeps the uniform 19×19 logical
  grid and emits a separate `edges[]` array of cumulative pixel boundaries —
  palindromic, with the three central rows/columns widened by `ARM_WIDTH_SCALE`.
  Renderers go through `cellStart`/`cellSize`/`cellMid`. Because one symmetric
  array drives both axes, each arm gets the right orientation for free (south arm
  wide-and-short, east arm tall-and-narrow). One knob, engine untouched.
- **2026-06-12** — **Unplayable 1st/2nd 6 grants the bonus roll (confirmed).** A 6
  with no legal move is *not* an ordinary forfeit: the player keeps the turn and
  rolls again, and the unplayable 6 still counts toward the three-in-a-row (so
  three unplayable 6s trip the lose-leading penalty) — symmetric with how a 3rd 6
  is penalized "regardless of playability." Engine: `applyRoll` handles the
  no-move-but-bonus branch; `grantsExtraTurn` was generalized to
  `rollGrantsExtraTurn(state, roll)` so the played and unplayable paths share it.
  A non-6 with no move still forfeits. Resolves the open question from the "6's
  turn consequences split by phase" entry below.
- **2026-06-12** — **Docs reorg for lean session context.** Split the docs into
  tiers: session-start (CLAUDE.md + a slimmed STATUS.md), lazy reference
  (architecture.md, rules-and-lineage.md, board-model.md, this log), and frozen
  archive (`archive/PLAN.md`). The decision log moved out of STATUS to here;
  PLAN.md's durable content moved to architecture.md and the original was archived.
  Goal: a session loads only the two session-start docs by default; rationale,
  rules, and geometry are one click away when a task needs them.
- **2026-06-12** — **Milestone 4 done → the game is playable.** The interaction
  loop lives entirely in `src/ui/`, rules-free: a `useGame` `useReducer` holds
  the live `GameState` and drives it only through `applyRoll`/`applyMove`. Key
  call: the reducer derives its two view-only fields (`rolled` die chip,
  `notice`) by **observing before/after engine state** — e.g. it tells the 3rd-6
  penalty from an ordinary forfeit by seeing the roller gain a piton in its nest,
  never by re-checking the rule. The die is rolled in the click handler (RNG
  injected) so the reducer is a pure `(view, action)`. Highlighting reuses the
  `buildLayout` seam (movable-piton halo + `destinationCell` target rings tinted
  the mover's color). Player-count pills became a new-game trigger. Two UX
  refinements landed alongside: a compact header row (title left / new-game
  right) freeing vertical space, and a board sized by `min(width, viewport-
  height)` — fixing a flex-shrink-to-content bug where the variable-length notice
  resized the whole board on every roll. Known wart deferred: the forfeit notice
  references the previous player while the indicator shows the next (see STATUS).
- **2026-06-12** — **Board model documented to stop drift.** Added
  [board-model.md](board-model.md) as the canonical engine-indices↔screen
  reference (one-arm diagram, safe-square table, seating convention, the "don't
  drift" list of mistakes corrected this session) after a session that re-derived
  the screen mapping wrong. Wired pointers from CLAUDE.md (session-start
  orientation) and `src/ui/layout.ts`. Layout fixes landed: `SAFE_PHASE`/
  `SEAT_ROTATION` split (player 0 seated South → 2P is North–South), mouths on
  tip-middles, nests on the start-column corner, safe squares black. Rectangular-
  cell rendering filed as milestone-6 polish.
- **2026-06-12** — **Milestone 3 done; index→screen mapping pinned** in
  [`src/ui/layout.ts`](../src/ui/layout.ts). The cross drops onto a **19×19 cell
  grid** (`sideLen = (trackLength/4 − 1)/2 = 8`, `gridSize = 2·sideLen+3`). The
  68-cell track ring is built from **one arm's 17-cell quadrant** (out a side
  column → across the tip U-turn → back the other side) **rotated 90° ×4**, then
  **phase-shifted by `RING_SHIFT = 10`** so engine track index 0 sits just inside
  an arm tip (a believable start) and each player's home lane + nest fall on
  their own arm. The engine still owns no screen geometry — `buildLayout` is the
  sole index→pixel map, so direction (counter-clockwise) lives only here.
  Component split: `<GameBoard>` (memoizes layout) → `<Board>` (static cross) +
  `<Pitons>` (overlay); player colors per arm in `ui/colors.ts`. UI stays
  rules-free (reads state, no `applyMove` yet). Verified by rasterizing a
  throwaway SVG render against `references/` (Selchow & Righter layout) — clean
  match: continuous ring, 12 safe squares 3-per-arm, lanes on the right arms.
- **2026-06-12** — **Rung 6 done → engine core complete.** Lane movement reuses
  the same progress-line walk as the track: `legalMoves` no longer special-cases
  the lane mouth — it lets `positionAt` map the target progress to a track
  square, lane cell, `finished`, or `null` (overshoot → not a move, which *is*
  `exactHomeEntry`). Lanes are **private**, so `passageBlocked`/`resolveLanding`
  treat progress ≥ `trackPathLength` as own-piton-only (no enemies, captures, or
  safe squares in-lane). **Win precedes the extra-turn grant**: `applyMove`
  checks all-four-`finished` *before* `grantsExtraTurn`, so a winning move ends
  the game (`winner` + `game-over`) and never also hands the player another roll,
  even off a 6.
- **2026-06-12** — **The 6's turn consequences split by phase.** The extra-turn
  *grant* lives in `applyMove` (after a move, a 6 keeps the turn + bumps
  `extraTurnStreak`); the 3rd-6 *penalty* lives in `applyRoll`, because that 6 is
  "**not played**" — there is no move to apply, so it's a roll-time event with a
  side effect (nest the most-advanced track piton), distinct from an ordinary
  no-move forfeit. `legalMoves` stays a pure movement query and is left out of
  it. Surfaced one new open question (unplayable 1st/2nd 6 — see STATUS).
- **2026-06-12** — **Safe squares + `homeEntryOffset` pinned** from the board and
  the friend who owns the rules. Travel is counter-clockwise; you start on your
  own arm. Counts of 7 then 5 from a start (and a 12 landing on the next player's
  lane entry) give `safeSquares = [0,7,12,17,24,29,34,41,46,51,58,63]` (starts +
  mid-arms +7 + home-mouths +12) and `homeEntryOffset: 4` (`trackPathLength: 64`,
  lane mouth 5 before own start). Closes the last "Still open" geometry items.
- **2026-06-12** — **Build the cabin variant (jeu de piton) first**, not canonical
  Parcheesi. The friend who owns the family rules confirmed the full ruleset
  (now in [rules-and-lineage.md](rules-and-lineage.md)), so we build the game we
  actually play. Bonus: one die is a *simpler* engine core than canonical's
  two-dice combine/split, which suits the baby-step build. The turn model is a
  "pool of movement amounts to consume" (single die = pool of one); canonical's
  two-dice case slots in later as the general case without reworking the core.
- **2026-06-11** — Dev tooling: **Vitest** is the test runner (`npm test`).
  Board SVG → PNG render pipeline added (`npm run render:board`, sharp) for
  reading geometry. Global personal memory now auto-loads each session via a
  `SessionStart` hook in `~/.claude/settings.json` (untracked machine-local);
  the project workspace hides the global `.claude` noise from explorer/search.
- **2026-06-11** — Board confirmed as standard Parcheesi geometry (68-track,
  7-cell lanes, 12 safe squares) from a photo of the cabin board. "Moving is
  mandatory if able" (forced-move) added as a rule and `forcedMove` Ruleset knob.
- **2026-06-11** — Project docs live under `docs/` (only `CLAUDE.md` at repo
  root; `README.md` kept at root by GitHub convention). Status tracked in STATUS.
- **2026-06-11** — Engine move validation is **path-based**, not
  destination-only, because the cabin variant has passing/blocking rules. Built
  in from the start; canonical Parcheesi is the permissive special case.
- **2026-06-11** — Travel **direction** (cabin = counter-clockwise) is a
  board-layout concern, not an engine branch: engine advances by increasing
  track index, UI maps index → screen position.
