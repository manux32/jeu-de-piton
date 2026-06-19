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
> Maintain: when a milestone closes or a fact gets pinned, move the detail to the
> right reference doc and leave only a one-line pointer here. Don't narrate
> finished work — that's what [decisions.md](decisions.md) is for. And don't copy
> volatile/derived facts into prose: reference the command (`npm test` for the
> test count) or the code symbol (`CTRL_SCALE`, not its value), never a hand-kept
> copy that goes stale.

## Where we are
**Playable hot-seat, polished — and all chrome lives *on the board*.** Milestones
1–4 done (scaffold · engine core · SVG board · interaction loop) plus the M6
look-and-feel pass: the HUD/header are gone (title, New Game disclosure, dice, and
per-nest turn notices all render inside the board SVG), the board is uncapped and
fills the viewport, the dice sit dead-centre over HOME, and whose-turn shows as a
gently pulsing corner wash. The **start-square exception** is shipped end-to-end —
visual ownership arrows *and* engine (`legalMoves`, entry-only). Tests + build +
lint green (`npm test` for the count); `src/ui/` stays rules-free.

A **2026-06-17 QOL pass** refined the chrome further: nests are **circles** (not
die-like squares); the centre die shows a **"Roll" prompt** on your turn with the
last roll **relocated into the roller's nest** (and shown again on a roll-again 6);
a win raises a **tap-to-dismiss popup** over the board; capture notices **name the
captured colour** in its own colour; and all UI copy now lives in
[`strings.ts`](../src/ui/strings.ts). A **2026-06-18** follow-up fixed the garbled
`Capture · Roll again` notice, moved the notice box onto math-free knobs
(`NOTICE_WIDTH`, `NOTICE_MAX_LINES`), and recoloured notices by **whose nest** they
sit in (`NOTICE_CURRENT` vs `NOTICE_PREVIOUS`) rather than message kind. QOL
fine-tuning is ongoing (docs get a fuller cleanup once it settles). Per-item *why* →
[decisions.md](decisions.md).

**Basic AI opponents shipped (2026-06-19).** Seats you don't control play
themselves. The AI is a swappable **`Strategy`** — a pure third layer in
[`src/ai/`](../src/ai/), no UI/engine change to add one — and the shipped
`greedyStrategy` prioritises finish → capture → leave-nest → advance-leader. By
default you're seat 0 and the rest are AI (`humanSeats` in [App.tsx](../src/App.tsx));
setting it to `[]` makes every seat AI — a game that plays itself. Roll/move pacing
is theme-knob-tunable. The layer → [architecture.md](architecture.md); the *why* →
[decisions.md](decisions.md) (2026-06-19).

All look-and-feel is knob-driven from [theme.ts](../src/ui/theme.ts) (COLOURS /
MOTION / GEOMETRY) and all UI copy from [strings.ts](../src/ui/strings.ts) — the
control surface is complete (bar the knob-set audit; see Backlog).

**Live on mobile:** an installable, offline-first PWA (`vite-plugin-pwa`) ships to
GitHub Pages from `main` via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
— **https://manux32.github.io/jeu-de-piton/** (repo public; Pages source = GitHub
Actions). Add-to-Home-Screen on an iPad gives a fullscreen, offline hot-seat game;
the board is **full-bleed** and **portrait-locked** (iOS ignores the manifest lock,
so it relies on the device rotation lock). The *why* + the iOS cache/orientation
caveats are in [decisions.md](decisions.md) 2026-06-18.

The session-by-session *why* for all of the above is in [decisions.md](decisions.md)
(newest first); the shipped rule + geometry facts are in
[rules-and-lineage.md](rules-and-lineage.md) and [board-model.md](board-model.md).

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
- **Finish the knob-set audit.** Squares + notices were audited (notices reworked
  again 2026-06-18); the **die, New Game button, and start arrows** remain — refine
  their `theme.ts` knobs as needed (the `knob-design-user-intent` memory holds the
  principle). Not blocking. *Notice follow-on the user flagged:* per-role
  differentiation knobs (italic / size / weight for `current` vs `previous`) — the
  CSS classes already exist, so it's adding knobs + forwarding, no render change.
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
- **Persistent per-player notices + last-roll dice.** Today a player's notice and
  small "last roll" die clear when the next player acts. Instead keep each one
  **pinned in that player's nest until it's their turn again**, so before you roll
  you can see what every other player/AI did since your last turn. Touches the
  notice/last-roll lifecycle in [useGame.ts](../src/ui/useGame.ts) /
  [GameBoard.tsx](../src/ui/GameBoard.tsx).
- **Richer notice copy — describe the last action.** Add notice strings that say
  *what* a previous player actually did on their turn (e.g. moved a piton, entered,
  finished one), not just captures/passes. Pairs with the persistent-notices item
  above (the notices have to linger to be worth reading). New copy in
  [strings.ts](../src/ui/strings.ts).
- **Smarter AI strategy.** A stronger `Strategy` beyond the current `greedyStrategy`
  priority ladder — e.g. weighing safety, blocking, racing the leader, or shallow
  lookahead. The swappable-policy seam (`src/ai/strategy.ts`) means this is a new
  strategy function dropped in, no engine/UI change.

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
