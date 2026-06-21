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
opponents** — with **all persistent chrome rendered on the board SVG**, no HUD: the
title, the New Game button, the centre die over HOME, per-nest notices, and a
whose-turn corner wash. (The two full-board modals — the win popup and the New Game
window — sit *over* the board as DOM overlays, not inside the SVG, so they centre
reliably on iOS; each is sized by one `*_WINDOW_SIZE` knob.) The cabin ruleset is shipped end-to-end, including the start-square
exception (engine `legalMoves` *and* the visual ownership arrows). **New Game opens
a setup window over the board** (`NewGameModal`) to pick player count, each seat's
**human/AI**, and each seat's **colour** (kept distinct — picking one a seat holds
swaps them); nothing applies until "Start game". Seats you don't control play
themselves via a swappable **`Strategy`** — a pure third layer in
[`src/ai/`](../src/ai/) (default: you're seat 0, the rest AI; all-AI is allowed —
watch it play). Each seat keeps a **turn log** pinned in its nest until its turn comes round
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
  fails to auto-pass — e.g. no legal move not forfeiting). The `forceNextTurn`
  recovery action still exists (reducer + engine, still dispatched from App), but
  its **"Skip turn" button was retired** with the New Game redesign — it'll return
  in the planned gear menu. The underlying defect is unfixed — chase a repro + root
  cause in a fresh session (start in the engine's `passTurn` / `applyRoll` /
  `applyMove` flow).
- **Fuller docs drift/redundancy sweep.** A systematic pass over the docs not
  recently touched ([architecture.md](architecture.md),
  [rules-and-lineage.md](rules-and-lineage.md)) for pre-existing staleness and
  cross-doc redundancy — a content-excavation task best started fresh, not bolted
  onto a session tail.
- **New Game UI — tweaks + extensions.** The per-seat setup window **shipped** this
  session (count, human/AI, colour, Cancel/Start). Remaining, all optional: tune the
  look via `SETUP_WINDOW_SIZE` (overall size) and the `setup-*` styles; maybe label
  each seat with its **board corner** (deferred — corners shift with player count);
  and the **gear menu** (its now-retired Skip-turn button is the first tenant — see
  the stuck-turn item; `forceNextTurn` is still wired from App). The **ruleset
  picker** (per *Rule-variant layer* above) is the natural next control to add here.
- **Smarter AI strategy.** The chosen near-term path is to **grow `greedyStrategy`
  itself in baby steps** — tweak the priority ladder and let each tier weigh more
  factors — playtesting between changes, rather than jumping straight to a wholesale
  replacement. (Latest step: the ladder now reasons about the start-square capture
  trap — see [decisions.md](decisions.md).) A richer rung might fold in blocking, or
  racing the leader more deliberately; a fundamentally different brain (e.g. shallow
  lookahead) is still a clean drop-in later via the swappable-policy seam
  (`src/ai/strategy.ts`), no engine/UI change.

## Open rule details
- **None open.** All cabin rules are confirmed and shipped as of 2026-06-13 — the
  start-square exception was the last (engine + visual). Full ruleset, including the
  resolved items, lives in [rules-and-lineage.md](rules-and-lineage.md).

## Dev quick-ref
- Basic commands (`npm install`/`dev`/`build`/`test`) → [README](../README.md#develop).
  Dev server is port 5173 — see [CLAUDE.md](../CLAUDE.md) session-start policy.
- **Dev scenario panel** now ships in **every** build (incl. the deployed PWA) so
  mobile/iPad issues can be driven from scenarios — opened from the **Dev** button on
  the board, right of New Game; panel chunk stays lazy. Lets you drop into doctored
  board states to validate UI fixes — how it works → [dev-tooling.md](dev-tooling.md).
  (A proper on/off gate is a later nicety; for now it's always on, incl. publicly.)
- Eyeball a render **without** the dev server via a throwaway Vitest →
  `references/` SVG → `scripts/render-board.mjs` (details in [dev-tooling.md](dev-tooling.md)).
- **Deploy:** push `main` → the GitHub Action builds + publishes to Pages (live URL
  above). PWA icons regenerate from `public/favicon.svg` via `npm run make:icons`.
