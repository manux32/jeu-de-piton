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
   Anything full-board and centred (the win popup, the New Game window) should be a
   normal absolutely-positioned HTML element layered over the board container, sized
   in `vmin`/`%`/`rem`, centred with ordinary flexbox. Plain HTML/CSS centring "just
   works" on Safari — the bugs are specific to HTML *inside* SVG. *(This is the
   pending refactor — see below.)*
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

- **Live sub-turn notice flew to the screen's top-left** (regression from commit
  `1643570`, fixed 2026-06-20). The live row centred its text with
  `position: absolute; left:0; right:0`. iOS anchored that absolute span to the SVG
  root → top-left of the screen. **Fix:** centre via flexbox instead — text span
  `flex:1; text-align:center` flanked by a die-width spacer on the right
  (`.nest-notice-row-current`). No absolute positioning.
- **Win popup renders tiny in the top-left on iPad** (open as of 2026-06-20 — the
  driver for the pending refactor below). First attributed to `%` not resolving
  against a foreignObject; the fix (explicit board-unit dimensions on `.win-overlay`,
  commit `1a1348a`) **did not work** — same symptom. **The New Game window shows the
  same tiny-and-top-left symptom**, confirming it's the general foreignObject-centring
  flakiness, not one specific property. **Resolution:** stop fighting it inside the
  foreignObject — move both modals to DOM overlays (Guideline 1 / the refactor below).

## Pending: move the win popup & New Game window to DOM overlays (approach "B")

**Decided 2026-06-20, deferred to a fresh session** (structural change, iPad-verified
— better with a full context budget). Goal: both full-board modals render as ordinary
HTML over the board, ending the iOS foreignObject-centring bugs for good.

**Current structure** (all inside GameBoard's single `<svg>`, in
[GameBoard.tsx](../src/ui/GameBoard.tsx)):
- **Win popup** (~line 460): `<foreignObject x=0 y=0 width=extent height=extent>` →
  `.win-overlay` (flex-centre) → `.win-panel` button. CSS in
  [index.css](../src/index.css) `.win-overlay` / `.win-panel`.
- **New Game window** (~line 475): full-board `<rect class="setup-scrim">` +
  `<g transform="translate(centre) scale(SETUP_SCALE)"><foreignObject SETUP_W×SETUP_H>`
  → `<NewGameModal>`. Knobs `SETUP_SCALE` / `SETUP_W` / `SETUP_H` in
  [theme.ts](../src/ui/theme.ts) (~line 348); `setup-*` styles in index.css.

**Target structure:**
- GameBoard returns a positioned **stage wrapper** (`position:relative`, sized to the
  board) containing the `<svg>` plus the modal overlays as DOM siblings — OR lift the
  overlays to App as siblings of `<GameBoard>` inside `.board-shell`. Keep them in
  GameBoard if it keeps cohesion; either way they leave the `<svg>`.
- Each overlay: `position:absolute; inset:0; display:flex; align-items:center;
  justify-content:center`, click-through scrim where needed. Panels sized in
  `vmin`/`%`/`rem` of the stage (drop the board-unit/`scale()` plumbing —
  `SETUP_SCALE`/`SETUP_W`/`SETUP_H` and `CTRL_SCALE`-style tricks are no longer
  needed for these two; the px-then-scale border gotcha disappears once they're real
  DOM).
- Z-order: scrim < win popup < New Game (New Game opens from the win screen too).
- **Leave on the SVG, untouched:** title, die, start arrows, per-nest notices, and
  the New Game *button* itself (small in-board chrome that already works on iOS).

**Watch-outs:** the win popup's dismiss-on-click and the "re-arm on next win"
(`dismissedWin` reference equality) must survive the move; the New Game draft
state (nothing applies until Start) is inside `NewGameModal`, so moving its mount
point shouldn't disturb it. Verify on the iPad via Dev → `win-green` (popup) and
the New Game button (window).

## Note on the "all chrome on the board SVG" principle

Early architecture (pre-mobile) said *all* chrome renders on the board SVG. The
DOM-overlay decision above intentionally narrows that to: **persistent chrome**
(title, die, notices, buttons, arrows) stays on the SVG; **full-screen modal
overlays** may live in the DOM over the board. They still appear over the board with
no standing external HUD, so the spirit (a self-contained board, no surrounding UI)
holds. See the 2026-06-20 decision in [decisions.md](decisions.md).
