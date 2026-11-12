# Eval: Mode A (parallel reviewers) in Claude Code (2026-11-12)

**Setup:** For each run, a fresh general-purpose agent (Opus 5.5) acted as coordinator and followed SKILL.md. Each one launched its reviewers as nested subagents through the Agent tool. `gpt-terra` isn't available in Claude Code, so the second runs used `sonnet` (orchestration.md step 2).

| Run | Launches (one message) | Recall | High+ | Main / unseeded | Agreement labels |
|---|---|---|---|---|---|
| seeded-correctness, defaults | 5: corr opus+sonnet, sec opus+sonnet, quality opus | 5/5 | 2/2 | 6 / 1 | F1–F3 agreed, F5 single, tests and dead-code findings n/a ✅ |
| seeded-security, defaults | 5 (same) | 5/5 | 2/2 | 9 / 4 | 7 agreed, 2 n/a (quality only) ✅ |
| seeded-correctness, `correctness: [opus, opus]` | 4: corr opus×2, sec, quality | 5/5 | 2/2 | 5 / 1 | Degraded-agreement warning shown ✅. Labels came out `single` (rule fixed, see below) |

Write check: clean on all three runs. No reviewer launch failed. In the security run, the coordinator corrected sonnet's line numbers (about 6 too high) during synthesis step 1. That's the location check doing its job.

The new **"no test setup" rule** fired correctly on seeded-security (one F8 for the whole diff).

## Unseeded findings (precision)

All real, and the same set as the Mode B runs: double-charge (high), async errors plus no timeout (merged, see below), no test setup, and a new one: **failed charge logs nothing** (low), which is real (the 502 path has no trail).

## Fixes from this run

| Problem | Fix |
|---|---|
| Two runs on the same family that both raised a finding were labeled `single` | synthesis.md: both runs of one 2-run lens raising it counts as `agreed` even on the same family. The degraded flag carries the caveat |
| Config-duplicate warning plus degraded warning gave the same message twice | config.md: no separate warning. The degraded line covers it |
| "same model line (opus, sonnet)" wording was inaccurate | "same vendor (opus, sonnet)". Same family twice: "the same model" |
| Step 7 offered "switch to sonnet" after sonnet had already run as the substitute | Leave out the "or switch to…" part when a substitute already ran |
| `families` for a substituted run was ambiguous | Record what actually ran. The warning names the family that was unavailable |
| "No error handling" and "no timeout" were merged into one finding | synthesis.md: a shared location or theme isn't a shared root cause. Each needs its own fix |
| Scorer credited the formatTotal finding to the wrong defect when two defects had equal severity | score.py: global closest-pair assignment |

## Not yet verified

- **Cursor with a real cross-vendor pair** (Opus + GPT Terra), the main target. Kit: `dist/pre-pr-review-cursor-eval.zip`.
- The rule changes above haven't been rerun in Claude Code. They're wording-level, and the Cursor run will exercise them.

## Cursor run: real cross-vendor pair (user, personal machine)

The 5 reviewers ran in parallel ("everything ran fine, in parallel as expected"). Correctness and security used `claude-opus-5-5-medium` + `gpt-5.6-terra-medium`, and quality used the session's Opus 5.5.

| Fixture | Recall | High+ | Main / unseeded | Worth a look | Result |
|---|---|---|---|---|---|
| seeded-correctness | 5/5 | 2/2 | 6 / 1 (no test setup) | 0 | PASS |
| seeded-security | 5/5 | 2/2 | 9 / 4 | 1 | PASS |
| clean | — | — | 0 | 0 | PASS |

- **Agreement:** every planted defect was `agreed (opus, gpt-terra)` except formatTotal (`single (opus)`). Its failure path held up on challenge, so it stayed at medium. The async-errors finding (F7) and the no-timeout finding (F8) stayed **separate**, so the merge fix held.
- **Precision:** the 4 unseeded security findings are the same real set as before. W1 (session middleware may be missing upstream) is a reasonable low-confidence lead.
- **Fixes after this run:**
  - The `-high` Cursor IDs weren't offered on this account, so `-medium` ran. The table now uses `<effort>`, picking the highest offered, with no warning.
  - Cursor warned that the optional reviewer agent wasn't installed. It now doesn't.
  - The quality model's label varied between "(session default)" and "tool default:". Annotations are no longer allowed.
  - "No test setup" was judged differently by Claude Code and Cursor when vitest was a devDependency but there were no tests. Now defined as no test files **and** no `test` script.

## Task 11: second run on the same commit (Claude Code, Mode B via `sequential`)

1. **Run 1 (Opus, `sequential`):** `PRIOR_RUN: none`. 6 findings plus W1, recall 5/5. The header showed `×1 of 2 (Claude Opus 5.5; sonnet pending)`, and the last line was "switch your model to **sonnet**". state.txt: `correctness 2 1 opus`, `security 2 1 opus`, `quality 1 1 opus`.
2. **Run 2 (Sonnet, same commit):** `PRIOR_RUN: incomplete`, `PRIOR_PENDING: correctness(opus),security(opus)`. Only correctness and security were reviewed, and quality wasn't rerun. `second-run.json` was written at 15:05:27, before the earlier `findings.json` was opened. The merged files were written at 15:06:00.
   - Merge: F1–F3 `agreed`; the quality findings `n/a`; the earlier W1 `single` (challenged, stayed low). One new Sonnet lead, W2 (a partial reservation isn't rolled back), went to "Worth a look".
   - Recall 5/5, high+ 2/2. Lens record: `families ["opus","sonnet"]`, `runs_completed 2`. Write check clean.
   - **Matches Mode A** (Claude Code, opus + sonnet): the same three findings `agreed`, and the same planted defects caught. The one difference: Mode A merged formatTotal's duplication and its negative-amounts bug into one medium finding, and Mode B kept them as a low finding plus W1. Both are reasonable, and the scores are equal.
3. **collect.sh state cases** (synthetic): none / incomplete / complete → archived to `previous/1` / different base → archived to `previous/2` / older commit listed in `EARLIER_REVIEWS`. All correct.

Fix: agreement labels showed display names ("Claude Opus 5.5") in Mode B and families in Mode A. Families are now required everywhere.
