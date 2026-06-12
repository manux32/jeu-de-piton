import { defineConfig } from 'vitest/config'

// The engine is pure TypeScript with no DOM, so the default `node` environment
// is all we need. UI component tests (later milestones) can opt into jsdom
// per-file via a `// @vitest-environment jsdom` pragma.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
