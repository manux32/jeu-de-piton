/**
 * DEV-ONLY scenario registry. Auto-discovers every scenario file under
 * `scenarios/` via Vite's `import.meta.glob`, so adding a file *is* adding a
 * scenario — no manual index to maintain (which is what lets the "save as
 * scenario" flow just write a new file). Eager so the views
 * are ready synchronously for the picker; sorted by path for a stable order.
 */
import type { DevScenario } from './scenario'

const modules = import.meta.glob<{ default: DevScenario }>('./scenarios/*.ts', {
  eager: true,
})

export const DEV_SCENARIOS: DevScenario[] = Object.keys(modules)
  .sort()
  .map((path) => modules[path].default)
