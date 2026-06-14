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

## Next session — agreed: M5 variant layer
The look-and-feel control surface is **complete**: [theme.ts](../src/ui/theme.ts)
now owns colour, vfx timing, *and* geometry — the colour-knob pass plus the
geometry-knob pass are both done (see [decisions.md](decisions.md) 2026-06-13 +
06-14 ×2). Every board size lives in `theme.ts`'s `GEOMETRY` section, grouped by
element with a unit legend; the three deferred questions (concern-vs-function,
stroke-width placement, units) are settled there. No size knob is CSS-consumed
yet, so `boardThemeVars` stays colour-only but reusable if a size ever animates.

**M5 variant layer is the agreed next step.** The cabin ruleset already ships as a
`Ruleset` and the engine is variant-agnostic, so this is mostly *proving* a second
variant (e.g. canonical Parcheesi) drops in with **no UI change** — likely a
ruleset-picker beside the player-count pills in the New Game control.

  *Colour-knob follow-ons (the motivating direction): colours
  beyond 4 extend the engine `PlayerColor` union + the palette; letting players
  *choose* builds on the per-seat `players[].color` field that already exists (a
  picker that sets it with uniqueness; seat→colour stays the default).*

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
