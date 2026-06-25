# The board model — engine indices ↔ screen, and how play moves on it

> **Read this before touching board geometry or `src/ui/` layout.** It is the
> canonical bridge between the engine's *abstract* board (plain integer indices,
> no pixels) and the *screen* layout. The rule details live in
> [rules-and-lineage.md](rules-and-lineage.md); this doc is about **where things
> sit and how a piton travels across them**. Visual ground truth:
> [`../references/board-render.png`](../references/board-render.png) (rasterize
> via `npm run render:board`).

## Two layers, one rule: the engine owns no screen geometry
- **Engine** ([`src/engine/`](../src/engine/)) knows only abstract positions:
  a track square `0…67`, a home-lane `step 0…6` per player, `nest`, `finished`.
  It never knows pixels, screen direction, or which arm is "up".
- **UI** ([`src/ui/layout.ts`](../src/ui/layout.ts)) is the **single** place that
  maps those indices to screen cells (`buildLayout`). Everything visual reads
  from it. If a position looks wrong on screen, the bug is here, not in the
  engine.

Travel is **counter-clockwise on screen**; the engine just advances by
*increasing* index. Direction is purely a UI concern.

## Engine indexing — the progress-coordinate model (PINNED)
Source of truth: [`src/engine/board.ts`](../src/engine/board.ts) + its tests; this
is the prose summary. Each piton's **whole journey is one monotonic integer line**
(a *progress* coordinate):

- `0 … P−1` — on the shared track (`P = trackPathLength`).
- `P … P+L−1` — in its private home lane (`L = laneLength`).
- `P+L` — HOME (`finished`).

The absolute track square is `(entryIndex + progress) mod trackLength`, so
cross-player **captures fall out of equal absolute squares** with no special case.
`progressOf` ↔ `positionAt` are inverses (the latter maps a progress value to a
track square, lane cell, `finished`, or `null` for an overshoot — which is exactly
"not a legal move").

Pinned values (2026-06-12): entry seats `{0, 17, 34, 51}` (2P → opposite arms
`{0, 34}`); `trackLength: 68`, `laneLength: 7`, `pitonsPerPlayer: 4`;
`homeEntryOffset: 4` → `trackPathLength: 64`, i.e. a player's lane mouth is 5
squares before its own start. The 12 safe squares are pinned below.

## The grid
The cabin board is the standard Selchow & Righter Parcheesi cross. It drops onto
a square **logical** grid (cell units, not pixels — cells *render* at non-uniform
sizes for the rectangular look; see "Rectangular cells — DONE" below):

- `sideLen = (trackLength/4 − 1)/2 = 8` — cells along one arm.
- `gridSize = 2·sideLen + 3 = 19` — the 19×19 grid.
- Each arm = **3 columns**: two outer **track** columns + a middle **home-lane**
  column. Four corner regions hold the **nests**; the centre 3×3 is **HOME**.

## One arm, labelled (schematic — exact indices in `layout.ts`/tests)
Drawn as the seated player sees it: they sit at the **tip** (bottom), HOME is
inward (top). "Right column" = the player's right hand.

```
                     ┌────────┐
                     │  HOME  │           centre / finish
        ┌──────┬──────────────┬──────┐
 pos 7  │ trk  │    lane 6    │ trk  │    inner (nearest HOME)
 pos 6  │ trk  │    lane 5    │ trk  │
 pos 5  │ trk  │    lane 4    │ trk  │
 pos 4  │ MID● │    lane 3    │ STRT●│    STRT● = this player's start (right col)
 pos 3  │ trk  │    lane 2    │ trk  │    MID●  = a mid-arm safe (left col, see note)
 pos 2  │ trk  │    lane 1    │ trk  │
 pos 1  │ trk  │    lane 0    │ trk  │    lane step 0 (mouth-adjacent)
 pos 0  │ trk  │    MOUTH●    │ trk  │    tip row: MOUTH (tip-middle), flanked by track
        └──────┴──────────────┴──────┘
   Each side column has 8 cells (pos 0 = tip … pos 7 = inner). The middle column
   is also 8: the MOUTH (a safe *track* square) at the tip + the 7 private lane
   cells (step 0 nearest the mouth … step 6 nearest HOME). START is ~5th from the
   tip on the player's RIGHT column; the nest is in the corner on that side.
```

Key spatial facts a renderer must honour (all four were mistakes once — see
"Don't drift" below):

- The home-lane **mouth is the tip-middle cell** — the outermost cell of the
  middle column. It is a **safe track square**, *not* one of the 7 private lane
  cells. A piton there is immune to capture (safe square) but is **not** in the
  fully-private lane (enemies still pass through the tip on the shared track).
- The **start / nest-exit** square is on the player's **right** side column
  (a few cells up from the tip), and is safe — but **only to other players**: its
  owner may exit the nest onto it to capture an enemy parked there (the
  start-square exception, see rules-and-lineage.md). It's marked with a colored
  **ownership arrow** (below).
- A player's **nest** sits in the board corner on the **same side as their start
  column** (the corner the entry arrow comes from), **centred in that corner
  quadrant** (the square board region between the two arms). Because the quadrant
  centre falls on a *cell boundary*, the 2×2 of nest holes is positioned in
  **render units** (`BoardLayout.nestSlots` / `nestCentres`), not integer cells —
  see the 2026-06-13 decision-log entry.

## Safe squares — 12, three per arm
From the ruleset (pinned, see rules-and-lineage.md):
`safeSquares = [0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63]`.

For a player whose start is `S ∈ {0,17,34,51}`, the three safe squares around
their arm are:

