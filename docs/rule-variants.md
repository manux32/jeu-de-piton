# Adding rule variants — scope & the canonical-Parcheesi case

> **Reference — open this only when planning a new `Ruleset`.** It's the durable
> scoping note for "what would a second variant actually cost," written after a
> design pass on 2026-06-22 (no code yet). The architecture rationale for the
> variant layer is in [architecture.md](architecture.md); the rules themselves
> (cabin vs canonical) in [rules-and-lineage.md](rules-and-lineage.md); the
> `Ruleset` knobs in [`../src/engine/types.ts`](../src/engine/types.ts). This doc
> ties those together into an effort estimate.

## TL;DR
The `Ruleset` config surface is genuinely variant-ready for **most** of what a
second variant needs — that early bet paid off. The one thing it does **not**
cover is **two dice**: `diceCount` exists as a knob but **nothing reads it**, and
the whole turn engine is single-die to the bone. So the cost of a variant splits
cleanly:

- **Single-die variants on a 4-arm cross** (Ludo, Petits Chevaux, cabin
  sub-variants) ≈ config + small tuning. Close to the "drops in with no engine
  change" dream — the board geometry is procedural, so even Ludo's different
  proportions are absorbed (see "Board cost is about topology…" below).
- **Canonical Parcheesi** = a **multi-session structural task**, because it's the
  one mainstream variant built on two dice. It's the hardest variant *among those
  that reuse our cross board* — but **not** the hardest imaginable: a board with a
  *different topology* (a non-cross board) would cost more still. The cheap
  proof-of-concept the backlog once imagined exists, but it's Ludo, not canonical.

## The variant landscape, easiest → hardest
Difficulty is driven by two independent axes: **does it fit the single-die turn
model?** and **does the board share our topology?** That second axis is the one
easy to get wrong — see "Board cost is about topology, not 'different board'"
below. Both the engine board model ([`../src/engine/board.ts`](../src/engine/board.ts))
and the UI layout ([`../src/ui/layout.ts`](../src/ui/layout.ts)) are **fully
procedural over a generic 4-arm symmetric cross**, so a board with the same
topology but different proportions mostly *flows through by changing numbers* —
it does not need new layout code or hand-drawn art.

| Variant | Dice | Fits turn model? | Board topology | Rough cost |
| --- | --- | --- | --- | --- |
| Cabin sub-variant (toggle one knob — e.g. allow stacking, change entry roll) | 1 | yes | ours | **trivial** — pure config |
| Canonical-on-our-board, *single-die* hypothetical | 1 | yes | ours | small — config + a couple knobs |
| Ludo / Petits Chevaux | 1 | yes | **same cross** (52-track = 4×13), enter on 6 | **small** — geometry is procedural; cost is retuning one phase constant + *optional* restyling |
| **Canonical Parcheesi** | **2** | **no** | ours | **large** — structural turn-model change, see below |
| A non-cross board (Tock oval, hexagonal, circular…) | varies | — | **different** | **largest** — rewrites layout.ts's core assumptions |

So the *truly* easiest real second variant is anything single-die on a 4-arm
cross: it exercises the variant seam without touching either part we'd have to
rebuild. **Ludo is mechanically a near-drop-in** and, crucially, its board is the
*same topology* as ours (it's the simplified English descendant of the same
cross), so its geometry is absorbed too. Canonical Parcheesi is the opposite
trade: it reuses our board exactly but breaks the single-die turn model. A board
with a *different topology* is the only thing costlier than two dice.

## Board cost is about topology, not "different board"
The intuition that "a new board can't be cheap — we built so much visual
machinery and centralized knobs" is half right, and worth pinning precisely so
the wrong variant doesn't get ruled out:

- **Same topology, different proportions (Ludo, Petits Chevaux): cheap.** A real
  Ludo board *is* a 4-arm cross. Its 52-cell track is `4 × 13`, which feeds
  straight through the procedural layout: `sideLen = (52/4 - 1)/2 = 6`,
  `gridSize = 2·6 + 3 = 15` — the classic 15×15 Ludo grid, computed
  automatically by [`buildLayout`](../src/ui/layout.ts). The engine's
  [`makeGeometry`](../src/engine/board.ts) / [`entrySeats`](../src/engine/board.ts)
  handle any `trackLength % 4 === 0` the same way. **No layout rewrite, no
  hand-drawn art.** The only real costs:
  1. **Retune one phase constant** — `SAFE_PHASE` in
     [`../src/ui/layout.ts`](../src/ui/layout.ts) — so engine index 0 lands on
     the correct cell for the new arm length (a small pinning task, exactly like
     pinning the cabin board was).
  2. **Restyling (optional, gradable).** An *authentic* Ludo look (solid-colour
     full arms, big corner yards, arrows) differs from the Parcheesi look — but
     that is the **`theme.ts` knob workflow the user already drives** (change/add
     knob values + maybe a component tweak), not architecture. And it's
     gradable: *minimal* Ludo = Ludo rules rendered in our current style (nearly
     free); *authentic* Ludo = restyling on top.

