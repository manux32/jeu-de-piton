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
**Playable hot-seat.** Milestones 1–4 done (scaffold · engine core · SVG board ·
interaction loop). 67 engine tests green, build + lint clean. `src/ui/` is
rules-free — every decision comes from the engine via
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
  - **Rectangular cells** — the board uses a uniform square grid; the reference
    draws cells as rectangles along each arm. Contained refactor of
    [`src/ui/layout.ts`](../src/ui/layout.ts) + renderers; engine untouched.
    Details in [board-model.md](board-model.md).
  - **Forfeit-notice wart** (2026-06-12) — the HUD notice describes the player
    who *just rolled* ("Red rolled 3 — no legal move, turn passes") while the
    turn indicator already shows the **next** player; momentarily confusing. No
    engine bug. Candidate fix: gate the handoff behind an explicit "Pass/Continue"
    click (an `awaitingPass` view flag in `useGame`). Deferred — accept as-is.

## Open rule details
- *All confirmed as of 2026-06-12.* The unplayable-1st/2nd-6 question is closed:
  it grants the bonus roll and counts toward the three-in-a-row (engine +
  `rules-and-lineage.md` updated). No capture/HOME bonuses; entry on a 5 is not
  forced. Reopen only if real play surprises us.

## Dev quick-ref
- `npm test` (engine), `npm run build` (type-check + build), `npm run dev` (UI,
  port 5173 — see CLAUDE.md session-start policy).
- Eyeball a layout/render change **without** the dev server: throwaway Vitest that
  builds the layout (or `renderToStaticMarkup`s `<GameBoard>` with a doctored
  state) to an SVG in `references/`, then `node scripts/render-board.mjs <in.svg>
  <out.png>`. Delete the artifacts after.
