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

## Cabin house rules (jeu de piton) — TO COLLECT

Fill in from the family. Known so far:
- Each player has **4–5 pitons** (confirm which).
- **Roll a 5 to get a piton on the board** (matches Parcheesi entry).
- Played with **a die** (confirm one die vs two).

Still needed: exact piton count, capture & safe-square specifics, doubles /
extra-turn behaviour, exact-vs-overshoot rule entering HOME, board dimensions of
the hand-built version, any family-specific twists. These become the second
`Ruleset` variant — no engine rewrite required.
