# Report format

`findings.json` is the source of truth. `report.md` and the chat output are **rendered from it** and never edited by hand, so they can't drift apart.

## Ordering and IDs

1. Sort findings by severity (critical → high → medium → low → nit), then confidence (high → medium), then agreement (agreed → single → n/a), then file path and line.
2. Number them `F1, F2, …` in that order. IDs are stable within one report only.
3. `confidence: low` findings never appear in the main list. They go under "Worth a look", numbered `W1, W2, …`.

## Template

Use this structure exactly. Omit a section only where noted.

````markdown
# Pre-PR review: `<branch>` → `<base_ref>`

| | |
|---|---|
| Range | `<base_sha:7>..<head_sha:7>` (<files_reviewed> file(s), <lines_reviewed> lines changed: write "1 file", "3 files") |
| Reviewers | correctness ×<runs> (<models>) · security ×<runs> (<models>) · quality ×<runs> (<models>) (see "Reviewers line" under Field rendering rules) |
| Mode | <A: parallel subagents / B: sequential> · <tool> |

<WARNINGS: omit the block entirely if there are none. One line each, in this order: write violations, stacked branch, uncommitted/untracked, failed reviewer runs, model availability and degraded agreement, config problems:>
> ⚠️ Files changed during this review: `src/a.ts`, … (see Step 5)
> ⚠️ This branch appears stacked on `feature-1`. …
> ⚠️ 3 uncommitted changes were NOT reviewed. …   (singular: "1 uncommitted change was NOT reviewed.")
> ⚠️ correctness: both runs used the same model (opus, opus), so "agreed" is weaker evidence than usual.   (one line per lens with agreement_degraded)
> ⚠️ .pre-pr-review.md: unknown setting "reviewers.performance" ignored.

**<N> findings: <x> critical · <y> high · <z> medium · <w> low · <v> nits**   ← or: **No issues found.** (see below)

## Findings

### F1 · [CRITICAL] <title>
- **Location:** `src/routes/orders.ts:21-24`
- **Lens:** security · **Confidence:** high · **Agreement:** agreed (opus, gpt-terra)
- **Why it matters:** <concrete consequence: what breaks, for whom, under what input>
- **Suggested fix:** <specific change; a short code snippet if it's clearer than prose>

### F2 · [HIGH] …

<Nits: compact one-line form, after all other findings. Omit the heading if there are none.>
#### Nits
- **F9** `src/cart.ts:31`: <title>. <one-sentence fix>

## Worth a look (low confidence)
<Omit the section if empty. Short form: these are leads, not findings.>
- **W1** `src/cart.ts:40-44` (correctness): <what you suspect and what would confirm or rule it out>

## Not reviewed
<Omit if skipped.txt is empty.>
`package-lock.json`, `dist/app.min.js` (generated, vendored or lock files, and this skill's own installed files)

---
<sub>pre-pr-review is read-only: it never changes code. Run directory: `<RUN_DIR>`</sub>
````

## Field rendering rules

- **Location:** `path:start` when `start_line == end_line`, else `path:start-end`. For `related_locations`, add a line `- **Also:** \`path:line\`, …`.
- **Reviewers line:** for each lens, `×<runs_completed>` and the models that ran (`models_requested`, or `models_confirmed` when known), written exactly as recorded, with no annotations such as "(session default)" or "tool default:". When `runs_completed` < `runs_configured`, write `×1 of 2 (<model>; <second family> pending)`. When **any** lens has `models_source: recommended`, add ` · recommended pair: <your tool's pair>` once at the end of the line (e.g. `opus + gpt-terra`; Claude Code: `opus + sonnet`). Example (Mode B in Cursor): `correctness ×1 of 2 (Claude Opus 5.5; gpt-terra pending) · security ×1 of 2 (Claude Opus 5.5; gpt-terra pending) · quality ×1 (Claude Opus 5.5) · recommended pair: opus + gpt-terra`
- **Lens:** join multiple lenses with ` + ` (e.g. `correctness + security`).
- **Agreement:** `agreed (<families>)`, `single (<family>)`, or omit the agreement part entirely when `n/a`. Use family names (`opus, gpt-terra`), not model IDs or display names, so labels read the same in every mode and tool.
- **Why it matters** says what goes wrong in practice ("a 15% discount makes the total negative"). It must not restate the rule ("violates input validation best practice").
- **Suggested fix** must be specific enough to act on without reading the finding twice. Keep code snippets under 10 lines.

## "No issues found"

When the main list is empty, replace the count line and the Findings section with:

```markdown
**No issues found.** The correctness, security and quality reviewers found nothing worth raising in <files_reviewed> files.
```

Still render "Worth a look" and "Not reviewed" if they have content. Never invent findings to fill this space.

If the main list holds **only nits**, it isn't empty. Render the count line (singular where needed: "1 finding … 1 nit") and a `## Findings` section containing just the `#### Nits` list.

## Chat output

Show the full rendered report in chat when it has 15 or fewer main-list findings. With more than 15, show critical, high and medium findings in full, list low findings and nits as one line each, and end with: "Full report: `<RUN_DIR>/report.md`".
