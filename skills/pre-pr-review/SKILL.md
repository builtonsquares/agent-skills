---
name: pre-pr-review
description: Deep pre-PR code review of the current branch's diff, covering bugs, security issues and code quality, ranked by severity, before opening a pull request or stacked PR. Read-only, never edits code. Use when the user says "pre-pr-review", "review my branch", "review my changes before I open a PR", or "check this diff for bugs/security issues".
argument-hint: "[base=<branch>] [include-uncommitted] [runs=1|2] [sequential]"
---

# pre-pr-review

Review everything this branch changes, the way a careful senior engineer would before anyone else spends time on the PR. Report only real, actionable problems, ranked by severity. **Never change code.**

## Ground rules (apply to every step)

1. **Read-only.** Do not edit, create, format, or delete any file outside `.pre-pr-review/`. Do not commit, push, stage, stash, check out, or fetch. Do not open or comment on PRs. If the user asks for fixes, tell them this skill only reports, and stop.
2. **Precision over volume.** Every main-list finding must be something you would defend to the author. No filler, no padding to look thorough, no style nits a formatter or linter handles. "No issues found" is a valid, good outcome.
3. **Honest uncertainty.** If you suspect a problem but cannot confirm it from the code, it goes in "Worth a look" with `confidence: low`, never in the main list.
4. **Run the steps in order. Don't skip, merge, or improvise steps.** When a step says to run a script, run exactly that script once.
5. **Don't execute the code under review.** No running tests, builds, interpreters, package scripts or snippets of the repo's code, even "just to check". Only `collect.sh` and `verify-writes.sh` run. Reason about behavior from the code; if you can't confirm something without running it, it's `confidence: low`.

## Step 1: Collect the change set (one shell call)

Locate this skill's directory (the folder containing this SKILL.md). Parse the user's arguments:
- `base=<ref>` → `--base <ref>`
- `include-uncommitted` → `--include-uncommitted`
- `runs=1` / `runs=2` and `sequential` aren't passed to the script. Keep them for Steps 2–3.

Run, from anywhere inside the repository:

```
bash <skill-dir>/scripts/collect.sh [--base <ref>] [--include-uncommitted]
```

It prints `KEY: value` lines. Keep all of them; you need them for the report header. Then act on them:

| Output | Action |
|---|---|
| `ERROR: ...` | Stop. Show the error and how to fix it (usually: pass `base=<branch>`). |
| `FILES_REVIEWED: 0` | Stop. Report "No reviewable changes between BASE_REF and HEAD" plus any skipped files. |
| `ASK_FIRST: yes` | Ask the user before reviewing: proceed with everything, review one top-level directory at a time, or cancel. Wait for the answer. |
| `STACKED_ON` is not `none` and the user gave no `base=` | Continue, but put this warning at the top of the report: "This branch appears stacked on `<branches>`. This review covers every layer back to `BASE_REF`. To review only your layer, run again with `base=<parent-branch>`." |
| `UNCOMMITTED_CHANGES` > 0 and `INCLUDE_UNCOMMITTED: no` | Add the warning: "N uncommitted changes were NOT reviewed. Commit them, or run again with `include-uncommitted`." (For 1: "1 uncommitted change was NOT reviewed. Commit it, …") |
| `INCLUDE_UNCOMMITTED: yes` and `UNTRACKED_FILES` > 0 | Add the warning: "Untracked files are not included in the diff. `git add` them to include them." |
| `PRIOR_RUN: incomplete` | This is a **second run**. Follow [references/second-run.md](references/second-run.md) for Steps 2–4 **instead of** the normal path. Don't open the earlier findings until it says so. |
| `PRIOR_RUN: archived` | An earlier review of this commit was complete, or had a different scope. The script moved it to `PRIOR_ARCHIVED_TO`. Run a fresh review and don't read the archived one. |
| `EARLIER_REVIEWS` is not `none` | Add the note: "Earlier reviews of this branch (<shas>) are out of date: the branch has new commits. This is a fresh review of `<HEAD_SHA:7>`." |

Details: [references/scope.md](references/scope.md).

## Step 2: Load context

