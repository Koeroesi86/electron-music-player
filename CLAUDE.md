# eMusic

Electron lossless audio player: main process in `electron/` (TypeScript, SQLite with `migrations/`), renderer in `client/` (React, Redux), build scripts in `scripts/`. The repository is a single package; the default branch is `master` and every change goes through a pull request.

## Checks

CI (`.github/workflows/`: `test.yml`, `dist.yml`, wired together by `pr-checks.yml` for pull requests and `build.yml` for `master`) runs these on Linux, macOS and Windows, in this order:

1. `npm run lint` (ESLint with Prettier; fix with `npm run lint:fix`, not `prettier --write`)
2. `npm run fallow` (dead code, unused dependencies and stale suppressions fail; complexity and duplication are reported)
3. `npm run typecheck`
4. `npm run test:coverage` (Vitest with coverage thresholds in `vitest.config.ts`, `--project backend` or `--project frontend` for one side with `npm test`)
5. `npm run security:electron` (Electronegativity on `electron/`; fails on a finding that is not in `electronegativity-baseline.json`, `node scripts/security-scan.js --update` after fixing one)
6. `npm run build`, then `npm run dist`, `npm run check:dist` (nothing that must not ship is in the package) and `npm run smoke:packaged` (the packaged app opens and answers; needs a display, `xvfb-run` on a headless Linux; `npm run smoke` does the same for `out/`)

Pull requests also run `fallow audit --base` (findings of the changed files), CodeQL, dependency review (high severity, GPL/AGPL licences denied) and OSV.

Releases come from `release.yml`: Monday and Thursday 06:00 UTC and by hand, from `master` only. A scheduled run skips when only docs or `.github/` changed since the latest `vYY.M.N` tag. The version is `YY.M.<run number>` (`scripts/version.js`, stamped into `package.json` in the packaging job; never edit `version` by hand, no zero padded month and no prerelease part, electron-updater would take it for a channel), the plan job refuses a version that is not greater than the latest tag, and `release.yml` must not be renamed or recreated (its run number would restart), and the published release is what installed apps update from. `EMUSIC_NO_UPDATE=1` turns the updater off and `EMUSIC_RADIO_DIRECTORY=<url>` replaces the station directory (the smoke tests set both, the second to a station of their own).

If `node` is not found, use `~/.nvm/versions/node/<version>/bin` directly.

## Conventions

- The renderer reaches the main process data (library, covers, audio, stations) and the page itself through the `emusic://app` protocol (`electron/emusicProtocol.ts`, URLs from `client/local-url.ts`), not through a port. A handler never throws into the main process: an error of a stream ends that stream (`pipeline`, not `pipe`), as an unhandled one opens a blocking error dialog.
- A test next to the code (`name.test.ts`) that fails without the change; no fixed sleeps.
- A new migration goes in `migrations/` as `NNN-name.sql` with the next number; it runs once per library (the number is stored as `PRAGMA user_version`), so it may `ALTER TABLE`. Do not edit one that has shipped (`electron/migrations.checksums.test.ts` fails on it; a new migration gets its line in `electron/migrations-checksums.json`). Numbers start at 1 with no gap. A migration runs in a transaction, so it cannot change `PRAGMA foreign_keys`. The library is copied to `library.sqlite.v<N>.bak` before pending migrations run, and a library from a newer app is refused. `001` to `003` ran on every start before the number was stored, so they stay safe to run again.
- User-facing text goes in `locales/en.json` (the complete source of truth) and is shown with `useTranslation()` in the renderer or `getMainTranslator()` in `electron/`, never written into a component; a new language is a `locales/<tag>.json` that is added to `locales/index.ts`, and a key it lacks shows the English text.
- No `any` or casts; fallow suppressions need a reason.
- Workflow changes: actions stay on the major versions already used, with minimal `permissions`.
- The website (`site/`, plain HTML and CSS, `npm run site` shows it) describes the app, so a change that adds, removes or visibly changes a feature (a page, the player bar, radio, platform support, install steps) updates the matching section of `site/index.html` in the same pull request, and the screenshots in `site/screenshots/` when what they show changed (retake them, do not edit them). Screenshots are taken from the built app with made-up data only: generated tagged files with drawn covers (no real artists, covers or stations), a fake station directory through `EMUSIC_RADIO_DIRECTORY` whose stream names its cover in `StreamUrl` (otherwise the app looks one up online and may show someone else's art), a clean profile (`HOME` and `XDG_CONFIG_HOME`), English, 1360×850, saved as WebP. Keep the Linux install steps in the README and on the page the same.
