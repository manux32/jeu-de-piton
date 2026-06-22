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
title — a small **"Pitons" logo wordmark** (the "i" is a pawn, the "o" a die) — the
Options gear button, the centre die over HOME, per-nest notices, and a
whose-turn corner wash. (The full-board modals — the win popup, the New Game
window, the Options menu, and the Game stats scoreboard — sit *over* the board as
DOM overlays, not inside the SVG, so they centre reliably on iOS; each is sized by
one `*_WINDOW_SIZE` knob.) The
cabin ruleset is shipped end-to-end, including the start-square
exception (engine `legalMoves` *and* the visual ownership arrows). **A single
Options gear button is the one entry to every game option** (`OptionsMenu`): it
opens a small window whose rows launch New Game, the **Game stats** window, and the
Dev panel — future options add rows here. **A per-game stats scoreboard**
(`StatsModal`) tallies each seat's captures (split regular vs the start-square
exception), pitons lost (captured / on an enemy's start / the triple-6 penalty),
and 6s rolled — a players-as-columns table ranked by pitons home, opened from the
win popup or the Options row; the tally is accrued UI-side by observing moves (the
engine stays pure). **New Game opens
a setup window over the board** (`NewGameModal`) to pick player count, each seat's
**human/AI**, each seat's **colour** (a dropdown picker; kept distinct — picking one
a seat holds swaps them), and **each AI seat's difficulty** (an Easy/Hard dropdown).
Nothing applies until "Start game". Seats you don't control play themselves via a
swappable **`Strategy`** — a pure third layer in [`src/ai/`](../src/ai/) chosen
per-seat through an id→strategy seam (`STRATEGY_BY_ID`; labels in `strings.ts`);
default you're seat 0, the rest AI on Hard; all-AI is allowed — watch it play.
Player colours run beyond the four seat defaults — the engine `PlayerColor` union +
an `ALL_PLAYER_COLORS` pickable palette currently add **orange** and **purple**
(black/white wait on a render tweak — see backlog). Each seat keeps a **turn log** pinned in its nest until its turn comes round
again: a stack of rows, one per sub-turn, each showing the die rolled and what it
did — moves are described in words (left the nest, reached the home lane, got one
home, reached a safe square, left the start square, a plain move, plus captures /
extra rolls / forfeits / the streak penalty / the win). So a 6-streak shows
several rows and, before you roll, you can read everything everyone did since.
**Move trajectories** can be drawn as dashed, track-following lines in each piton's
colour: a live preview from every movable piton to where it would land, and a
persisted history of the moves played since your last turn (a dot marks each
origin) that clears when your turn returns, like the notices. Each seat rides its
own parallel lane so overlapping routes don't draw on top of each other. The two
features are independently toggleable — theme defaults, live-switchable in the Dev
panel's General section. All
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

- **Rule-variant layer.** The cabin ruleset ships as a `Ruleset` and the engine
  is variant-agnostic *for single-die variants* (Ludo etc.) — those are close to a
  config-only drop-in (+ a ruleset picker in New Game, + board art if the geometry
  differs). **Canonical Parcheesi is the exception**: it needs two dice, which the
  turn engine doesn't model, making it a multi-session structural task, not a
  drop-in. Full scope + the variant landscape → [rule-variants.md](rule-variants.md).
- **More player colours (black + white).** The per-seat colour picker + extra
  colours already ship (orange/purple added to the `PlayerColor` union + the
  `ALL_PLAYER_COLORS` palette). `black` and `white` are the two held back: each
  collides with a near-its-own-colour board element (black on the dark safe squares;
  white on the near-white nest holes + die face), so each needs a small **render
  tweak** first (e.g. a contrasting outline for black; a non-white nest-hole/die
  treatment, or outline, for white) before adding it to the union + palette. Purely
  a rendering/look task — nothing to do with rules.
- **Finish the knob-set audit.** Squares + notices were audited; the **die, New
  Game button, and start arrows** remain — refine their `theme.ts` knobs as needed
  (the `knob-design-user-intent` memory holds the principle). Not blocking.
  *Notice follow-ons — mostly addressed this round:* compound rows that clipped
  horizontally are fixed — finished sub-turns are kept to one line ("Roll again"
  now rides the live prompt, not the row), and the live row is set apart (its text
  centres on the nest; its die shows a big "!" via the `NOTICE_DIE_GLYPH_*` knobs).
  Still optional: the `current` vs `previous` per-role *text* knobs (italic / size /
  weight) — the CSS classes exist, so it's adding knobs + forwarding, no render change.
- **Fuller docs drift/redundancy sweep.** A systematic pass over the docs not
  recently touched ([architecture.md](architecture.md),
  [rules-and-lineage.md](rules-and-lineage.md)) for pre-existing staleness and
  cross-doc redundancy — a content-excavation task best started fresh, not bolted
  onto a session tail.
