# jeu-de-piton — status

> Fast-moving tracker. Skim at session start. Durable vision lives in
> [PLAN.md](PLAN.md); confirmed rules in [rules-and-lineage.md](rules-and-lineage.md).
> This file is current + next + a decision log — keep it short.

## Mission of the moment
Capture the cabin house rules and make sure the engine architecture can express
them, before writing engine logic.

## Where the build stands
- ✅ Milestone 1 — scaffold (Vite + React + TS, own repo).
- 🔜 Milestone 2 — engine core (state model + canonical Parcheesi rules + tests).
  Not started.
- Cabin house rules **collected** (2026-06-11) and recorded in
  [rules-and-lineage.md](rules-and-lineage.md).
- `Ruleset` / `GameState` types **widened** to express the cabin mechanics
  (path-based passing, the 6→12 rule, streak penalty, no-stacking, exact HOME).

## Board geometry — CONFIRMED (2026-06-11, from board photo)
Standard Selchow & Righter Parcheesi layout. `trackLength: 68`, `laneLength: 7`,
`pitonsPerPlayer: 4`, **12 safe squares** (4 colored entry/start squares — each
is safe — + 8 others, a pair per arm). Details in
[rules-and-lineage.md](rules-and-lineage.md).

## Next steps
1. Decide test runner (Vitest expected) and add it.
2. Design the track/lane coordinate + indexing scheme, and from it pin the
   exact indices of the 12 safe squares + 4 entry squares (read off the photo).
3. Build engine core for **canonical Parcheesi** first: state init, roll →
   legal moves (path-aware + forced-move from day one), apply move, capture, win
   detection, with unit tests.
4. Add the **jeu de piton** `Ruleset` as variant #2 and test its divergences.

## Open rule details to confirm (non-blocking)
- Exact track **indices** of the 12 safe + 4 entry squares (positions known;
  numbering pinned during step 2 above).
- Capture edge case on a safe/entry square (likely moot — enemies can't land
  there at all).

## Decision log
- **2026-06-11** — Board confirmed as standard Parcheesi geometry (68-track,
  7-cell lanes, 12 safe squares) from a photo of the cabin board. "Moving is
  mandatory if able" (forced-move) added as a rule and `forcedMove` Ruleset knob.
- **2026-06-11** — Project docs live under `docs/` (only `CLAUDE.md` at repo
  root; `README.md` kept at root by GitHub convention). Status tracked here.
- **2026-06-11** — Engine move validation is **path-based**, not
  destination-only, because the cabin variant has passing/blocking rules. Built
  in from the start; canonical Parcheesi is the permissive special case.
- **2026-06-11** — Travel **direction** (cabin = counter-clockwise) is a
  board-layout concern, not an engine branch: engine advances by increasing
  track index, UI maps index → screen position.
