# agent-skills

Agent skills for **Cursor**, **GitHub Copilot** and **Claude Code**, built on the open [Agent Skills](https://agentskills.io) format.

## Skills

| Skill | Version | What it does | Guide |
|---|---|---|---|
| [`pre-pr-review`](skills/pre-pr-review/) | 1.0.0 | Read-only, two-model review of your branch before you open a PR: correctness, security and quality, ranked by severity | [docs/pre-pr-review.md](docs/pre-pr-review.md) |

## Install

```bash
# One skill, into the current repo, for the tools you use
npx skills add builtonsquares/agent-skills --skill <skill> -a cursor github-copilot claude-code

# Or for yourself, across all repos
npx skills add builtonsquares/agent-skills --skill <skill> -g -a cursor github-copilot claude-code

# See what's available
npx skills add builtonsquares/agent-skills --list
```

## Layout

| Path | What |
|---|---|
| `skills/<skill>/` | The skill itself. This is all `npx skills` installs. |
| `docs/<skill>.md` | User guide |
| `dev/<skill>/` | Development material: spec, plan, eval harness and results. Never installed. |
| `.github/ISSUE_TEMPLATE/` | Forms for reporting eval results and problems |

Adding a skill: create `skills/<name>/SKILL.md` (the `name` must match the folder, and `metadata.version` holds its version), plus `docs/<name>.md`, then add a row to the table above and a section to [CHANGELOG.md](CHANGELOG.md).
