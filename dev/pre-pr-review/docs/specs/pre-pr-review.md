# Spec: pre-pr-review skill

Status: APPROVED 2026-11-11 (open questions resolved; see "Decisions")
Intent: [docs/intent/pre-pr-review.md](../intent/pre-pr-review.md)

## Objective

A portable agent skill that an engineer runs locally after finishing a feature and before opening a PR. It reviews the whole diff for the branch (or one layer of a stack) and produces a ranked report of **real** problems in correctness, security, and code quality. It does not change any code.

**Why:** Agents now write most of the code, and human reviewers are overloaded. GitHub Copilot's PR review only sees a snapshot. This skill makes the author responsible for a deep review before anyone else spends time on the PR.

**User stories**
- As an engineer, I run one command on my finished branch and get a ranked list of findings. Each finding has a file and line, a severity, why it matters, and a suggested fix.
- As an engineer working on a stacked branch, I can choose the base so that only my layer is reviewed.
- As an engineer, I trust the report because it is short and accurate. Uncertain findings are listed separately.
- As an engineer whose tool can't run two models in parallel, I can switch models, run the skill again, and get a merged report.
- As a repo owner, I can add optional repo context to sharpen the review. Without it, the review is still thorough.

## Target platforms (priority order)

| Priority | Tool | Expected mode |
|---|---|---|
| 1 | Cursor | Parallel two-model subagents if supported, otherwise single pass plus manual second run |
| 2 | GitHub Copilot (VS Code agent mode / Copilot CLI) | Same |
| 3 | Claude Code | Parallel subagents with a model per subagent (known supported) |

