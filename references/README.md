# References

Visual references for the board layout. Not shipped with the app — these inform
the geometry we model in [`../docs/rules-and-lineage.md`](../docs/rules-and-lineage.md).

The cabin board matches the standard **Selchow & Righter Parcheesi** layout
(68-square track, 7-cell home lanes, 12 safe squares). The original reference
was a tilted photo found online (unknown licence, not committed); these are
clean, freely-licensed substitutes of the same board.

## Files

| File | What it is | Best for |
| --- | --- | --- |
| `parcheesi-board-schematic.svg` | Clean, straight-on vector schematic of the board | **Reading exact cell/track/lane structure and the 12 safe-square positions**; our own SVG rendering reference |
| `parcheesi-board-photo.jpg` | Angled photo of a game in progress (pieces + dice on the board) | A real-world look at the same board; not reliable for measuring positions (perspective + occluding pieces) |

For pinning exact track/safe-square indices, use the **SVG** — it's straight-on
and vector, so cell boundaries are unambiguous.

The SVG is hand-authored Inkscape, so its raw path data isn't practical to read
as text. Rasterize it to a (gitignored) PNG to inspect it as an image:

```
npm run render:board                 # → references/board-render.png (1600px)
node scripts/render-board.mjs in.svg out.png 2400   # custom in/out/size
```

(On the corporate network, prefix with `NODE_OPTIONS=--use-system-ca`.) This is
how the board geometry below was confirmed: each arm = a tip safe-cell + 7 red
home-lane cells, with 3 circled safe squares per arm (mouth, entry/start,
mid-arm) = 12 total.

## Attribution / licences

Both files are by **Micha L. Rieser** via Wikimedia Commons.

- `parcheesi-board-schematic.svg` — source
  [File:Parcheesi.svg](https://commons.wikimedia.org/wiki/File:Parcheesi.svg),
  licensed **CC BY-SA 3.0** (also CC BY-SA 2.5 / GFDL 1.2+). Reuse requires
  attribution and share-alike.
- `parcheesi-board-photo.jpg` — source
  [File:Parcheesi-board.jpg](https://commons.wikimedia.org/wiki/File:Parcheesi-board.jpg),
  licensed **CC BY** (attribution).

Downloaded 2026-06-11. If we ever embed a board image in the shipped app (we
currently render the board ourselves in SVG, so we don't), honour these terms.
