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
  the engine is variant-agnostic for *single-die* variants, so those add cheaply —
  but canonical's two dice is a structural turn-model change, not config. Full
  scope → [rule-variants.md](rule-variants.md).

- **Basic AI opponents** (shipped 2026-06-19): seats not controlled by a human play
  themselves via a swappable strategy. Kept as a *third pure layer* — see below.

**Non-goals (for now):** 3D, online/networked play, animation beyond simple
transitions. None are precluded by the architecture — just out of scope until the
core is fun. (AI opponents *were* a non-goal; a first draft now ships.)

## Tech
- **Vite + React + TypeScript** — matches the home stack, zero-install sharing.
- **SVG board** (not canvas, not Phaser): the board *is* vector art, and cells +
  pitons become real DOM elements, so clicks/hover come for free. Phaser was ruled
  out — this game has no real-time loop or physics to justify it.
- **Distribution: installable PWA, no backend.** Builds to a static site served
  over HTTPS from GitHub Pages; `vite-plugin-pwa` adds a manifest + offline service
  worker so it installs to a home screen and runs with no network — fitting the
  hot-seat, no-internet cabin use (the engine is all client-side, so there's nothing
  to host but files). Rationale + the iOS caveats → [decisions.md](decisions.md)
  (2026-06-18); reusable how-to is in the home KB's PWA/static-hosting pages.

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
The cabin rules are variant #1; a *single-die* variant adds with **no UI change** —
that's the payoff, and rule variants are config objects, **not code branches**.
The exception is anything that changes the *turn shape*: canonical Parcheesi's two
dice need engine + UI work (the `diceCount` knob is not yet wired). Scope +
the variant landscape → [rule-variants.md](rule-variants.md).

### The AI: a third pure layer
AI opponents sit in **`src/ai/`** — a third pure layer beside engine and UI, no
React/DOM. Because the only decision in this game is *which legal move to play*
(rolling is chance; entry/capture/finish are already items in the engine's
`legalMoves` list), an AI is just a **`Strategy`**: `(state, moves) => Move`,
choosing among moves the rules already allowed. Like a `Ruleset` for rules, a
`Strategy` makes the *opponent* swappable config, not a code branch — a smarter AI
is a drop-in new function. Which seats are AI — and which `Strategy` each AI seat
runs — is **controller state in the UI** (`humanSeats` + a seat-indexed
`seatStrategies`, chosen in New Game via the `STRATEGY_BY_ID` id→policy seam), not
engine state; a small driver hook (`useAiTurn`) walks an AI seat through the same
roll→move path a human taps, playing that seat's own strategy. Rationale + the v1 `greedyStrategy`
choice → [decisions.md](decisions.md) (2026-06-19).

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

### Design consequence: presentation state is derived by *observing* transitions
Anything the UI needs that the rules don't own — the per-nest **notices**, the
per-seat **turn log**, the **stats** tally, the full **game-log history** — is
*not* added to engine state. Instead `useGame` ([`useGame.ts`](../src/ui/useGame.ts))
computes it by **observing the before/after engine state across each transition**:
it diffs what changed (a piton appeared in a nest ⇒ a capture or a 3rd-6 penalty; a
piton reached `finished` ⇒ "got one home") rather than re-running or re-checking the
rule. This is the recurring pattern that keeps the engine pure while the UI grows
rich feedback — a *presentation ledger*, not a rule. When adding a new piece of
derived feedback, reach for this seam (observe in `useGame`), **not** a new engine
field. The dated instances → [decisions.md](decisions.md).
