# Task 14: Cursor and Copilot (VS Code), all 13 fixtures, Mode A

Run on 2026-11-19 on the work machine. Skill installed with `npx skills` from this repo, fixtures built with `build-all.sh`, summaries from `summarize.py` (pasted verbatim below).

## Verdict

| Tool | Result | Seeded recall | High+ recall | Clean fixtures |
|---|---|---|---|---|
| Cursor (Opus 5.5 + GPT-5.6 Terra) | **13/13 PASS** | 23/23 | 14/14 | 0, 0, 0 findings |
| Copilot VS Code (Opus 5.5 + GPT-6.1 Terra) | 11/13 | 22/23 (missed PE2, low) | 14/14 | 1, 0, 0 findings |

- Both tools ran Mode A (parallel subagents, model per launch). Copilot found the skill from the `npx skills` install.
- The six seeded fixtures that had never been run: 100% recall in Cursor; Copilot missed only PE2 (low, unclosed file handle).
- The "repo has no test setup" finding shows up once per fixture, as designed (fixed rule 1).

## Problems found, and the fixes made

1. **Retired model ID (Copilot).** `GPT-5.6 Terra (copilot)` was retired. `config.md` told the agent to use the table's ID first, so some runs failed outright; others substituted GPT-6.1 Terra but printed a warning on every fixture. **Fix:** the agent now reads the tool's model list and picks the newest model in the family (no warning). A refused or retired ID is re-resolved in the same family and relaunched, and never stops the review. The table is now spelling patterns only.
2. **Re-run after a failed run (Copilot).** A failed GPT run left the review incomplete, so the next run went down the second-run path. Its "same model as the first run → stop and switch models" check applied in Mode A too, where it makes no sense: Mode A launches the missing family itself. **Fix:** that check is now Mode B only. Mode A just launches the missing runs. The agent says up front that it is completing the earlier review, and how to start over (delete the run folder). Step 7 no longer tells Mode A users to switch models.
3. **"1 uncommitted change was NOT reviewed" on every Copilot fixture**, not on Cursor. Something in the Copilot setup creates a file in the repo. The cause is not known yet. **Fix:** collect.sh now prints `UNCOMMITTED_PATHS` (up to 5) and the warning names them, so the next run shows what the file is.
4. **Eval tooling:** `summarize.py` marks no-test-setup findings as expected, and shows a miss as "(in Worth a look)" when the defect landed there.

## Labels (done 2026-11-19, against the fixture code)

Every unexpected finding was checked by hand. The no-test-setup finding is expected and real in every fixture (fixed rule 1).

| Fixture | Finding | Label |
|---|---|---|
| seeded-security | Double charge on repeated /pay (both tools) | real |
| seeded-security | Async rejections bypass Express 4 error handling (both) | real |
| seeded-security | Payment call has no timeout; 502 not logged (Cursor) | real (low) |
| seeded-security | Default redirect `/orders` has no route (Copilot) | real (minor; medium is high) |
| seeded-security | `db` import has no runtime export (Copilot, critical) | **fixture artifact**: `db.ts` was a type-only stub. Fixed: it is now a real runtime wrapper |
| py-injection | Export source/output escape REPORTS_DIR (both) | real (listed as acceptable) |
| py-injection | Relative REPORTS_DIR: isfile and send_file resolve differently (Copilot) | real (edge case) |
| py-injection | Pandoc stderr discarded (both) | real (low) |
| py-concurrency | Throttled jobs dropped on stop (both) | real (listed as acceptable) |
| py-concurrency | Constructor overrides skip the capacity check (both) | real |
| go-authz | SetPlan/SetNotifications copy-paste (Cursor, nit) | real |
| stacked | "Layer N of the stack" doc comments (nit) | real |
| stacked | Reject invalid domain labels (Copilot, medium) | over-rated: a judgment call, nit at most |
| stacked | Preserve local-part case (Copilot, medium) | **false**: lowercasing is deliberate and standard |
| clean | Compatibility characters bypass the separator rule (Copilot, medium) | real doc/behavior mismatch, over-rated. Fixed the fixture docstring |

**Precision:** Cursor 100% (every main finding real). Copilot: 1 false (stacked, local-part case) and 1 fixture artifact out of 43 main findings. Its weakness is severity calibration on judgment calls, not invented bugs.

**Decisions:** the stacked cap stays at 2; Copilot failing it is a fair noise signal. PE2 stays seeded; a single low miss in one run isn't enough to retune on.

**Uncommitted file:** the skill was copied into each repo as `.agents/`. `.agents/skills/pre-pr-review/` is already excluded, so the leftover file is probably something else in the copy (e.g. a macOS `.DS_Store`). The next run names it.

