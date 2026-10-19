---
paths:
  - ".github/**"
---

# Workflows (`.github/`)

- Keep the `build` job running on the Linux, macOS and Windows matrix with `fail-fast: false`; a change that only works on one OS is not done.
- `permissions` are minimal: wider only on the job that needs it (`release` needs `contents: write`), with a comment why. Never interpolate `${{ ... }}` of untrusted input into `run:`; pass it through `env:`.
- Keep the check order lint, fallow, typecheck, test, build, dist, so the cheap checks fail first.
- Keep the per-OS caches keyed on `package-lock.json`; do not share one cache between platforms.
- No bypass flags or skipped checks (`--no-verify`, `continue-on-error`) to make something pass; find out why it fails.
- Dependabot waits 7 days before proposing a release; do not bump around it by hand.
