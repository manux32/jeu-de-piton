# Cross-platform UI — making the board look & behave the same on PC and mobile

> **Read this before authoring or moving any HTML that lives inside the board
> SVG** (anything via `<foreignObject>`: the New Game controls/window, the
> per-nest notices, the win popup). Desktop Chrome/Firefox hide a class of bugs
> that only bite **iOS Safari / WebKit** (the iPad is the test device) — this doc
> is the running log of the ones we've hit and the rules that avoid them.
>
> Companion docs: board geometry → [board-model.md](board-model.md); the dated
> *why* → [decisions.md](decisions.md); current state/backlog → [STATUS.md](STATUS.md).

## The one root cause behind most mobile-only glitches

Almost everything here traces to a single fact: **`<foreignObject>` (HTML embedded
in SVG) is reliable on desktop but flaky on iOS Safari.** WebKit mishandles, inside
a foreignObject:

- **`position: absolute` / `fixed`** — the element is anchored to the **SVG root's
  top-left**, not its CSS containing block, so it flies to the corner of the screen.
- **percentage sizing (`width:100%`, `height:100%`)** — often resolves to ~0
  against a foreignObject, collapsing the box.
- **centring of HTML content** (flex/transform combinations) — unpredictable; a
  panel that centres perfectly on desktop can land tiny in the top-left on iOS.

Desktop never shows any of this, so **a green desktop render proves nothing about
mobile.** When a change touches foreignObject HTML, assume iOS will differ until
checked on the iPad (load the relevant state via the on-board **Dev** panel →
scenarios, rather than playing a whole game).

## Guidelines (the do / don't)

1. **Modals & overlays go in the DOM *over* the board, NOT in a foreignObject.**
   Anything full-board and centred (the win popup, the New Game window, the Options
   menu) is a normal `position:fixed` HTML element over the *viewport*, sized in
   `vmin`/`em`, centred with ordinary flexbox. Plain HTML/CSS centring "just works"
   on Safari — the bugs are specific to HTML *inside* SVG. *(Established 2026-06-20
   — see the issue log below + the decision in [decisions.md](decisions.md); the
   Options menu was the first new modal to adopt the pattern.)*
2. **Inside a foreignObject, never use `position: absolute`/`fixed`.** Lay things
   out with flow + flexbox. To centre text while pinning an icon left, flank the
   text with an equal-width **spacer** instead of absolutely positioning it (this is
   how the live notice row is centred — see `.nest-notice-row-current` in
   [index.css](../src/index.css)).
3. **Inside a foreignObject, give boxes explicit sizes, not percentages.** 1 CSS px
   == 1 board unit there; size in those units (or author in natural px and shrink
   with a `scale()` transform — see knob note below). Avoid `width:100%`/`height:100%`.
4. **Borders/sub-pixel detail: author in px + `scale()`, not in board units.** In
   board units a sub-px border clamps up to the 1px minimum, which is a whole board
   square (~40 screen px) — it renders gigantic. The New Game **button** and
   **window** dodge this by being built at natural px and shrunk onto the board with
   `scale(SETUP_SCALE)` / `CTRL_SCALE`. (Pure-text chrome like the notices is fine in
   board units.)
5. **Test on the iPad, not just desktop.** The Dev panel now ships in every build
   (see [dev-tooling.md](dev-tooling.md)) precisely so mobile-only issues can be
   driven from scenarios on-device.

## Issue log (confirmed iOS Safari bugs + the fix)

Newest first. Each entry: symptom → cause → fix.

