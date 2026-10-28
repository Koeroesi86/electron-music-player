#!/usr/bin/env bash
# PreToolUse (Bash): blocks the commands that CLAUDE.md and .claude/rules forbid, with the way to do it instead.
# Exit 2 sends the message on stderr to Claude.
set -euo pipefail

command -v jq >/dev/null 2>&1 || exit 0

CMD="$(jq -r '.tool_input.command // empty' <<<"$(cat)")"

deny() {
  echo "guard-bash: blocked: $1" >&2
  exit 2
}

# a search for a word is not the use of it
case "$CMD" in
  grep* | rg* | git\ log* | git\ grep*) exit 0 ;;
esac

# the text of a commit message or a pull request may name what it forbids
case "$CMD" in
  *git\ commit* | *gh\ pr\ * | *gh\ issue\ *) CMD="$(tr '\n' ' ' <<<"$CMD" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")" ;;
esac

[[ "$CMD" =~ --no-verify ]] && deny "--no-verify skips the hooks; find out why the hook fails."
[[ "$CMD" =~ prettier.*[[:space:]](--write|-w)([[:space:]]|$) ]] && deny "use 'npm run lint:fix', not prettier --write (it ignores the ESLint configuration)."
[[ "$CMD" =~ continue-on-error ]] && deny "continue-on-error hides a failing check; find out why it fails."
[[ "$CMD" =~ (mv|rm)[[:space:]].*release\.yml ]] && deny "release.yml must not be renamed, removed or recreated: its run number is the release version."
[[ "$CMD" =~ git[[:space:]]+push.*(HEAD:|[[:space:]:])master([[:space:]]|$) ]] && deny "master changes through a pull request."

if [[ "$CMD" =~ git[[:space:]]+push ]] && [ "$(git branch --show-current 2>/dev/null)" = "master" ]; then
  deny "master changes through a pull request; push a branch."
fi

exit 0
