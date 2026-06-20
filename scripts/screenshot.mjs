// Screenshot the LIVE app (dev server) to a PNG, for eyeballing UI that only
// exists in React view-state — modals, hover/selected states, mid-interaction —
// which the static SVG render (render-board.mjs) can't reach. Drives the system
// Edge/Chrome via playwright-core, so there's no browser download.
//
//   # start the dev server first (npm run dev), then:
//   NODE_OPTIONS=--use-system-ca node scripts/screenshot.mjs [options]
//
// Options (all optional):
//   --out <path>      output PNG            (default references/shot.png — scratch)
//   --size <WxH>      viewport in px        (default 1200x900)
//   --path <route>    app route to load     (default /jeu-de-piton/)
//   --click <name>    click an element by its accessible name; repeatable, runs
//                     in order (e.g. --click "New game" --click "Start game")
//   --wait <ms>       settle delay after the last click (default 350)
//
// Example — capture the New Game window:
//   NODE_OPTIONS=--use-system-ca node scripts/screenshot.mjs \
//     --out references/new-game.png --click "New game"
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i === -1 ? def : args[i + 1]
}
const clicks = args.reduce((acc, a, i) => (a === '--click' ? [...acc, args[i + 1]] : acc), [])

const out = opt('--out', 'references/shot.png')
const [w, h] = opt('--size', '1200x900').split('x').map(Number)
const route = opt('--path', '/jeu-de-piton/')
const wait = Number(opt('--wait', '350'))

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' })
  for (const name of clicks) {
    await page.getByRole('button', { name, exact: true }).first().click()
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(wait)
  await page.screenshot({ path: out })
  console.log(`wrote ${out} (${w}×${h}${clicks.length ? `, clicked: ${clicks.join(' → ')}` : ''})`)
} finally {
  await browser.close()
}
