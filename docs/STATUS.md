# jeu-de-piton — status

> **Fast-moving tracker — skim at session start.** Keep it short: *current state,
> backlog, live open questions, dev quick-ref* only. Durable material lives
> elsewhere — don't let it pile up here:
> - architecture / vision → [architecture.md](architecture.md)
> - rules → [rules-and-lineage.md](rules-and-lineage.md) · board geometry →
>   [board-model.md](board-model.md) · dev rig → [dev-tooling.md](dev-tooling.md)
> - *why* a past choice was made → [decisions.md](decisions.md) (append new
>   decisions there, not here)
>
> Maintain: **"Where we are" is a date-free snapshot of the game's *current
> capabilities*** — no dates, no shipped-feature narration. A date there (grep
> `\d{4}-\d{2}-\d{2}`) means it's history that belongs in
> [decisions.md](decisions.md): move it and leave the single pointer. The dated
> *why* of how we got here is decisions.md's job, not this section's — that split
> is the one source-of-truth rule this file most often breaks. Likewise across the
> file: when a milestone closes or a fact gets pinned, move the detail to the right
> reference doc and leave only a one-line pointer; don't narrate finished work. And
> don't copy volatile/derived facts into prose: reference the command (`npm test`
> for the test count) or the code symbol (`CTRL_SCALE`, not its value), never a
> hand-kept copy that goes stale.

## Where we are
A **playable, polished** cross-and-circle race game — hot-seat **plus AI
opponents** — with **all chrome rendered on the board SVG**, no HUD: the title, the
New Game disclosure, the centre die over HOME, per-nest notices, and a whose-turn
corner wash. The cabin ruleset is shipped end-to-end, including the start-square
exception (engine `legalMoves` *and* the visual ownership arrows). Seats you don't
control play themselves via a swappable **`Strategy`** — a pure third layer in
[`src/ai/`](../src/ai/) (default: you're seat 0, the rest AI; `[]` makes every seat
AI). Each seat keeps a **turn log** pinned in its nest until its turn comes round
again: a stack of rows, one per sub-turn, each showing the die rolled and what it
did — moves are described in words (left the nest, reached the home lane, got one
home, reached a safe square, left the start square, a plain move, plus captures /
extra rolls / forfeits / the streak penalty / the win). So a 6-streak shows
several rows and, before you roll, you can read everything everyone did since. All
look-and-feel is knob-driven from [theme.ts](../src/ui/theme.ts) and all UI copy
from [strings.ts](../src/ui/strings.ts). Tests + build + lint are green (`npm test`
for the count) and `src/ui/` stays rules-free.

**Live on mobile** as an installable, offline-first PWA at
**https://manux32.github.io/jeu-de-piton/** — auto-deploys from `main`.

The engine/UI/AI layers + vision → [architecture.md](architecture.md); the
session-by-session *why* (newest first, incl. AI, persistent notices, and the
mobile/PWA caveats) → [decisions.md](decisions.md); shipped rules + board geometry →
[rules-and-lineage.md](rules-and-lineage.md) / [board-model.md](board-model.md).

## Backlog — unscheduled; pick the next task with the user
Nothing is pre-committed for next session. The game is mature, so future work is
most likely **UI polish** or a **rule-variant layer** — but a new idea may surface,
so decide with the user at the start of each session. This section names a
*specific* next task **only** when we've explicitly agreed one; otherwise it's just
the candidate list below, in no particular order:

- **Rule-variant layer.** The cabin ruleset already ships as a `Ruleset` and the
  engine is variant-agnostic, so this is mostly *proving* a second variant (e.g.
  canonical Parcheesi) drops in with **no UI change** — likely a ruleset picker
  beside the player-count pills in New Game. *Colour follow-ons in the same
  direction:* colours beyond 4 extend the engine `PlayerColor` union + the palette;
  letting players *choose* builds on the per-seat `players[].color` field that
  already exists (a picker that sets it with uniqueness; seat→colour stays default).
- **Finish the knob-set audit.** Squares + notices were audited; the **die, New
  Game button, and start arrows** remain — refine their `theme.ts` knobs as needed
  (the `knob-design-user-intent` memory holds the principle). Not blocking.
  *Notice follow-ons — mostly addressed this round:* compound rows that clipped
  horizontally are fixed — finished sub-turns are kept to one line ("Roll again"
  now rides the live prompt, not the row), and the live row is set apart (its text
  centres on the nest; its die shows a big "!" via the `NOTICE_DIE_GLYPH_*` knobs).
  Still optional: the `current` vs `previous` per-role *text* knobs (italic / size /
  weight) — the CSS classes exist, so it's adding knobs + forwarding, no render change.
- **Stuck-turn bug (repro unknown).** A real game once wedged on a player's turn —
  it could not be advanced by normal play and had to be unstuck manually. Not yet
  reproducible, so the cause is unknown (likely candidate: a state where the turn
  fails to auto-pass — e.g. no legal move not forfeiting). A **"Skip turn" escape
  hatch** now ships in the New Game picker (`forceNextTurn`) as a *recovery* for it,
  but the underlying defect is unfixed — chase a repro + root cause in a fresh
  session (start in the engine's `passTurn` / `applyRoll` / `applyMove` flow).
- **Fuller docs drift/redundancy sweep.** A systematic pass over the docs not
  recently touched ([architecture.md](architecture.md),
  [rules-and-lineage.md](rules-and-lineage.md)) for pre-existing staleness and
  cross-doc redundancy — a content-excavation task best started fresh, not bolted
  onto a session tail.
- **New Game UI v2 — per-seat setup.** Replace the count-only picker with a richer
  New Game panel that lets you set, per seat, whether it's **human or AI** and its
  **colour**. Builds on what already exists: `humanSeats` (App state, today fixed to
  `[0]`) and the per-seat `players[].color` field — so this is mostly UI. Folds in
  the colour-choice and (eventual) ruleset-picker follow-ons already noted under
  *Rule-variant layer* above; do them as one New Game redesign.
- **Smarter AI strategy.** A stronger `Strategy` beyond the current `greedyStrategy`
  priority ladder — e.g. weighing safety, blocking, racing the leader, or shallow
  lookahead. The swappable-policy seam (`src/ai/strategy.ts`) means this is a new
  strategy function dropped in, no engine/UI change.
- **Mobile (iPad) winner-popup bug.** On iPad the win popup renders very small and
  pinned to the top-left corner instead of centred/sized over the board. Likely a
  viewport/SVG-sizing issue specific to the mobile PWA layout — chase the win-popup
  render in [GameBoard.tsx](../src/ui/GameBoard.tsx).

## Open rule details
- **None open.** All cabin rules are confirmed and shipped as of 2026-06-13 — the
  start-square exception was the last (engine + visual). Full ruleset, including the
  resolved items, lives in [rules-and-lineage.md](rules-and-lineage.md).

## Dev quick-ref
- Basic commands (`npm install`/`dev`/`build`/`test`) → [README](../README.md#develop).
  Dev server is port 5173 — see [CLAUDE.md](../CLAUDE.md) session-start policy.
- **Dev scenario panel** (dev builds only) lets you drop into doctored board states
  to validate UI fixes — feature-complete; how it works → [dev-tooling.md](dev-tooling.md).
- Eyeball a render **without** the dev server via a throwaway Vitest →
  `references/` SVG → `scripts/render-board.mjs` (details in [dev-tooling.md](dev-tooling.md)).
- **Deploy:** push `main` → the GitHub Action builds + publishes to Pages (live URL
  above). PWA icons regenerate from `public/favicon.svg` via `npm run make:icons`.