- **Die-label text ("Roll", "!") looked centred on PC but off-centre on iPad**
  (fixed 2026-06-21). This is *not* a foreignObject bug — it's native SVG `<text>`.
  Two compounding causes, both rooted in **`system-ui` resolving to a different
  physical font per platform** (Segoe UI on Windows, San Francisco on iOS): (1)
  `dominant-baseline="central"` centres against the font's em box *including
  descender room the glyph doesn't use*, so a descender-less glyph sits low by a
  font-dependent amount; (2) hand-tuned X/Y nudges that corrected this were
  calibrated to Segoe's metrics, so they mis-corrected under SF. Intermediate fixes
  (drop the descender dependence, zero the nudges, bbox-style centring) reduced but
  couldn't *eliminate* the drift — any approach that renders the substituted system
  font is at that font's mercy. **Fix:** stop rendering text at all — bake the fixed
  strings as SVG `<path>` outline geometry traced from one font (Nunito ExtraBold,
  OFL) via `tools/gen-glyphs.mjs` → `src/ui/glyphs.ts`, and render the path
  bbox-centred (`DieFace`). Pure geometry = pixel-identical everywhere, no font, no
  centring drift. **General rule this establishes:** native SVG `<text>` is *also*
  platform-dependent (via font substitution), not just foreignObject HTML — for
  small fixed strings that must look identical, prefer baked path geometry. (Live
  text still fine where exact match doesn't matter — e.g. the notice prose.)
- **Live sub-turn notice flew to the screen's top-left** (regression from commit
  `1643570`, fixed 2026-06-20). The live row centred its text with
  `position: absolute; left:0; right:0`. iOS anchored that absolute span to the SVG
  root → top-left of the screen. **Fix:** centre via flexbox instead — text span
  `flex:1; text-align:center` flanked by a die-width spacer on the right
  (`.nest-notice-row-current`). No absolute positioning.
- **Win popup (and New Game window) rendered tiny in the top-left on iPad** (fixed
  2026-06-20). First attributed to `%` not resolving against a foreignObject; the
  fix (explicit board-unit dimensions on `.win-overlay`, commit `1a1348a`) **did not
  work** — same symptom, and the New Game window showed it too, confirming it's the
  general foreignObject-centring flakiness, not one specific property. **Fix:** stop
  fighting it inside the foreignObject — both modals moved out to plain DOM overlays
  (`position:fixed; inset:0`, flex-centred on the *viewport*, panels sized in
  `vmin`/`em`). iPad-verified centred. See the 2026-06-20 decision in
  [decisions.md](decisions.md).

## How the modals are structured (the DOM-overlay pattern)

The full-board modals live as DOM overlays, not in the SVG (established 2026-06-20;
the *why* is in [decisions.md](decisions.md)). Several do this — the win popup, the
New Game window, the Options menu, the Game stats window, the Game log — all the same
shape, which is what to copy for any future one:
- **GameBoard returns a fragment** of its single `<svg>` plus the overlays as DOM
  siblings — they are no longer inside the `<svg>`. Their open state
  (`dismissedWin`, `setupOpen`, `optionsOpen`) stays in GameBoard; the Options gear
  *button* and the rest of the persistent chrome stay on the SVG.
- **Each overlay** is `position:fixed; inset:0; display:flex` centred on the
  **viewport** (not sized to the board — a modal just needs the middle of the
  screen). `.win-overlay` is click-through (`pointer-events:none`) so the board
  behind stays live; `.setup-overlay` / `.options-overlay` double as the
  click-eating scrim. Z-order via `z-index`: board < win popup (20) < New Game /
  Options (30) — only one of the latter two is ever open at once.
- **Panels are sized in `vmin`/`em`** from one knob each — `WIN_WINDOW_SIZE` /
  `SETUP_WINDOW_SIZE` / `OPTIONS_WINDOW_SIZE` (the panel's whole layout is `em` off
  that base font, so the knob scales the whole window). No board-unit/`scale()`
  plumbing.

## Note on the "all chrome on the board SVG" principle

Early architecture (pre-mobile) said *all* chrome renders on the board SVG. The
DOM-overlay decision above intentionally narrows that to: **persistent chrome**
(title, die, notices, buttons, arrows) stays on the SVG; **full-screen modal
overlays** may live in the DOM over the board. They still appear over the board with
no standing external HUD, so the spirit (a self-contained board, no surrounding UI)
holds. See the 2026-06-20 decision in [decisions.md](decisions.md).
