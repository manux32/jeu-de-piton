# jeu-de-piton — project routing

A 2D, browser-based cross-and-circle race game (Pachisi/Parcheesi family). This
file is the durable routing for the project; it loads on top of the home-tree
root glue at [`../../CLAUDE.md`](../../CLAUDE.md).

## Orientation — read at session start
- **Where we stand + next steps + decisions** → [docs/STATUS.md](docs/STATUS.md)
- **Plan, architecture, milestones** → [docs/PLAN.md](docs/PLAN.md)
- **Game lineage + canonical rules + cabin house-rules** → [docs/rules-and-lineage.md](docs/rules-and-lineage.md)
- This is its own independent git repo (`manux32/jeu-de-piton`), nested under the
  home work-tree but ignored by the parent allowlist repo.

## Architecture (do not violate)
- **`src/engine/`** = pure rules core, **no React/DOM imports**. Unit-testable in
  isolation. Rule variants are `Ruleset` config objects, not code branches.
- **`src/ui/`** = React + SVG presentation. Renders engine state, sends intents
  back, holds no rules.
- Rationale and the full plan live in [docs/PLAN.md](docs/PLAN.md) — don't
  re-litigate the engine/UI split or the no-Phaser decision without revisiting
  it there.

## Shared knowledge base
Cross-cutting home knowledge lives in the shared KB one level up — start at
[`../../knowledge/index.md`](../../knowledge/index.md). Most relevant here:
- [`../../knowledge/vscode-setup.md`](../../knowledge/vscode-setup.md) — dev environment / per-stack setup
- [`../../knowledge/git-setup.md`](../../knowledge/git-setup.md) — git toolchain + new-machine recreation
- [`../../knowledge/toolchain.md`](../../knowledge/toolchain.md) — installed tooling

Durable cross-project knowledge belongs in the KB, not here. Project-specific
docs all live under [docs/](docs/) (only this `CLAUDE.md` and `README.md` sit at
the repo root). Fast-moving status → [docs/STATUS.md](docs/STATUS.md).

## This-machine note
Node was installed via winget mid-2026; if `node`/`npm` aren't on a fresh
shell's PATH, refresh from the machine env. Corporate TLS interception on this
network means npm registry calls need Node's `--use-system-ca`
(`NODE_OPTIONS=--use-system-ca`). General picture (TLS interception, cert-pinning
vs trust-store, winget) lives in the KB →
[`../../knowledge/machine-quirks.md`](../../knowledge/machine-quirks.md).
