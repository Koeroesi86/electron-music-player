#!/usr/bin/env bash
# PreToolUse (AskUserQuestion): the previews of that tool are text drawings, which the user rejects.
# Exit 2 sends the message on stderr to Claude.
set -euo pipefail

command -v jq >/dev/null 2>&1 || exit 0

if jq -e '[.tool_input.questions[]?.options[]? | has("preview")] | any' <<<"$(cat)" >/dev/null; then
  echo "no-ascii-preview: blocked: no ASCII mockups. Ask without 'preview' and show a layout or design option as an HTML mockup (artifact) instead." >&2
  exit 2
fi

exit 0
