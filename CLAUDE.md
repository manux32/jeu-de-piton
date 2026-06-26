# jeu-de-piton — project routing

A 2D, browser-based cross-and-circle race game (Pachisi/Parcheesi family). This
file is the durable routing for the project; it loads on top of the home-tree
root glue at [`../../CLAUDE.md`](../../CLAUDE.md).

## The user's role here — and how to pitch answers
On this project the user acts purely as **game designer**, not implementer: Claude
has written **all** the code from scratch; the user shapes the game design, rules,
and look, and tweaks exposed knobs. So **don't assume code familiarity** — he knows
the design and the visuals, not the implementation corners. Default to **concise,
plain-English answers**: lead with the direct answer in a sentence or two. Deeper
technical detail is welcome as *optional* backing afterward, but always close with a
straight, to-the-point answer to what was actually asked. (He may choose to dive
into the code later; revisit this then.)

## Orientation — docs are tiered; load lazily
**At session start, read only [docs/STATUS.md](docs/STATUS.md)** (backlog + live
open questions — *that's all it holds*). Everything else is **reference — open it
only when a task touches that area**, to keep session context lean.

**This list is the project's routing map: every kind of fact has exactly one home
below, and everything else *points* instead of restating it** (the home-tree
[single-source-of-truth directive](../../CLAUDE.md), applied here). When filing
anything, route it to the one home; when you find the same fact in two places, the
non-home copy is the bug — delete it and leave a pointer. The `/mnx-session-wrap`
settling pass enforces this each session.

- **Backlog + live open questions** (the only volatile, session-scoped facts) →
  [docs/STATUS.md](docs/STATUS.md). **Not** an overview, capabilities list,
  quick-ref, or why-log — those live below.
- **What the game *is* + how it's built** (engine/UI/AI split, tech, goals/non-goals,
  recurring patterns) → [docs/architecture.md](docs/architecture.md)
- **Game lineage + canonical rules + cabin house-rules** → [docs/rules-and-lineage.md](docs/rules-and-lineage.md)
- **Board model** (engine indices ↔ screen, seating, how a piton travels) →
  [docs/board-model.md](docs/board-model.md) — read before touching board geometry
  or `src/ui/` layout (it's where past sessions drifted).
- **PC ↔ mobile parity** (iOS Safari `foreignObject` gotchas + do/don'ts) →
  [docs/cross-platform-ui.md](docs/cross-platform-ui.md) — read before authoring or
  moving any HTML inside the board SVG; desktop hides bugs that only bite the iPad.
- ***Why* a past choice was made** (dated rationale log) → [docs/decisions.md](docs/decisions.md).
  An entry earns its place only if it records *why* / a rejected alternative / a
  reusable gotcha that `git log` + the diff wouldn't already show.
- **Dev rig + commands + deploy** (`src/ui/dev/` panel, build/test commands, Pages
  deploy) → [docs/dev-tooling.md](docs/dev-tooling.md) / [README](README.md).
- **What changed, when** → git history (no doc mirrors it).
- Original scaffold-time plan, frozen → [docs/archive/PLAN.md](docs/archive/PLAN.md)

This is its own independent git repo (`manux32/jeu-de-piton`), nested under the
home work-tree but ignored by the parent allowlist repo.

## Dev server (session-start policy)
The Vite dev server (`npm run dev`, port 5173) may outlive a session as an OS
process — but a new session loses the background-task handle to it. So at session
start: **check whether something is already serving on :5173** (on Windows:
`netstat -ano | grep ':5173 '` — the port precedes `LISTENING`/PID on the line, so
*don't* grep `LISTENING.*:5173`, which never matches and falsely reads as down);
**if so, restart it** (kill the stale process and relaunch via the Bash tool so
this session owns a managed handle + fresh state). **If nothing is running, leave it down** — don't
start it until the user asks or until you actually need it to do work this
session. (Launch with `NODE_OPTIONS=--use-system-ca npm run dev`, backgrounded.)

**Never ask the user about the dev server** — not whether to start, stop, restart,
or leave it running. Apply the policy above silently: restart a stale one when you
need it, leave it otherwise. The user manages its lifecycle and will say if they
want it shut down; don't prompt about it.

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
