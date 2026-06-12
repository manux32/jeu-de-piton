# jeu-de-piton — status

> Fast-moving tracker. Skim at session start. Durable vision lives in
> [PLAN.md](PLAN.md); confirmed rules in [rules-and-lineage.md](rules-and-lineage.md).
> This file is current + next + a decision log — keep it short.

## Mission of the moment
Build Milestone 2 — the engine core. The board coordinate model is in; next is
state init + path-aware move generation for **jeu de piton (the cabin variant)**
— the game we actually play, and the simpler core (one die vs canonical's two).

## Where the build stands
- ✅ Milestone 1 — scaffold (Vite + React + TS, own repo).
- 🔄 Milestone 2 — engine core (state model + canonical Parcheesi rules + tests).
  - ✅ Test runner: **Vitest** added (`npm test` / `npm run test:watch`,
    `vitest.config.ts`, node env).
  - ✅ Board coordinate model: [`src/engine/board.ts`](../src/engine/board.ts)
    + 19 passing tests. The keystone *progress-coordinate* scheme is pinned
    (see below). Exported via `src/engine/index.ts`.
  - 🔜 State init → roll → legal moves (path-aware) → apply → capture → win.
- Cabin house rules **collected** (2026-06-11) and recorded in
  [rules-and-lineage.md](rules-and-lineage.md).
- `Ruleset` / `GameState` types **widened** to express the cabin mechanics
  (path-based passing, the 6→12 rule, streak penalty, no-stacking, exact HOME).

## Board geometry — CONFIRMED (2026-06-11, from board photo)
Standard Selchow & Righter Parcheesi layout. `trackLength: 68`, `laneLength: 7`,
`pitonsPerPlayer: 4`, **12 safe squares** (4 colored entry/start squares — each
is safe — + 8 others, a pair per arm). Details in
[rules-and-lineage.md](rules-and-lineage.md).

## Indexing scheme — PINNED (2026-06-11, [`src/engine/board.ts`](../src/engine/board.ts))
A **progress-coordinate** model: each piton's whole journey is one monotonic
integer line, `0 … P-1` on the shared track, `P … P+L-1` in its private lane,
`P+L` = HOME (`P` = `trackPathLength`, `L` = `laneLength`). Absolute track
square = `(entryIndex + progress) mod trackLength`, so cross-player captures
fall out of equal absolute squares. `progressOf` ↔ `positionAt` are inverse.
Entry seats at `{0,17,34,51}` (2P → opposite arms `{0,34}`). `trackPathLength`
defaults to a full lap; the exact lane turn-off is a `homeEntryOffset` knob,
still pending a visual read (does not affect coordinate correctness).

## Next steps — jeu de piton engine core, built in baby-step rungs
1. ✅ `JEU_DE_PITON` `Ruleset` constant + `createGame()` → initial `GameState`
   (players, pitons in nest, player 0 to roll), with unit tests.
2. ✅ Roll one die + **entry** — `rollDie`/`legalMoves`/`applyRoll`/`applyMove`
   in [`src/engine/moves.ts`](../src/engine/moves.ts); a 5 enters onto the entry
   square, no legal move → turn forfeits. `Move` type added. RNG injected for
   determinism. (Turn handoff is provisional — extra-turn/win hook in later.)
3. 🔜 **Plain track movement** — path-aware step with ally-blocking, safe-square
   blocking, no-stacking. *(needs the 8 non-entry safe-square indices pinned)*
4. **Capture** — landing on a lone enemy off a safe square → nest.
5. **The 6** — moves 12, grants another roll, 3rd-consecutive-6 streak penalty.
6. **Lane + exact HOME + win** — lane turn-off, exact landing, all-four-home.
7. Pin the exact indices of the 12 safe squares + 4 entry squares off the
   vector reference (`../references/parcheesi-board-schematic.svg`) — non-blocking.

## Open rule details to confirm (non-blocking)
- Exact track **indices** of the 12 safe + 4 entry squares (positions known;
  numbering pinned during step 2 above).
- Capture edge case on a safe/entry square (likely moot — enemies can't land
  there at all).

## Next session — start here
**Task: engine core (canonical Parcheesi).** `GameState` init + a
`CANONICAL_PARCHEESI` `Ruleset` → roll → path-aware legal-move generation →
apply move → capture → win detection, with unit tests. Build on the
progress-coordinate helpers in [`src/engine/board.ts`](../src/engine/board.ts)
(`progressOf`/`positionAt`/`trackSquareOf`). Treat safe squares as injected data
and keep `homeEntryOffset` at its default — exactness is non-blocking. This is
where the absolute index convention gets pinned (exercised by tests). Run tests
with `npm test`; render the board with `npm run render:board` if geometry
questions come up.

## Decision log
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
  root; `README.md` kept at root by GitHub convention). Status tracked here.
- **2026-06-11** — Engine move validation is **path-based**, not
  destination-only, because the cabin variant has passing/blocking rules. Built
  in from the start; canonical Parcheesi is the permissive special case.
- **2026-06-11** — Travel **direction** (cabin = counter-clockwise) is a
  board-layout concern, not an engine branch: engine advances by increasing
  track index, UI maps index → screen position.
