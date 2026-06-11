# jeu-de-piton — game plan

> Preliminary plan written at scaffold time. The build happens in a later
> session; treat milestones as a sketch, not a contract.

## What this is

A 2D, browser-based version of the cross-and-circle race game played by friends
at the cabin in the woods. The game is a folk descendant of **Pachisi**, the
ancient Indian race game, by way of **Parcheesi** — the same family as Ludo,
Petits Chevaux, and the Québécois **Tock**. Our family's version is on the
**dice** branch (not the card-based Tock branch): each player has 4–5 *pitons*
(pawns), and you must roll a **5** to bring a piton onto the board — the
signature Parcheesi entry rule. Full lineage and rules: see
[docs/rules-and-lineage.md](docs/rules-and-lineage.md).

"Piton" is Québec slang for *pion* (token). The board is a cross; we built a
physical one by hand at the cabin. Rules have drifted across generations and
families, so there is no single canonical "jeu de piton" — which is exactly why
swappable rule sets matter here.

## Goals

- A genuinely **playable** 2D game soon — fun first, polish later.
- **Hot-seat local multiplayer**, with a **selectable player count**.
- **Swappable rule sets**: ship canonical Parcheesi first; add the cabin's house
  rules as a second variant once the details are collected from the gang.

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
  [`src/engine/types.ts`](src/engine/types.ts).
- **`src/ui/`** — React + SVG. Renders engine state, sends user intents (rolled
  the die, clicked a piton) back to the engine, shows whose turn it is. Holds no
  rules.

A **variant** is just a `Ruleset` config object fed to the engine (player count,
pitons each, which rolls let you enter, capture rules, safe squares,
extra-turn-on-N, …). Canonical Parcheesi is variant #1; the cabin rules become
variant #2 — **no UI changes needed to add a variant.** That's the payoff.

## Milestones (rough)

1. **Scaffold** — Vite + React + TS, own git repo, `CLAUDE.md` + `docs/`. ✅ *(this session)*
2. **Engine core** — state model + canonical Parcheesi rules + unit tests. No UI.
3. **Board rendering** — SVG board reflecting engine state; pick player count.
4. **Interaction loop** — roll, highlight legal moves, click to move, captures, win.
5. **Variant layer** — formalize the `Ruleset` config; stub a second variant.
6. *(later)* the real cabin house rules; polish, optional animation.

## Open questions (to resolve when building)

- Exact cabin house rules — **pending**: collect from the family (piton count
  4 vs 5, capture/safe-square specifics, doubles behaviour, what happens on
  exact-vs-overshoot into HOME, etc.).
- Test runner choice (Vitest is the natural fit with Vite) — decide at milestone 2.
- Board coordinate system / track indexing scheme — design at milestone 2.
