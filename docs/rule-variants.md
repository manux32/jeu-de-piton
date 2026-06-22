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

- **Single-die variants** (Ludo, Petits Chevaux, cabin sub-variants) ≈ config +
  maybe board art. Close to the "drops in with no engine change" dream.
- **Canonical Parcheesi** = a **multi-session structural task**, because it's the
  one mainstream variant built on two dice. It is the *hardest* variant we could
  pick, not the easy proof-of-concept the backlog once imagined.

## The variant landscape, easiest → hardest
Difficulty is driven by two independent axes: **does it fit the single-die turn
model?** and **does it reuse our exact board art?**

| Variant | Dice | Fits turn model? | Board | Rough cost |
| --- | --- | --- | --- | --- |
| Cabin sub-variant (toggle one knob — e.g. allow stacking, change entry roll) | 1 | yes | ours | **trivial** — pure config |
| Canonical-on-our-board, *single-die* hypothetical | 1 | yes | ours | small — config + a couple knobs |
| Ludo | 1 | yes | **different** (52-track, enter on 6) | medium — config is easy, but the SVG board is hand-drawn for the Parcheesi cross, so new board art |
| Petits Chevaux | 1 | yes | different | medium — like Ludo |
| **Canonical Parcheesi** | **2** | **no** | ours | **large** — see below |

So the *truly* easiest real second variant is anything single-die: it exercises
the variant seam without touching the part we never built. Ludo is mechanically a
near-drop-in; its only real cost is that it needs its own board geometry +
rendering (our hand-drawn SVG is a Parcheesi cross, not a Ludo board). Canonical
Parcheesi is the opposite trade: it reuses our board exactly (it *is* a Parcheesi
board) but breaks the turn model.

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
