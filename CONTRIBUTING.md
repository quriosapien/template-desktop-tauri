# Contributing

## Prerequisites

- Node.js >= 26: run `nvm use` to pick up the version pinned in `.nvmrc`.
- npm >= 12. Node 26 bundles npm 11, so run `npm install -g npm@12` once per Node install. This is
  enforced by `devEngines`: on an older Node or npm, npm commands fail with `EBADDEVENGINES`.
- Rust via rustup. `rust-toolchain.toml` installs the pinned toolchain (with rustfmt and clippy)
  on first use. Also the platform prerequisites in the README.

## Setup

```bash
nvm use
npm install                  # also installs git hooks via lefthook (the "prepare" script)
cp .env.example .env.local   # defaults work for local dev (mock API on)
npm run dev                  # first run compiles the Rust dependencies
```

## Local dev loop

- `npm run dev`: UI edits hot-reload; Rust edits rebuild and relaunch the app.
- `npm test`: the UI suite once, without coverage (fast, for iterating).
- `npm run test:watch`: Vitest watch mode.
- `npm run test:rust`: the Rust suite.

## Before pushing

Run the same checks CI runs, in the same order:

```bash
npm run lint           # Biome: lint + format + import order
npm run typecheck      # vue-tsc
npm run build          # vite build
npm run test:coverage
npm run lint:rust      # cargo fmt --check + clippy -D warnings
npm run test:rust
```

lefthook formats staged web files (Biome) and Rust files (rustfmt) at commit time.

If you changed packaging, the CSP, capabilities or updates, also run `npm run dist` and launch the
app from `src-tauri/target/release/bundle/`. Release builds are the only place the production CSP
and the updater run.

## What CI checks

`.github/workflows/ci.yml` runs on every push to `main` and every PR. There are two jobs:
- `ui`: lint → typecheck → build → test, with coverage thresholds.
- `rust`: fmt → clippy → test, on Linux with the WebKitGTK dependencies.

`release.yml` runs only on `v*` tags; see README → Releasing.

## PR checklist

- [ ] Tests added or updated (this repo follows TDD; see [CLAUDE.md](CLAUDE.md)).
- [ ] A new native capability touches every layer listed in CLAUDE.md's layering rule, including
      `build.rs` and `capabilities/default.json`.
- [ ] Security-relevant changes (capability, CSP, navigation guards, command validation) keep
      their regression tests green.
- [ ] Any change under `src/` that isn't shell-specific is mirrored to `template-desktop-electron`.
- [ ] Clear, descriptive commit messages.
