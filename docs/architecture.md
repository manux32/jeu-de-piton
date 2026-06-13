# Architecture & vision

> Durable reference — **read when making an architectural call or re-litigating a
> structural decision**, not every session. Current status lives in
> [STATUS.md](STATUS.md); the dated rationale log is in [decisions.md](decisions.md);
> rules in [rules-and-lineage.md](rules-and-lineage.md); board geometry in
> [board-model.md](board-model.md); the dev scenario rig in
> [dev-tooling.md](dev-tooling.md). Maintain: update a section when the decision it
> describes actually changes; record *why* it changed in [decisions.md](decisions.md).

## What this is
A 2D, browser-based version of the cross-and-circle race game played by friends at
the cabin — a folk descendant of **Pachisi → Parcheesi** (same family as Ludo,
Petits Chevaux, and the Québécois Tock). Our version is on the **dice branch**:
4 *pitons* (pawns) each, roll a **5** to enter. Lineage + full rules:
[rules-and-lineage.md](rules-and-lineage.md). Rules have drifted across families,
so there is no single canonical "jeu de piton" — which is exactly why swappable
rule sets matter.

## Goals
- A genuinely **playable** 2D game — fun first, polish later.
- **Hot-seat local multiplayer**, with a **selectable player count**.
- **Swappable rule sets**: ship the **cabin variant (jeu de piton)** first — the
  game we actually play and, with a single die, the simpler core to build.
  Canonical Parcheesi (two dice, combine/split) stays a possible future variant;
  the engine is built variant-agnostic so adding it costs no UI change.

**Non-goals (for now):** 3D, AI opponents, online/networked play, animation beyond
simple transitions. None are precluded by the architecture — just out of scope
until the core is fun.

## Tech
- **Vite + React + TypeScript** — matches the home stack, zero-install sharing.
- **SVG board** (not canvas, not Phaser): the board *is* vector art, and cells +
  pitons become real DOM elements, so clicks/hover come for free. Phaser was ruled
  out — this game has no real-time loop or physics to justify it.

## The split that matters: pure rules core ↔ UI
**A pure rules core is separated from the UI.** This is what makes "change the
rules per game" actually work. **Do not violate this** — it's the load-bearing
decision.

- **`src/engine/`** — plain TypeScript, *zero* React/DOM imports. Owns the board
  model, game state, legal-move generation, applying a move, captures, win
  detection. Pure functions over a state object → **fully unit-testable** with no
  rendering (Vitest, `npm test`).
- **`src/ui/`** — React + SVG. Renders engine state, sends user intents (rolled
  the die, clicked a piton) back to the engine, shows whose turn it is. **Holds no
  rules** — every decision comes from the engine.

A **variant** is just a `Ruleset` config object fed to the engine (player count,
pitons each, which rolls enter, capture rules, safe squares, extra-turn-on-N, …).
The cabin rules are variant #1; canonical Parcheesi could be variant #2 — **no UI
changes needed to add a variant.** That's the payoff. Rule variants are config
objects, **not code branches**.

### Design consequence: path-based move validation
The cabin variant has *passing* rules — you can't move past your own piton, and a
piton on a safe square blocks everyone (see [rules-and-lineage.md](rules-and-lineage.md)).
So move generation/validation is **path-based, not destination-only**: the engine
inspects every square a piton crosses, not just where it lands. It is built
path-aware from the start, so the canonical (destination-only) variant is just the
permissive special case.

### Design consequence: direction is a UI concern
The engine advances by *increasing* track index; counter-clockwise travel is the
SVG layer's mapping. Direction never branches the rules core.