---

## Cursor (summarize.py output)

## Scores

- **Tool / mode:** Cursor · Mode A

| Fixture | Result | Recall | High+ | Main | Worth a look |
|---|---|---|---|---|---|
| clean | PASS | — | — | 0 | 0 |
| clean-large | PASS | — | — | 0 | 0 |
| clean-python | PASS | — | — | 0 | 0 |
| go-authz | PASS | 2/2 | 1/1 | 4 | 0 |
| go-concurrency | PASS | 2/2 | 2/2 | 3 | 0 |
| py-concurrency | PASS | 2/2 | 1/1 | 5 | 1 |
| py-error-swallow | PASS | 2/2 | 1/1 | 3 | 1 |
| py-injection | PASS | 2/2 | 2/2 | 5 | 0 |
| repo-override | PASS | 1/1 | 0/0 | 1 | 0 |
| seeded-correctness | PASS | 5/5 | 2/2 | 6 | 0 |
| seeded-security | PASS | 5/5 | 4/4 | 10 | 1 |
| stacked | PASS | — | — | 2 | 1 |
| ts-migration | PASS | 2/2 | 1/1 | 3 | 0 |

## Per fixture

**clean**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)

**clean-large**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)

**clean-python**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)

**go-authz**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F3 [medium] Repo has no test setup; new behavior is untested  ← label: real / false
- unexpected F4 [nit] SetPlan and SetNotifications are copy-pasted and differ only in the field they assign  ← label: real / false

**go-concurrency**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F3 [medium] Repo has no tests; the new concurrent lookup behavior is untested  ← label: real / false

**py-concurrency**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F2 [high] Throttled jobs are parked in a queue that nothing drains, and stop() silently drops them  ← label: real / false
- unexpected F4 [medium] Repo has no test setup, so the new limiter and throttling logic are untested  ← label: real / false
- unexpected F5 [low] Constructor `overrides` bypass the capacity >= 1 check that set_capacity enforces  ← label: real / false

**py-error-swallow**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F2 [medium] Repo has no test setup; none of the new settlement, retry or receipt logic is tested  ← label: real / false

**py-injection**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F3 [medium] Export's `source` and derived `output` paths can escape REPORTS_DIR  ← label: real / false
- unexpected F4 [medium] Repo has no test setup, so the new download and export endpoints are completely untested  ← label: real / false
- unexpected F5 [low] Every pandoc failure becomes a generic 422 and the captured stderr is thrown away  ← label: real / false

**repo-override**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)

**seeded-correctness**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F4 [medium] Repo has no test setup, so none of the new cart logic is tested  ← label: real / false

**seeded-security**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F5 [high] Pay endpoint can charge the same order repeatedly and never marks it paid  ← label: real / false
- unexpected F6 [high] Async handler errors aren't caught under Express 4, so a failed DB or payment call hangs the request or crashes the process  ← label: real / false
- unexpected F8 [medium] Payment provider call has no timeout  ← label: real / false
- unexpected F9 [medium] Repo has no test setup, so the new orders routes are untested  ← label: real / false
- unexpected F10 [low] Payment provider failure returns a bare 502 with nothing logged  ← label: real / false

**stacked**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- warning: This branch appears stacked on `feature`. This review covers every layer back to `origin/main`. To review only your layer, run again with `base=feature`.
- unexpected F1 [medium] Repo has no test setup; new email validation and update logic is untested  ← label: real / false
- unexpected F2 [nit] Doc comments describe the PR stack position ("Layer N of the stack") instead of the code  ← label: real / false

**ts-migration**: correctness x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · security x2 (claude-opus-5-5-high, gpt-5.6-terra-high) · quality x1 (claude-opus-5-5-high)
- unexpected F3 [medium] The repo has no test setup, so none of the new timezone behavior is tested  ← label: real / false

## Copilot VS Code (summarize.py output)

## Scores

- **Tool / mode:** Copilot VS Code · Mode A

| Fixture | Result | Recall | High+ | Main | Worth a look |
|---|---|---|---|---|---|
| clean | PASS | — | — | 1 | 0 |
| clean-large | PASS | — | — | 0 | 0 |
| clean-python | PASS | — | — | 0 | 0 |
| go-authz | PASS | 2/2 | 1/1 | 3 | 0 |
| go-concurrency | PASS | 2/2 | 2/2 | 3 | 0 |
| py-concurrency | PASS | 2/2 | 1/1 | 5 | 1 |
| py-error-swallow | **FAIL** | 1/2 | 1/1 | 2 | 1 |
| py-injection | PASS | 2/2 | 2/2 | 6 | 0 |
| repo-override | PASS | 1/1 | 0/0 | 1 | 0 |
| seeded-correctness | PASS | 5/5 | 2/2 | 6 | 0 |
| seeded-security | PASS | 5/5 | 4/4 | 10 | 1 |
| stacked | **FAIL** | — | — | 3 | 1 |
| ts-migration | PASS | 2/2 | 1/1 | 3 | 0 |

