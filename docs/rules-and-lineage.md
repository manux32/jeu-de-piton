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

## Canonical Parcheesi rules (the backbone we build first)

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

These are the defaults encoded as the first `Ruleset` in the engine.

## Cabin house rules (jeu de piton) — CONFIRMED

Collected 2026-06-11 from the friend who taught the game; his version comes from
his own family lineage. This is the **second `Ruleset` variant** the engine must
support alongside canonical Parcheesi. Where it diverges from canonical:

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
| Safe squares | immune to capture | immune to capture **and block all passage** — nobody may move past an occupied safe square |
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
  it's a safe square).

### Board geometry — CONFIRMED
The cabin board matches the standard **Selchow & Righter Parcheesi** layout
(confirmed 2026-06-11 from a photo of the board). A cross of four arms, each arm
**3 columns × 8 cells**; the two outer columns of every arm form the shared
track, the middle column (red runway) is that player's private home lane.

- **Main track: 68 squares** (4 arms × 16 outer-column cells + 4 outer-corner
  connector squares).
- **Home lanes: 7 cells each**, ×4, leading into the centre.
- **HOME**: the centre goal.
- **Safe squares: 12** — the circle-marked cells. They are the **4 colored
  entry/start squares** (one just outside each nest) plus **8 more** (each arm
  carries a pair: the home-lane mouth and a mid-arm square). A player's own
  **entry/start square is itself a safe square**.

So the concrete `Ruleset` numbers are `trackLength: 68`, `laneLength: 7`,
`pitonsPerPlayer: 4`, and `safeSquares` = the 12 marked indices.

### Still open / to confirm later
- Exact **track indices** of the 12 safe squares + the 4 entry squares: read
  directly off the board photo when we design the coordinate/indexing scheme
  (milestone 2). The *count* and *positions* are known; only the numbering is
  pending.
- Capture specifics **on** a safe/entry square (a safe square can't be landed on
  by an enemy at all, so capture there shouldn't arise — confirm no edge case).
