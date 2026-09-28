import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// UI tests only — the Rust side has its own (`npm run test:rust`).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Node 26 ships an experimental native `localStorage` global that jsdom's
    // setup trips over (warning noise, and it would shadow jsdom's own).
    execArgv: ['--no-experimental-webstorage'],
    include: ['src/tests/**/*.test.ts'],
    // Node's fetch (used by Vitest even under jsdom) rejects relative URLs, so
    // tests need an absolute API base. MSW handlers use `*/api/...` wildcards
    // so they match both this absolute base and the dev server's.
    env: {
      VITE_API_BASE_URL: 'http://localhost/api',
    },
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/tests/**',
        'src/**/*.types.ts',
        'src/**/*.d.ts',
        'src/mocks/**',
        // Entry point: pure wiring, exercised by running the app.
        'src/main.ts',
      ],
      // Ratchet, not aspirational: a few points below the measured baseline
      // (92.1 / 85.9 / 93.2 / 92.9). Raise these as coverage grows; never lower.
      thresholds: { statements: 89, branches: 82, functions: 90, lines: 89 },
    },
  },
});