## Per fixture

**clean**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- warning: GPT-5.6 Terra (copilot) was unavailable; GPT-6.1 Terra (copilot) was used for the gpt-terra runs.
- unexpected F1 [medium] Compatibility characters bypass the separator rule  ← label: real / false

**clean-large**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.

**clean-python**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- warning: GPT-5.6 Terra (copilot) was unavailable; correctness run 2 and security run 2 used GPT-6.1 Terra (copilot).

**go-authz**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- unexpected F3 [medium] New handler and store behavior has no test coverage  ← label: real / false

**go-concurrency**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with `include-uncommitted`.
- unexpected F3 [medium] New LookupPrices behavior has no regression tests  ← label: real / false

**py-concurrency**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with `include-uncommitted`.
- unexpected F3 [medium] Stopping the pool abandons throttled jobs  ← label: real / false
- unexpected F4 [medium] New rate-limiting and throttling behavior has no test coverage  ← label: real / false
- unexpected F5 [medium] Constructor overrides bypass the positive-capacity validation  ← label: real / false

**py-error-swallow**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with `include-uncommitted`.
- missed: PE2
- unexpected F2 [medium] No test setup covers the new settlement, retry, and receipt behavior  ← label: real / false

**py-injection**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- warning: correctness run 2 requested GPT-5.6 Terra (copilot), unavailable; used GPT-6.1 Terra (copilot).
- warning: security run 2 requested GPT-5.6 Terra (copilot), unavailable; used GPT-6.1 Terra (copilot).
- unexpected F3 [high] Export can read and write files outside the reports directory  ← label: real / false
- unexpected F4 [medium] New report endpoints have no test setup or regression coverage  ← label: real / false
- unexpected F5 [medium] Relative REPORTS_DIR can make download check and serve different paths  ← label: real / false
- unexpected F6 [low] Pandoc failure diagnostics are captured but discarded  ← label: real / false

**repo-override**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- warning: Configured model ID GPT-5.6 Terra (copilot) was unavailable; correctness run 2 and security run 2 used GPT-6.1 Terra (copilot).

**seeded-correctness**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- unexpected F5 [medium] New cart behavior has no test setup or coverage  ← label: real / false

**seeded-security**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with include-uncommitted.
- warning: GPT-5.6 Terra (copilot) was refused; correctness run 2 and security run 2 used GPT-6.1 Terra (copilot).
- unexpected F3 [critical] The new database import has no runtime export and prevents the app from loading  ← label: real / false
- unexpected F6 [high] Repeated payment requests can charge the same order again  ← label: real / false
- unexpected F7 [medium] Rejected async route handlers bypass Express 4 error handling  ← label: real / false
- unexpected F8 [medium] The default post-payment redirect points to an unimplemented route  ← label: real / false
- unexpected F10 [medium] The repo has no test setup, so the new behavior is untested  ← label: real / false

**stacked**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: This branch appears stacked on `feature`. This review covers every layer back to `origin/main`. To review only your layer, run again with `base=feature`.
- warning: 1 uncommitted change was NOT reviewed. Commit it, or run again with `include-uncommitted`.
- warning: The requested `GPT-5.6 Terra (copilot)` model was unavailable; `GPT-6.1 Terra (copilot)` was used for the correctness and security second runs.
- unexpected F1 [medium] Reject invalid domain labels during email validation  ← label: real / false
- unexpected F2 [medium] Repo has no test setup; new behavior is untested  ← label: real / false
- unexpected F3 [medium] Preserve the case of the email local part  ← label: real / false

**ts-migration**: correctness x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · security x2 (Claude Opus 5.5 (copilot), GPT-6.1 Terra (copilot)) · quality x1 (Claude Opus 5.5 (copilot))
- warning: 2 uncommitted changes were NOT reviewed. Commit them, or run again with include-uncommitted.
- warning: GPT-5.6 Terra (copilot) was unavailable; correctness and security run 2 used GPT-6.1 Terra (copilot).
- unexpected F2 [medium] The new timezone behavior has no tests, and the repository has no test setup  ← label: real / false
