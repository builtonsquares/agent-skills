# pre-pr-review: user guide

A read-only, pre-PR code review skill for **Cursor**, **GitHub Copilot** and **Claude Code**. Run it on your branch before you open a PR. It reviews the whole diff for correctness, security and code quality and returns a ranked list of findings. Each finding has a file and line, a severity, why it matters and a suggested fix.

It never changes code. Fixing is up to you (or your SDLC's remediation step).

**Version 1.0.0.** See the [changelog](../CHANGELOG.md).

## Supported tools

| Tool | Status in 1.0.0 |
|---|---|
| Cursor | Tested: all eval fixtures pass, reviewers run in parallel on two models |
| GitHub Copilot in VS Code | Tested: all eval fixtures pass, reviewers run in parallel on two models |
| Claude Code | Tested on the first 7 eval fixtures (Opus + Sonnet); not yet rerun on the full set |
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

## Configure (optional)

Copy `templates/pre-pr-review.example.md` to your repo root as `.pre-pr-review.md`:

- **Frontmatter:** runs and model families per topic, e.g. `quality: { runs: 2 }`. Details: `references/config.md`.
- **Body:** repo context for the reviewers (conventions, focus areas). It can add checks, but can never turn off the security review.

## Report a problem

Open an issue with the **Problem report** template. Include the skill version, tool, main model, and what happened (wrong finding, missed bug, stopped early, edited a file, confusing report).

**This repo is public.** Don't paste code, file paths, branch names or findings from a private repo. Describe the problem in general terms ("flagged a SQL query that uses parameters as injection"). If you can reproduce it on one of the eval fixtures, paste that output instead.

## Known limits

- It needs a specific main model. With Auto or Copilot Fusion it stops and asks you to pick one.
- It reviews committed work against the default branch. On a stacked branch it reviews every layer and tells you which `base=` to pass to review only yours.
- A full review runs 5 reviewers, so it takes longer and costs more than a single chat turn. Use `runs=1` for a quicker check with 3.

Development, evals and the spec: [`dev/pre-pr-review/`](../dev/pre-pr-review/).
