# Scope: what gets reviewed

`scripts/collect.sh` decides the scope deterministically, so the agent never assembles git commands itself. This file explains its behavior so you can answer user questions about it.

## Base resolution

1. `base=<ref>` argument, if given. Any ref works: a branch, `origin/<branch>`, a tag, a SHA.
2. Otherwise the first of `origin/HEAD`, `origin/main`, `origin/master`, `main`, `master` that exists and is not the branch under review.

The review covers `merge-base(BASE_REF, HEAD)..HEAD`, which is what a PR from this branch would show. Commits that landed on the base after you branched are **not** included.

## Stacked branches

The team uses GitHub's built-in stacked PRs with no local stacking tool, so the parent can't be known for sure. `collect.sh` reports `STACKED_ON: <branches>` when local branches sit strictly between the merge-base and HEAD. That means you branched off another unmerged branch. The skill never guesses the parent. It reviews back to `BASE_REF` and tells the user to pass `base=<parent-branch>` to review only their layer.

## Uncommitted changes

By default only **committed** changes are reviewed, because those are what the PR will contain. Uncommitted changes are counted and reported as a warning. With `include-uncommitted`, the diff is merge-base vs working tree, which includes staged and unstaged edits to tracked files. Untracked files are still excluded until `git add`ed.

## Skipped files

Changed files matching these patterns are not reviewed. They're listed in the report under "Not reviewed" so nothing disappears silently:

- **Lock files:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `bun.lockb`, `Cargo.lock`, `poetry.lock`, `uv.lock`, `Pipfile.lock`, `Gemfile.lock`, `composer.lock`, `go.sum`, `packages.lock.json`, `gradle.lockfile`
- **Build output and bundles:** `*.min.js`, `*.min.css`, `*.map`, `dist/`, `build/`
- **Vendored code:** `node_modules/`, `vendor/`
- **Generated code:** `*.generated.*`, `__generated__/`, `generated/`, `*.pb.go`, `*_pb2.py`, `*_pb2.pyi`
- **Snapshots:** `*.snap`

Dependency *manifest* changes (`package.json`, `requirements.txt`, `go.mod`, …) **are** reviewed, so new or risky dependencies get checked by the security lens.

## Large diffs

More than 3,000 changed lines (`ASK_FIRST: yes`): ask the user whether to review everything, go one top-level directory at a time, or cancel. Very large diffs reduce review quality, because attention gets spread thin.

## Run directory

Everything for one review lives in `.pre-pr-review/<branch>/<short-head-sha>/`:

| File | Written by | Purpose |
|---|---|---|
| `diff.patch` | collect.sh | The diff under review (10 lines of context) |
| `files.txt` / `skipped.txt` | collect.sh | Reviewed / not-reviewed changed files |
| `status.before` / `status.after` | collect.sh / verify-writes.sh | Write check |
| `findings.json` | agent | Source of truth for the review |
| `report.md` | agent | Rendered report |

The same branch at the same commit always maps to the same directory. That's how a second run (with a different model) finds the first run's findings.