- **Different topology (non-cross): expensive.** A board that is *not* a 4-arm
  symmetric cross — an oval Tock track, a hexagonal or circular board — breaks
  [`buildLayout`](../src/ui/layout.ts)'s load-bearing assumptions (4-fold
  symmetry, tile-one-arm-by-90°-rotation, square grid) and the engine's
  `trackLength % 4 === 0` seating. **That** is a real layout-core rewrite, and
  the only board change that costs *more* than two dice.

So the honest ranking of "two dice vs. a different board" depends entirely on the
board: two dice is **harder** than a same-topology board (Ludo) but **easier**
than a different-topology one.

## What the `Ruleset` surface already covers (no engine change)
These canonical differences are already pure data — see
[`../src/engine/rulesets.ts`](../src/engine/rulesets.ts) for the cabin values to
flip:

- **Blockades / stacking of 2** → `maxPerSquare: 2`
- **Passing allowed** → `alliesBlockPassage: false`, `safeSquaresBlockPassage: false`
- **Pips move as rolled** → empty `rollStepOverrides` (drop the cabin's `{6: 12}`)
- **Clockwise travel** → not a ruleset field at all; direction is a UI mapping in
  [`../src/ui/layout.ts`](../src/ui/layout.ts), engine advances by increasing
  index either way (see [board-model.md](board-model.md))
- **Exact home, forced move** → same `exactHomeEntry` / `forcedMove` knobs
- **Board geometry** → unchanged; canonical *is* a Parcheesi board, so our 68
  track / 7 lanes / 12 safe squares already match it. **Zero board work.**

The engine is also already **path-based** (it scans every crossed square, not
just the landing), so canonical's permissive passing rules are just the easy
special case of machinery we already have. See architecture.md → "path-based move
validation."

## The wall: two dice
`diceCount` is a **dead knob** — referenced only in `rulesets.ts` (the value `1`)
and a test asserting it. The turn engine assumes one die everywhere:

- **State** carries `lastRoll: number | null` — one scalar
  ([`../src/engine/types.ts`](../src/engine/types.ts), `GameState`).
- **Phase machine** is `awaiting-roll → one move → pass turn`. One roll = exactly
  one move ([`../src/engine/moves.ts`](../src/engine/moves.ts), `applyRoll` /
  `applyMove`).
- `legalMoves(state, roll)` takes a single number.
- The **die UI**, the **AI driver** (`useAiTurn`), the **turn log** (one row per
  move), and the **dev panel** state editor + serializer all assume that scalar.

Canonical Parcheesi is fundamentally: roll **two** dice → hold **two
move-values** → play them as **two separate sub-moves** (same or different
pawns), with combine/split rules for entry and a doubles bonus. Concretely that
means:

- `lastRoll: number` → something like `dice: number[]` plus tracking of **which
  die is still unspent**;
- `legalMoves` must **regenerate after the first sub-move** (the board changed);
- the phase machine grows a **"second sub-move pending"** state;
- the AI driver (plays one move per roll today), die rendering (one die →
  **two dice + animation**), turn log, and dev tooling all follow.

This is why the backlog's "likely no UI change" is true for a single-die variant
but **false for canonical specifically** — two dice must be rendered, and the
player must choose which die applies to which pawn.

## Smaller canonical-only divergences (each = a new knob + a little engine)
- **Bonus moves** — capturing grants **+20**, reaching HOME grants **+10**. We
  have *no* bonus-move concept (the cabin rules deliberately carry none — see
  rules-and-lineage.md "No bonuses beyond the 6"). New knobs + apply-move logic.
- **Extra turn on doubles** — `extraTurnOn: number` can't express "any matching
  pair." Needs to become a predicate/mode (e.g. `'doubles'`).
- **Three doublets penalty** — close to our `extraTurnStreakLimit` +
  `streakPenalty: 'lose-leading'`, but triggered by *doubles* rather than a fixed
  face. Partly reusable.
- **Entry** — "a die showing 5, **or** two dice summing to 5." Entry logic
  becomes two-dice-aware (`entryRolls` alone no longer suffices).
- **Blockade nuances** — must break a blockade when forced by a doublet; can't
  form one on certain squares. Edition-dependent (see caveat below).

## Sizing
The **two-dice turn-model rework is the bulk** of the job and deserves its own
dedicated session, ending with a full re-test of the engine. The bonus moves and
doubles handling are smaller adds on top, then a UI/AI/dev-tooling follow-on for
two-dice rendering and interaction. Rough budget: a **2–4 session arc**. Doable,
and the architecture won't fight it — but it is real structural work, not a config
drop-in.

## Rules-knowledge caveat
Claude can draft a faithful canonical ruleset unguided from the official modern
Hasbro / Selchow & Righter rules (entry on 5, capture +20, home +10, doubles
bonus using all four faces when all pawns are out, three-doublets-loses-furthest,
blockades, safety squares). **But canonical Parcheesi has real edition-to-edition
variation** — the exact bonus numbers, blockade-break-on-doublet, and a couple of
safety-square edge cases differ between printings. When implementing, pin to one
named edition and flag the 2–3 spots where editions disagree, rather than pretend
there's a single unambiguous canon (the brand's rules drifted just like our cabin
rules did).
