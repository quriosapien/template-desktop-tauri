import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
// Explicit extension: Vite's upcoming native config loader requires it.
import { mockApiPlugin } from './src/mocks/mock-api.plugin.ts';

/**
 * Tauri injects its CSP only into assets it serves itself — under `tauri dev`
 * the webview loads this dev server directly, so tauri.conf.json's `devCsp`
 * would be inert. The dev server sends it instead, keeping the conf the single
 * source of truth for both policies.
 */
function readDevCsp(): string {
  const conf = JSON.parse(
    readFileSync(new URL('./src-tauri/tauri.conf.json', import.meta.url), 'utf8'),
  );
  const directives: Record<string, string> = conf.app.security.devCsp;
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');
}

/** The UI build. `tauri dev` / `tauri build` run it via tauri.conf.json's before* commands. */
export default defineConfig(({ mode }) => {
  // Node context: read all vars (no VITE_ filter) — DEV_* stay dev-server-side only.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      tailwindcss(),
      ViteImageOptimizer(),
      ...(env.DEV_MOCK_API === 'true' ? [mockApiPlugin()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // `tauri dev` prints Rust compiler output to the same terminal; don't wipe it.
    clearScreen: false,
    server: {
      // tauri.conf.json's devUrl points at exactly this port.
      port: 5173,
      strictPort: true,
      watch: { ignored: ['**/src-tauri/**'] },
      headers: { 'Content-Security-Policy': readDevCsp() },
      proxy:
        env.DEV_PROXY === 'true'
          ? {
              '/api': {
                target: env.DEV_PROXY_TARGET ?? 'http://localhost:3000',
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
