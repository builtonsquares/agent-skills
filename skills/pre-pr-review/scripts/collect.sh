#!/usr/bin/env bash
# collect.sh: gather everything the reviewers need in ONE shell call.
#
#   bash <skill-dir>/scripts/collect.sh [--base <ref>] [--include-uncommitted]
#
# Prints "KEY: value" lines on stdout for the agent to read. Writes the run's files under
#   .pre-pr-review/<branch>/<short-sha>/   (the only place this skill ever writes)
#     diff.patch      the diff to review (skip patterns already applied)
#     files.txt       changed files under review, one per line
#     skipped.txt     changed files NOT reviewed (generated/vendored/lock files)
#     status.before   `git status` snapshot, compared afterwards by verify-writes.sh
#
# This script is read-only for the repository. It never fetches, checks out, or changes config.
# Compatible with bash 3.2 (macOS default) and Git Bash on Windows.
set -euo pipefail

LARGE_DIFF_LINES=3000
CONTEXT_LINES=10

out() { printf '%s: %s\n' "$1" "$2"; }
fail() { out ERROR "$*"; exit 1; }

base_arg=""
include_uncommitted=0
while [ $# -gt 0 ]; do
  case "$1" in
    --base) [ $# -ge 2 ] || fail "--base needs a ref"; base_arg="$2"; shift 2 ;;
    --base=*) base_arg="${1#--base=}"; shift ;;
    --include-uncommitted) include_uncommitted=1; shift ;;
    *) fail "unknown argument: $1" ;;
  esac
done

root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "not inside a git repository"
cd "$root"

head_sha="$(git rev-parse HEAD 2>/dev/null)" || fail "repository has no commits"
short_sha="$(git rev-parse --short HEAD)"
branch="$(git symbolic-ref --short -q HEAD || echo "detached-$short_sha")"
safe_branch="$(printf '%s' "$branch" | tr '/\\: ' '----')"
run_dir=".pre-pr-review/$safe_branch/$short_sha"
mkdir -p "$run_dir"

# Generated, vendored and lock files are listed as "not reviewed" rather than silently dropped.
excludes=(
  ':(exclude).pre-pr-review'
  ':(exclude,glob)**/package-lock.json' ':(exclude,glob)**/yarn.lock' ':(exclude,glob)**/pnpm-lock.yaml'
  ':(exclude,glob)**/npm-shrinkwrap.json' ':(exclude,glob)**/bun.lockb' ':(exclude,glob)**/Cargo.lock'
  ':(exclude,glob)**/poetry.lock' ':(exclude,glob)**/uv.lock' ':(exclude,glob)**/Pipfile.lock'
  ':(exclude,glob)**/Gemfile.lock' ':(exclude,glob)**/composer.lock' ':(exclude,glob)**/go.sum'
  ':(exclude,glob)**/packages.lock.json' ':(exclude,glob)**/gradle.lockfile'
  ':(exclude,glob)**/*.min.js' ':(exclude,glob)**/*.min.css' ':(exclude,glob)**/*.map'
  ':(exclude,glob)**/*.snap' ':(exclude,glob)**/*.pb.go' ':(exclude,glob)**/*_pb2.py' ':(exclude,glob)**/*_pb2.pyi'
  ':(exclude,glob)**/*.generated.*' ':(exclude,glob)**/__generated__/**' ':(exclude,glob)**/generated/**'
  ':(exclude,glob)**/node_modules/**' ':(exclude,glob)**/vendor/**' ':(exclude,glob)**/dist/**' ':(exclude,glob)**/build/**'
  # This skill's own installed files and config: review tooling, not PR work.
  ':(exclude).agents/skills/pre-pr-review' ':(exclude).claude/skills/pre-pr-review'
  ':(exclude).cursor/skills/pre-pr-review' ':(exclude).github/skills/pre-pr-review'
  ':(exclude).cursor/agents/pre-pr-reviewer.md' ':(exclude).claude/agents/pre-pr-reviewer.md'
  ':(exclude).github/agents/pre-pr-reviewer.agent.md' ':(exclude)skills-lock.json' ':(exclude).pre-pr-review.md'
)
# The same paths, for leaving them out of the uncommitted/untracked counts.
TOOLING_RE='^.. (\.(agents|claude|cursor|github)/skills/pre-pr-review(/|$)|\.(cursor|claude)/agents/pre-pr-reviewer\.md$|\.github/agents/pre-pr-reviewer\.agent\.md$|skills-lock\.json$|\.pre-pr-review\.md$)'

