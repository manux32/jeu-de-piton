# Decision log

> Durable, append-only rationale log (ADR-style) — **read when revisiting *why* a
> past choice was made**, not every session. Newest entry first.
>
> **Maintain — the admission test (apply before adding an entry):** an entry earns
> its place *only* if it records a **why**, a **rejected alternative**, or a
> **reusable gotcha** that `git log` + the diff wouldn't already show. If the bullet
> could be reconstructed from the commit + its diff, it's per-change status narration
> — that's git's job; don't write it here. Keep entries to *why*, not blow-by-blow
> status (status → [STATUS.md](STATUS.md)); the resulting *facts* belong in their
> reference doc ([architecture.md](architecture.md),
> [rules-and-lineage.md](rules-and-lineage.md), [board-model.md](board-model.md),
> [cross-platform-ui.md](cross-platform-ui.md)) with this log holding only the dated
> rationale. Prepend new entries (newest first).

- **2026-06-25** — **Default seat colours reordered to green/red/blue/yellow; a
  "seat" abstraction was considered and rejected.** Changed `PLAYER_COLORS` so each
  mode's default falls out of one shared prefix (2p green/red, 3p +blue, 4p & 2v2
  +yellow) — seat order also fixes board-arm order, so this moved which arm each
  colour occupies (intended). The reorder forced a 4-cycle rename across the
  engine/AI tests, because they use colour names (`red-0`, "yellow's start") as
  *seat handles* — colour is the engine's player identity. *That coupling raised the
  real question (and the rejected alternative):* should seat index become the
  identity, with colour demoted to pure paint? **Decided no, and intentionally not
  even backlogged.** *Why:* the coupling causes no bugs (colours are constrained
  distinct, so they key fine); the test-churn motivation is one-time (we reorder
  defaults ~once, now done), not recurring; and — the deciding point — **rule
  variants wouldn't benefit either**, since a variant is a `Ruleset` of *mechanics*
  (piton count, safe squares, capture/dice rules) and where position matters it
  already keys off `entryIndices` geometry, never the colour name. Canonical
  Parcheesi is still just a ruleset, identity-agnostic. The seat refactor would only
  pay off for *presentation* features that don't exist (mid-game recolour, freely
  swapped palettes, spectator seats), so it's pure churn today — recorded here so a
  later session that re-notices "tests use colours as seats" doesn't re-open it.
- **2026-06-25** — **2v2 read-back windows: the Game log stays chronological (a team
  *tag*, not a regroup); the nest team letter is baked geometry.** Finishing the 2v2
  UI (session two). *The design call (the user's, worth recording):* in a team game the
  Game log prefixes each turn with a neutral `[A]`/`[B]` tag in true play order, rather
  than re-clustering each round's turns under Team A/Team B headers. *Why / rejected
  alternative:* a log's job is chronology — play alternates A,B,A,B within a round, and
  reordering to group teammates would hide that real back-and-forth; the tag gives the
  at-a-glance team read without lying about order. (The Game stats window does the
  opposite on purpose — it's a *standings* table, so it groups columns by team, leading
  team first, with a vertical separator.) *Also this session, applying the existing
  rule not setting a new one:* the nest-centre team letter moved from live SVG `<text>`
  to a bbox-centred baked `<path>` (added "A"/"B" to `gen-glyphs.mjs`), because live
  `<text>` sat left+low — `textAnchor=middle` centres on advance width and
  `dominant-baseline=central` reserves unused descender room — the same drift the die
  labels hit (see the 2026-06-21 entry + [cross-platform-ui.md](cross-platform-ui.md)).
  Confirms the standing rule: any new fixed glyph that must sit dead-centre gets baked.
- **2026-06-25** — **2v2 is a derived state, not a UI mode flag.** The 2v2 UI half
  (New Game toggle + Team A/B headers, nest team labels, team win banner) reads
  "is this a team game?" everywhere as `new Set(state.teams).size < teams.length` —
  i.e. straight off the engine's `teams` array — rather than carrying a separate
  `mode: '2v2'` boolean through the UI. *Why:* `teams` is already the single source
  of truth (a free-for-all is the identity `[0,1,2,…]`, 2v2 is `[0,1,0,1]`), so a
  parallel flag could only drift out of sync with it; the engine deliberately models
  a free-for-all as the degenerate team case, and the UI mirrors that. *Consequence
  for session two:* the Game log / stats windows should derive team grouping the same
  way (off `state.teams`), not re-introduce a flag. Also recorded here so a later
  session doesn't "tidy up" by adding one. (The win window separately dropped the
  winner-hue tint for the generic window palette — a look choice, not logged.)
