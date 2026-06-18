import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * DEV-ONLY endpoint behind the "save as scenario" flow (src/ui/dev/). It lives
 * in `configureServer` with `apply: 'serve'`, so Vite only wires it for the dev
 * server — it has no presence in a production build. Accepts
 * `POST /__save-scenario { id, source }` and writes
 * `src/ui/dev/scenarios/<id>.ts`; the registry's `import.meta.glob` then surfaces
 * it in the picker on the next HMR pass. The id is slug-validated and the path is
 * confined to the scenarios dir (no traversal); existing files are never
 * overwritten (409).
 */
function saveScenarioPlugin(): Plugin {
  const dir = fileURLToPath(new URL('./src/ui/dev/scenarios/', import.meta.url))
  const send = (res: import('node:http').ServerResponse, code: number, body: object) => {
    res.statusCode = code
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(body))
  }
  return {
    name: 'dev-save-scenario',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-scenario', (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const { id, source } = JSON.parse(body) as { id?: string; source?: string }
            if (!id || !/^[a-z0-9-]+$/.test(id) || typeof source !== 'string')
              return send(res, 400, { error: 'bad id or source' })
            const file = fileURLToPath(new URL(`${id}.ts`, new URL('./src/ui/dev/scenarios/', import.meta.url)))
            if (!file.startsWith(dir)) return send(res, 400, { error: 'path escapes scenarios dir' })
            if (existsSync(file)) return send(res, 409, { error: `scenario '${id}' already exists` })
            writeFileSync(file, source, 'utf8')
            send(res, 200, { ok: true, path: `src/ui/dev/scenarios/${id}.ts` })
          } catch (e) {
            send(res, 400, { error: String(e) })
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Served from a GitHub Pages project site (manux32.github.io/jeu-de-piton/), so
  // assets must resolve under that sub-path. This also scopes the service worker.
  base: '/jeu-de-piton/',
  plugins: [
    react(),
    saveScenarioPlugin(),
    // Installable, offline-first build for playing on an iPad at the cabin (no
    // internet): "Add to Home Screen" → the service worker precaches the whole
    // app so it runs from cache. Inert in dev (no SW unless devOptions.enabled),
    // so it never interferes with the dev server or the save-scenario middleware.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Jeu de piton',
        short_name: 'Piton',
        description: 'A cross-and-circle race game for the cabin.',
        lang: 'en',
        theme_color: '#1c1330',
        background_color: '#1c1330',
        display: 'standalone',
        // Locked to portrait: the square board fills the width with no side gaps
        // there, whereas landscape leaves left/right gutters. (Installed-PWA lock;
        // iOS reads it at "Add to Home Screen" time — see decisions.md caveat.)
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
