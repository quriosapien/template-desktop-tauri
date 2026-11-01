# template-desktop-tauri

A production-grade Tauri 2 desktop template: a Vue 3 + TypeScript UI on Vite 8 inside a small Rust
shell. The release `.app` is about 5 MB and uses the OS webview (WebKit on macOS and Linux,
WebView2 on Windows).

The UI carries full parity with `template-webapp-vuejs`: JWT auth with refresh-token rotation,
guarded routes, Pinia and Tailwind CSS v4. On top of that sits a desktop layer:
- the refresh token lives in the **OS keychain**, not localStorage;
- settings are persisted natively and applied natively;
- a native menu, safe external links, and a single-instance lock;
- **auto-update from GitHub Releases**.

The `src/` UI is shared with its sibling `template-desktop-electron` (see
[Shared with template-desktop-electron](#shared-with-template-desktop-electron)).

## Toolchain

| Tool                                                                                                     | Role                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Tauri](https://v2.tauri.app) 2.12                                                                       | Desktop shell: Rust core + OS webview; bundler for app/dmg, msi/nsis, deb/rpm/AppImage                           |
| [Rust](https://www.rust-lang.org) 1.99                                                                   | The shell's language. `rust-toolchain.toml` pins it the way `.nvmrc` pins Node                                   |
| [Vite](https://vitejs.dev) 8                                                                             | UI dev server (HMR) and build                                                                                    |
| [keyring](https://crates.io/crates/keyring) 4                                                            | OS keychain access (macOS Keychain, Windows Credential Manager, Linux Secret Service)                            |
| tauri-plugin-updater / -log / -opener / -single-instance                                                 | Auto-update, logging, opening links in the system browser, one running instance. All are used **from Rust only** |
| [vue-tsc](https://github.com/vuejs/language-tools)                                                       | UI typecheck. Held at TypeScript 6 for the same reason as `template-webapp-vuejs`: vue-tsc can't load TS 7 yet   |
| [Biome](https://biomejs.dev) + rustfmt/clippy                                                            | Lint + format: Biome for TS/Vue/JSON/CSS, rustfmt and clippy for Rust                                            |
| [Vitest](https://vitest.dev) + [@vue/test-utils](https://test-utils.vuejs.org) + [MSW](https://mswjs.io) | UI unit tests; `@tauri-apps/api/mocks` fakes the IPC. Rust has its own `cargo test` suite                        |
| [lefthook](https://github.com/evilmartians/lefthook)                                                     | Git hooks (pre-commit Biome + rustfmt)                                                                           |
| [Tailwind CSS v4](https://tailwindcss.com)                                                               | Styling, via `@tailwindcss/vite`                                                                                 |

## Requirements

- Node.js >= 26 (`.nvmrc` pins `26`; run `nvm use`).
- npm >= 12. Node 26 bundles npm 11, so run `npm install -g npm@12` once per Node install. This is
  enforced by `devEngines`: on an older Node or npm, npm commands fail with `EBADDEVENGINES`.
- **Rust** via [rustup](https://rustup.rs). The pinned toolchain in `rust-toolchain.toml`
  installs itself on first use.
  - With Homebrew's keg-only `rustup`, add `$(brew --prefix rustup)/bin` to your `PATH`.
- **Platform prerequisites** ([Tauri docs](https://v2.tauri.app/start/prerequisites/)):
  - macOS: Xcode Command Line Tools.
  - Windows: WebView2 (preinstalled on Windows 11) and the MSVC build tools.
  - Linux: `libwebkit2gtk-4.1-dev`, `librsvg2-dev` and friends (see `.github/workflows/ci.yml`).

## Getting started

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

The first `npm run dev` compiles the Rust dependencies (a minute or two); after that it's
incremental. An app window opens. Sign in with `demo@example.com` / `password123`; the Vite dev
server answers with the mock API, so no backend is needed.

## Scripts

| Script                                             | Description                                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                      | `tauri dev`: Vite (via `dev:renderer`) + the Rust app. UI edits hot-reload; Rust edits rebuild and relaunch |
| `npm run dev:renderer`                             | Vite alone (what `tauri dev` runs; there's no native bridge in a plain browser)                             |
| `npm run build`                                    | Typecheck, then `vite build` → `dist/` (what `tauri build` embeds)                                          |
| `npm run dist`                                     | `tauri build`: release binary + installers for the current OS (→ `src-tauri/target/release/bundle/`)        |
| `npm run tauri -- <cmd>`                           | The Tauri CLI, e.g. `icon`, `signer generate`, `info`                                                       |
| `npm run typecheck`                                | `vue-tsc --noEmit`                                                                                          |
| `npm run lint` / `lint:fix` / `lint:ci` / `format` | Biome check / fix / CI mode / format                                                                        |
| `npm run lint:rust` / `format:rust`                | `cargo fmt --check` + `cargo clippy -D warnings` / `cargo fmt`                                              |
| `npm test` / `test:watch` / `test:coverage`        | Vitest once / watch / with enforced coverage thresholds                                                     |
| `npm run test:rust`                                | `cargo test`                                                                                                |
| `npm run prepare`                                  | Install lefthook git hooks (runs automatically after `npm install`)                                         |

## Environment configuration

There is no `dotenv` package: Vite loads `.env` / `.env.<mode>` natively. Only `.env.example` is
committed; copy it to `.env.local`.

- `src/config/env.ts` is the only reader of `import.meta.env`. `VITE_*` values end up in the UI
  bundle, so **never put secrets in them**.
- **API URL in release builds:** relative `/api` only works in dev, because release builds serve
  the UI from `tauri://localhost` (`http://tauri.localhost` on Windows), where nothing answers
  `/api`. To point at a real backend:
  1. put an absolute `VITE_API_BASE_URL` in `.env.production`;
  2. **add its origin to `connect-src` in `src-tauri/tauri.conf.json` → `app.security.csp`**.
     Tauri's CSP is static config; unlike the Electron sibling, it isn't derived from the env var.
  3. make sure your backend's CORS allows the app origins above.
- **Dev-server only:** `DEV_MOCK_API`, `DEV_PROXY` and `DEV_PROXY_TARGET` are read by
  `vite.config.ts` in Node and never reach the UI.

## Project structure

```
src/                     # the Vue UI — same layout as template-webapp-vuejs
  api/                   # http.client.ts, auth.api.ts, native.api.ts (the only Tauri-aware UI file)
  components/  config/  mocks/  router/  stores/  styles/  types/  utils/  views/
  tests/                 # Vitest, mirroring src/ (+ support/fake-native.ts)
src-tauri/
  src/
    lib.rs               # builder: plugins, managed state, menu, window, command list
    main.rs              # one line: calls lib::run()
    window.rs            # the main window + navigation / new-window guards
    menu.rs              # native menu → "menu-action" events
    error.rs             # AppError → { kind, message }
    json_file.rs         # atomic, owner-only JSON writes
    commands/            # every #[tauri::command] the UI can call, one file per domain
  capabilities/default.json   # what the webview may call (our commands + event listen, nothing else)
  tauri.conf.json        # app identity, CSP/devCsp, bundle, updater endpoint + public key
  tauri.release.conf.json     # release overlay: also emit signed updater artifacts
  build.rs               # declares the commands → generates their allow-* permissions
  icons/                 # icon.svg (source) → generated platform icons
rust-toolchain.toml
```

## How the pieces talk

```
Vue UI ──nativeApi──▶ invoke('secret_get', …) ──IPC──▶ #[tauri::command] (Rust) ──▶ OS
  ▲                                                          │
  └──────── result, or a rejected { kind, message } ◀────────┘
```

- **Views and stores call `nativeApi` only** (`src/api/native.api.ts`). It implements
  `NativeApi` from `src/types/native.types.ts` and turns rejections into `NativeError`s.
- **Every capability is one of the app's own Rust commands:** secrets, settings, updates,
  opening external links and app info. `build.rs` declares each command, which generates an
  `allow-<command>` permission, and `capabilities/default.json` grants exactly those, plus
  event listen/unlisten for the menu. **The webview holds no plugin permissions and not even
  `core:default`**: the updater, opener, store and log plugins are driven from Rust.
- **Commands take raw input and validate it:** settings patches are `deny_unknown_fields`,
  secret keys follow a fixed pattern. They return `AppError`, which serialises to
  `{ kind, message }`, the same shape the Electron sibling uses. Internal details are logged,
  never sent.
- **The native menu only emits actions** (`open-settings`, `check-updates`). `app.vue` decides
  what they mean.

## Auth flow

This is the same flow as `template-webapp-vuejs`: login, bearer requests, 401 → single-flight
refresh → retry, and lazy bootstrap in the router guard. Where the refresh token lives is what
differs:

- **Access token:** kept in memory only.
- **Refresh token:** `nativeApi.secrets` stores it as an OS keychain entry, under the service
  `com.quriosapien.template-desktop-tauri`. A session therefore survives an app restart.
- **No keychain:** on Linux without a Secret Service, the command reports `unsupported`, and the
  UI keeps the refresh token in memory, so the session won't survive a restart.
- **Dev builds on macOS:** Keychain may ask for permission after a rebuild, because every debug
  build is a new binary with a new ad-hoc signature. Signed release builds don't have this problem.

## Security model

- **Capabilities:** least privilege, as described above. `window.__TAURI_INTERNALS__.invoke()`
  of any plugin or core API from the webview is refused.
- **CSP** (`tauri.conf.json`): `script-src 'self'`, no `unsafe-*` in production, `connect-src`
  limited to `'self'` plus Tauri's IPC origins.
  - Tauri injects this into the assets it serves.
  - Under `tauri dev` the webview loads Vite directly, so `vite.config.ts` sends `devCsp` as a
    response header. Otherwise it would be inert.
- **Navigation** (`window.rs`):
  - The window only ever shows the app's own origins.
  - `https:` links open in the system browser; every other scheme is dropped.
  - `window.open` never creates a window.
- **`freezePrototype`** is on. Rust forbids `unsafe` code (`[lints.rust]`).

## Mock API vs. real backend

`DEV_MOCK_API=true` makes the Vite dev server answer `/api/*` with the MSW handlers in
`src/mocks/handlers.ts` (`mock-api.plugin.ts`). Unit tests use the same handlers through `msw/node`.

It runs on the dev server rather than as a service worker because WKWebView (Tauri's macOS
webview) refuses service-worker registration. Release builds never include the mock.

To use a real backend, set `DEV_MOCK_API=false DEV_PROXY=true DEV_PROXY_TARGET=<url>` in
`.env.local`. The endpoint contract is the one in `template-webapp-vuejs`'s README.

## Releasing and auto-update

**One-time setup: update signing.** Tauri's updater only installs bundles signed with your key.
1. Run `npm run tauri signer generate -- -w ~/.tauri/template-desktop-tauri.key`, and choose a
   password.
2. Paste the **public** key into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`,
   replacing the placeholder.
3. Add the **private** key's contents and its password as GitHub secrets:
   `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The private key never
   goes in the repo.

**Each release:**
1. Bump `version` in `package.json` (`tauri.conf.json` reads it), commit, then tag and push:
   `git tag v0.2.0 && git push --tags`.
2. `.github/workflows/release.yml` runs `tauri-action` on macOS (arm64 + x64), Windows and Linux.
   It uploads installers, signed update bundles and `latest.json` to a **draft** GitHub Release.
3. Review and **publish** the draft. The updater polls `releases/latest/download/latest.json`,
   which only resolves to published releases.

Release builds check once per launch. The update banner offers **Restart to install**; Settings →
Updates checks on demand. Debug builds report `unsupported`.

Set the repo variable `VITE_API_BASE_URL` (Settings → Variables) so release builds get an absolute
API URL, and add its origin to the CSP.

**OS code signing** (Apple Developer ID and notarization, or a Windows certificate) is opt-in; the
environment block in `release.yml` lists the secrets. Without it:
- macOS: builds are ad-hoc signed, and Gatekeeper warns on first launch.
- Windows: SmartScreen warns.

## App icon

`src-tauri/icons/icon.svg` is the source. After editing it, regenerate the icons:

```bash
node -e "require('sharp')('src-tauri/icons/icon.svg').resize(1024,1024).png().toFile('src-tauri/icons/icon.png')"
npm run tauri icon src-tauri/icons/icon.png -- -o src-tauri/icons
```

Then delete the `android/`, `ios/` and `Square*`/`StoreLogo` outputs; this template is desktop-only.

## Shared with template-desktop-electron

Both desktop templates keep `src/` identical, so UI work moves between them by copying files. Only
these differ:
- `src/api/native.api.ts` and its test: the shell binding.
- The `VITE_APP_NAME` default in `src/config/env.ts` and its test.
- The accent colour in `src/styles/index.css`.
- `src/assets/logo.svg`.

## File suffix convention

UI files are kebab-case with a role suffix, imported through the `@/` alias. Rust follows Rust
conventions: snake_case modules, one file per command domain under `commands/`.

| Suffix            | Role                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| `*.view.vue`      | Routed page component                                                                  |
| `*.component.vue` | Reusable (non-routed) component                                                        |
| `*.store.ts`      | Pinia store                                                                            |
| `*.api.ts`        | Typed call group (HTTP or native)                                                      |
| `*.client.ts`     | Low-level transport (HTTP client)                                                      |
| `*.plugin.ts`     | Vite plugin (dev/build tooling, runs in Node)                                          |
| `*.util.ts`       | Framework-agnostic helper                                                              |
| `*.types.ts`      | Shared TypeScript types                                                                |
| `*.test.ts`       | Unit test in `src/tests/`, mirroring `src/`. Rust tests live in `#[cfg(test)]` modules |

## Code style consistency

Three layers keep formatting and linting consistent:

1. **Editor:** `.vscode/settings.json` makes Biome the formatter (format-on-save), and
   `.vscode/extensions.json` recommends Biome, Volar, rust-analyzer and Tauri.
2. **Pre-commit:** lefthook runs `biome check --write` on staged web files and `rustfmt` on
   staged `.rs` files.
3. **CI backstop:** `lint:ci` (Biome), `cargo fmt --check` and `clippy -D warnings` fail the
   build.

Biome only parses a `.vue` file's `<script>` block, so `biome.json` turns off the unused-binding
rules for `**/*.vue`, and vue-tsc enforces them with full template awareness. `biome.json` also
enables Tailwind directive parsing (`@theme`, `@apply`).
