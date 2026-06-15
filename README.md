# jeu-de-piton

A 2D, browser-based version of the cross-and-circle race game played at the
cabin — a folk descendant of **Pachisi → Parcheesi** (the same family as Ludo
and Tock). "Piton" is Québec slang for the token/pawn (*pion*).

Built with **Vite + React + TypeScript**, board rendered as **SVG**. No game
engine framework — the game is turn-based discrete state, not real-time.

- **What & why, architecture, goals** → [docs/architecture.md](docs/architecture.md)
- **Game lineage + canonical rules + house-rules** → [docs/rules-and-lineage.md](docs/rules-and-lineage.md)
- **Current status + next steps** → [docs/STATUS.md](docs/STATUS.md)

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm test         # engine unit tests (Vitest)
```

## Layout

```
src/
  engine/   pure TypeScript rules core — no React/DOM. Fully unit-testable.
  ui/       React + SVG presentation. Renders engine state, sends back intents.
  App.tsx   shell
```
