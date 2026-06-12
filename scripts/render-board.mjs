// Rasterize the hand-authored board SVG to a PNG so it can be inspected as an
// image (the raw Inkscape path data isn't practical to read as text). Handy for
// pinning track/safe-square indices and as a reference when we build our own
// SVG board. Output is scratch — not committed (see .gitignore).
//
//   node scripts/render-board.mjs [input.svg] [output.png] [size]
//
// Needs Node's system CA on the corporate network:
//   NODE_OPTIONS=--use-system-ca node scripts/render-board.mjs

import sharp from 'sharp'

const input = process.argv[2] ?? 'references/parcheesi-board-schematic.svg'
const output = process.argv[3] ?? 'references/board-render.png'
const size = Number(process.argv[4] ?? 1600)

const info = await sharp(input, { density: 300 })
  .resize(size, size, { fit: 'inside' })
  .png()
  .toFile(output)

console.log(`rendered ${input} → ${output} (${info.width}×${info.height})`)
