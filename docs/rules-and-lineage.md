# Lineage & rules

## Where this game comes from

The cabin game is a folk descendant of **Pachisi**, the ancient Indian
cross-and-circle race game, by way of the American brand **Parcheesi**.

```
Pachisi (India, ~4th c. CE)            cross-shaped cloth board; cowrie shells, not dice
  └─ Parcheesi (US, Selchow & Righter) switched to DICE; 4 pawns; roll a 5 to enter  ← our branch
       ├─ Ludo (England, 1896)         simplified
       ├─ Petits Chevaux (France)      simplified
       └─ Tock / Tuck / Pock (Québec)  CARD-based; marbles in a drilled wooden board
```

A vintage **Selchow & Righter Parcheesi** board (the center cartouche reads
"HOME") is exactly the layout we hand-drew at the cabin: four corner circles =
the players' start nests, the colored arms = the tracks, the central HOME = the
goal.

Our family's version sits on the **dice / Parcheesi branch**, *not* the
card-based Tock branch — even though Tock is the more famous Québec one. The
"roll a 5 to bring a piton out" rule is the tell. "Piton" is just Québec slang
for *pion* / *jeton* (token). Rules have drifted across generations and
families, so there's no single official "jeu de piton."

### Sources
- [Pachisi — Wikipedia](https://en.wikipedia.org/wiki/Pachisi)
- [Parcheesi — Wikipedia](https://en.wikipedia.org/wiki/Parcheesi)
- [Tock — Wikipedia](https://en.wikipedia.org/wiki/Tock)
- [piton — dictionnaire québécois](https://www.je-parle-quebecois.com/lexique/definition/piton.html)

## Canonical Parcheesi rules (the family reference)

- 2–4 players, **4 pawns** each, starting in their nest.
- Two dice. **Roll a 5 (or two dice summing to 5) to move a pawn out** of the
  nest onto its start square.
- Move pawns clockwise around the shared track, then up your own home column to
  HOME at the center.
- **Capture:** landing exactly on a square occupied by a single opponent pawn
  sends that pawn back to its nest.
- **Safe squares:** marked squares can't be captured on.
- **Doubles** grant another turn; three doubles in a row can be penalized
  (variant-dependent).
- First to get **all pawns HOME** wins.

Canonical Parcheesi is the family reference. The engine actually encodes the
**cabin variant (jeu de piton) first** (see below and
[architecture.md](architecture.md)); canonical could be added later as a second
`Ruleset`.

## Cabin house rules (jeu de piton) — CONFIRMED

Collected 2026-06-11 from the friend who taught the game; his version comes from
his own family lineage. This is the **primary `Ruleset` the engine implements**
(built first — see [architecture.md](architecture.md)). Where it diverges from
canonical:

| Aspect | Canonical Parcheesi | jeu de piton (ours) |
| --- | --- | --- |
| Pitons per player | 4 | **4** (confirmed) |
| Dice | two | **one** |
| Direction of travel | clockwise | **counter-clockwise** |
| Entry roll | roll a 5 | roll a 5 *(unchanged)* |
| Extra turn | doubles | **roll a 6** |
| The 6 | move pips rolled | **moves 12** (doubled value), *and* grants another turn |
| Repeated bonus | 3 doubles penalized | **3rd consecutive 6 is penalized** (see below) |
| Stacking | blockades of 2 allowed | **never two pitons on one square** |
| Passing an ally | allowed | **forbidden** — cannot move past your own piton |
| Passing an enemy | allowed | allowed *(unless on a safe square — see below)* |
| Safe squares | immune to capture | immune to capture **and block all passage** — nobody may move past an occupied safe square *(exception: a player's own **start** square is not safe **to them** — see below)* |
| Entering HOME | exact count | **exact count required** |
| Moving is | mandatory if able | **mandatory if able** (forced move) |

### Forced move
You must always move *a* piton by the number rolled if any legal move exists —
playing is never optional. Consequence for HOME: a roll that would overshoot
HOME for one piton is simply not a legal move for that piton, but if **another**
piton can legally use the number, you are forced to play it there instead. A turn
is only forfeited when the roll has **no** legal move at all.

### The 6 and its penalty
- Rolling a **6** moves the chosen piton **12** squares and grants **another roll**.
- Rolling **three 6s in a row** is penalized: the third 6 is **not played**.
  Instead the player **loses the piton closest to entering its home column**
  (the most-advanced piton still out on the shared track), sending it back to the
  nest.
- A piton **already in its home column is fully protected** — it can never be the
  one lost to this penalty (nor, presumably, captured).

### Movement & blocking (the mechanically significant part)
Because of the passing rules, a move is **not** just "land on the destination" —
the **whole path matters**:
- You may not move a piton *past or onto* one of **your own** pitons.
- You may move *past* an enemy piton, **unless** that enemy sits on a **safe
  square**, which blocks everyone.
- No square may ever hold two pitons, so a destination occupied by an ally is
  illegal, and a destination occupied by a lone enemy is a **capture** (unless
  it's a safe square — but see the start-square exception next).

### Start-square exception — safe *only for the owner* (CONFIRMED 2026-06-13)
The one crack in "safe squares are immune to everyone": a **start/entry** square
is safe to everyone **except the player who owns it**. If an enemy is parked on
your start square, you may bring a piton **out of the nest** (on a 5) straight
onto it and **capture** the enemy — the square neither blocks your entry nor
shields the enemy *from you*. It still shields that enemy from **every other**
player, and the other two safe kinds (mid-arm +7, home-mouth +12) stay
universally safe.

The board marks this with the per-start **ownership arrow** (the colour triangle,
see [board-model.md](board-model.md)), and the **engine implements it**:
`legalMoves` offers a capturing entry move when a lone enemy sits on the player's
own start. The exception is **entry-only** — the owner never re-touches its own
start via normal movement (`homeEntryOffset` turns it into the home lane before a
lap wraps round), so `resolveLanding` rightly keeps every safe square universally
immune to *movement*-landings. (See the 2026-06-13 [decisions.md](decisions.md)
entry for that scoping.)

### Board geometry — CONFIRMED
The cabin board matches the standard **Selchow & Righter Parcheesi** layout
(confirmed 2026-06-11 from a photo of the board). A cross of four arms, each arm
**3 columns × 8 cells**; the two outer columns of every arm form the shared
track, the middle column (red runway) is that player's private home lane.

- **Main track: 68 squares** (4 arms × 16 outer-column cells + 4 outer-corner
  connector squares).
- **Home lanes: 7 cells each**, ×4, leading into the centre.
- **HOME**: the centre goal.
- **Safe squares: 12** — the circle-marked cells. Three per arm, repeating every
  17 squares: the **start/entry** square (offset 0), a **mid-arm** safe (+7), and
  the **home-lane mouth** (+12, which is the *next* player's lane entry). A
  player's own **entry/start square is safe to everyone *but its owner*** — see the
  start-square exception above.
- **Travel is counter-clockwise**; you start on your **own** arm and lap back to
  enter your home lane there. The lane mouth sits **5 squares before your start**
  (`homeEntryOffset: 4`, `trackPathLength: 64`).

Pinned indices (2026-06-12, from the board + the friend's confirmation —
counts of 7 then 5 from the start, and a 12 landing on the next player's lane
entry): entries `{0, 17, 34, 51}` each offset by `{0, 7, 12}`, giving

```
safeSquares = [0, 7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63]
  starts      {0, 17, 34, 51}
  mid-arms    {7, 24, 41, 58}
  home-mouths {12, 29, 46, 63}
```

So the concrete `Ruleset` numbers are `trackLength: 68`, `laneLength: 7`,
`homeEntryOffset: 4`, `pitonsPerPlayer: 4`, and the 12 `safeSquares` above.

### No bonuses beyond the 6 — CONFIRMED (2026-06-12)
The cabin version is leaner than canonical Parcheesi — it carries **none** of the
brand's bonus-move rules:
- **Capture** sends the enemy piton to its nest and nothing more — no bonus move
  or extra roll for the capturer.
- **Reaching HOME** earns no bonus move.
- **Bringing a piton out on a 5** earns no extra roll (only a 6 does).
- **Entry is not forced**: rolling a 5 with a piton in the nest *and* another
  that can move lets you choose either — you only *must* enter if entry is your
  one legal move (the general forced-move rule).

### Still open / to confirm later
- ~~Exact track indices of the 12 safe squares + 4 entry squares~~ — **PINNED
  2026-06-12** (see the indices above; `homeEntryOffset: 4` confirmed too).
- ~~Capture specifics **on** a safe/entry square~~ — **RESOLVED 2026-06-12** in
  the engine (rung 4): an enemy on a safe square can't be landed on, so capture
  there never arises. Confirm with real play if a surprise turns up.
- ~~Enemy on your start square~~ — **RESOLVED 2026-06-13** (the friend) **+ fully
  shipped**: it's an **exception** — you *may* capture it by exiting the nest onto
  your start; a start square is safe only to non-owners (see "Start-square
  exception" above). Both the visual cue (ownership arrows) **and the engine**
  (`legalMoves`, entry-only) are now done.
- ~~Unplayable bonus 6~~ — **RESOLVED 2026-06-12** (confirmed with the friend):
  an unplayable 6 still grants the bonus roll **and still counts toward the
  three-in-a-row** — so three consecutive 6s trip the lose-leading penalty even
  if none was playable. Encoded in `applyRoll` (a non-6 with no move still
  forfeits as before).

## 2v2 partnership mode — CONFIRMED (2026-06-24; two modes 2026-06-25)

A team variant of the cabin rules: a 4-player game where the four seats form two
teams of two. The base rules above are unchanged; team play only changes who is an
ally, who keeps playing, and when the game ends. There are **two modes**, offered
as two separate New Game buttons — they share everything below *except* how
partners interact during normal play:

- **Teams.** Seats 1&3 are one team, seats 2&4 the other (partners sit on
  opposite arms — the colours already alternate around the board).
- **Finished-partner takeover (the tempo rule).** Once a player gets **all** their
  own pitons HOME, they keep taking their turns but spend them **moving their
  partner's** pitons. So while a team has one member home and one still running,
  the team gets **two rolls per lap** on its remaining pitons — a deliberate,
  significant closing advantage. (Both modes.)
- **Win.** The game ends when **every piton of both members of a team** is HOME.
  The first team to do so wins. (Both modes.)

### "2v2" (the official mode) — CONFIRMED 2026-06-25 (the friend)
Partners play an **almost-normal game against each other** until one finishes:

- A teammate's piton is treated **like an enemy** for movement — you **may capture
  it** and **may pass through it**, exactly as with an opponent.
- The one exception is the universal safe-square rule: a teammate parked **on a
  safe square** blocks you (and is immune), the same as any enemy there — so "you
  can't pass a partner on a safe square" falls out for free.
- This lasts until a partner gets all their own pitons HOME; from then the
  takeover rule above applies and the two cooperate (the surviving player moves the
  finished one's turns on the team's behalf).
- **Forced capture of your own partner is possible.** With captures allowed and the
  base **forced-move rule** (you must move if any legal move exists), a player whose
  *only* legal move captures their own teammate is **forced to take it** — human and
  AI alike. The AI avoids a teammate-capture whenever it has any other legal move,
  but neither can pass the turn to dodge it.

### "2v2 friendly" — CONFIRMED 2026-06-24 (the original mode)
Partners are **fully one side** the whole game. A teammate's piton counts exactly
like your own: you **cannot capture it**, **cannot pass through or land on it**, and
it **blocks** you the same way your own pitons do.

Implementation (engine 2026-06-24; second mode 2026-06-25; UI progress in
[STATUS](STATUS.md)): a per-seat `GameState.teams` array (seat → team id) plus a
`GameState.partnersAreAllies` boolean (the mode: `true` = friendly). A free-for-all
is the special case where each seat is its own team, so all the solo rules above are
unchanged regardless of the flag. The takeover seam (`movingSeat`) and the
movement-vs-team split (`movementAlly` vs `sameTeam`) are documented in
`src/engine/moves.ts`. The AI's teammate-capture avoidance lives in
`src/ai/strategy.ts` (`greedyStrategy`).
