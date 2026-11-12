# Implementation Plan: pre-pr-review skill

Spec: [docs/specs/pre-pr-review.md](../docs/specs/pre-pr-review.md) · Intent: [docs/intent/pre-pr-review.md](../docs/intent/pre-pr-review.md)
Tasks: [tasks/todo.md](todo.md)

## Overview

We build a portable Agent Skill (`SKILL.md` + `references/`) that reviews a branch diff with one reviewer per lens (correctness, security, quality). It runs 1 or 2 model runs per lens, combines the results into a ranked findings report, and never edits code. Build order:

1. Prove the platform assumptions.
2. Build a scoring harness.
3. Ship a working single-model pass (Mode B), one lens at a time.
4. Add multi-model runs (Mode A, and the manual second run).
5. Finish portability and distribution.

## What platform research found (2026-11-11)

| Capability | Cursor | Copilot (VS Code) | Claude Code |
|---|---|---|---|
| Loads `SKILL.md` skills | Yes (`.cursor/skills/`) | Yes (`.github/skills/`, **`.claude/skills/`**) | Yes (`.claude/skills/`) |
| Slash-invocable skill | Yes | Yes (`/skill-name`, `argument-hint`) | Yes |
| Subagent definitions | `.cursor/agents/`, **also reads `.claude/agents/`** | `.github/agents/*.agent.md` | `.claude/agents/` |
| Parallel subagents | Yes (multiple Task calls per message) | **Unconfirmed** | Yes |
| Model per subagent | Frontmatter `model:` or named at launch. **Forum reports say it is sometimes ignored or silently falls back to the parent model** | `model:` in `.agent.md` frontmatter (set in the file, not at launch) | `model` param at launch (Claude families only) or frontmatter |
| Read-only subagent | `readonly: true` | `tools: [read, search]` | `tools:` allowlist |