- **2026-06-24** — **Docs restructured around single-source-of-truth; routing has
  one home and a garbage collector.** *The failure:* STATUS's "Where we are" was a
  capabilities snapshot — duplication *by construction*, since it restates the
  reference docs — and both it and this log accreted because the system had writers
  but no eviction step, while routing stayed a session-tail judgment call that
  drifted. *The fix, by rung:* (1) STATUS now holds only backlog + open questions;
  the per-doc **routing map moved into [CLAUDE.md](../CLAUDE.md)** (one home per
  fact, deterministic lookup). (2) The reusable layer was harvested to its home
  (observe-the-transition → [architecture.md](architecture.md); the overlay
  text-align gotcha → [cross-platform-ui.md](cross-platform-ui.md); deploy →
  [dev-tooling.md](dev-tooling.md)). (3) Enforcement was **promoted from a prose nag
  to a mechanism** — a generic settling/eviction pass in `/mnx-session-wrap` runs
  every session. *Why the skill stays generic* (not a per-project copy): the
  mechanism has one home too, and reads each project's *declared* routing — its
  contract is that routing must be declared legibly, or the settling step decays back
  into judgment. *Rejected:* retiring this log for git — git shows what/when, not
  synthesized *why* or rejected alternatives, so it stays in a lighter form gated by
  an admission test (an entry must add a why/alternative/gotcha the diff wouldn't
  show — this entry's own bar).
- **2026-06-23** — **Pre-push hook runs the CI build, because `npm run dev` never
  type-checks.** *The failure it closes:* the Game-log change left a stale `GameView`
  test fixture missing the new `history` field. `vite` dev (and HMR) never run `tsc`, so
  it built fine locally — but CI's `npm run build` (`tsc -b && vite build`) failed, and a
  failed build silently produces no Pages artifact, so the deploy just stops updating with
  no loud error. The PC had the feature; the iPad (served from Pages) didn't. *The fix:*
  a tracked [`.githooks/pre-push`](../.githooks/pre-push) that runs the exact CI gate
  (`npm run build`) and blocks the push on failure — caught at the last local moment
  instead of as a silent post-push deploy miss. *Why pre-push, not pre-commit:* commits
  are frequent (one per step) and the build is the deploy gate, so push is the natural
  once-per-batch checkpoint. *Why it survives clones:* a `prepare` npm script sets
  `core.hooksPath .githooks` on install, so it's not a per-machine local tweak. Bypass for
  a real emergency with `git push --no-verify`. Note this is a *local* mirror of CI, not a
  replacement — CI stays the backstop; they now check the same thing.
- **2026-06-23** — **Full Game log window — the persistent twin of the per-nest
  turn log.** *Where the data lives (the key call):* a new append-only `history` in
  [`useGame`](../src/ui/useGame.ts) — same observe-the-transition pattern as the turn
  log and the stats tally, **not** an engine concern. The non-obvious bit is *when* a
  turn is recorded: a seat's finished stack is snapshotted **at turn-end** — inside
  `handover` (which already fires once per real handover, and skips bonus-6 stays) plus
  an explicit flush at game-over (no handover fires there, so the winning turn would be
  lost otherwise). Snapshotting only *completed* stacks is what makes the log "previous
  turns only" by construction — the in-progress turn is never in it, with no extra
  filter. *One render source:* the board's per-row die+notice JSX was extracted into a
  shared [`NoticeRow`](../src/ui/NoticeRow.tsx) so a log line and a nest line can't
  drift. *Round grouping* is derived in `LogModal`, not stored: walk the flat turn list,
  start a new round when the seat index stops climbing (robust to a skipped seat). *CSS
  trap worth remembering for any future DOM-overlay panel:* `#root` sets
  `text-align: center` and it **inherits**, so a panel that wants left-aligned text must
  set `text-align: left` itself; and `align-items: flex-start` shrink-wraps each block to
  its content width, so centred text then lands at a *different* x per block — the cause
  of the first "mess of indentations" pass. Fix = explicit `text-align: left` + full-width
  (stretch) blocks + pure `padding-left` indents, so every tree level has a fixed,
  content-independent left edge.
- **2026-06-22** — **greedyStrategy tier 6 ("reach a safe square") now excludes a
  *dangerous* start outright, not just via the soft guard.** *The trap:* every start
  square is also a marked safe square (entries {0,17,34,51} ⊂ `safeSquares`), so a
  move landing on an opponent's start counts as "safe" — but if that owner still nests
  a piton, it exits onto the square and captures next turn, the opposite of safe. The
  flat ladder's *general* dangerous-start avoidance didn't save us: it only
  *deprioritises* such landings within a tier and falls back to "play one anyway if the
  tier would otherwise empty" — so when the dangerous start was the *only* safe-square
  landing, tier 6 took the bait. *Fix:* fold `!landsOnDangerousStart` into tier 6's
  predicate so the move never qualifies as safety at all and falls through to a later
  tier (where the leader fallback still shuns it). The soft guard stays for the other
  tiers, where a dangerous-start landing can be a legitimate-but-risky move (e.g. a
  capture). Tier 8 needs no such change — `capturableNextRoll` already self-rejects it.
- **2026-06-22** — **Per-game player stats scoreboard (captures / losses / 6s),
  accumulated UI-side.** *Where it lives (the key call):* the per-seat tally is
  built in [`useGame`](../src/ui/useGame.ts) by *observing* each engine transition
  — the same pattern as the turn log — **not** in the engine. The rules core stays
  pure; stats are a presentation ledger, not a rule. It accrues from the deal to the
  win and, unlike the turn log, is **never wiped** at a handover. *Why the
  "on start square" splits are exact, not heuristic:* every start square is a safe
  square, so a *moving* piton can never capture on one — the only capture that lands
  on a start square is leaving the nest straight onto your OWN start and bumping a
  squatting enemy (the cabin start-square exception). So `from.kind === 'nest'` ⟺ a
  start-square capture (its mirror is the victim's "on enemy's start"); every
  movement capture is "regular." The triple-6 loss is counted **only when a piton
  was actually lost**, gated on the same nest-count rise the turn log already reads.
  *UI:* a separate Stats window ([`StatsModal`](../src/ui/StatsModal.tsx)) — not
  crammed into the win popup — reusing the Options/New-Game overlay family + one
  `STATS_WINDOW_SIZE` knob, opened from a button on the win popup or an Options-menu
  row; players are columns, ranked by pitons home then total captures.
- **2026-06-22** — **greedyStrategy's tail got two smarter tiers: un-clog the home
  lane, then a one-ply *dodge a capture*.** The old final pair (finish-from-lane →
  advance-leader) became: (7) **un-clog the home lane** — advance *any* lane piton,
  most-advanced first (this broadens the old finish-from-lane tier, which it
  subsumes); (8) **dodge a capture**; (9) advance-leader fallback. *Why un-clog
  over dodge (the designer's call):* a lane piton is already capture-immune, so the
  move is free progress that also clears the lane for pitons still to come; a
  capture is only a *potential* (RNG-gated) threat, so it's the lower priority.
  *How dodge works:* among track pitons (leader first), if one is capturable next
  turn **and** its single move this roll lands where no rival can then reach, play
  that escape; else fall to the leader. *Non-obvious choice:* "capturable next
  turn" is answered by stepping into each rival seat and running the engine's own
  `legalMoves` for all six faces ([`strategy.ts`](../src/ai/strategy.ts)
  `capturableNextRoll`) rather than re-deriving the chase by hand — so passing/
  blocking (a screened chaser is **not** a threat, per the designer's request),
  safe-square immunity, the home-lane turn-off, and even the start-square capture
  all fall out for free, and a dangerous-start landing self-rejects (the owner
  captures it on entry) without a separate guard. A rival's reach is the six single
  rolls {1–5, and a 6's twelve}; multi-roll 6-streak chains are deliberately
  ignored. Still a flat ladder — the real upgrade stays a future search `Strategy`.
- **2026-06-22** — **Move trajectories: dashed, track-following lines from a
  piton's origin to its destination — a live "where can I go" preview and a
  persisted record of previous moves.** *Non-obvious choices:* (1) **Lines follow
  the track, reusing the engine's own progress model.** Rather than straight chords
  (which cut across the board interior and through HOME), the UI walks the route
  square-by-square via the engine's pure `progressOf`/`positionAt`
  ([`board.ts`](../src/engine/board.ts)) and maps each step to a screen cell — so
  the engine stays geometry-free and the UI just renders a known from→to. (2)
  **Per-seat *perpendicular lane* offset, not a fixed nudge.** A first cut nudged
  each seat's whole line by a constant diagonal; that gives only two distinct
  values per axis, so on-screen *horizontal* lines collapsed onto each other. The
  fix offsets each line perpendicular to its own direction by a distinct per-seat
  lane (mitre-joined so it stays continuous through the 90° corners), spread
  symmetrically about the true path — every seat gets its own track whatever the
  direction. (3) **History rides the turn log.** The persisted lines reuse the
  per-seat turn log's "pinned until your turn comes round, then wiped" lifecycle —
  an optional `move:{from,to}` was added to `TurnEntry` ([`useGame.ts`](../src/ui/useGame.ts))
  purely as geometry; it is **not** shown in the nest notice (the notice render
  reads only `die`/`notice`), keeping the notices clean. (4) **Two features,
  each a live toggle via a second runtime store** ([`trajectorySettings.ts`](../src/ui/trajectorySettings.ts)),
  mirroring the timing store; the look knobs stay plain theme.ts consts. (5)
  **Native SVG (`<polyline>`/`<circle>`), no `foreignObject`,** so it renders
  identically on iOS Safari (see [cross-platform-ui.md](cross-platform-ui.md)).
- **2026-06-21** — **The `_MS` motion timings became live-tunable from the Dev
  panel, via a runtime store seeded from theme.ts.** *Non-obvious choices:* (1)
  **A separate live store (`src/ui/timing.ts`), not React context or mutated
  consts.** The durations are `export const`s imported into the timer hooks, so they
  can't be reassigned at runtime; rather than thread context through, the hooks now
  read through getters on a module-level store (immutable snapshots + a tiny
  `useSyncExternalStore` for the editor). theme.ts stays the single source of truth
  for the *defaults* — the store reseeds from it on every reload, so edits are
  deliberately session-only (a dev convenience, not a saved setting). A tweak lands
  on the **next** roll/turn (getters are read at schedule time), which is the wanted
  behaviour. (2) **A master multiplier scales everything *except* `SPIN_TICK_MS`.**
  The tick is the spin's *refresh rate*, not a duration to stretch — keeping it
  fixed means the die animates smoothly however long the overall spin is scaled to;
  multiplier 0 ⇒ zero delay (instant play). (3) The tweaked theme defaults were
  rolled in at the same time (spin/hold 1000→500, AI delays 600→500).
- **2026-06-21** — **New Game gained a per-AI-seat difficulty picker and a
  dropdown colour picker; two new player colours shipped, two stay deferred.**
  Each AI seat now picks its own brain (**Easy** = `randomStrategy`, **Hard** =
  `greedyStrategy`) in the New Game window. *Non-obvious choices:* (1) **An
  id→strategy indirection seam, with labels in the UI layer.** `src/ai/strategy.ts`
  exports `STRATEGY_IDS` + `STRATEGY_BY_ID` (the "mini labelling indirection" the
  user asked for); the human words "Easy"/"Hard" live in `strings.ts`
  (`SETUP.strategyLabels`), so renaming/translating them — or adding a third rung —
  never touches the ai layer. The draft flows seat-indexed through
  `GameSetup.strategies` → `App.seatStrategies` → `useAiTurn`, which now takes
  **one `Strategy` per seat** (was one for all). (2) **A custom `Dropdown`
  component, not native `<select>`.** The colour picker's options are bare coloured
  swatches, which a native select can't render cross-platform; the New Game window
  is a plain DOM overlay (not in the board SVG), so there's no `foreignObject`
  caveat to a custom popover. The same component drives both pickers. (3) **`black`
  and `white` are deliberately *not* offered yet** — each blends into a
  near-its-own-colour board element (black on the dark safe squares; white on the
  near-white nest holes + die face) and needs a render tweak first. `orange` +
  `purple` shipped (they read fine, since every piton carries a dark outline). The
  engine `PlayerColor` union widened + a new `ALL_PLAYER_COLORS` *pickable palette*
  (superset of the 4 default seat colours; a game still seats ≤ 4). (4) **A
  dropdown widget's height is locked to the standard control height; its pill-size
  knob sizes only the swatch *inside* it.** An earlier pass let the colour button
  grow to fit a big pill — which broke sibling alignment and made the knob a
  coupled trial-and-error tweak. The fix decouples them: `SETUP_SWATCH_SIZE` (the
  chosen-colour pill on the closed picker) and `SETUP_PALETTE_SWATCH_SIZE` (the
  open palette's pills) change pills with zero layout side-effects. *General UI
  principle:* a control's outer size stays fixed; cosmetic knobs never feed back
  into layout. Seat rows are a left-packed 3-column grid (type | colour | strategy)
  so every seat's controls align and nothing shifts when a label's width changes.
- **2026-06-21** — **Die labels ("Roll", "!") are baked SVG path geometry, not
  live text.** They render identically on PC and iPad now (user-confirmed). *Why
  this and not a text tweak:* native SVG `<text>` in `system-ui` substitutes a
  different physical font per platform (Segoe UI ↔ San Francisco), so both the
  baseline centring and any hand-tuned nudge drift between devices — no
  text-rendering setting can fully fix it, since it's at the substituted font's
  mercy. So we stop rendering text: trace the two fixed strings once from **Nunito
  ExtraBold (OFL)** into `src/ui/glyphs.ts` via `tools/gen-glyphs.mjs`, and render
  the path **bbox-centred** in `DieFace` (which also removed the residual
  horizontal drift). Pure geometry = pixel-identical everywhere. *General rule this
  set:* native SVG `<text>` is platform-dependent too (not just `foreignObject`);
  for small fixed strings that must match exactly, prefer baked paths — full
  symptom→cause→fix in [cross-platform-ui.md](cross-platform-ui.md). *Deferred:*
  the title wordmark's plain letters still use the system font and drift the same
  way, but converting them needs its hand-drawn icons re-tuned by eye (see STATUS).
- **2026-06-21** — **The board title became a "Pitons" logo wordmark; its
  positioning knobs were cut to plain X/Y/size.** Renamed the title from "Jeu de
  piton" to **"Pitons"** and turned it from one `<text>` into a small logo
  (`BoardTitle.tsx`): the **"i" is a side-view pawn** (a *piton* — the game's own
  piece) and the **"o" is a five-pip die** (its other star); P/t/n/s stay heading-
  font letters so it still reads at a glance. *Non-obvious choices:* (1) **native SVG
  in board units, no `foreignObject`** — the old title was already native `<text>`,
  and a wordmark of shapes scales + behaves on iOS where foreignObject mis-centres
  (see [cross-platform-ui.md](cross-platform-ui.md)). (2) **Deterministic cell
  layout, not measured text** — each glyph gets a fixed cell width (`TITLE_GLYPHS`,
  in ems) and is centred in it, so nothing depends on `getComputedTextLength` (no
  reflow flash); glyphs are centred so a narrow one only gains side-bearing, never
  overlaps. (3) **Icon fills reuse `--title-fill`** so the whole mark is one colour;
  the die's pips punch through in `--board-bg` to read as holes. (4) **Knob
  philosophy, at the user's steer:** position/geometry knobs are kept to **X / Y /
  size** only — `TITLE_BASELINE_RATIO` (font-metric plumbing) was folded into the
  component as a `CAP_RATIO` constant, and `TITLE_FONT_SIZE`→`TITLE_SIZE`,
  `TITLE_TOP`→`TITLE_Y`, plus a new `TITLE_X` nudge. The **Options gear** got the
  same X/Y treatment (`CTRL_INSET`→`CTRL_Y`, new `CTRL_X`). This seeded a backlog
  task to reorganize all of `theme.ts` **by visual element** rather than by knob
  type (the user's standing preference; see STATUS + the `knob-design-user-intent`
  memory).
- **2026-06-20** — **Options gear menu became the single entry to game options;
  `forceNextTurn` removed entirely.** Replaced the two board pills (New game + Dev)
  with **one gear button** that opens an **Options window** (`OptionsMenu`), whose
  rows launch the existing New Game window and the Dev panel — and where every future
  option lives (one row + a `strings.OPTIONS` label). *Design choices:* (1) a
  **window, not a dropdown** — a menu anchored inside the board's `<foreignObject>` is
  exactly what iOS Safari mis-positions (flies to a screen corner), so it reuses the
  trusted DOM-overlay pattern the win/New-Game modals already use (centred on the
  viewport; see [cross-platform-ui.md](cross-platform-ui.md)). It's a pure launcher —
  no state, no rules. (2) The **gear icon is self-authored** (a small SVG path
  computed from a few radii in `GearIcon.tsx`), so there's no third-party asset or
  licence to track. (3) GameBoard signals App to open Dev via an **`onOpenDev`
  callback** (replacing the old `devButton` node slot), keeping the presentation file
  free of any dev dependency. (4) **`forceNextTurn` deleted outright** — the engine
  function, the reducer action, *and* the App wiring. It was a recovery hatch for a
  stuck-turn bug that hasn't recurred in a long time; with the Dev panel now shipping
  everywhere (incl. mobile), any future wedge can be unstuck from a scenario, so the
  standing escape hatch (and its retired-button thread through the gear menu) earned
  removal rather than resurrection. The stuck-turn backlog item was dropped too — it
  can be re-added from this entry if the bug returns.
- **2026-06-20** — **Modals moved off the SVG to DOM overlays (the deferred
  refactor, now done); each window has one overall-size knob.** Executed the move
  decided just below: the win popup and New Game window now render as plain DOM
  overlays (`position:fixed; inset:0`, flex-centred) instead of HTML inside the
  board `<svg>`. iPad-verified — the tiny-top-left foreignObject-centring bug is
  gone. *Non-obvious choices:* (1) **kept both in GameBoard** (it returns a
  fragment of the `<svg>` + the two overlays) rather than lifting them to App —
  their open state (`dismissedWin`/`setupOpen`) and the New Game button already
  live there, so a fragment preserves cohesion with no state-lifting. (2)
  **Centred on the *viewport*, not the board** — the user explicitly rejected
  deriving a board-sized stage wrapper as needless complexity: a modal just needs
  to sit in the middle of the screen, which `fixed` + flexbox does with no
  geometry math. (3) **One overall-size knob per window** (`WIN_WINDOW_SIZE` /
  `SETUP_WINDOW_SIZE`, both in `vmin`): the panel's whole layout is now `em` off
  that one base font, so the knob scales the entire window proportionally. `vmin`
  because the board is ~100 vmin tall on every device, so a window stays a stable
  fraction of the board. Defaults reproduce the old (correct desktop) sizes. This
  retired the board-unit/scale plumbing for these two (`SETUP_SCALE`/`W`/`H`, the
  `frameW/H` props, the `.setup-scrim` rect + `.setup-frame`). Named `WINDOW` not
  `TEXT` because they size the window, not just its text.
- **2026-06-20** — **Mobile-fix session: dev panel ships everywhere; modals will
  move off the SVG to DOM overlays.** Two decisions, both driven by iOS Safari /
  WebKit being flaky with HTML inside `<foreignObject>` (desktop never shows it, so
  the iPad is the only real test). (1) **The Dev scenario panel now ships in *every*
  build** (incl. the deployed PWA), so mobile-only issues are driven from scenarios
  on-device instead of by playing a whole game. Its toggle moved off a fixed-position
  floating button onto the board, right of New Game (a generic `devButton` slot on
  GameBoard, so the presentation file keeps no dev dependency); the panel chunk stays
  lazy. A proper on/off gate is deferred — for now it's always on, *publicly* (no
  security surface: pure client-side state editing, repo already public). (2)
  **Decided to render the win popup and New Game window as DOM overlays *over* the
  board rather than inside the SVG** — the prior win-popup fix (`1a1348a`, explicit
  board-unit dims) didn't work and the New Game window shows the same tiny-top-left
  symptom, so it's general foreignObject-centring flakiness, not one CSS property.
  Plain HTML/CSS centring works on Safari; the bugs are specific to HTML *inside*
  SVG. This **narrows the early "all chrome on the board SVG" principle**: persistent
  chrome (title, die, notices, buttons, arrows) stays on the SVG; full-screen modal
  overlays may live in the DOM over the board (still no standing external HUD, so the
  self-contained-board spirit holds). The refactor itself is **deferred** to a fresh
  session (structural + iPad-verified); full handoff + the running gotcha/guideline
  log now live in [cross-platform-ui.md](cross-platform-ui.md). *Also fixed this
  session:* the live sub-turn notice flew to the screen's top-left on iOS (the
  `1643570` regression) — it centred the live row with `position:absolute`, which iOS
  anchors to the SVG root inside a foreignObject; re-centred with a flexbox spacer, no
  absolute positioning.
- **2026-06-20** — **New Game became a setup *window*; over-board HTML chrome is
  authored in px + scaled, not in board units.** Replaced the inline 2/3/4
  disclosure with a modal (`NewGameModal`) over the board: player count, a
  human/AI toggle per seat, a colour picker per seat, Cancel / Start game — nothing
  applies to the live game until Start (draft state; Cancel discards). *Design
  choices:* a **single button → modal** now, **gear menu deferred** (it only pays
  off once several options exist; its first tenant is the retired Skip-turn button);
  **Skip turn dropped from the UI** but `forceNextTurn` kept wired (reducer + engine
  + App) for trivial restore; **colours kept distinct by swapping** (pick a colour a
  seat holds → the two seats swap) since colour is engine identity (piton ids /
  capture / win) — `createGame` now takes an optional per-seat `colors` array,
  validated distinct; **all-AI allowed** (no min-human guard). *The load-bearing
  gotcha:* the win popup renders HTML in **board units** (1 CSS px = 1 board unit),
  which works for plain text but **not for anything with a border** — a sub-px
  border clamps up to the 1px minimum = **one whole board square** (~40 screen px),
  so the first attempt rendered gigantic. Fix: author the window in **natural px and
  shrink it with a `scale(SETUP_SCALE)` transform** (the same px-then-scale trick
  the New Game *button* already uses), where 1px is tiny and ordinary CSS just
  works. A full-board `<rect>` scrim dims + blocks play behind it. *Also this
  session:* the **iPad win-popup bug** got a fix — WebKit doesn't resolve `%`
  against a `foreignObject`, collapsing its centring frame, so the overlay now gets
  explicit board-unit dimensions (unverified on device; see STATUS). And added
  [`scripts/screenshot.mjs`](../scripts/screenshot.mjs) — a playwright-core helper
  that shoots the live app (modals, selected states) the static render can't reach;
  it's what caught the px-vs-board-unit sizes empirically.
- **2026-06-20** — **greedyStrategy ladder reordered around the start-square
  capture exception.** Two new tiers added and FINISH split in two. New ladder:
  (1) rush a *track* piton off the exposed ring into its home lane or straight
  HOME; (2) leave a *dangerous opponent start* — an opponent's start square whose
  owner still holds a nested piton; (3) capture; (4) leave nest; (5) vacate own
  start; (6) reach a safe square; (7) finish *from the lane*; (8) advance leader.
  *Why the split + the new tiers:* a start square shields its occupant from capture
  by movement, but **not** from the owner exiting the nest straight onto it
  ([moves.ts](../src/engine/moves.ts) entry block) — so sitting on an opponent's
  start is only safe once that owner's nest is empty. That single rule drives both
  new tiers and demotes finishing-from-lane: a piton already in its lane can't be
  captured, so getting an *exposed* track piton to safety outranks finishing a safe
  one. Cutting across every tier is one avoidance — never *land* on a dangerous
  start when a non-dangerous move exists **in the same tier** (the mirror of tier 2
  on the landing side); it does real work mainly in the reach-safe tier, since
  opponent starts are themselves marked safe squares and would otherwise lure a
  piton onto the trap. Deliberately kept as a flat priority ladder, no lookahead;
  each tier may later weigh more factors (agreed with the user as a "for now").
- **2026-06-20** — **Sub-turn notices kept to one line; "Roll again" moved off
  finished rows onto the live prompt; the live row set apart.** Polishing the turn
  log from the entries below. Three linked changes, all to keep each *finished*
  sub-turn row on a single line and distinguish the live (current) sub-turn from the
  finished rows above it:
  (1) **"Roll again" is no longer baked into a finished row.** It used to be appended
  to a 6-move's notice ("Left start square · Got to safe square · Roll again" — three
  fragments, which wrapped to two lines). Now it's carried by the **live prompt**
  (`PROMPT.rollAgain`, "Roll again!"), shown in place of "Your turn!" whenever the
  seat already has logged sub-turns this turn — a non-empty `log[seat]` ⇒ mid-6-streak,
  since the log is wiped at handover. The unplayable-bonus-6 row is likewise just
  "No move" now (was "No move — roll again"). *Why:* "roll again" on a finished row is
  redundant (a 6-streak is self-evident), and that extra fragment was what pushed rows
  to two lines — and a 2-line row gets its **top clipped** in the stack. "No move —
  pass" keeps its suffix because a passed turn has no live prompt to carry the meaning.
  (2) **The live row's tiny die shows a big "!" glyph** (`DIE.rollGlyph`) instead of
  the word "Roll", which is illegible at notice size. `NOTICE_DIE_GLYPH_TEXT` sizes it
  to fill the face; `NOTICE_DIE_GLYPH_OFFSET_X/Y` fine-centre it (a tall single glyph
  reads low+left under SVG `text-anchor:middle` + `dominant-baseline:central`, which
  centre by font metrics, not by ink). `DieFace` gained `labelSize` / `labelOffsetX` /
  `labelOffsetY` so the notice die tunes independently of the centre die's "Roll".
  (3) **The live row's *text* centres on the nest** while its die stays pinned left
  (aligned with the finished rows' dice); finished rows stay fully left-aligned — the
  first visible `current` vs `previous` differentiation. `NOTICE_MAX_LINES` now stays
  at **4** (superseding the "capped at 3" reasoning in the entry below): kept as
  headroom so a stray 2-line row can't clip the top of the stack.
- **2026-06-20** — **`greedyStrategy` ladder gained two mid-tiers: vacate-start,
  then reach-safe.** Extends the v1 ladder from the 2026-06-19 AI entry below
  (`finish → capture → leave-nest → advance-leader`) by inserting two tiers just
  above the advance-leader fallback, so the ladder is now finish → capture →
  leave-nest → **vacate-start** → **reach-safe** → advance-leader. *Vacate-start* =
  move our piton off our **own entry square** so a nested piton can come out next
  turn — gated on the nest still holding a piton (if the nest is empty, freeing the
  start buys nothing, so the tier is skipped and the leader advances). *Reach-safe* =
  land on a marked safe square for capture immunity. Ordering **vacate above
  reach-safe is the designer's call "for now"** and may flip later. Kept deliberately
  cheap — still a fixed ladder, no lookahead; the real upgrade (safety/blocking
  weighting or shallow search) stays the **"Smarter AI strategy"** backlog item, a
  whole new `Strategy` function, not more tiers bolted on here.
- **2026-06-20** — **Notices became a per-seat *turn log* — every sub-turn stacked,
  not just the last action.** Supersedes the single roll+notice slot from the
  2026-06-19 entry below. The user (as designer) expanded the "richer notice copy"
  backlog item mid-design: he wanted a seat's nest to record **everything** it did
  on its turn, so a 6-streak (which grants extra rolls) shows as several rows, each
  with the die it rolled. So `GameView` dropped the parallel `rolls[p]` + `notices[p]`
  arrays for a single **`log[p]: TurnEntry[]`** (each entry = `{ die, notice }`). One
  entry is appended per *completed* sub-turn; the whole list is wiped at handover to
  that seat (same `handover()` helper, now clearing a list). **Why a log beats two
  parallel arrays:** it unifies die + outcome into one record, so a row is naturally
  "this roll → this result," and the old fiddly `lastRollMark` die-alignment math is
  gone (dice are now inline in each row). **Centre die decoupled:** it now reads
  `game.lastRoll` directly (was `rolls[turn]`) — the log only holds completed
  sub-turns, so an in-progress roll isn't in it. That made the dev scenarios' `rolled`
  scalar redundant (the centre die reads `lastRoll`, which scenarios already set), so
  it was **removed** — one less piece of plumbing. **Move descriptions** (the original
  ask) are derived in `describeMove()` from the move's `from→to` vs geometry/ruleset:
  Left the nest / Reached Home Lane / Got one Home! / Moved (+ Reached safe square /
  Left start square). "Moved" is a *fallback*, suppressed whenever a milestone **or a
  capture** already describes the move (a capture implies a move, so "Moved · Capture"
  was rejected as redundant). **Rendering:** one `foreignObject` per nest holds a
  bottom-anchored flex **column** of rows, each an inline SVG die + tinted text; the
  prompt row also carries a die (a "Roll"-labelled face before rolling, the rolled
  pips while picking) so its text lines up with logged rows. `NOTICE_MAX_LINES` is
  capped at **3** — a turn can complete at most three sub-turns, so a 4th row could
  never fill.
- **2026-06-19** — **Per-player notices + last-roll dice, pinned until that seat's
  turn comes round again.** Was: one global `notice`/`rolled` (+ owner) that jumped
  to whoever just acted and erased the previous. Now `GameView` carries **per-seat
  arrays** (`rolls[p]`, `notices[p]`): each seat's roll + message lingers in *their*
  nest while play goes round the table, so before you roll you can read what every
  other player/AI did since your last turn. **Key simplification — no explicit
  "clear on my turn" logic:** a stale slot is wiped at the *handover* (a single
  `handover()` helper, fired only when the turn actually leaves the actor), so when
  the turn lands back on a seat its nest already shows the clean "Roll" prompt +
  centre die, not a leftover line. A turn that *stays* (a bonus 6) is not a handover,
  so the roller's own "Roll again" line + die persist with no special case. The
  centre die now rests on `rolls[turn]` (the current player's roll) — invisible under
  the "Roll" label in awaiting-roll, the just-rolled value in awaiting-move. **Win
  styling** had to switch from "the single notice owner" to a colour→seat lookup
  (`state.winner` is a colour), since multiple nests can now show lingering lines at
  game-over but only the winner's gets the win look. Dev rig kept its **scalar**
  authoring form (`build()` returns one `rolled`/`rolledBy`); `loadScenario` fans it
  into the per-seat array, so no scenario file changed. **Deliberately left for next
  session** ([STATUS](STATUS.md) "Richer notice copy"): an ordinary move still makes
  *no* notice, so a plain turn shows only the lingering die — the reducer's `pick`
  case carries a marked SEAM where an action-description part plugs in. Built the
  persistence first because the richer copy is worthless until notices linger, and
  the copy itself is a design call the user wants to own.
- **2026-06-19** — **AI opponents as a third pure layer — a swappable `Strategy`,
  not engine code.** First-draft AI. Key realisation that makes it small: the whole
  decision surface of this game is one question — *which legal move do I play?* —
  because rolling is pure chance and entry/capture/finish all arrive pre-baked as
  items in the engine's `legalMoves` list. So an AI is just `(state, moves) => Move`
  (`src/ai/strategy.ts`), a *third* layer beside engine/UI: pure, no DOM, no rules,
  picking among moves the rules already allowed. This mirrors the `Ruleset` pattern —
  a `Strategy` makes the *opponent* swappable config, not a code branch; a smarter AI
  later is a new function of the same shape, nothing else touched. Shipped
  `greedyStrategy` (a fixed priority ladder: finish → capture → leave-nest →
  advance-leader, ties broken by most-advanced piton) **over** pure random as v1:
  random is nearly free but visibly makes dumb choices (skips captures/finishes); the
  ladder is ~free and feels non-broken. `randomStrategy` kept as the floor + proof of
  the seam. **`humanSeats` lives as App-level state, deliberately *not* in `GameView`**
  (a change from the original plan): it's controller config nothing renders, and the
  reducer rebuilds the view in ~7 branches plus the dev loader, so threading a required
  field through all of them was needless churn/risk. Default `[0]` (you vs all-AI);
  `[]` makes every seat AI — a self-running game (handy as an engine smoke test). The
  driver (`useAiTurn`) auto-rolls then auto-picks on theme-knob beats, reusing the same
  roll trigger + `pick` dispatch a human uses, so AI turns spin like a human's; it needs
  no re-entrancy flag of its own (one effect, keyed on the game, cleans up its timer).
  Roll-timing constants moved into `theme.ts` MOTION alongside new AI delay knobs so all
  pacing has one home. Verified by a **headless full-game test** (the synchronous twin of
  the driver loop) proving greedy terminates 2/3/4-player games to a clean winner across
  seeds — the hook itself, being glue, is verified live (no React-test harness exists yet).
- **2026-06-18** — **Corner notices: colour by *whose nest*, not by message kind;
  box geometry from math-free knobs.** Triggered by a bug — the combined
  `Capture! (blue) · Roll again` line rendered as a garbled multi-line jumble. Root
  cause: `.nest-notice` is `display:flex`, so each notice *segment* (the joined
  fragments + tinted colour run) became its own flex item — edge whitespace
  collapsed (the ` · ` separator lost its spaces) and each item wrapped
  independently. Fix: wrap the segments in **one inner span** so flex centres a
  single inline run; the text reflows normally. **Geometry reworked to the user's
  intent** (he tunes these, wants no arithmetic): the fixed px `NEST_NOTICE_W/H`
  became **derived** from `NOTICE_WIDTH` (squares) + `NOTICE_MAX_LINES` (whole
  lines) — height = `MAX_LINES × line-height`, so an over-long message clips *on a
  line boundary* instead of leaving a sub-pixel sliver of the next line (the sliver
  was a rounding artifact of scaling the clipped foreignObject, and only ever showed
  on overflow, which never happens with real ≤2-line notices). `NOTICE_LINE_HEIGHT`
  is now the single source for line spacing (CSS `line-height` *and* the height
  math); added a dev-only `NOTICE_DEBUG_OUTLINE` to see box extents while tuning.
  **The colour model changed on purpose:** the old `event`-vs-`prompt` split was
  legacy from when all notices shared one HUD box at the top. Notices are now
  coloured by **whose corner they sit in** — `NOTICE_CURRENT` (player to act now,
  more visible) vs `NOTICE_PREVIOUS` (player who acted last turn, quieter) — keyed
  on `state.turn`, so a player on a 6-streak *stays* "current" and keeps the visible
  colour with no special case. `NOTICE_WIN` kept as the one-off end-state. Each role
  has its own CSS class (`.nest-notice-current/-previous/-win`), differing by colour
  only for now but ready for per-role italic/size/weight knobs without touching
  render code. Supersedes the notice-knob names in the 2026-06-14 audit entry below.
- **2026-06-18** — **Ship to iPad as an installable PWA on GitHub Pages — not a
  native app.** Goal: play hot-seat at the cabin (no internet) on iPads we own, with
  no App Store and no $99/yr Apple dev fee. The fee is about *distribution* through
  Apple's channel; we distribute nothing, so it's not in the path. Safari's "Add to
  Home Screen" gives a fullscreen, icon'd, app-like launch for free; a manifest +
  service worker (via `vite-plugin-pwa`, `registerType: 'autoUpdate'`, default
  precache) make it run fully offline once loaded. **No bridging tech (Capacitor/
  Cordova)** — that only buys App Store distribution or native device APIs we don't
  need; pure overhead here. Android would work too (and is more forgiving on cache
  eviction), but isn't needed. Hosting reuses the existing repo via a Pages Action
  (`.github/workflows/deploy.yml`); `base: '/jeu-de-piton/'` matches the project-site
  sub-path and scopes the SW. **Known caveat:** iOS evicts a PWA's storage after
  ~7 days unused, so the cache isn't guaranteed weeks later — mitigation is "open it
  once before leaving" rather than engineering around Apple's eviction. **Escape
  hatch:** a stuck turn once needed the dev bar to recover, but the dev rig is
  dead-code-eliminated from prod (`import.meta.env.DEV`) and its save-scenario flow
  is a dev-only Vite middleware — it can't ship. So instead of shipping the whole
  rig, a minimal `forceNextTurn` (engine, wrapping the private `passTurn`) is exposed
  as a **"Skip turn"** button tucked *inside* the New Game disclosure, right of the
  2/3/4 pills — behind another button + styled apart so it's never a play-time
  mis-tap. It's a *recovery* tool, not a fix; the real bug is unrepro'd (STATUS backlog).
  **Follow-ons the same day:** (a) **Repo made public** — free Pages serves public
  repos only; the toggle is reversible, and going private merely downs the live site
  (an already-installed PWA keeps running from its cache). (b) **Board went
  full-bleed** — dropped the shell padding entirely (superseding the earlier ~56px
  height reserve from the 2026-06-14 sizing below), so the square board fills the
  viewport's limiting axis edge-to-edge; the only remaining inset is
  `env(safe-area-inset-*)` (0 on desktop; the iPad's home-indicator clearance when
  installed). A one-line regression en route — accidentally deleting `.board-shell`'s
  `max-width: none`, letting the 640px `.app-shell` cap shrink the board, then
  defending it for several turns as "inherent geometry" — is the cautionary tale
  behind the new global `feedback_suspect_own_change` memory. (c) **Orientation lock
  is OS-side, not in-app:** the manifest sets `orientation: 'portrait'` (honoured on
  Android/desktop), but **iOS ignores PWA orientation lock and `screen.orientation.lock()`
  is unsupported in iOS Safari** — no in-app way to lock it, so use the iPad's
  rotation lock. The reusable half of all this is filed in the home KB (its
  PWA-on-mobile and static-hosting pages).
- **2026-06-17** — **QOL polish pass: the nest reads as a nest (not a die), the
  roll prompt lives on the die, and a win is unmissable.** A batch of user-driven
  legibility fixes; the *why* per item (blow-by-blow is in the commits):
  **(1) Nest enclosure square → circle.** Four holes in a rounded *square* read as a
  die's 4-face; a circle around the same 2×2 kills that false cue without moving the
  holes. Radius derives from the hole cluster + `NEST_BOX_PAD`; hole spacing became
  its own knob (`NEST_HOLE_SPACING`, the circle follows it); `NEST_BOX_RX` retired.
  **(2) The centre die shows a "Roll" prompt when it's your turn to roll**, instead
  of holding last turn's pips — the held value **relocates to the roller's nest** as
  a small die (left-aligned to their whose-turn highlight area, on the notice line).
  It shows only when the centre *isn't* already showing that value as pips: once the
  turn passes, **and** on a roll-again 6 (back to awaiting-roll, centre showing the
  prompt) where it backs the "Roll again" notice — never twice. A `rolledBy` field
  was added to the view state so the board knows whose roll the held value was.
  **(3) Win popup.** A win was only a nest line; now a content-sized panel over the
  board centre announces "{Colour} wins!" in the winner's hue, tap-to-dismiss — the
  full-board wrapper is click-through so New Game stays live, and dismissal re-arms
  on the next win (tracked by game-state identity). Knobs `WIN_WINDOW_SIZE` /
  `WIN_PANEL_BG`.
  **(4) Notices became rich text** — a `Notice` is a list of optionally-tinted
  segments — so a capture **names the captured colour in its own colour**
  ("Capture! (red)"). The colour is read off the captured piton's `owner` in the
  pre-move state, not by parsing the id.
  **(5) UI copy centralized in [`src/ui/strings.ts`](../src/ui/strings.ts)**
  (TITLE/DIE/PROMPT/NOTICE/WIN). Copy is its own axis — kept out of `theme.ts`
  (sizes/colours) and out of the drawing code; it's the single seam a future French
  translation would swap.
  **(6) Dev scenarios no longer override the board notice.** `loadScenario` stamped
  the description as a `Dev:` notice, which masked the real gameplay notices and made
  them impossible to test in place; it now loads with **no** notice (the description
  stays the picker tooltip) and defaults `rolledBy` to the current player so the
  last-roll nest die behaves as in a real game. *(Reverses the notice half of the
  2026-06-13 "Dev rig S3" decision — see that entry.)*
  All knobs live in `theme.ts`; build + 77 tests + lint green.
- **2026-06-14** — **Knob-board usability pass: organize by *user intent*, in plain
  language.** After the geometry pass landed, the user (the actual person turning
  these knobs) flagged that the surface was built for an engineer, not for him:
  descriptions leaned on jargon (CSS-var seam, foreignObject, px→cell bridge,
  `[ratio]`), several knobs appeared dead, and the set didn't match what he'd reach
  for — useless knobs present, wanted ones missing or buried. The reframe (now the
  standing principle for `theme.ts`, see also memory `knob-design-user-intent`):
  **a knob maps to something you'd actually change for one element, named/described
  plainly; one knob never drives two unrelated things.** Concretely this pass:
  (1) **plain-language rewrite** of every comment, and conditional knobs now state
  *when* they act (e.g. `WASH_BREATHE_*` only with `NEST_FLASH` on; `FLASH_TINT_AMOUNT`
  only pre-roll) — that's why they "did nothing." Sections renamed to COLOURS /
  MOTION / GEOMETRY; the CSS hand-off kept but de-jargoned. (2) **Square size became
  a knob**: `ARM_WIDTH_SCALE` graduated from `layout.ts` to `theme.ts` as
  `SQUARE_WIDTH` (layout.ts imports it) — *revising* the earlier "model constants
  stay in layout" carve-out for this one value because the user tweaks it; the true
  topology (`SAFE_PHASE`/`SEAT_ROTATION`) stayed put. (3) **Notices fixed**: the New
  Game button and the notices shared one scale (`CTRL_SCALE`), so resizing notice
  text also resized the button — split into an independent `noticeScale`. Exposed
  the three things actually wanted — `NOTICE_TEXT_SIZE` (board units, per the user's
  pick over raw px), `NOTICE_OFFSET_X/Y`, and the existing colours
  (`NOTICE_EVENT/PROMPT/WIN`, cross-referenced — *renamed/reworked 2026-06-18 above
  to `NOTICE_CURRENT/PREVIOUS/WIN`; `NEST_NOTICE_W/H` later became knob-derived*).
  The plumbing `NEST_NOTICE_W/H`
  demoted to GameBoard locals, `NEST_NOTICE_GAP` removed; `.nest-notice` font-size
  now reads `--notice-font-px` so `theme.ts` is the single source. All
  value-preserving (board renders identically). The die / New Game button / start
  arrows are the un-audited elements, deferred to future sessions as needed.
- **2026-06-14** — **Geometry-knob pass: every board *size* is now a knob in
  `theme.ts` (`GEOMETRY`).** Completes the look-and-feel control surface — colour
  (done) + timing + geometry all live in [theme.ts](../src/ui/theme.ts). Settled
  the three questions the colour pass deferred: **(1) concern vs function
  grouping → hybrid for a mechanical reason, not taste.** Colour and timing stay
  their own axes because they carry machinery geometry doesn't (`tint()`,
  player-hue derivation, the `boardThemeVars` CSS-var seam binds them); a
  feedback ring's colour is player-derived and flows through that seam while its
  radius is a static number, so co-locating would fragment the seam. So:
  function-grouping lives *inside* the `GEOMETRY` section (one block per element —
  board surfaces, arrow, nest, piton, die, target rings, chrome), not across the
  whole file. **(2) stroke width vs colour →** widths (`X_STROKE_W`) go with
  their shape's geometry, distinct from stroke *colours* (`X_STROKE`) in COLOURS;
  the seeded GameBoard ring strokes were renamed `_STROKE` → `_STROKE_W` for that
  convention. **(3) the new wrinkle colour didn't have — geometry isn't
  unit-homogeneous.** Every colour is just hex; sizes span three coordinate
  spaces (cell units / `[ratio]` of a reference length / `[px]` authored in a
  foreignObject then scaled by the `CTRL_SCALE` px→cell bridge). A flat list
  would invite reading a `0.4` and a `168` as the same kind of number, so the
  section leads with a unit legend and tags every non-cell-unit knob. Function-
  grouping happens to segregate the units anyway (the `[px]` knobs all belong to
  the chrome group; the `[ratio]` ones to arrow/die). Folded in two knobs the
  colour pass hadn't named (the title `fontSize`/`y`) and the die's *internal*
  proportions (pip step/radius, corner, border — `[ratio]` of `DIE_SIZE`) so the
  die is fully tunable, not half. `HOME_FAN`'s four ±0.32 offsets collapsed to
  one `HOME_FAN_SPREAD`. No geometry knob is CSS-consumed today, so the CSS-var
  seam stays colour-only (it remains reusable verbatim if a size ever needs to
  animate). Value-preserving relocation — board renders identically; build + 77
  tests + lint green.
- **2026-06-14** — **`colors.ts` → `theme.ts`; every board colour is now a knob.**
  Renamed the colour file to [theme.ts](../src/ui/theme.ts) — it owns colour + vfx
  timing today and will absorb the geometry knobs in their own pass, becoming the
  one look-and-feel control surface. Promoted the remaining hardcoded board colours
  into named knobs there: board background, track/safe/HOME fills, the die face,
  nest holes and start-arrow outline (each its *own* knob — they share a near-white
  today but are unrelated elements, so independent control beats DRY-by-coincidence
  for a polish file), the neutral strokes, the title fill, and the three notice
  colours. **The carve-out that drove the shape:**
  look-and-feel knobs and board-*model* constants are different animals —
  `SAFE_PHASE`/`SEAT_ROTATION` (pinned against the reference board) stay in
  [layout.ts](../src/ui/layout.ts), out of the tweak file, so a polish session can't
  nudge the board topology by accident. CSS-consumed colours (board bg, title,
  die-flash rest state, notices) extend the existing `boardThemeVars` seam, with
  literal fallbacks in the stylesheet. Pure relocation — values unchanged, board
  renders identically.
- **2026-06-13** — **Player-colour knobs centralized in `theme.ts`; deliberately
  split from geometry; capture cue is the destination ring, not a halo.** Made
  [theme.ts](../src/ui/theme.ts) the single owner of the *colour-appearance*
  axis — hue (`PLAYER_HEX`, the lone per-colour data + extension point), lightening
  (`tint(hex, amount)` *derives* light variants, retiring the hand-tuned
  `PLAYER_HEX_LIGHT` parallel map), opacities, and the flash/wash *timing*. Two
  delivery paths because keyframes can't read TS: plain SVG attributes import the
  constant directly; animation-driven knobs are surfaced as CSS custom properties
  by `boardThemeVars`, set once on the board `<svg>` root and inherited by every
  animated descendant (generalizes the old one-off `--die-flash`; the same seam is
  reusable by the future layout-knob pass). **Axis split is intentional:** size
  knobs (ring radii/strokes, piton/hole radii, arrow geometry) stay with the
  *renderer*, not `theme.ts` — the move-target ring sizes now sit in a named block
  in [GameBoard.tsx](../src/ui/GameBoard.tsx) as the first slice of the planned
  layout-knob centralization. **Open question deferred to that pass:** group knobs
  by *concern* (colour vs geometry, as now) or by *function* (everything driving one
  visual-feedback element, together)? User leans function for the feedback knobs;
  settle it deliberately when consolidating layout knobs, not by accident.
  **Action-pending flash family — one shared cadence (`FLASH_CADENCE_S`) so the
  board pulses as one**; the die-swell and the opacity-pulse are two mechanisms but
  one rate (no separate die-vs-piton cadence unless we split it later). The
  whose-turn wash keeps its *own* `WASH_CADENCE_S` on purpose — it's a presence cue,
  not an action prompt. **Non-obvious limit that shaped the capture cue:** CSS
  animations are *not* globally phase-locked — equal `animation-duration` gives equal
  frequency but the phase depends on each element's *start time*, and a state-gated
  animation (die flash, restarting each turn) drifts against a continuously-running
  one (the wash). Sync only holds for elements that *mount together*. That's why the
  capture cue ended up as an **enlarged, flashing dashed destination ring** drawn on
  the enemy (the capture move's target square *is* the enemy's): it mounts in the
  same render as the capturing piton's halo, so the two pulse in lockstep — which a
  separate enemy halo couldn't guarantee. (Earlier tries: swelling the enemy disc's
  own fill read as confusing; a separate halo couldn't be reliably synced.) All
  piton-destination rings are now dashed, including HOME, so they read as one family.
- **2026-06-13** — **Chrome scales with the board, by design — the "chrome size
  tuning" item is retired (won't-do).** The parked M6 item *hypothesized* that
  on-board chrome (pills, die, notices), sized in *board* units (`CTRL_SCALE`,
  `DIE_SIZE`), would read oversized once the board fills a large monitor, and
  floated decoupling chrome from board size (viewport-relative sizing). Resolved:
  uniform scaling is the **intended** feel — the whole thing behaves like a
  physical board game, every element growing and shrinking together. So chrome
  stays in board units; we deliberately do **not** pin it to the viewport. (The
  only residual, separate concern is the *opposite* extreme — a very small phone
  screen could push the notice text under a legibility floor; revisit only if it
  actually bites on a device, not pre-emptively.)
- **2026-06-13** — **Die HUD: a native-SVG pip face you tap to roll, with all
  roll *timing* in the view layer.** Replaced the HTML "Roll button + number chip"
  (foreignObject) with a native SVG die (`DieFace` — a rounded box of pips on the
  3×3 grid), reusing the nest's coloured-circles recipe so the die reads as a
  sibling of the nests; the whole face is the roll target, tinted to the acting
  player. Two non-obvious timing choices, both kept in the UI so the engine stays
  pure: **(1)** the die **holds the last value through the turn handover** — the
  view's `rolled` now persists across a move instead of nulling to `null`, because
  a die that blanks between turns reads as broken; `init` still resets it (shown as
  1) on a new game. **(2)** a roll **spins, settles, and — only when it leaves the
  player with no move — holds a beat before the turn visibly passes**, so a forfeit
  is legible. This lives in a `useDieRoll` sequencer that owns the timers; to pick
  the hold-vs-commit branch it *peeks* the engine (`applyRoll(game, value).phase
  !== 'awaiting-move'`) rather than re-deriving the "no legal move" rule —
  `applyRoll` is pure/immutable, so peeking then dispatching the same value is free
  and safe, and it captures every no-move case (pass, unplayable 6, three-6s
  penalty) that a `legalMoves`-only peek would miss. Durations are knobs atop
  [useDieRoll.ts](../src/ui/useDieRoll.ts); the roll-pending **pulse** + post-roll
  **dim** reuse the board's existing opacity-pulse vocabulary. Removed
  `DICE_SCALE`/`DICE_W`/`DICE_H` and the now-dead `.die` / `.board-dice` CSS.
- **2026-06-13** — **Start-square exception implemented in the engine — and it's
  *entry-only*.** Taught `legalMoves` the owner-exception (the visual cue shipped
  earlier the same day; see the entry below): on an entry roll, a lone enemy on the
  player's own start is now a **capturing entry move** (`captures: occupant.id`),
  gated on `captureEnabled`; an ally there still blocks; an empty start is a plain
  entry as before. *Non-obvious scoping:* the change touches **only** the entry
  block — `resolveLanding`/`passageBlocked` keep treating every `safeSquares`
  member as universally immune/blocking, deliberately. That's correct because a
  piton **never re-touches its own start via normal movement**: `homeEntryOffset`
  turns it off into its private lane ~5 squares before progress would wrap back to
  offset 0, so the owner only ever meets its own start at the entry instant. So the
  exception lives entirely at entry; movement-landing by *non-owners* on any start
  stays blocked (a test pins this). Multiple capturing-entry moves are offered (one
  per nested piton), but each is an *alternative* — `applyMove` brings out exactly
  one piton (also pinned), so clicking to capture never empties the nest.
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
  the same 1.x-second rate. *(Superseded 2026-06-13: the wash now ships **static**
  — `NEST_FLASH` off — with its opacity/cadence as knobs in `theme.ts`; the breathe
  is opt-in. See the top entry.)* (2) **The single bottom-right notice became two
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
  `description`. *(Superseded 2026-06-17: the notice-stamping was removed — it masked
  the real gameplay notices; `description` is now picker-tooltip-only. The
  `build()`-returns-board-state-only shape stays.)* (2) **Deliberately did *not*
  merge `id` and `label`** — superficially
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
  `<Pitons>` (overlay); player colors per arm in `ui/theme.ts`. UI stays
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
