# Configuration

Everything here is optional. With no config, the skill uses the defaults below.

## Where config comes from (highest priority first)

1. **Run arguments** typed after the command, e.g. `/pre-pr-review runs=1`.
2. **`.pre-pr-review.md` frontmatter** at the repo root.
3. **Defaults** in this file.

The **body** of `.pre-pr-review.md` (below the frontmatter) is repo context for the reviewers (Step 2), not configuration. A file with no frontmatter is valid: it's context only, with default settings and no warning.

## Frontmatter schema

```yaml
---
reviewers:
  correctness: { runs: 2, models: [opus, gpt-terra] }
  security:    { runs: 2 }
  quality:     { runs: 1, models: [sonnet] }
---
```

| Key | Allowed values | Default |
|---|---|---|
| `reviewers.correctness.runs` | `1` or `2` | `2` |
| `reviewers.security.runs` | `1` or `2` | `2` |
| `reviewers.quality.runs` | `1` or `2` | `1` |
| `reviewers.<lens>.models` | list of 1–2 model **families** (see below) | unset → your tool's recommended pair |

- A lens can't be turned off. `runs: 0` is invalid, so security always runs.
- `models` lists one family per run, in order. A single string (`models: opus`) counts as a one-item list. If it has fewer entries than `runs`, fill the rest from the recommended pair, skipping a family that's already listed. If it has more, ignore the extras.

## Run arguments

| Argument | Effect |
|---|---|
| `runs=1` or `runs=2` | Overrides `runs` for **every** lens on this run. `runs=1` is the cheap quick check (3 reviewer runs). |
| `base=<ref>`, `include-uncommitted` | Scope (see `scope.md`) |

## Validation: warn, never fail

Read the frontmatter yourself. For **each** problem below, add a line to `run.warnings` (shown in the report's warning block) and use the default for that one value only. Keep every other valid setting.

| Problem | Warning text |
|---|---|
| Frontmatter isn't valid YAML | `.pre-pr-review.md config couldn't be parsed; using defaults.` |
| Unknown lens or key (e.g. `performance`, `run`) | `.pre-pr-review.md: unknown setting "<full path, e.g. reviewers.performance>" ignored.` |
| `runs` not 1 or 2 | `.pre-pr-review.md: <lens>.runs must be 1 or 2; using <default>.` |
| `models` neither a string nor a list of strings | `.pre-pr-review.md: <lens>.models must be a list like [opus, gpt-terra]; using the recommended pair.` |
| Same family twice for a 2-run lens | No separate warning: keep it and set `agreement_degraded: true`. The degraded-agreement line in the report covers it. |

Never stop the review because of config.

## Model families

Configure **families**, not exact IDs, so one config works in every tool:

| Family | Means |
|---|---|
| `opus` | Newest Claude Opus |
| `sonnet` | Newest Claude Sonnet |
| `haiku` | Newest Claude Haiku |
| `gpt-terra` | Newest GPT Terra |
| `gpt` | Newest GPT flagship (Terra if that's the newest) |
| `gemini` | Newest Gemini Pro |

**Recommended pair (used when `models` is unset), per tool:**

| Tool | Pair | Why |
|---|---|---|
| Cursor, Copilot (VS Code, CLI, JetBrains) | `opus` + `gpt-terra` | Different vendors give the most useful disagreement, and both are available at work |
| Claude Code | `opus` + `sonnet` | Claude Code runs Claude models only. This is its best pair and needs no warning |

### Resolving a family to the model ID your tool uses

1. If the table below has an entry for your tool and the family, use it.
2. Otherwise pick the **newest** model your tool offers whose name contains the family (e.g. `sonnet` → "Claude Sonnet 5.5").
3. If nothing matches, use the member of **your tool's recommended pair** that the lens's other run isn't using, and add the warning `<family> isn't available in <tool>; <lens> run <n> used <substitute>.` If both runs of a lens still land on the same family, set `agreement_degraded: true`.

| Family | Cursor (Task tool `model`) | Copilot: VS Code (`runSubagent`) | Copilot: CLI (`task`) | Claude Code (Agent tool) |
|---|---|---|---|---|
| `opus` | `claude-opus-5-5-<effort>` | `Claude Opus 5.5 (copilot)` | `claude-opus-5.5` | `opus` |
| `gpt-terra` | `gpt-5.6-terra-<effort>` | `GPT-5.6 Terra (copilot)` | `gpt-5.6-terra` | not available (rule 3) |
| `sonnet` | — (rule 2) | — (rule 2) | — (rule 2) | `sonnet` |
| `haiku` | — (rule 2) | — (rule 2) | — (rule 2) | `haiku` |

Use the exact spelling: VS Code rejects shorthand such as `opus`. These IDs were observed on 2026-11-12. If one is refused, fall back to rule 2.

**Cursor `<effort>`:** use the highest reasoning variant your Cursor offers for that model (`high`, then `medium`). Accounts differ, so this isn't a warning. The header shows the ID that ran.

## What to record

For each lens in `run.lenses.<lens>`:

- `runs_configured`: after applying arguments, config and defaults
- `models_source`: `config` if the lens has `models` in config. Otherwise `recommended` for a 2-run lens and `tool-default` for a 1-run lens. A `tool-default` run uses the **first member of your tool's recommended pair** in Mode A (e.g. `opus`), and your own model in Mode B.
- `families`: the family for **each configured run, in the order they run**, as it **actually ran** (a substitute's family, not the unavailable one it replaced; the warning names that one). In Mode B, `families[0]` is always your own family (see below), e.g. `["opus", "gpt-terra"]` for a 2-run lens and `["opus"]` for a 1-run lens.
- `models_requested`: one entry per run that **actually happened** in this session. In Mode B, use your model's name **as your tool displays it** (e.g. "Claude Opus 5.5"). In Mode A, use the exact ID you passed at launch (e.g. `claude-opus-5-5-high`).
- `models_confirmed`: what the tool itself showed for each run, or `null`. Never a model's description of itself.

## Mode B and the second model

In Mode B you run every pass yourself on **your own** model. So:

- Run 1 of each lens uses your model, whatever the config says. If config names a family for this lens and **none** of its families is yours, add the warning `<lens> is configured for <families>; this session ran it on <your model>.`
- **Second family** for a lens with `runs: 2`, the first match wins:
  1. A configured family for this lens that differs from yours **and is available in your tool**.
  2. The member of your tool's recommended pair that differs from yours.
  3. If you're in neither, the pair's first member.
- That second run happens in a later session on that model (Step 7 offers it, `second-run.md` describes it). Until then the lens shows `runs_completed: 1`.
