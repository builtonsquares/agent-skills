# pre-pr-review: user guide

A read-only, pre-PR code review skill for **Cursor**, **GitHub Copilot** and **Claude Code**. Run it on your branch before you open a PR. It reviews the whole diff for correctness, security and code quality and returns a ranked list of findings. Each finding has a file and line, a severity, why it matters and a suggested fix.

It never changes code. Fixing is up to you (or your SDLC's remediation step).

**Version 1.0.0.** See the [changelog](../CHANGELOG.md).

## Supported tools

| Tool | Status in 1.0.0 |
|---|---|
| Cursor | Tested: all eval fixtures pass, reviewers run in parallel on two models |
| GitHub Copilot in VS Code | Tested: all eval fixtures pass, reviewers run in parallel on two models |
| Claude Code | Tested: all eval fixtures pass (Opus + Sonnet) |
| Copilot CLI, Copilot in JetBrains | Not tested yet. It may work; please report what happens |

## Install (recommended: `npx skills`)

From the root of the repo you want to review:

```bash
npx skills add builtonsquares/agent-skills --skill pre-pr-review -a cursor github-copilot claude-code
```

- Cursor and Copilot read the skill from `.agents/skills/pre-pr-review/`. Claude Code gets a symlink at `.claude/skills/pre-pr-review/`.
- Commit `skills-lock.json` and the installed folders so the whole team gets the same version.
- Add `-g` to install it for yourself across all repos instead.
- Update later with `npx skills update pre-pr-review`.

Leave out any agent you don't use. Run `npx skills add builtonsquares/agent-skills --list` to see what the repo offers.

### Manual install (no npx)

Copy `skills/pre-pr-review/` into `.agents/skills/pre-pr-review/` in your repo. Cursor and Copilot in VS Code both pick it up from there, including the `/pre-pr-review` slash command (verified 2026-11-19). Claude Code needs its own copy:

| Tool | Folder |
|---|---|
| Cursor | `.agents/skills/pre-pr-review/` (or `.cursor/skills/`) |
| GitHub Copilot (VS Code) | `.agents/skills/pre-pr-review/` (or `.github/skills/`) |
| Claude Code | `.claude/skills/pre-pr-review/` |

The skill leaves its own folders out of the review and out of the "uncommitted changes" count.

### Optional: read-only reviewer agents

When your tool supports subagents, the skill runs its reviewers in parallel. Without these files it uses the tool's general subagent, and a check after the review reports any file that changed. With them, the tool itself blocks reviewers from editing. `npx skills` doesn't install agent files, so copy the one for your tool once:

| Tool | Copy | To |
|---|---|---|
| Cursor | `agents/cursor/pre-pr-reviewer.md` | `.cursor/agents/` |
| GitHub Copilot (VS Code) | `agents/copilot/pre-pr-reviewer.agent.md` | `.github/agents/` |
| Claude Code | `agents/claude-code/pre-pr-reviewer.md` | `.claude/agents/` |

(Paths are relative to the installed skill folder, e.g. `.agents/skills/pre-pr-review/`.) The files don't pin a model. The skill picks the model for each reviewer.

## Use

In your tool's agent chat, on the branch you want to review:

```
/pre-pr-review
```

Or ask in plain words: "run pre-pr-review" or "review my branch before I open a PR".

| Argument | Effect |
|---|---|
| `base=<branch>` | Review against this branch. Use your parent branch when the PR is stacked. |
| `include-uncommitted` | Also review uncommitted changes (by default only committed work is reviewed) |
| `runs=1` | Quick check: one model per topic (3 reviewers instead of 5) |
| `sequential` | Don't use parallel subagents |

Pick a specific model for the main chat (e.g. Claude Opus 5.5), not Auto or Copilot Fusion. The skill stops and asks you to pick one if it finds a router, because a router may send every reviewer to the same model. The report appears in chat and in `.pre-pr-review/<branch>/<commit>/report.md`. Add `.pre-pr-review/` to your `.gitignore`.

### Two models

By default, correctness and security are each reviewed by **two models** and quality by one. Findings both models raise are marked **agreed**.

| Tool | Default pair |
|---|---|
| Cursor, Copilot | Opus + GPT Terra |
| Claude Code | Opus + Sonnet |

If your tool can't run reviewers in parallel, the skill reviews with your current model and then tells you which model to switch to. Run it again on the same commit and it completes the review, merging in the second opinion.

## Configure and tune (optional)

With no config, every review runs **5 reviewers**: correctness ×2, security ×2, quality ×1, on your tool's default pair of models. That's the setup the evals measured. To change it, add `.pre-pr-review.md` at your repo root. Start from `templates/pre-pr-review.example.md` in the installed skill folder.

### What you can change

| Setting | Where | What it trades |
|---|---|---|
| Runs per lens (`1` or `2`) | `reviewers.<lens>.runs` | Fewer runs: cheaper and faster. Two runs: a second opinion, and findings both models raise are marked **agreed** |
| Models per lens | `reviewers.<lens>.models` | Smaller models (`sonnet`, `haiku`) cost less; two different vendors catch more |
| One-off quick check | `/pre-pr-review runs=1` | Sets every lens to 1 run for this review only (3 reviewers) |
| Repo context | Body of `.pre-pr-review.md` | Sharper focus: in the evals, a repo rule raised a convention finding from low to medium and made it cite the rule. Costs a little more input per reviewer |

Lenses: `correctness`, `security`, `quality`. Security can't be turned off. Models are **families**, not exact IDs, so one file works in every tool: `opus`, `sonnet`, `haiku`, `gpt-terra`, `gpt`, `gemini`. The skill picks the newest model of each family from your tool's list. A family your tool doesn't offer (GPT or Gemini in Claude Code) is replaced with the other member of the tool's default pair, and the report says so.

Run arguments beat the file, and the file beats the defaults. A bad setting gives a warning in the report and falls back to the default; it never stops the review.

### Presets

| Goal | Reviewers | Frontmatter |
|---|---|---|
| **Default** (balanced, eval-tested) | 5 | none |
| **Quick check** before pushing a small change | 3 | none; type `/pre-pr-review runs=1` |
| **Cheaper every day** | 3 | `correctness: { runs: 1 }` `security: { runs: 1 }` `quality: { runs: 1, models: [sonnet] }` |
| **Most thorough** (risky or large PRs) | 6 | `quality: { runs: 2 }` |
| **Security-sensitive repo**, lower cost elsewhere | 4 | `correctness: { runs: 1 }` `quality: { runs: 1, models: [sonnet] }` |

Only the default was measured in the evals: every planted bug found, and 98–100% of findings real. The other presets trade some of that for cost or speed. A single run per lens loses the second opinion, and a smaller model may miss subtle bugs. If you lower cost, keep `security` at 2 runs.

### Example `.pre-pr-review.md`

```markdown
---
reviewers:
  correctness: { runs: 2 }                          # two models (default pair)
  security:    { runs: 2, models: [opus, gpt-terra] }
  quality:     { runs: 1, models: [sonnet] }        # cheaper model for style and maintainability
---

## Conventions
- Services return Result<T, AppError>; they never throw.
- All SQL goes through src/db/query.ts with parameters.

## Focus areas
- src/billing/ moves money: treat double-charge and rounding risks as high.

## Known exceptions
- src/legacy/ is frozen; skip quality issues there unless the diff changes it.
```

The body is read by every reviewer. It can add checks and conventions, but it can't turn off security or let reviewers edit code. The header of each report shows the runs and models that were actually used, so you can check your settings took effect. Full schema: `references/config.md`.

## Report a problem

Open an issue with the **Problem report** template. Include the skill version, tool, main model, and what happened (wrong finding, missed bug, stopped early, edited a file, confusing report).

**This repo is public.** Don't paste code, file paths, branch names or findings from a private repo. Describe the problem in general terms ("flagged a SQL query that uses parameters as injection"). If you can reproduce it on one of the eval fixtures, paste that output instead.

## Known limits

- It needs a specific main model. With Auto or Copilot Fusion it stops and asks you to pick one.
- It reviews committed work against the default branch. On a stacked branch it reviews every layer and tells you which `base=` to pass to review only yours.
- A full review runs 5 reviewers, so it takes longer and costs more than a single chat turn. Use `runs=1` for a quicker check with 3.

Development, evals and the spec: [`dev/pre-pr-review/`](../dev/pre-pr-review/).