| Safe square | Index | Where it sits | Note |
| --- | --- | --- | --- |
| **start** | `S + 0` | own arm, right side column | nest-exit; the colored entry |
| **mid-arm** | `S + 7` | the **next** arm's near side column | — |
| **home-mouth** | `S + 12` | the **next** arm's tip-middle | = that next player's lane MOUTH |

Only `S + 0` is on the player's own arm; `S + 7` and `S + 12` land on the next
(CCW) arm. So a player's **own** mouth is `S − 5` (≡ `S + 63`) — some *other*
player's `S + 12` — and the mid-arm safe you *see* on a given arm's left column
is the **previous** player's `+7`. Net: **each arm shows three safe cells** — its
own mouth (tip-middle), its player's start (right column), and one neighbour's
mid-arm (left column). The mouth being `start − 5` is the engine's
`homeEntryOffset: 4` (`trackPathLength: 64`) seen on the board.

Rendered as a **black fill** (not blue — that would clash with blue players'
home-lane cells). The four **start** squares additionally carry an **ownership
arrow** — a triangle in the owner's colour, laid *over* the black fill — that does
double duty: it marks whose square it is (only that player can capture on it, per
the start-square exception) and, by pointing the way play travels, shows the
direction of flow. The arrow is axis-aligned (never tilted) with its base on the
trailing edge; shape via the `ARROW_*` knobs in `src/ui/Board.tsx`.

## How a piton travels (the spatial walkthrough)
1. Starts in its **nest** (corner). A roll of **5** moves it onto its **start**
   square (`S`).
2. Travels **counter-clockwise** around the shared 68-square track (index
   increasing), passing other arms' starts/mouths.
3. After ~a full lap it reaches its **own mouth** (`S − 5`, the tip-middle of its
   arm) and turns into its **private 7-cell home lane** (`step 0 → 6`).
4. Reaches **HOME** by **exact** count (an overshoot is simply not a legal move).

Capture/blocking happen on the **shared track** only; the private lane is immune,
and safe squares can't be captured on and block passage — the lone exception being
that a player may capture an enemy on the player's **own** start square (see
rules-and-lineage.md; implemented in the engine, entry-only). The "6 moves 12", the
3rd-six penalty, etc. are rule details — see rules-and-lineage.md, not here.

## Seating convention (UI choice, not a rule)
`buildLayout` splits its ring offset into two named constants:
- `SAFE_PHASE` — aligns indices to cells (mouths on tip-middles, starts up the
  right column, safe marks on true cells). **Don't change without re-validating
  against the reference render.**
- `SEAT_ROTATION` — a whole-arm rotation (board is 4-fold symmetric, so this
  keeps every safe square / lane / mouth in place but changes *which arm each
  player sits on*). Currently `3`, which seats **player 0 at South**.

Consequences (intentional):
- **Player 0 always sits at the South arm.** A future solo player (vs. AI) is
  player 0 → faces up the board from the bottom.
- A **2-player** game (entries `{0, 34}`) is therefore **North–South**, not
  sideways.
- Colors map to arms in seat order — the default seat→colour order is
  `PLAYER_COLORS` (`src/engine/state.ts`), so seat 0 (South) takes the first
  entry. New Game lets each player **choose** their colour per seat (shipped).

## Don't drift — mistakes made and corrected (2026-06-12)
- ❌ Mouth drawn on a **side column** → ✅ it is the **tip-middle** cell.
- ❌ Safe squares **rotated/offset** along the track → ✅ pinned by `SAFE_PHASE`
  (= 13 for this board); spacing was right, the whole sequence was off.
- ❌ Nest on the **wrong (trailing) corner** → ✅ on the **start-column** corner.
- ❌ 2-player seated **East–West** → ✅ **North–South** via `SEAT_ROTATION`.
- ❌ Safe squares blue / start square color-tinted (read as a lane entry) → ✅
  safe squares **black**, no start tint.

## How to verify a layout change without the dev server
The fast loop used to validate this model: a throwaway Vitest that builds the
layout (or `renderToStaticMarkup`s `<GameBoard>` with a doctored `GameState`) to
an SVG under `references/`, then `node scripts/render-board.mjs <in.svg>
<out.png>`; compare against `board-render.png`. Delete the artifacts after.

## Rectangular cells — DONE (2026-06-12)
The reference draws movement cells as rectangles whose long side runs **across**
each arm (wider perpendicular to travel than along it), which is what makes the
arms read as chunky bands rather than thin spikes. Implemented as a **render-only**
change: the logical grid stays uniform 19×19, but `buildLayout` now emits an
`edges[]` array of cumulative cell boundaries (non-uniform, palindromic — the
three central rows/columns, i.e. each arm's width plus HOME, stretched by
`SQUARE_WIDTH`). Renderers map a logical `{col,row}` to pixels through
`cellStart`/`cellSize`/`cellMid` instead of assuming unit cells. Because the same
spacing drives both axes, the south arm's cells come out wide-and-short and the
east arm's identical cells tall-and-narrow automatically — the 90° rotation model
carries the orientation. Engine untouched. `SQUARE_WIDTH` (currently 1.9) is
the single knob: 1 = the old squares, higher = chunkier arms. It lives in
`ui/theme.ts` (a user-facing look knob), imported by `layout.ts` — it's the one
board-*shape* constant exposed for tweaking; the pinned topology constants
(`SAFE_PHASE` / `SEAT_ROTATION`) stay in `layout.ts`. *(Renamed from
`ARM_WIDTH_SCALE` and moved out of `layout.ts` on 2026-06-14.)*
