# jeu-de-piton

A 2D, browser-based version of the cross-and-circle race game played at the
cabin — a folk descendant of **Pachisi → Parcheesi** (the same family as Ludo
and Tock). "Piton" is Québec slang for the token/pawn (*pion*).

Built with **Vite + React + TypeScript**, board rendered as **SVG**. No game
engine framework — the game is turn-based discrete state, not real-time.

- **What & why, architecture, milestones** → [docs/PLAN.md](docs/PLAN.md)
- **Game lineage + canonical rules + house-rules** → [docs/rules-and-lineage.md](docs/rules-and-lineage.md)
- **Current status + next steps** → [docs/STATUS.md](docs/STATUS.md)

> Status: **engine core complete** (Milestone 2). Board model + full jeu-de-piton
> rules live in [`src/engine/`](src/engine/), unit-tested with Vitest (`npm test`,
> 67 passing); SVG rendering (Milestone 3) is next — no UI yet.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
```

## Layout

```
src/
  engine/   pure TypeScript rules core — no React/DOM. Fully unit-testable.
  ui/       React + SVG presentation. Renders engine state, sends back intents.
  App.tsx   shell
```
