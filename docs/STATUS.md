# jeu-de-piton — status

> **Fast-moving tracker — skim at session start.** Holds **only the backlog + live
> open questions** (the project's session-scoped state). Everything else — overview,
> capabilities, commands, *why* — has its one home in the
> [routing map](../CLAUDE.md); a line that belongs there is misfiled, so move it and
> leave nothing here. Ship a backlog item ⇒ delete it (git is the changelog).
> `/mnx-session-wrap` keeps this tidy each session.

## Backlog — unscheduled; pick the next task with the user
Nothing is pre-committed for next session. The game is mature, so future work is
most likely **UI polish** or a **rule-variant layer** — but a new idea may surface,
so decide with the user at the start of each session. This section names a
*specific* next task **only** when we've explicitly agreed one; otherwise it's just
the candidate list below, in no particular order:

- **2v2 teams — UI half (engine half SHIPPED).** The engine team-model is done and
  tested: `GameState.teams` (seat→team id; identity = free-for-all, so the solo
  rules are the special case), team-aware ally/capture/blocking, `movingSeat` (a
  seat all-HOME plays its partner's pitons — the tempo advantage), and a
  team-based win. `createGame` + the `newGame` action already take a `teams` arg
  (default identity), so the engine is wired and waiting. **Remaining (next
  session) is pure UI:** a **2v2 button** in New Game (right of the player-count
  buttons; teams are seats 1&3 vs 2&4) + **"Team A"/"Team B"** headers grouping the
  seat rows; the **log** (simple — group by team); and the **Stats** window —
  reorder columns so the winning team's two members come first (left→right) with a
  **vertical separator** between teams. Win-display reads the winning *team* from
  `winner` (the moving seat's colour) via `teams`. Confirmed design: partners are
  fully one side (no capture, no passing each other); the finished-partner tempo
  boost is intended.
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
  (`OptionsMenu`) ship; rows launch New Game, the Game stats window, the Game log
  window, and the Dev panel. Optional: tune the
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

## Open questions
- **None open.** All cabin rules are confirmed and shipped; the full ruleset (incl.
  the resolved items) lives in [rules-and-lineage.md](rules-and-lineage.md). New
  open design questions — rules or otherwise — go here until resolved.