- **New Game UI — tweaks + extensions.** The per-seat setup window ships (count,
  human/AI, **colour dropdown**, **AI-difficulty dropdown**, Cancel/Start), reached
  from the Options menu; seat rows are a left-packed 3-column grid and the colour
  pills size via `SETUP_SWATCH_SIZE` / `SETUP_PALETTE_SWATCH_SIZE`. Remaining, all
  optional: tune the look via `SETUP_WINDOW_SIZE` (overall size) and the `setup-*`
  styles; maybe label each seat with its **board corner** (deferred — corners shift
  with player count). The **ruleset picker** (per *Rule-variant layer* above) is the
  natural next control to add — either to the New Game window or as its own Options
  row.
- **Options menu — extensions.** The single gear button + the Options window
  (`OptionsMenu`) ship; rows launch New Game, the Game stats window, and the Dev
  panel. Optional: tune the
  look via `OPTIONS_WINDOW_SIZE` + the `options-*` styles; the gear button reuses the
  `CTRL_*` knobs. Future options (e.g. a ruleset picker, sound/animation toggles)
  drop in as one more row + a label in `strings.OPTIONS`.
- **Convert the title wordmark to baked glyphs (mobile parity).** The die labels
  ("Roll", "!") are now pre-traced SVG `<path>` geometry baked from Nunito ExtraBold
  (`src/ui/glyphs.ts`, generated by `tools/gen-glyphs.mjs`) — so they render
  identically on every platform instead of via the system font, which substituted a
  different face on iOS and drifted the centring. The **title's plain letters**
  (P/t/n/s in `BoardTitle`) are *still* live `<text>` in the system font, so they
  keep drifting subtly PC↔iPad. Converting them is the same pipeline (add the chars
  to the generator's `RUNS`), **but** its hand-drawn pawn/die icons were tuned to sit
  beside system-font letters, so a font swap needs the icon proportions + kerning
  re-tuned by eye — an interactive design pass. The user likes the current PC title,
  so this is deferred, not urgent.
- **Reorganize `theme.ts` by visual element.** Today the file is grouped **by knob
  type** at the top level — one big `COLOURS` section, one `MOTION`, one `GEOMETRY` —
  so an element's colour sits far from its size/position (worst case: `TITLE_FILL` is
  up in `COLOURS` while `TITLE_SIZE/X/Y` are down in `GEOMETRY`). The user prefers
  grouping **by visual element**: one block per element (Title, Gear button, Die,
  Squares, Nests, Notices, …) holding that element's colour + size + position +
  motion together. (The gear button is already element-grouped — use it as the
  template.) Keep a small **"Board-wide / shared"** section at the top for the few
  knobs no single element owns (`BOARD_BG`, `PLAYER_HEX`, the `tint()` helper). It's
  a big but **purely mechanical** pass (~400 lines, cut-and-paste of existing values,
  no behaviour change) — best done as its own focused session. Principle behind it:
  the `knob-design-user-intent` memory.
- **Smarter AI strategy.** The chosen near-term path is to **grow `greedyStrategy`
  itself in baby steps** — tweak the priority ladder and let each tier weigh more
  factors — playtesting between changes, rather than jumping straight to a wholesale
  replacement. (Latest step: a one-ply *dodge a capture* tier plus an un-clog-the-lane
  tier — the ladder now does shallow lookahead via the engine's own `legalMoves`; see
  [decisions.md](decisions.md). *Worth a playtest:* un-clog-the-lane outranks
  dodge, so the AI advances a safe lane piton even while a track piton sits in
  danger — by design, but watch how it feels.) A richer rung might fold in blocking, or
  racing the leader more deliberately; a fundamentally different brain (e.g. shallow
  lookahead) is still a clean drop-in later via the swappable-policy seam
  (`src/ai/strategy.ts`), no engine/UI change — and that seam is now player-facing:
  the New Game window picks a strategy per AI seat by id (`STRATEGY_BY_ID`), so a new
  brain is registered there + given a label in `strings.ts`. The current rungs are
  surfaced as **Easy** (`randomStrategy`) / **Hard** (`greedyStrategy`).

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
  board states to validate UI fixes, **live-tune the motion timings** (die
  spin/hold, AI pacing) via a master multiplier, and **toggle the move-trajectory
  features** (a **General** section at the top) — how it works → [dev-tooling.md](dev-tooling.md).
  (A proper on/off gate is a later nicety; for now it's always on, incl. publicly.)
- Eyeball a render **without** the dev server via a throwaway Vitest →
  `references/` SVG → `scripts/render-board.mjs` (details in [dev-tooling.md](dev-tooling.md)).
- **Deploy:** push `main` → the GitHub Action builds + publishes to Pages (live URL
  above). PWA icons regenerate from `public/favicon.svg` via `npm run make:icons`.
