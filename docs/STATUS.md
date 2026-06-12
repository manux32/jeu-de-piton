# jeu-de-piton — status

> Fast-moving tracker. Skim at session start. Durable vision lives in
> [PLAN.md](PLAN.md); confirmed rules in [rules-and-lineage.md](rules-and-lineage.md).
> This file is current + next + a decision log — keep it short.

## Mission of the moment
**Milestone 2 (engine core) is COMPLETE.** All six baby-step rungs are in
(createGame → entry → track movement → capture → the 6 → lane/HOME/win); the
pure rules core for **jeu de piton (the cabin variant)** is done. 67 engine
tests green. Next up: **Milestone 3 — SVG board rendering** (the `src/ui/`
layer that renders engine state and sends intents back).

## Where the build stands
- ✅ Milestone 1 — scaffold (Vite + React + TS, own repo).
- ✅ Milestone 2 — engine core (state model + jeu de piton rules + tests). DONE.
  - ✅ Test runner: **Vitest** added (`npm test` / `npm run test:watch`,
    `vitest.config.ts`, node env).
  - ✅ Board coordinate model: [`src/engine/board.ts`](../src/engine/board.ts)
    + 19 passing tests. The keystone *progress-coordinate* scheme is pinned
    (see below). Exported via `src/engine/index.ts`.
  - ✅ State init + roll + legal moves (path-aware) + apply + capture + the 6 —
    rungs 1–5 in [`src/engine/`](../src/engine/) (`state.ts`, `moves.ts`).
  - ✅ Lane turn-off + exact HOME + win — rung 6, the last. Movement walks the
    track *and* the private lane; `passageBlocked`/`resolveLanding` are
    lane-aware (lanes private: only the mover's own pitons block, no enemies/
    captures/safe squares); overshoot past HOME is no move; all-four-home sets
    `winner` + `game-over` in `applyMove` (a winning move never grants an extra
    roll). 8 new tests.
- 🔜 Milestone 3 — SVG board rendering (`src/ui/`).
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
Entry seats at `{0,17,34,51}` (2P → opposite arms `{0,34}`). `homeEntryOffset`
**PINNED 2026-06-12 = 4** (`trackPathLength: 64`, lane mouth 5 squares before
own start). The 12 safe squares are also pinned — see below.

## Next steps — jeu de piton engine core, built in baby-step rungs
1. ✅ `JEU_DE_PITON` `Ruleset` constant + `createGame()` → initial `GameState`
   (players, pitons in nest, player 0 to roll), with unit tests.
2. ✅ Roll one die + **entry** — `rollDie`/`legalMoves`/`applyRoll`/`applyMove`
   in [`src/engine/moves.ts`](../src/engine/moves.ts); a 5 enters onto the entry
   square, no legal move → turn forfeits. `Move` type added. RNG injected for
   determinism. (Turn handoff is provisional — extra-turn/win hook in later.)
3. ✅ **Plain track movement** — path-aware step in
   [`src/engine/moves.ts`](../src/engine/moves.ts): `rollStep` (6→12),
   `passageBlocked` walks the crossed squares enforcing ally-blocking (pass +
   land), occupied safe-square blocking, no-stacking. Lane moves deferred to 6.
4. ✅ **Capture** — landing on a lone enemy off a safe square sets
   `Move.captures` (→ nest); ally / safe-square enemy still blocks. In
   [`src/engine/moves.ts`](../src/engine/moves.ts) via `resolveLanding`.
5. ✅ **The 6** — moves 12, grants another roll (turn stays + `extraTurnStreak++`
   in `applyMove`), 3rd-consecutive-6 penalty in `applyRoll`
   (`penalizedStreakRoll` → `loseLeadingTrackPiton`, not played, turn passes).
6. ✅ **Lane + exact HOME + win** — lane turn-off, exact landing, overshoot-is-
   no-move, all-four-home → winner. In [`src/engine/moves.ts`](../src/engine/moves.ts).
7. ✅ Safe squares + `homeEntryOffset` pinned 2026-06-12 (see decision log).

## Safe squares — PINNED (2026-06-12, from the board + friend's confirmation)
`safeSquares = [0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63]` — entries
`{0,17,34,51}` each offset by `{0, 7, 12}`. Three families: starts, mid-arms
`{7,24,41,58}`, home-mouths `{12,29,46,63}`. Counter-clockwise travel; the +12
home-mouth is the next player's lane entry. Full detail in
[rules-and-lineage.md](rules-and-lineage.md).

## Open rule details to confirm (non-blocking)
- ~~Capture edge case on a safe/entry square~~ — handled in rung 4: an enemy on a
  safe square can't be landed on (no capture there), so the edge case can't
  arise. Closed unless real play surprises us.
- **Unplayable 1st/2nd 6** (added rung 5): if a 6 you *could* otherwise replay
  has no legal move (12-move blocked everywhere), the engine currently treats it
  as an ordinary forfeit — no extra turn, streak not bumped. Confirm with the
  friend whether an unplayable 6 should still grant the bonus roll. (The *3rd* 6
  is unaffected: its penalty fires before the playability check.)

## Next session — start here
**Task: Milestone 3 — SVG board rendering (`src/ui/`).** The engine core is done
and fully tested; now build the React + SVG presentation layer that *renders*
`GameState` and sends intents (roll / chosen move) back. Architecture rule
(CLAUDE.md): `src/ui/` holds **no rules** — it reads engine state and calls
`rollDie`/`applyRoll`/`legalMoves`/`applyMove`, nothing more.
- Start from the geometry already proven by the board-render pipeline
  (`npm run render:board`, see [`scripts/`](../scripts/) / `src/engine/board.ts`).
  The engine deliberately does **not** model screen direction (counter-clockwise)
  — the UI maps a track index / lane step → screen position. That index→pixel
  mapping is the first real UI design decision.
- Suggested baby-steps: (1) static SVG board from geometry (track ring, four
  lanes, nests, safe-square marks); (2) render pitons at their `PitonPosition`;
  (3) a roll button + dice display; (4) highlight `legalMoves` and apply the
  picked one; (5) turn/winner banner.
- Before coding the layer, **discuss the index→screen mapping and component
  split** (per working-style: design before implementing).
- Run `npm test` to confirm the engine still passes; `npm run dev` for the UI.

Revisit the two non-blocking open rule details above with the friend at some
point (capture-on-safe is closed; unplayable 1st/2nd 6 is still open).

## Decision log
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
  it. Surfaced one new open question (unplayable 1st/2nd 6 — see above).
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
  root; `README.md` kept at root by GitHub convention). Status tracked here.
- **2026-06-11** — Engine move validation is **path-based**, not
  destination-only, because the cabin variant has passing/blocking rules. Built
  in from the start; canonical Parcheesi is the permissive special case.
- **2026-06-11** — Travel **direction** (cabin = counter-clockwise) is a
  board-layout concern, not an engine branch: engine advances by increasing
  track index, UI maps index → screen position.
