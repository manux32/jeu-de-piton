import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react(), saveScenarioPlugin()],
})
