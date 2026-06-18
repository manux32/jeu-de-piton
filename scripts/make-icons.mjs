// Rasterise the master app mark (public/favicon.svg) into the PNG icons the PWA
// manifest + iOS "Add to Home Screen" need. Re-run after editing favicon.svg:
//
//   NODE_OPTIONS=--use-system-ca node scripts/make-icons.mjs   (or: npm run make:icons)
//
// Outputs into public/ (Vite copies it to the build root). The art already sits
// inside the maskable safe zone, so the same source serves both the plain and
// maskable icons; iOS uses apple-touch-icon (no transparency, no OS masking).

import sharp from 'sharp'

const src = 'public/favicon.svg'
const targets = [
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/pwa-maskable-512x512.png', 512],
  ['public/apple-touch-icon.png', 180],
]

for (const [out, size] of targets) {
  const info = await sharp(src, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`rendered ${src} → ${out} (${info.width}×${info.height})`)
}