# --- snapshot working tree state (for the write check and the uncommitted warning)
# Status lines alone miss a file that was already modified and gets modified again, so the
# snapshot also carries a content fingerprint of every tracked change and untracked file.
# Keep in sync with verify-writes.sh.
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
snapshot > "$run_dir/status.before"
# Counts for the warnings. The skill's own files and config aren't PR work, so they're not counted
# (they stay in the snapshot, so the write check still notices if they change).
counted="$(grep -v '^#FINGERPRINT' "$run_dir/status.before" | grep -Ev "$TOOLING_RE" || true)"
uncommitted="$(printf '%s' "$counted" | grep -c . || true)"
untracked="$(printf '%s' "$counted" | grep -c '^??' || true)"

# --- resolve the base
if [ -n "$base_arg" ]; then
  git rev-parse --verify -q "${base_arg}^{commit}" >/dev/null || fail "base ref not found: $base_arg"
  base_ref="$base_arg"
  base_source="argument"
else
  base_ref=""
  for candidate in origin/HEAD origin/main origin/master main master; do
    if git rev-parse --verify -q "${candidate}^{commit}" >/dev/null; then
      # Skip a local default branch that IS the branch under review.
      [ "$candidate" = "$branch" ] && continue
      base_ref="$candidate"
      break
    fi
  done
  [ -n "$base_ref" ] || fail "could not find a default branch (tried origin/HEAD, origin/main, origin/master, main, master); pass base=<ref>"
  # Show the branch origin/HEAD points to (e.g. origin/main) rather than the symbolic name.
  if [ "$base_ref" = "origin/HEAD" ]; then
    resolved="$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || true)"
    [ -n "$resolved" ] && base_ref="$resolved"
  fi
  base_source="default"
fi
base_sha="$(git merge-base "$base_ref" HEAD)" || fail "no common ancestor between $base_ref and HEAD"

# --- stacked-branch detection: local branches strictly between the merge-base and HEAD
stacked_on=""
while IFS= read -r b; do
  [ "$b" = "$branch" ] && continue
  [ "$b" = "$base_ref" ] && continue
  tip="$(git rev-parse "$b")"
  [ "$tip" = "$base_sha" ] && continue
  [ "$tip" = "$head_sha" ] && continue
  if git merge-base --is-ancestor "$tip" HEAD && ! git merge-base --is-ancestor "$tip" "$base_sha"; then
    stacked_on="${stacked_on:+$stacked_on, }$b"
  fi
done < <(git for-each-ref --format='%(refname:short)' refs/heads)

# --- the diff
if [ "$include_uncommitted" -eq 1 ]; then
  range=("$base_sha")              # merge-base vs working tree (staged + unstaged tracked changes)
  range_label="$base_sha..WORKTREE"
else
  range=("$base_sha" "$head_sha")  # committed changes only
  range_label="$base_sha..$head_sha"
fi

git diff --name-only -M "${range[@]}" -- . ':(exclude).pre-pr-review' | sed 's/^/?? /' | { grep -Ev "$TOOLING_RE" || true; } | sed 's/^?? //' | LC_ALL=C sort > "$run_dir/.all-files"
git diff --name-only -M "${range[@]}" -- . "${excludes[@]}" | LC_ALL=C sort > "$run_dir/files.txt"
LC_ALL=C comm -23 "$run_dir/.all-files" "$run_dir/files.txt" > "$run_dir/skipped.txt"
rm -f "$run_dir/.all-files"

