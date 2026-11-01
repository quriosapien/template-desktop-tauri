# Roadmap — template-desktop-tauri

A Tauri 2 desktop template with the Vue 3 UI of `template-webapp-vuejs`, a keychain-backed session,
native settings and GitHub Releases auto-update, all through a least-privilege capability. Its
UI (`src/`) is shared with `template-desktop-electron`. This roadmap is a record of intent: items
here are candidates, not commitments. Pick one up, or leave the repo as-is.

## Now — parity + hardening, no new dependencies

- **Validate the login payload with Zod.** This is the same gap as in both webapps' roadmaps, and
  `zod` is already a dependency.

- **Generate the updater key and replace the placeholder pubkey** as soon as the repo is pushed.
  See README → Releasing.
  _Done when:_ a tagged draft release, once published, updates an installed older build.

## Next — meaningful advancement, small dependency cost

- **Persist window size and position** with `tauri-plugin-window-state`, driven from Rust like
  the other plugins. Don't grant its JS permission.

- **Standing item: recheck tauri-specta on every sweep.** Command bindings are hand-written today
  (`native.api.ts` ↔ `commands/`), and both sides' tests pin the names and shapes. tauri-specta
  2 was still a release candidate when this repo was created, which the no-pre-release rule
  excludes. Rechecked 2026-11-01: still `2.0.0-rc.26` (specta `2.0.0-rc.27`).
  _Done when:_ it's stable and generates `native.api.ts`'s types, or it's dropped with a reason.

- **Wire up OS code signing.** The secrets are listed, commented out, in `release.yml`. Signed
  macOS builds also end the dev-rebuild Keychain prompts for release users.

## Later — opt-in, adds a real dependency or platform surface

- **E2E tests.** tauri-driver (WebDriver) supports Linux and Windows only, not macOS, so this
  would be a CI-only suite. For now, integration is checked by hand; see CONTRIBUTING.
- Tray icon, deep links (`tauri-plugin-deep-link`), notifications, global shortcuts.
- Mobile targets (iOS/Android). Tauri 2 supports them, but the menu, keychain and updater
  choices here are desktop-specific.
- Renovate config, shared in shape with the other `template-*` repos.

## Deliberately not doing

- **ESLint / Prettier:** Biome replaces both.
- **Granting plugin or `core:default` permissions to the webview:** every capability is a
  validated Rust command.
- **`csp: null` or `dangerousDisableAssetCspModification`:** the CSP is part of the security
  model, and `vite.config.ts` even enforces `devCsp` under `tauri dev`.
- **tauri-plugin-store for settings:** a ~60-line atomic JSON file (`json_file.rs`) does the job,
  is unit-testable without a Tauri runtime, and matches the Electron sibling.
- **An MSW service worker in the UI:** WKWebView refuses service workers; mocking runs on the dev
  server.

## Family conventions

These rules are shared across the `template-*` repos and apply here too:

- `biome.json`'s `$schema` URL tracks the installed `@biomejs/biome` version: bump both together.
  (This repo also enables `css.parser.tailwindDirectives` and ignores `src-tauri/target`.)
- Manifests pin `^<then-latest>`, npm and Cargo alike. `allowScripts` keys embed exact versions
  and move in lockstep with the packages they gate. `rust-toolchain.toml` moves with the sweeps
  too.
- No pre-release dependencies, apart from documented exceptions. This repo has none.
- Dependency sweeps commit with a lowercase `setup:` or `chore(deps):` prefix. Nothing is pushed
  without the user's say-so.
- **TypeScript 6** until `vue-tsc` supports TS 7, the same gate as `template-webapp-vuejs`.
  Rechecked 2026-11-01: `typescript` 7.0.2 + `vue-tsc` 3.3.14 still fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **Node 26 everywhere**, enforced by `devEngines`. CI upgrades to npm 12 before `npm ci` because
  Node 26 bundles npm 11.
