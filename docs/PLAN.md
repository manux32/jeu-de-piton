# jeu-de-piton — game plan

> Durable plan written at scaffold time. The build is now underway (Milestone 2,
> the engine core, is nearly complete — see [STATUS.md](STATUS.md) for live
> progress); treat the milestones below as a sketch, not a contract.

## What this is

A 2D, browser-based version of the cross-and-circle race game played by friends
at the cabin in the woods. The game is a folk descendant of **Pachisi**, the
ancient Indian race game, by way of **Parcheesi** — the same family as Ludo,
Petits Chevaux, and the Québécois **Tock**. Our family's version is on the
**dice** branch (not the card-based Tock branch): each player has 4 *pitons*
(pawns), and you must roll a **5** to bring a piton onto the board — the
signature Parcheesi entry rule. Full lineage and rules: see
[rules-and-lineage.md](rules-and-lineage.md).

"Piton" is Québec slang for *pion* (token). The board is a cross; we built a
physical one by hand at the cabin. Rules have drifted across generations and
families, so there is no single canonical "jeu de piton" — which is exactly why
swappable rule sets matter here.

## Goals

- A genuinely **playable** 2D game soon — fun first, polish later.
- **Hot-seat local multiplayer**, with a **selectable player count**.
- **Swappable rule sets**: ship the **cabin variant (jeu de piton)** first — it's
  the game we actually play and, with a single die, the simpler core to build.
  Canonical Parcheesi (two dice, combine/split) stays a possible future variant;
  the engine is built variant-agnostic so adding it costs no UI change.

Explicit non-goals (for now): 3D, AI opponents, online/networked play,
animations beyond simple transitions. None are precluded by the architecture —
they're just out of scope until the core is fun.

## Tech

- **Vite + React + TypeScript** — matches the home stack, zero-install sharing.
- **SVG board** (not canvas, not Phaser): the board *is* vector art, and cells +
  pitons become real DOM elements, so clicks/hover come for free. Phaser was
  ruled out — this game has no real-time loop or physics to justify it.

## Architecture — the one decision that matters up front

**Split a pure rules core from the UI.** This is what makes "change the rules per
game" actually work.

- **`src/engine/`** — plain TypeScript, *zero* React/DOM imports. Owns the board
  model, game state, legal-move generation, applying a move, captures, win
  detection. Pure functions over a state object → **fully unit-testable** with no
  rendering. Draft domain types already sketched in
  [`src/engine/types.ts`](../src/engine/types.ts).
- **`src/ui/`** — React + SVG. Renders engine state, sends user intents (rolled
  the die, clicked a piton) back to the engine, shows whose turn it is. Holds no
  rules.

A **variant** is just a `Ruleset` config object fed to the engine (player count,
pitons each, which rolls let you enter, capture rules, safe squares,
extra-turn-on-N, …). Canonical Parcheesi is variant #1; the cabin rules become
variant #2 — **no UI changes needed to add a variant.** That's the payoff.

> **Design consequence from the collected cabin rules** (see
> [rules-and-lineage.md](rules-and-lineage.md)): our variant has *passing* rules
> — you can't move past your own piton, and a piton on a safe square blocks
> everyone. That means move generation/validation is **path-based**, not
> destination-only: the engine must inspect every square a piton crosses, not
> just where it lands. The engine is built path-aware from the start so the
> canonical (destination-only) variant is just the permissive special case.

## Milestones (rough)

1. **Scaffold** — Vite + React + TS, own git repo, `CLAUDE.md` + `docs/`. ✅ *(this session)*
2. **Engine core** — state model + **jeu de piton (cabin) rules** + unit tests. No UI.
3. **Board rendering** — SVG board reflecting engine state; pick player count.
4. **Interaction loop** — roll, highlight legal moves, click to move, captures, win.
5. **Variant layer** — the cabin variant ships as the first `Ruleset`; a later
   pass can add a second variant (e.g. canonical Parcheesi) — no UI changes.
6. *(later)* polish, optional animation; confirm remaining open rule details.

The cabin house rules are now **collected** (2026-06-11) and live in
[rules-and-lineage.md](rules-and-lineage.md); the `Ruleset` type has been widened
to express them. A few secondary details remain to confirm — see the "Still
open" list in that doc.

## Open questions — RESOLVED at milestone 2

- ~~Test runner~~ → **Vitest** (`npm test`).
- ~~Board coordinate / indexing scheme~~ → **progress-coordinate model**, pinned
  in [`src/engine/board.ts`](../src/engine/board.ts) (see STATUS).
- ~~Movement direction~~ → confirmed a board-layout concern: the engine advances
  by increasing track index (counter-clockwise is the SVG layer's mapping), so
  direction never branches the rules core.

Live open items now live in [STATUS.md](STATUS.md); rule details still to confirm
are in [rules-and-lineage.md](rules-and-lineage.md) "Still open".
