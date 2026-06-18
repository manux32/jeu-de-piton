# jeu-de-piton — project routing

A 2D, browser-based cross-and-circle race game (Pachisi/Parcheesi family). This
file is the durable routing for the project; it loads on top of the home-tree
root glue at [`../../CLAUDE.md`](../../CLAUDE.md).

## Orientation — docs are tiered; load lazily
**At session start, read only [docs/STATUS.md](docs/STATUS.md)** (current state +
backlog + open questions). Everything else is **reference — open it only when a
task touches that area**, to keep session context lean:
- **Architecture & vision** (engine/UI split, tech choices, goals/non-goals) →
  [docs/architecture.md](docs/architecture.md)
- **Game lineage + canonical rules + cabin house-rules** → [docs/rules-and-lineage.md](docs/rules-and-lineage.md)
- **Board model** (engine indices ↔ screen, seating, how a piton travels) →
  [docs/board-model.md](docs/board-model.md) — read before touching board geometry
  or `src/ui/` layout (it's where past sessions drifted).
- ***Why* a past choice was made** (dated rationale log) → [docs/decisions.md](docs/decisions.md)
- **Dev scenario rig** (the dev-only `src/ui/dev/` panel) → [docs/dev-tooling.md](docs/dev-tooling.md)
- Original scaffold-time plan, frozen → [docs/archive/PLAN.md](docs/archive/PLAN.md)

This is its own independent git repo (`manux32/jeu-de-piton`), nested under the
home work-tree but ignored by the parent allowlist repo.

## Dev server (session-start policy)
The Vite dev server (`npm run dev`, port 5173) may outlive a session as an OS
process — but a new session loses the background-task handle to it. So at session
start: **check whether something is already serving on :5173; if so, restart it**
(kill the stale process and relaunch via the Bash tool so this session owns a
managed handle + fresh state). **If nothing is running, leave it down** — don't
start it until the user asks or until you actually need it to do work this
session. (Launch with `NODE_OPTIONS=--use-system-ca npm run dev`, backgrounded.)

## Architecture (do not violate)
- **`src/engine/`** = pure rules core, **no React/DOM imports**. Unit-testable in
  isolation. Rule variants are `Ruleset` config objects, not code branches.
- **`src/ui/`** = React + SVG presentation. Renders engine state, sends intents
  back, holds no rules.
- Rationale lives in [docs/architecture.md](docs/architecture.md) — don't
  re-litigate the engine/UI split or the no-Phaser decision without revisiting
  it there.

## This-machine note
Node was installed via winget mid-2026; if `node`/`npm` aren't on a fresh
shell's PATH, refresh from the machine env. Corporate TLS interception on this
network means npm registry calls need Node's `--use-system-ca`
(`NODE_OPTIONS=--use-system-ca`). General picture (TLS interception, cert-pinning
vs trust-store, winget) lives in the KB →
[`../../knowledge/machine-quirks.md`](../../knowledge/machine-quirks.md).
