# eMusic

Electron lossless audio player: main process in `electron/` (TypeScript, SQLite with `migrations/`), renderer in `client/` (React, Redux), build scripts in `scripts/`. The repository is a single package; the default branch is `master` and every change goes through a pull request.

## Checks

CI (`.github/workflows/`: `test.yml`, `dist.yml`, wired together by `pr-checks.yml` for pull requests and `build.yml` for `master` and tags) runs these on Linux, macOS and Windows, in this order:

1. `npm run lint` (ESLint with Prettier; fix with `npm run lint:fix`, not `prettier --write`)
2. `npm run fallow` (dead code, unused dependencies and stale suppressions fail; complexity and duplication are reported)
3. `npm run typecheck`
4. `npm run test:coverage` (Vitest with coverage thresholds in `vitest.config.ts`, `--project backend` or `--project frontend` for one side with `npm test`)
5. `npm run security:electron` (Electronegativity on `electron/`; fails on a finding that is not in `electronegativity-baseline.json`, `node scripts/security-scan.js --update` after fixing one)
6. `npm run build`, then `npm run dist`, `npm run check:dist` (nothing that must not ship is in the package) and `npm run smoke:packaged` (the packaged app opens and answers; needs a display, `xvfb-run` on a headless Linux; `npm run smoke` does the same for `out/`)

Pull requests also run `fallow audit --base` (findings of the changed files), CodeQL, dependency review (high severity, GPL/AGPL licences denied) and OSV.

If `node` is not found, use `~/.nvm/versions/node/<version>/bin` directly.

## Conventions

- A test next to the code (`name.test.ts`) that fails without the change; no fixed sleeps.
- A new migration goes in `migrations/`; do not edit one that has shipped.
- No `any` or casts; fallow suppressions need a reason.
- Workflow changes: actions stay on the major versions already used, with minimal `permissions`.
