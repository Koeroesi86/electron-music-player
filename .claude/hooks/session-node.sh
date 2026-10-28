#!/usr/bin/env bash
# SessionStart: puts the newest Node 24 of nvm on PATH for the Bash tool, as it does not load nvm.
# Without nvm or Node 24 it does nothing.
set -euo pipefail

[ -n "${CLAUDE_ENV_FILE:-}" ] || exit 0

NODE_BIN="$(ls -d "$HOME"/.nvm/versions/node/v24.*/bin 2>/dev/null | sort -V | tail -n1 || true)"
[ -n "$NODE_BIN" ] || exit 0

echo "export PATH=\"$NODE_BIN:\$PATH\"" >>"$CLAUDE_ENV_FILE"
