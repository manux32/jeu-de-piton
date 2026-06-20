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
  on the next win (tracked by game-state identity). Knobs `WIN_TEXT_SIZE` /
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
