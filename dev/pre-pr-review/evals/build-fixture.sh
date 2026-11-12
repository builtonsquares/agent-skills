#!/usr/bin/env bash
# Build an eval fixture into a real git repo the skill can review.
#
#   evals/build-fixture.sh <fixture-name> <dest-dir>
#
# Layout of a fixture:  evals/fixtures/<name>/base/     -> committed on main, pushed to a local bare "origin"
#                       evals/fixtures/<name>/feature/  -> overlaid on a `feature` branch and committed
#                       evals/fixtures/<name>/feature.delete (optional) -> paths removed on `feature`
#
# Commits use fixed authors and dates, so the SHAs are the same on every run.
set -euo pipefail

die() { echo "build-fixture: $*" >&2; exit 1; }

[[ $# -eq 2 ]] || die "usage: $0 <fixture-name> <dest-dir>"
name="$1"
dest="$2"

fixtures_dir="$(cd "$(dirname "$0")/fixtures" && pwd)"
src="$fixtures_dir/$name"
[[ -d "$src/base" && -d "$src/feature" ]] || die "no fixture '$name' (expected $src/base and $src/feature)"
[[ ! -e "$dest" ]] || die "destination already exists: $dest"

origin="${dest%/}.origin.git"
[[ ! -e "$origin" ]] || die "origin path already exists: $origin"

export GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.invalid"
export GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.invalid"
git_q() { git -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@"; }

mkdir -p "$dest"
cp -R "$src/base/." "$dest/"
cd "$dest"

git_q init -q -b main
git_q add -A
GIT_AUTHOR_DATE="2026-01-01T00:00:00Z" GIT_COMMITTER_DATE="2026-01-01T00:00:00Z" \
  git_q commit -q -m "base"

git_q init -q --bare "$origin"
git_q remote add origin "$origin"
git_q push -q origin main
git_q remote set-head origin main

git_q checkout -q -b feature
# Optional: evals/fixtures/<name>/feature.delete lists repo paths (one per line) the feature removes.
if [[ -f "$src/feature.delete" ]]; then
  while IFS= read -r path || [[ -n "$path" ]]; do
    [[ -z "$path" || "$path" == \#* ]] && continue
    git_q rm -q -- "$path"
  done < "$src/feature.delete"
fi
cp -R "$src/feature/." "$dest/"
git_q add -A
GIT_AUTHOR_DATE="2026-01-02T00:00:00Z" GIT_COMMITTER_DATE="2026-01-02T00:00:00Z" \
  git_q commit -q -m "feature: $name"

# Optional stacked layer: evals/fixtures/<name>/feature-2/ becomes branch `feature-2` on top of `feature`.
if [[ -d "$src/feature-2" ]]; then
  git_q checkout -q -b feature-2
  cp -R "$src/feature-2/." "$dest/"
  git_q add -A
  GIT_AUTHOR_DATE="2026-01-03T00:00:00Z" GIT_COMMITTER_DATE="2026-01-03T00:00:00Z" \
    git_q commit -q -m "feature-2: $name (stacked on feature)"
fi

echo "built '$name' at $dest (origin/HEAD -> main, HEAD -> $(git symbolic-ref --short HEAD) @ $(git rev-parse --short HEAD))"