Sources: [Cursor subagents](https://cursor.com/docs/subagents), [Cursor forum: model not respected](https://forum.cursor.com/t/subagent-model-choice-not-respected/163645), [VS Code agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [VS Code custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents), [skills CLI](https://skills.sh/docs/cli).

## Architecture decisions

*Revised 2026-11-12 after the Task 1 spike. See [platform-matrix.md](../docs/research/platform-matrix.md).*

1. **The core needs no subagent definition files.** Reviewer prompts are built at runtime from `references/<lens>.md`, so the core works anywhere a skill loads. The optional **adapters** add one read-only reviewer agent per tool (`readonly: true` for Cursor, a read/search-only `tools:` list for Copilot). Adapters don't set models: every tool tested accepts the model at launch.
2. **The main agent runs every shell command. Reviewers have none.** Cursor can't give a subagent read-only access and a shell together, and VS Code subagents have no shell at all. So the main agent runs **one batched git script** (base resolution, diff, file list). That also limits JetBrains Copilot's per-command approval prompts to one. Reviewers get the diff and file paths and use only read/search tools.
3. **Report requested and confirmed models, not self-reported ones.** Agents echo the requested model or answer "unknown". The header shows the *requested* model and the *confirmed* model where the tool exposes it (for example Copilot CLI `model_info`). The *degraded agreement* flag fires when the confirmed or requested models for a lens's two runs are the same family.
4. **Model families resolve to per-tool IDs through a table** in `references/config.md`. Observed spellings: Cursor `claude-opus-5-5-high` / `gpt-5.6-terra-high`, Copilot CLI `claude-opus-5.5` / `gpt-5.6-terra`, Copilot VS Code `Claude Opus 5.5 (copilot)` / `GPT-5.6 Terra (copilot)`. Shorthand such as `opus` is rejected by Copilot, so the skill matches the family against the tool's list of available models and picks the newest match. If nothing matches, it uses the tool default and the report says so.
5. **Skill lives at `skills/pre-pr-review/`** in this repo. `npx skills add` installs it into each tool's own folder. For a manual install, copy it into **each** tool's folder (`.cursor/skills/`, `.github/skills/`, `.claude/skills/`). The spike showed no single shared folder works.
8. **Check for writes; don't assume read-only.** Copilot CLI didn't enforce read-only. The main agent records `git status --porcelain` before and after the review and reports any change outside `.pre-pr-review/` as a violation at the top of the report.
9. **Slash command plus plain language.** JetBrains Copilot didn't show the slash command, so the skill's `description` must also trigger on "run pre-pr-review" / "review my branch before PR".
6. **`findings.json` is the single source of truth.** Markdown is rendered from it. Merging, the Mode B second run, and eval scoring all read the JSON, which keeps synthesis deterministic and testable.
7. **Evals score with a script, but precision is labeled by hand.** `evals/score.py` matches findings to seeded defects (file + line overlap + lens) for recall and noise. Whether a reported finding is real is judged by a human.

## Task list

### Phase 1: Prove the risky parts
- [ ] Task 1: Platform capability spike (all three tools)
- [ ] Task 2: Eval harness + first 3 fixtures + findings schema

### Checkpoint 1 (with the user)
- [x] Capability matrix filled in with observed results, not docs
- [x] `score.py` scores a hand-written `findings.json` correctly (perfect 100%, empty 0%, edge cases correct)
- [x] Copilot adapter decided: **go, repurposed** as read-only reviewer definitions (no model setting)

### Phase 2: Single-model vertical slice (Mode B, runs: 1)
- [ ] Task 3: SKILL.md skeleton + scope resolution
- [ ] Task 4: Output contract (severity rubric, report format, renderer rules)
- [ ] Task 5: Correctness lens end to end
- [ ] Task 6: Security lens (OWASP)
- [ ] Task 7: Quality lens + "what NOT to report"
- [ ] Task 8: Synthesis: cross-lens dedupe, confidence split, ranking

### Checkpoint 2
- [ ] Full single-model report on all 3 fixtures in Claude Code and in Cursor
- [ ] Seeded recall ≥ 70%, clean fixture ≤ 2 findings, no high or critical
- [ ] Zero writes outside `.pre-pr-review/`

### Phase 3: Multi-model
- [ ] Task 9: Config: `.pre-pr-review.md` schema, defaults, family resolution, recommendations
- [ ] Task 10: Mode A: parallel lens × run orchestration + capability detection
- [ ] Task 11: Mode B second run: detect prior run, pending lenses, independent-then-merge

### Checkpoint 3
- [ ] Mode A run in Claude Code and Cursor shows correct agreement labels and the requested-vs-actual model in the header
- [ ] Mode B two-run merge test passes in at least one tool

### Phase 4: Portability + hardening
- [ ] Task 12: Adapters + install docs (Copilot agents, Cursor notes, npx skills)
- [ ] Task 13: Expand fixtures to ≥ 8 seeded + 3 clean + 1 repo-override
- [ ] Task 14: Full portability eval + precision labeling + checklist tuning

### Checkpoint 4: Done
- [ ] All 7 spec success criteria met and recorded in `evals/results/`
- [ ] User review before sharing with the team

## Parallelization

- Tasks 5, 6, and 7 (the lens checklists) can be built in parallel once Task 4 sets the output contract.
- Task 13 (more fixtures) can run in parallel with Phase 3.
- Everything else is sequential.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A tool silently runs a different model than requested | Medium (not seen in the spike) | Report confirmed models where available. Degraded-agreement flag (decision 3) |
| Read-only not enforced (Copilot CLI) | High: the review edits code | Before/after `git status` check (decision 8) + read-only adapter agents |
| Copilot orchestration is unreliable (stray agents, false "no tools" report seen in the spike) | Medium | Very explicit, numbered orchestration steps. Recommend a specific main model instead of Auto |
| Recall is too low with one model per lens | High: the skill isn't trusted | Measured at Checkpoint 2, before any multi-model work. Tune the checklists first. |
| Too much noise, especially from quality | High: engineers stop using it | A "what NOT to report" list per lens, a confidence split, and a clean-fixture noise gate at every checkpoint |
| Large diffs overflow a reviewer's context | Medium | Ask-first above ~3k lines and split by directory (Task 3). Reviewers get full files only for the files in their batch. |
| The company restricts which models are available | Medium | Families resolve to whatever is available. Fallback to the tool default is reported, never an error. |
| Prompts drift between tools | Low | One core. Adapters contain wiring only, never review logic. |

## Open questions

- Task 1 must run in Cursor and Copilot **as available at your job**. Can you run the spike there, or should it be checked on personal installs first?
- For the Copilot adapter, which model families are enabled in your org's Copilot policy? That sets the default pair.