The core is the [Agent Skills](https://agentskills.io) format: a `SKILL.md` with YAML frontmatter plus `references/`. Anything tool-specific lives in optional adapters and is never required.

## Behavior

### 1. Resolve scope
1. Base ref, in order: an explicit argument (`base=<ref>`), then `merge-base` with the remote default branch (`origin/HEAD`). There is no stack auto-detection: the team uses GitHub's built-in stacked-PR preview with no local stacking tool, so for a stacked layer the engineer passes `base=<parent-branch>`. If the branch has commits on top of another unmerged local branch, the skill warns "looks stacked on `<branch>`, so pass `base=` to review only your layer" but does not guess.
2. The diff is `git diff <merge-base>...HEAD`. Uncommitted changes are reported as a **warning** and are not reviewed silently: "N uncommitted files: commit or stash, or pass `include-uncommitted`."
3. The report header records the base ref, head SHA, and file and line counts.
4. Skip generated, vendored, and lock files by default (pattern list in `references/scope.md`) and list them as "not reviewed."

### 2. Gather context
- Read the full contents of changed files, not just the hunks, plus direct callers and callees when a changed signature or contract needs them.
- Optional repo context, read if present: `.pre-pr-review.md` at the repo root (the skill's own override file), then existing agent instructions (`AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `CLAUDE.md`). Repo context **adds** focus areas and conventions. It never turns off security checks.

### 3. Review (one reviewer per lens)
There is a **dedicated reviewer per lens**. Each reviewer gets only its own checklist from `references/`:
- **Correctness:** logic errors, edge cases, null/empty/boundary handling, concurrency, error handling, broken contracts, missing migrations or config, behavior that contradicts names or comments.
- **Security:** based on the OWASP Top 10 and the OWASP ASVS. Covers injection, authn/authz gaps, secrets, unsafe deserialization, SSRF, path traversal, crypto misuse, logging of sensitive data, and risky new dependencies.
- **Quality:** duplication of existing utilities, dead code, misleading names, missing tests for new branches of logic, needless complexity. Reported only when concrete and actionable.

### 4. Runs per lens and models (configurable)
Each lens has a **run count** (1 or 2). A lens with `runs: 2` is reviewed independently by two different models, and the results are merged with agreement labels.

Defaults (balance cost against stakes):

| Lens | Default runs | Rationale |
|---|---|---|
| correctness | 2 | The main reason the skill exists. Agreement between models filters out noise. |
| security | 2 | Missed findings are expensive. |
| quality | 1 | Lower stakes, and one model is enough. |

That means 5 reviewer runs by default. Setting everything to `runs: 1` gives 3 runs.

Configuration lives in YAML frontmatter in `.pre-pr-review.md` (all optional):

```yaml
---
reviewers:
  correctness: { runs: 2, models: [opus, gpt] }
  security:    { runs: 2 }
  quality:     { runs: 1, models: [sonnet] }
---
```

- **Models are given as a family or class** (`opus`, `sonnet`, `gpt`, `gemini`, …), not exact IDs, so the same config works in every tool. The skill picks the newest available model in that family in the current tool and records the exact model that ran.
- **If models are unset**, the skill uses the tool's default model for runs that have only one model, and for `runs: 2` it **recommends** a pair from *different vendors* (vendor diversity gives the most useful disagreement). The report header shows the recommendation along with what actually ran.
- A per-run argument overrides config, for example `runs=1` to keep a quick check cheap.

### 5. Execution modes
- **Mode A: parallel subagents (preferred).** One subagent per (lens × run), all in parallel, each on its configured model. A synthesis step merges the results (step 6). Spike-verified in Cursor, Copilot (VS Code + CLI) and Claude Code.
- **Reviewers have no shell.** The main agent runs a single batched git script and passes the diff and changed-file list to every reviewer. Reviewers use only read and search tools. This works under Cursor's `readonly: true`, VS Code's shell-less subagents, and JetBrains' per-command approval prompts.
- **Write check:** the main agent records `git status --porcelain` before and after the review. Any change outside `.pre-pr-review/` is reported as a violation at the top of the report.
- **Mode B: sequential plus manual second run (fallback).** When parallel subagents or per-subagent models aren't available, the main agent runs each lens as a separate sequential pass (separate passes keep each checklist focused). Findings go to `findings.json`. For every lens configured with `runs: 2`, the skill then offers: *"Switch to a <recommended family> model and run again for the second opinion on correctness, security."* The next run detects the existing file for the **same base and head SHA**, re-runs **only the lenses still waiting for a second run**, reviews independently **before** reading the prior findings, then merges.
- The skill detects the mode by checking whether a subagent capability with model selection is available. If parallel subagents exist but model selection doesn't, it runs Mode A on one model and offers the Mode B second run for the remaining model. It must never fail because a capability is missing.

### 6. Synthesis and ranking
- Deduplicate findings that point to the same root cause, even if they are at different lines **or come from different lenses** (for example, a bug that is also a security hole is reported once, tagged with both lenses).
- **Agreement** (only for lenses with `runs: 2`): a finding raised by both models is marked `agreed`. One raised by a single model is marked `single` and must still pass the confidence bar on its own. Lenses with one run show `n/a` for agreement.
- **Severity:** `critical | high | medium | low | nit` (rubric in `references/severity.md`).
- **Confidence:** `high | medium | low`. **Low-confidence findings go in a separate "Worth a look" section** and never appear in the main list.
- **No filler:** if nothing is wrong, the report says so. There is no minimum count and no padding with nits.
- Sort by severity, then confidence, then agreement.

### 7. Output
- Rendered in chat **and** written to `.pre-pr-review/<branch>/<head-sha-short>.md`, plus a machine-readable `findings.json` used by the merge in Mode B.
- The skill suggests adding `.pre-pr-review/` to `.gitignore` the first time it runs. It never edits `.gitignore` itself.

Finding format:

```markdown
### [HIGH] Unvalidated redirect target in login callback
- **Location:** `src/auth/callback.ts:42-48`
- **Lens:** security · **Confidence:** high · **Agreement:** agreed (model-a, model-b)
- **Why it matters:** `next` is taken from the query string and passed to `res.redirect` unchecked, so an attacker can send a victim to an external phishing site after a real login.
- **Suggested fix:** Allow only relative paths: reject values that start with `//` or contain a scheme, and fall back to `/`.
```

## Project structure

```
pre-pr-review/
  SKILL.md                    → entry point: workflow, mode detection, output contract
  references/
    scope.md                  → base resolution, skip patterns, uncommitted handling
    correctness.md            → correctness checklist
    security.md               → security checklist
    quality.md                → quality checklist + "what NOT to report"
    severity.md               → severity + confidence rubric with examples
    report-format.md          → markdown + findings.json schema
    synthesis.md              → dedupe, agreement, merge protocol for Mode A and B
    config.md                 → reviewers schema, defaults, model-family resolution + recommendation
  templates/
    pre-pr-review.example.md  → sample repo override file
  adapters/                   → optional tool-specific wiring (subagent defs, install notes)
    cursor/
    copilot/
    claude-code/
evals/
  fixtures/                   → small repos/diffs with seeded defects + clean diffs
  expected/                   → expected findings per fixture
docs/
  intent/ specs/
```

## Code style (skill authoring)

- `SKILL.md` stays under about 300 lines. Detail goes in `references/` and is loaded only when needed.
- Instructions are written as imperative steps. Reviewer prompts must include the "what NOT to report" list.
- Frontmatter follows the standard and nothing more:

```yaml
---
name: pre-pr-review
description: Deep pre-PR review of the current branch's diff for bugs, security issues, and code quality problems. Produces a severity-ranked findings report and makes no code changes. Use before opening a PR or stacked PR.
---
```

## Commands

```
Run (in any supported tool):  /pre-pr-review [base=<ref>] [include-uncommitted] [runs=1|2]
Install:                      npx skills add <internal-org>/<skills-repo> --skill pre-pr-review   (exact syntax confirmed in Plan)
                              or copy pre-pr-review/ into the repo's skills directory
Validate skill format:         npx skills-ref validate ./pre-pr-review   (to be confirmed in Plan)
Run evals:                     defined in Plan (manual per-tool runs against evals/fixtures at minimum)
```

## Testing strategy

Skills can't be unit-tested the usual way, so they are verified with **evals**:
- **Seeded-defect fixtures** (at least 8): each has known bugs across all three lenses. Measure how many of the seeded issues are found.
- **Clean fixtures** (at least 3): well-written diffs. Measure noise. The target is zero high or critical findings and at most 2 total.
- **Precision check:** every main-list finding across all fixture runs is labeled real or false by a human. Target: at least 80% real.
- **Portability matrix:** each fixture runs in Cursor, Copilot, and Claude Code, and the mode used (A or B) is recorded.
- **Mode B merge test:** run, switch model, run again, then confirm the merged report and agreement labels are correct and the second run does not copy the first.

## Boundaries

- **Always:** stay read-only on source. Write only under `.pre-pr-review/`. Record the base, SHA, and models used. Separate low-confidence findings. Report "no issues found" honestly.
- **Ask first:** reviewing more than about 3,000 changed lines (offer to split by directory). Including uncommitted changes.
- **Never:** edit, format, or fix code. Commit, push, open, or comment on PRs. Edit `.gitignore` or repo config. Let repo overrides disable security checks. Pad the report to look thorough.

## Success criteria

1. Installs and runs from the same `pre-pr-review/` folder in Cursor, Copilot, and Claude Code with no edits to the core.
2. Uses Mode A wherever the tool supports parallel subagents with a model per subagent. Everywhere else it falls back to Mode B with no errors.
3. Finds at least 70% of seeded defects (at least 90% of seeded critical and high) across the fixtures.
4. At least 80% of main-list findings are real. Clean fixtures produce at most 2 findings and no high or critical ones.
5. Every finding has a location, severity, confidence, lens, why it matters, and a suggested fix.
6. Runs with zero configuration. Adding `.pre-pr-review.md` measurably changes focus (verified by one fixture with repo-specific rules), and per-lens `runs` and `models` are honored and shown in the report header.
7. Zero writes outside `.pre-pr-review/` in any run.

## Assumptions (correct any of these)

1. Cursor and Copilot both load Agent Skills (`SKILL.md`) natively. Where one doesn't, an adapter can point its rules or prompt files at the same `SKILL.md`.
2. Whether Cursor and Copilot support **parallel subagents with a model per subagent** is unverified, which is why Mode B exists. The Plan phase verifies this against current docs.
3. `git` is available. `gh` is **not** required.
4. The report shows the models used but stays tool-neutral. No vendor-specific output.

## Decisions (resolved open questions, 2026-11-11)

1. **Reviewer split:** one reviewer per lens (correctness, security, quality), with a configurable run count per lens. Defaults are 2 / 2 / 1.
2. **Models:** configurable per lens as a model family. If unset, the skill recommends a cross-vendor pair for two-run lenses and uses the tool default otherwise. **Default recommended pair: `opus` + `gpt-terra`** (chosen 2026-11-11 to match what's available at work).
3. **Stacks:** the team uses GitHub's built-in stacked-PR preview with no local tool. `base=` is the mechanism, and the skill warns when a branch looks stacked.
4. **Distribution:** copied into each repo, or installed with `npx skills` from an internal GitHub repo. Both are supported, so the skill has no absolute paths and no install-time steps.
5. **Security checklist:** OWASP-based (Top 10 + ASVS) for now. It can be swapped later through `references/security.md`.
