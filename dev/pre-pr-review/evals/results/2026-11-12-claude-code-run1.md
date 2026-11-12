# Eval run 1: Claude Code, Mode B, one model per lens (2026-11-12)

**Setup:** Each fixture was run by a fresh general-purpose agent (Claude Opus 5.5) that was told only that "the engineer typed /pre-pr-review" and where the skill lives. The agents had no knowledge of the seeded defects. The skill was at its Phase 2 version (Tasks 3–8).

## Scores (`evals/score.py`, after the closest-match assignment fix)

| Fixture | Recall | High+ recall | Main findings | Not seeded | Worth a look | Result |
|---|---|---|---|---|---|---|
| seeded-correctness | 5/5 (100%) | 2/2 | 6 | 1 | 0 | PASS |
| seeded-security | 5/5 (100%) | 2/2 | 9 | 4 | 0 | PASS |
| clean (v1) | — | — | 2 (0 high+) | 2 | 1 | PASS |

Write check: `clean` on all three runs. The only untracked path was `.pre-pr-review/`.

## Precision labeling (main-list findings that aren't seeded)

Labeled by Claude. **Pending user spot-check.**

| Fixture | Finding | Label | Reason |
|---|---|---|---|
| seeded-correctness | F4 no tests for new cart logic (medium) | real | Fixed rule 1. The fixture has no tests |
| seeded-security | F5 no tests for orders routes (medium) | real | Fixed rule 1 |
| seeded-security | F6 payment fetch has no timeout (medium) | real | `fetch` has no default timeout, and the request hangs while holding a payment in flight |
| seeded-security | F8 pay endpoint doesn't check or update status, so repeat charges are possible (medium) | real | Unintended second defect in the fixture |
| seeded-security | F9 async handlers lack error handling on Express 4 (medium) | real | Express 4 doesn't forward async rejections |
| clean v1 | F1 length-cap test can't fail (medium) | real | Verified: index 79 of `"ab-"×n` is `b`, so the trim is never exercised |
| clean v1 | F2 regex range written as invisible literal chars (nit) | real | Verified with `od -c`. A fixture-authoring artifact |

**Precision: 17/17 main findings real (100%).** Both `clean` v1 findings were real defects in the fixture, so `clean` was rewritten (v2: escaped regex, a length test that actually cuts on a hyphen, an honest doc comment, a ß test).

## Harness fix found by this run

`assign_matches` took the *first* matching finding in report order, so broad "no tests for lines 18–59" findings stole credit from precise ones (S5 credited to the tests finding, while the actual open-redirect finding was listed as unexpected). It now takes the closest match: same lens, then smallest line gap, then narrowest span. Recall numbers were unchanged, but attribution is now correct.

## Skill fixes from agent feedback

| Ambiguity reported | Fix |
|---|---|
| Mode A/B never defined in SKILL.md; the schema hinted otherwise | Defined in SKILL.md Step 3 and the schema `mode` description |
| No source for `models_requested` in sequential runs | SKILL.md Step 3: the agent's own model as the tool names it, `models_confirmed: [null]` |
| One or many missing-tests findings? Location span? | quality.md: one per changed source file, tight location + `related_locations` |
| Gitignore tip: in report.md or chat? | Chat only |
| "1 files" | Pluralization note in report-format.md |
| Step 5 before Step 6 looked like a bug | Rationale added in SKILL.md |
| A tool refused to write report.md (Claude Code subagent restriction) | Fallback: show the report in chat and say which file wasn't saved |

Not changed: equal-severity ties sort by file and line (a hardcoded key on line 6 came before SQLi on line 22, both critical). That's acceptable for now.

## Rerun: clean v2 (after the skill fixes)

| Fixture | Main findings | High+ | Result |
|---|---|---|---|
| clean v2 | 1 (nit) | 0 | PASS |

The single nit was **real again**: v2 still had literal combining characters in the regex. Root cause: `\uXXXX` escapes in tool-call text get decoded before they reach disk, so writing the escape directly silently produces the literal character. Fixed by building the backslash from `chr(92)` (`clean` v3). Verified with `od -c` and a node run of the three test expectations. Clean-fixture precision so far: 3/3 findings real across two runs, 0 false positives.

**Fixture-authoring rule:** never type `\u` escapes in fixture source through tool calls. Generate them, then check with `grep -c $'\xcc\x80'` or `od -c`.
