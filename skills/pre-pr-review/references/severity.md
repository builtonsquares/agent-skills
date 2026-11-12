# Severity and confidence rubric

Assign **severity** by asking: *if this merges as-is, what is the worst realistic outcome?* Assign **confidence** by asking: *how sure am I that it's real, from the code I can see?* They're independent: a critical issue can have low confidence, and a nit can have high confidence.

## Severity

| Level | Use when, if merged as-is… | Typical examples |
|---|---|---|
| **critical** | It causes a security breach, data loss or corruption, or an outage, and it's reachable through normal use or by an attacker. Must be fixed before merge. | SQL injection on a user-facing endpoint. Any hardcoded credential (fixed rule 2). A migration that drops a populated column. Auth check removed from an admin route. |
| **high** | It breaks a feature's core behavior or exposes sensitive data in realistic cases. Should be fixed before merge. | Discount math makes totals negative. Async work not awaited, so success is reported before it happens. One user can read another user's records. Card data written to logs. |
| **medium** | It's wrong only in edge cases, degrades reliability, or creates a security weakness that needs other conditions to exploit. Fix before merge unless there's a reason not to. | Off-by-one in pagination. An error swallowed in a catch. Open redirect. Missing timeout on an external call. A new branch of logic with no test. |
| **low** | The code works, but it will cost the team later: maintainability, duplication, misleading code. | Reimplements an existing utility. Dead code. A name that says the opposite of what the code does. |
| **nit** | A small, concrete improvement with no behavior impact. Rendered in compact form, and never a reason to block. | A clearer variable name in a tricky block. A redundant condition. |

**Never report** (any severity): formatting or style a formatter or linter enforces, personal preference, "consider refactoring" without a concrete problem, or hypothetical issues that need code you can't see to be wrong.

## Confidence

| Level | Meaning | Where it goes |
|---|---|---|
| **high** | You can point at the exact lines and explain the failure path from the code in front of you. | Main list |
| **medium** | Very likely real, but it depends on something you can reasonably infer and can't fully see (e.g. how a caller you didn't open uses this). Say what you're assuming in "Why it matters". | Main list |
| **low** | Plausible, but you couldn't confirm it. It needs runtime information, configuration, or code outside what you read. | "Worth a look" only, never the main list |

## Calibration rules

- When unsure between two severities, pick the **lower** one and explain the conditions that would make it worse.
- Severity is about impact if merged, not effort to fix. A one-character fix can be critical.
- A finding raised by two models (`agreed`) does not raise its severity. It's evidence for confidence, not impact.

## Fixed rules (team decisions, 2026-11-12)

These override the "pick the lower one" calibration rule:

1. **Untested new logic is medium.** A new branch of behavior (a new condition, error path, or calculation) with no test that exercises it is at least **medium**, even when the code looks right. Exempt: pure wiring (re-exports, config plumbing, logging statements) and code already covered by an existing test. **If the repo has no test setup at all** (no test files, no test runner or script), report a single medium finding for the whole diff instead of one per file (see `quality.md`). (Decided 2026-11-12.)
2. **Hardcoded secrets are always critical.** Any credential, API key, token, private key, or password literal in source is **critical**, including ones that look like test or non-production values. Rotation and secret-scanning decide whether it's harmless. The reviewer doesn't. Exempt: obvious placeholders (`"changeme"`, `"<YOUR_KEY>"`, `"xxx"`) and values loaded from env or config at runtime.
3. **Nits stay in the main report**, in the compact one-line "Nits" section at the end, and only when they're concrete (see "Never report").
