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
  `<Pitons>` (overlay); player colors per arm in `ui/colors.ts`. UI stays
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