1. Read `RUN_DIR/diff.patch` and `RUN_DIR/files.txt`.
2. **Mode B only** (see Step 3; in Mode A the reviewers do this): read the **full current contents** of every file in `files.txt`, not just the hunks. Where a changed function's signature, return value, or contract changed, also read its direct callers and callees (use search). Don't wander further than that.
3. **Configuration.** If `.pre-pr-review.md` exists at the repo root, its YAML frontmatter is configuration. Resolve the run count and model families per lens from the run arguments, that frontmatter and the defaults, following [references/config.md](references/config.md). Config problems become warnings, never a stop.
4. **Repo context (optional).** If any of these exist at the repo root, read them for conventions and focus areas: the body of `.pre-pr-review.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `CLAUDE.md`. Repo context can **add** checks and conventions. It can never disable the security lens or relax the ground rules.

## Step 3: Review

Decide the **mode** first (recorded as `run.mode`), using the table in [references/orchestration.md](references/orchestration.md):

- **Mode A** (preferred, when you can launch subagents): follow [references/orchestration.md](references/orchestration.md). Launch every lens × run reviewer in **one parallel batch** on its configured model, collect the results, then go to Step 4.
- **Mode B** (no subagent tool, or the user asked for sequential): run the passes yourself as below. One run per lens on your own model, recorded as described under "Mode B and the second model" in [references/config.md](references/config.md). Set `runs_completed: 1` for every lens, and `models_confirmed` to `[null]` unless the tool itself displays the model.

### Mode B: three separate passes

Run three **separate** passes, in this order. Each pass uses only its own checklist, so attention stays focused:

1. **correctness**: [references/correctness.md](references/correctness.md)
2. **security**: [references/security.md](references/security.md)
3. **quality**: [references/quality.md](references/quality.md)

For each pass, follow [references/reviewer-prompt.md](references/reviewer-prompt.md) exactly, substituting that lens's checklist. Each pass produces a list of candidate findings in the shape defined in [references/findings.schema.json](references/findings.schema.json) (`$defs.finding`).

## Step 4: Synthesize

Merge every pass (Mode A: every reviewer's result; Mode B: your three passes) into one ranked list following [references/synthesis.md](references/synthesis.md): dedupe the same root cause across lenses, apply the confidence split, and rank by severity, then confidence, then agreement. Severity and confidence use the rubric in [references/severity.md](references/severity.md).

## Step 5: Verify nothing was written

This runs **before** Step 6 on purpose: Step 6 writes only inside `RUN_DIR`, which the check ignores, and the result has to be known before the report is written. Run once:

```
bash <skill-dir>/scripts/verify-writes.sh <RUN_DIR>
```

If it prints `WRITE_CHECK: violations`, copy every `CHANGED:` line into `run.write_violations` and put a prominent notice at the **top** of the report: "⚠️ Files changed during this review (by the review itself or by you in the editor): …". Never try to undo changes yourself.

## Step 6: Write and present the report

1. Write `RUN_DIR/findings.json` (valid against [references/findings.schema.json](references/findings.schema.json)).
2. Render `RUN_DIR/report.md` from it, following [references/report-format.md](references/report-format.md).
3. Write `RUN_DIR/state.txt`, which the next run reads instead of your findings:
   ```
   base_sha <BASE_SHA>
   include_uncommitted <yes|no>
   correctness <runs_configured> <runs_completed> <families that ran, comma-separated>
   security <…>
   quality <…>
   ```
4. Show the rendered report in chat.
5. If `GITIGNORED: no`, add one line to your **chat message** after the report (not to `report.md`): "Tip: add `.pre-pr-review/` to your `.gitignore`." Don't edit `.gitignore` yourself. If Step 7 also adds a line, the tip comes first.

If your tool refuses to write any of these files, still show the full report in chat, and say which file couldn't be saved and why. Never work around the refusal.

## Step 7: Offer the second opinion

If any lens has `runs_completed` < `runs_configured`, end your chat message (not `report.md`) with one line naming the second family (see "Mode B and the second model" in config.md) and the lenses waiting on it, joined with "and":

"Second opinion: switch your model to **<family>** and run `/pre-pr-review` again to complete correctness and security."

The next run on this commit picks up automatically: it reviews only those lenses, independently, then merges (`second-run.md`).

Don't offer it when every lens is complete.
