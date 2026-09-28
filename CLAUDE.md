# CLAUDE.md

Guidance for anyone working in this repo, including AI coding assistants.

## What this repo is

A **scaffold**, not a product. It has three reference features:
- **Auth:** login, keychain-persisted refresh token, and a guarded dashboard.
- **Settings:** a theme persisted and applied natively.
- **Updates:** check and install from GitHub Releases.

Each one crosses every layer below. Copy their shape when adding a native capability.

## Layering rule

`view/store → nativeApi (src/api/native.api.ts) → invoke → #[tauri::command] (src-tauri/src/commands/) → OS`.

- **UI code never imports `@tauri-apps/*`.** It imports `nativeApi`, whose `NativeApi` type lives
  in `src/types/native.types.ts`. That keeps `src/` shell-agnostic and identical to
  `template-desktop-electron`.
- **Adding a native capability takes all of:**
  1. its types in `src/types/native.types.ts`;
  2. a command in `src-tauri/src/commands/<domain>.rs`;
  3. its name in `build.rs`'s `AppManifest::commands`;
  4. the command in `lib.rs`'s `generate_handler!`;
  5. its `allow-<command>` permission in `capabilities/default.json`;
  6. its `nativeApi` method;
  7. a fake in `src/tests/support/fake-native.ts`.
- **Plugins are driven from Rust, never granted to the webview.** Don't add plugin permissions
  (`opener:default`, `updater:default`, `core:default`, …) to the capability. Wrap the plugin in a
  command instead, so the command can validate its input.
- **Commands validate raw input:** take `serde_json::Value` or `String` and parse or check it
  yourself, as in `SettingsStore::apply` and `validate_key`. Return `AppError`. Use
  `AppError::internal(detail)` for anything the UI shouldn't see; it logs the detail and sends a
  generic message.
- **Blocking work (the keychain) runs in `async` commands.** Synchronous commands run on the
  main thread.

## File-suffix convention

UI files follow the table in [README.md](README.md#file-suffix-convention); don't invent new
suffixes. Rust uses snake_case modules, one file per command domain under `commands/`, with
tests in a `#[cfg(test)] mod tests` at the bottom of each file.

## Config rule

- **UI:** never read `import.meta.env` outside `src/config/env.ts`.
- **A new env var needs all of:**
  1. a Zod entry;
  2. an entry with a comment in `.env.example`;
  3. if tests exercise it, an entry in `vitest.config.ts`'s `test.env`.
- **A new network origin** (an API URL, a CDN) must be added to `connect-src` (or the matching
  directive) in **both** `csp` and `devCsp` in `tauri.conf.json`. `vite.config.ts` reads
  `devCsp` from there; don't duplicate it.
- **Version** lives only in `package.json`; `tauri.conf.json` points at it. `Cargo.toml`'s
  version is not shipped.

## Testing rule

- **UI** (`src/tests/**`, jsdom): every test gets the in-memory fake shell
  (`support/fake-native.ts`, via `vi.mock` in `setup.ts`) and MSW's `msw/node` server.
  `native.api.test.ts` opts back into the real module and fakes IPC with `mockIPC` from
  `@tauri-apps/api/mocks`.
- **Rust** (`cargo test`): logic lives in plain functions and structs (`SettingsStore`,
  `Secrets` over a `SecretBackend` trait, `is_app_url`, `is_safe_external_url`), so it's tested
  without a running app. Commands are thin wrappers.
- **Security rules are regression-tested** (`window.rs`, `shell.rs`, `secrets.rs`, `error.rs`).
  If you change them, update the tests that pin them. Don't delete those tests.
- Coverage thresholds in `vitest.config.ts` are a ratchet: raise them, never lower them.

This project follows **test-driven development**: write the failing test first, watch it fail for
the expected reason, then write the minimal code to pass.

## Known intentional states — not bugs

- **`plugins.updater.pubkey` in `tauri.conf.json` is a placeholder** until you generate a key
  (README → Releasing). Until then, update checks work but installs fail signature
  verification.
- **Release builds can't log in until `VITE_API_BASE_URL` points at a real backend** and its
  origin is in the CSP. The mock API only exists on the dev server.
- **`Update check failed`** (404) until the GitHub repo exists and has a *published* release.
- **macOS may prompt for Keychain access after rebuilds** in dev: each debug binary gets a new
  ad-hoc signature.
- **On Linux without a Secret Service, sessions don't survive a restart** (`unsupported` →
  memory-only fallback in `token-storage.util.ts`).

## Out of scope — don't add without being asked

- Plugin or `core:default` permissions in the capability (see the layering rule).
- `dangerousDisableAssetCspModification`, `csp: null`, or `unsafe-*` in the production CSP.
- tauri-specta or other binding generators (pre-release; see ROADMAP), mobile targets, E2E
  tests, a tray, deep links: see ROADMAP.
- `dotenv`, ESLint, Prettier.

## Pointers

- [README.md](README.md): toolchain, setup, architecture, security model, releasing.
- [CONTRIBUTING.md](CONTRIBUTING.md): local dev loop and the checks to run before pushing.
- [ROADMAP.md](ROADMAP.md): what's next, what's deliberately not done.
