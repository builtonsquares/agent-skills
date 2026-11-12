# pre-pr-review: user guide

A read-only, pre-PR code review skill for **Cursor**, **GitHub Copilot** and **Claude Code**. Run it on your branch before you open a PR. It reviews the whole diff for correctness, security and code quality and returns a ranked list of findings. Each finding has a file and line, a severity, why it matters and a suggested fix.

It never changes code. Fixing is up to you (or your SDLC's remediation step).

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

Copy `skills/pre-pr-review/` into each tool's skills folder in your repo:

| Tool | Folder |
|---|---|
| Cursor | `.cursor/skills/pre-pr-review/` (or `.agents/skills/`) |
| GitHub Copilot | `.github/skills/pre-pr-review/` (or `.agents/skills/`) |
| Claude Code | `.claude/skills/pre-pr-review/` |

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

Or ask in plain words: "run pre-pr-review" or "review my branch before I open a PR". Copilot in JetBrains doesn't list skills as slash commands, so use plain words there.

| Argument | Effect |
|---|---|
| `base=<branch>` | Review against this branch. Use your parent branch when the PR is stacked. |
| `include-uncommitted` | Also review uncommitted changes (by default only committed work is reviewed) |
| `runs=1` | Quick check: one model per topic (3 reviewers instead of 5) |
| `sequential` | Don't use parallel subagents |

Pick a specific model for the main chat (e.g. Claude Opus 5.5), not Auto. The report appears in chat and in `.pre-pr-review/<branch>/<commit>/report.md`. Add `.pre-pr-review/` to your `.gitignore`.

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

Development, evals and the spec: [`dev/pre-pr-review/`](../dev/pre-pr-review/).
