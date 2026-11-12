#!/usr/bin/env bash
# verify-writes.sh: confirm the review changed nothing outside .pre-pr-review/.
#
#   bash <skill-dir>/scripts/verify-writes.sh <run-dir>
#
# Compares `git status` now against the snapshot collect.sh took before the review.
# Prints "WRITE_CHECK: clean" or "WRITE_CHECK: violations" followed by one "CHANGED: <status line>" per difference.
# Caveat: edits the user makes in the editor during the review also show up here. The report says so.
set -euo pipefail

[ $# -eq 1 ] || { echo "ERROR: usage: verify-writes.sh <run-dir>"; exit 1; }
run_dir="$1"
root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ERROR: not inside a git repository"; exit 1; }
cd "$root"
[ -f "$run_dir/status.before" ] || { echo "ERROR: no snapshot at $run_dir/status.before (run collect.sh first)"; exit 1; }

# Keep in sync with snapshot() in collect.sh.
snapshot() {
  git status --porcelain=v1 --untracked-files=all -- . ':(exclude).pre-pr-review'
  {
    git diff HEAD --no-color --no-ext-diff -- . ':(exclude).pre-pr-review'
    git ls-files -o --exclude-standard -- . ':(exclude).pre-pr-review' | while IFS= read -r f; do
      # A symlink (e.g. the one npx skills makes for Claude Code) is fingerprinted by its target.
      if [ -L "$f" ]; then h="link:$(readlink "$f")"; else h="$(git hash-object -- "$f" 2>/dev/null || echo unreadable)"; fi
      printf '%s %s\n' "$h" "$f"
    done
  } | printf '#FINGERPRINT %s\n' "$(git hash-object --stdin)"
}
snapshot > "$run_dir/status.after"

if cmp -s "$run_dir/status.before" "$run_dir/status.after"; then
  echo "WRITE_CHECK: clean"
  exit 0
fi

echo "WRITE_CHECK: violations"
changed="$(diff <(grep -v '^#FINGERPRINT' "$run_dir/status.before") <(grep -v '^#FINGERPRINT' "$run_dir/status.after") \
  | grep -E '^[<>] ' | sed -E 's/^[<>] /CHANGED: /' | sort -u || true)"
if [ -n "$changed" ]; then
  printf '%s\n' "$changed"
else
  # Same files listed as changed before and after, but their contents moved: a file that was
  # already dirty got edited again. Name the candidates.
  grep -v '^#FINGERPRINT' "$run_dir/status.after" | sed -E 's/^/CHANGED (content): /'
fi
