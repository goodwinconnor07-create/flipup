#!/usr/bin/env bash
# SessionStart: keep every Claude session on the latest main (the owner's rule, 6 Nov 2026).
# - A session branch with no work of its own is moved to origin/main, so it never starts from a stale copy.
# - A branch with its own commits that is behind main gets a loud note, so Claude merges main before working.
# It never discards commits or uncommitted changes. Whatever it prints is read by Claude at the start.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
timeout 30 git fetch -q origin main 2>/dev/null || { echo "sync-main: couldn't fetch origin/main; check it's current before starting."; exit 0; }
branch=$(git rev-parse --abbrev-ref HEAD)
behind=$(git rev-list --count HEAD..origin/main)
ahead=$(git rev-list --count origin/main..HEAD)
[ "$behind" -eq 0 ] && { echo "sync-main: $branch is up to date with origin/main."; exit 0; }
if [ "$ahead" -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
  if [ "$branch" = "main" ]; then git merge -q --ff-only origin/main; else git reset -q --hard origin/main; fi
  echo "sync-main: moved $branch to the latest origin/main ($behind newer commits). Build on this."
else
  echo "sync-main: WARNING $branch is $behind commits behind origin/main and has $ahead of its own."
  echo "Before any other work: git merge origin/main (resolve conflicts in favour of main's design), then continue."
fi
exit 0
