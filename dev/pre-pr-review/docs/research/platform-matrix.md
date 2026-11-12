# Platform capability matrix

Status: **observed** (Task 1 spike, 2026-11-11/12). Raw spike reports are kept locally (they include details of a private work repo).

| Capability | Cursor | Copilot: VS Code | Copilot: CLI / JetBrains (WebStorm) | Claude Code |
|---|---|---|---|---|
| Skill discovered from `.claude/skills/` | Not tested (run used `.cursor/skills/`) | **No.** Needed `.github/skills/` | **No.** Needed `.github/skills/` | Yes (docs) |
| Slash invocation | Yes | Yes | **No** (not listed in WebStorm. Ran by asking the agent to read SKILL.md) | Yes |
| Subagent mechanism | Task tool (`subagent_type` + `model`) | `runSubagent` | `task` tool (+ background, `read_agent`) | Agent tool |
| Model param at launch | **Yes.** Slugs, e.g. `claude-opus-5-5-high`, `gpt-5.6-terra-high` | **Yes.** Display names, e.g. `Claude Opus 5.5 (copilot)`, `GPT-5.6 Terra (copilot)`. Shorthand rejected | **Yes.** e.g. `claude-opus-5.5`, `gpt-5.6-terra` | Yes (Claude families only) |
| Model param works on a predefined agent | Yes | Yes | Yes | Yes |
| Parallel subagents | **Yes** (time windows overlapped) | Launched in the same turn. Overlap **not measurable** (subagents have no shell) | **Yes** (time windows overlapped) | Yes (docs) |
| Models honored (opus vs gpt-terra) | Yes (self-report) | Opus yes, Terra unclear | Yes (**harness `model_info` confirmed**) | n/a |
| Read-only enforcement | `readonly: true` in agent file, **but it also blocks shell** | Writes blocked (predefined and generic) | **Not enforced.** Writes succeeded | `tools:` allowlist |
| Subagent shell access | Only when not read-only | **None** | Yes | Yes |
| Shell approval prompts | — | — | **Every command** (WebStorm) | Configurable |
| Agent-file `tools:` names | n/a | — | `read_file`, `run_in_terminal`, `file_search`, `grep_search`, `run_subagent` | — |

## What this means

1. **Reviewer subagents must not need a shell.** Cursor can't have read-only and shell together, and VS Code subagents have no shell at all. The **main agent** runs git once, then passes the diff and the list of changed files to the reviewers. Reviewers only use read/search tools.
2. **Choosing the model at launch works everywhere**, so no model has to be set inside an agent file. Each tool spells model IDs differently, which confirms the family → per-tool ID table (decision 4 in the plan).
3. **Self-reported models are weak evidence.** Agents echo the requested slug or say "unknown". The harness's own report (Copilot CLI `model_info`) is better. The report shows *requested* models plus *confirmed* models where the tool provides that, and doesn't build logic on the self-report.
4. **Read-only can't be guaranteed in Copilot CLI**, so the skill checks it: the main agent records `git status --porcelain` before and after, and reports any change outside `.pre-pr-review/` as a violation.
5. **Skills must be installed in each tool's own folder** (`.cursor/skills/`, `.github/skills/`, `.claude/skills/`). There is no single shared location. `npx skills` handles this. Manual install docs must list each folder.
6. **Slash invocation isn't universal** (JetBrains Copilot). The skill's description must also trigger on plain language, e.g. "run pre-pr-review".
7. **Shell prompts on every command** in JetBrains Copilot: keep shell use to the fewest possible calls (one batched git script).
8. **Copilot's Auto mode** hides the main model, and the CLI runs launched stray agents and got its first report wrong. Recommend choosing a specific main model instead of Auto, and keep the orchestration instructions very explicit.

## Decisions

- **Adapters: go, but repurposed.** Not for setting models. Each tool gets one **read-only reviewer agent** definition (`.cursor/agents/pre-pr-reviewer.md` with `readonly: true`, and `.github/agents/pre-pr-reviewer.agent.md` with a read/search-only `tools:` list), with the model passed at launch. Without the adapter, the skill falls back to a generic subagent plus the write check.
- **The degraded-agreement safeguard** stays, but is based on confirmed or requested models, not the self-report.
- **Manual install:** a copy per tool folder (or symlinks). `npx skills` is preferred.
- **Mode B (one model at a time, plus a manual second run)** is still needed only for tools with no subagents. All tools tested can run Mode A.

## Install via `npx skills` (observed 2026-11-12, local install)

- `npx skills add <source> --skill pre-pr-review -a cursor github-copilot claude-code` writes `.agents/skills/pre-pr-review/` (the CLI calls it "universal: Cursor, GitHub Copilot"), a **symlink** at `.claude/skills/pre-pr-review`, and `skills-lock.json`.
- **Open question:** the spike found that Copilot (VS Code, JetBrains) loaded skills only from `.github/skills/`. Whether Copilot at work reads `.agents/skills/` must be checked in Task 14. If it doesn't, install with `--copy` into `.github/skills/` or copy manually.
- Agent definitions (`.cursor/agents/`, `.github/agents/`, `.claude/agents/`) are not installed by the CLI.
- Claude Code only loads `.claude/agents/` from the project it was started in.
