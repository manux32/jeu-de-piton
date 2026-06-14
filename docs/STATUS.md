# jeu-de-piton — status

> **Fast-moving tracker — skim at session start.** Keep it short: *current state,
> next steps, live open questions, dev quick-ref* only. Durable material lives
> elsewhere — don't let it pile up here:
> - architecture / vision → [architecture.md](architecture.md)
> - rules → [rules-and-lineage.md](rules-and-lineage.md) · board geometry →
>   [board-model.md](board-model.md) · dev rig → [dev-tooling.md](dev-tooling.md)
> - *why* a past choice was made → [decisions.md](decisions.md) (append new
>   decisions there, not here)
>
> Maintain: when a milestone closes or a fact gets pinned, move the detail to the
> right reference doc and leave only a one-line pointer here. Don't narrate
> finished work — that's what [decisions.md](decisions.md) is for. And don't copy
> volatile/derived facts into prose: reference the command (`npm test` for the
> test count) or the code symbol (`CTRL_SCALE`, not its value), never a hand-kept
> copy that goes stale.

## Where we are
**Playable hot-seat, polished — and all chrome lives *on the board*.** Milestones
1–4 done (scaffold · engine core · SVG board · interaction loop) plus the M6
look-and-feel pass: the HUD/header are gone (title, New Game disclosure, dice, and
per-nest turn notices all render inside the board SVG), the board is uncapped and
fills the viewport, the dice sit dead-centre over HOME, and whose-turn shows as a
gently pulsing corner wash. The **start-square exception** is shipped end-to-end —
visual ownership arrows *and* engine (`legalMoves`, entry-only). Tests + build +
lint green (`npm test` for the count); `src/ui/` stays rules-free.

The session-by-session *why* for all of the above is in [decisions.md](decisions.md)
(newest first); the shipped rule + geometry facts are in
[rules-and-lineage.md](rules-and-lineage.md) and [board-model.md](board-model.md).

## Build checklist
- ✅ **M1** scaffold — Vite + React + TS, own repo.
- ✅ **M2** engine core — state model, path-aware moves, capture, the 6, lane +
  exact HOME + win. (`src/engine/`, Vitest.)
- ✅ **M3** SVG board render — `buildLayout` index→screen map; `<GameBoard>` →
  `<Board>` + `<Pitons>`. (`src/ui/`.)
- ✅ **M4** interaction loop — `useGame` reducer, roll → highlight legal moves →
  click-to-move.
- ⬜ **M5** variant layer.
- ✅ **M6** polish — rectangular cells, capture-click fix, HOME grouping/highlight,
  viewport-fit, chrome-moved-on-board, fill-the-screen, nest centring,
  dice-at-centre, turn-clarity cues, start-square arrows + engine, die HUD (SVG
  pip-face, tap-to-roll, spin/settle, pulse/dim). Chrome scaling with the board is
  intended, not a defect — the one parked tuning item is retired (won't-do).
  *(Per-item rationale → [decisions.md](decisions.md).)*

## Next session — pick one
- **M5 — variant layer.** The cabin ruleset already ships as a `Ruleset` and the
  engine is variant-agnostic, so this is mostly *proving* a second variant (e.g.
  canonical Parcheesi) drops in with **no UI change** — likely a ruleset-picker
  beside the player-count pills in the New Game control.
- **Centralize player-color knobs** (groundwork for more colors + player color
  choice). Today the *hue* is centralized (`PLAYER_HEX`) but each element's
  *lightening knob* is scattered: lane `fillOpacity 0.45` and nest-box `0.18`
  inline in [Board.tsx](../src/ui/Board.tsx), the whose-turn wash opacities in CSS
  (`nest-breathe` 0.18↔0.42, `.nest-active-wash-static` 0.3), and the die flash as
  a hand-kept second map (`PLAYER_HEX_LIGHT`). Plan:
  1. Make [colors.ts](../src/ui/colors.ts) the single owner. Keep `PLAYER_HEX` as
     the only per-color data (the extension point). Add a `tint(hex, amount)`
     helper (mix toward white) so light variants are *derived*, not a parallel map
     that must grow with every new color — retires `PLAYER_HEX_LIGHT`. Each role
     can still pass its own amount; they need not match.
  2. Name the per-role knobs in one block there: lane fill, nest-box fill, wash
     (static + breathe min/max), and the **action-pending flash family** (below).
     Replace the inline/CSS magic numbers with these.
  3. Feed the CSS-driven ones (wash breathe, all flashes) via CSS custom properties
     set from TS — same pattern as the `--die-flash` var shipped this session — so
     the numbers live in `colors.ts`, not split across the stylesheet. *(Time-boxed
     fallback: centralize hues + solid tints only; leave CSS opacity knobs in CSS
     and cross-reference.)*

  **Action-pending flashes — one family, one set of knobs.** The deliberate rule
  is: *only elements awaiting an action from a player flash.* Members today:
  die roll-ready (`.die-square` fill swell → `--die-flash`), movable pitons
  (`.piton-halo`, `piton-pulse`), and the HOME-reachable target (`.move-target-home`,
  `piton-pulse`). They already share a 1.2s cadence (the lone 1.5s was the wash,
  now static) — make that shared cadence a knob too, which settles the "different
  rates" issue. Two mechanisms exist: a *fill-colour swell* (die, toward a light
  tint) and a plain *opacity pulse* (halo/target); the system should hold both.
  - **New member: capturable enemy pitons.** Give the current player obvious
    feedback on which enemies a legal move would capture — flash them. Already
    UI-derivable, no engine change: Pitons.tsx builds `captureByPiton` from moves
    where `m.captures` is set, and tags those discs `.piton-target` (today only
    `cursor:pointer`). Open design call for next session: flash toward the
    *capturing* player's tint vs. a distinct warning treatment — try both.

  Out of scope but the motivating direction: colors beyond 4 extend the engine
  `PlayerColor` union + the palette; letting players *choose* builds on the
  per-seat `players[].color` field that already exists (a picker that sets it with
  uniqueness; seat→color stays the default).

## Open rule details
- **None open.** All cabin rules are confirmed and shipped as of 2026-06-13 — the
  start-square exception was the last (engine + visual). Full ruleset, including the
  resolved items, lives in [rules-and-lineage.md](rules-and-lineage.md).

## Dev quick-ref
- `npm test` (engine), `npm run build` (type-check + build), `npm run dev` (UI,
  port 5173 — see CLAUDE.md session-start policy).
- **Dev scenario panel** (dev builds only) lets you drop into doctored board states
  to validate UI fixes — feature-complete; how it works → [dev-tooling.md](dev-tooling.md).
- Eyeball a render **without** the dev server via a throwaway Vitest →
  `references/` SVG → `scripts/render-board.mjs` (details in [dev-tooling.md](dev-tooling.md)).