git diff --no-color --no-ext-diff -M -U"$CONTEXT_LINES" "${range[@]}" -- . "${excludes[@]}" > "$run_dir/diff.patch"
lines_changed="$(git diff --numstat -M "${range[@]}" -- . "${excludes[@]}" | awk '$1 != "-" { n += $1 + $2 } END { print n + 0 }')"
files_reviewed="$(grep -c '' "$run_dir/files.txt" || true)"
files_skipped="$(grep -c '' "$run_dir/skipped.txt" || true)"

ask_first="no"
[ "$lines_changed" -gt "$LARGE_DIFF_LINES" ] && ask_first="yes"

# --- earlier reviews of this commit (see references/second-run.md)
# Reads only state.txt (scope + run counts per lens), never the earlier findings,
# so a second run stays independent until it has written its own results.
prior_run="none"; prior_pending=""; prior_archived=""
if [ -f "$run_dir/findings.json" ]; then
  state="$run_dir/state.txt"
  same_scope="no"
  if [ -f "$state" ] \
     && [ "$(awk '$1=="base_sha"{print $2}' "$state")" = "$base_sha" ] \
     && [ "$(awk '$1=="include_uncommitted"{print $2}' "$state")" = "no" ] \
     && [ "$include_uncommitted" -eq 0 ]; then
    same_scope="yes"
    # lens lines: <lens> <runs_configured> <runs_completed> <families-that-ran, comma-separated>
    prior_pending="$(awk '($1=="correctness"||$1=="security"||$1=="quality") && $3+0 < $2+0 {printf "%s%s(%s)", sep, $1, $4; sep=","}' "$state")"
  fi
  if [ "$same_scope" = "yes" ] && [ -n "$prior_pending" ]; then
    prior_run="incomplete"
  else
    # Complete, different scope, or unknown: keep it, out of the way, and start fresh.
    n=1; while [ -e "$run_dir/previous/$n" ]; do n=$((n + 1)); done
    mkdir -p "$run_dir/previous/$n"
    for f in findings.json report.md state.txt second-run.json; do
      [ -f "$run_dir/$f" ] && mv "$run_dir/$f" "$run_dir/previous/$n/"
    done
    prior_run="archived"; prior_archived="$run_dir/previous/$n"
  fi
fi
# Reviews of earlier commits on this branch are out of date.
earlier=""
for d in ".pre-pr-review/$safe_branch"/*/; do
  d="${d%/}"; s="${d##*/}"
  [ "$s" = "$short_sha" ] && continue
  { [ -f "$d/findings.json" ] || [ -d "$d/previous" ]; } && earlier="${earlier:+$earlier,}$s"
done

gitignored="no"
git check-ignore -q .pre-pr-review 2>/dev/null && gitignored="yes"

# --- report
out RUN_DIR "$run_dir"
out REPO_ROOT "$root"
out BRANCH "$branch"
out HEAD_SHA "$head_sha"
out BASE_REF "$base_ref"
out BASE_SOURCE "$base_source"
out BASE_SHA "$base_sha"
out RANGE "$range_label"
out INCLUDE_UNCOMMITTED "$([ "$include_uncommitted" -eq 1 ] && echo yes || echo no)"
out FILES_REVIEWED "$files_reviewed"
out LINES_CHANGED "$lines_changed"
out FILES_SKIPPED "$files_skipped"
out UNCOMMITTED_CHANGES "$uncommitted"
out UNTRACKED_FILES "$untracked"
out STACKED_ON "${stacked_on:-none}"
out ASK_FIRST "$ask_first"
out PRIOR_RUN "$prior_run"
[ -n "$prior_pending" ] && [ "$prior_run" = "incomplete" ] && out PRIOR_PENDING "$prior_pending"
[ -n "$prior_archived" ] && out PRIOR_ARCHIVED_TO "$prior_archived"
out EARLIER_REVIEWS "${earlier:-none}"
out GITIGNORED "$gitignored"
[ "$files_reviewed" -eq 0 ] && out WARNING "no reviewable changes between $base_ref and HEAD"
exit 0
