# Eval: new fixtures, focused run (Claude Code, Mode A, opus + sonnet), 2026-11-12

| Fixture | Diff | Main findings | High+ | Result |
|---|---|---|---|---|
| clean-large | 13 files, 263 lines (refactor) | 0 | 0 | PASS: all 5 reviewers returned `[]` |
| clean-python | 4 files, 114 lines | 0 | 0 | PASS: all 5 returned `[]` |
| repo-override (with rule) | 3 files, 80 lines | 1: RO1 **medium / high**, cites `.pre-pr-review.md` | 0 | PASS (after the `alt_locations` fix) |
| repo-override control (`git rm .pre-pr-review.md`) | same | 1: same issue at **low / medium**, "inferred convention from the projects route" | 0 | n/a (control) |

**Spec success criterion 6 (repo context measurably changes focus):** met, but as a change of **severity and confidence**, not detection. With one existing example of the pattern in base, the quality lens infers the convention by itself, as `quality.md` "Repo conventions" asks. The rule raised the finding from low/medium to medium/high and made it cite the rule.

## Fixes from this run

| Problem | Fix |
|---|---|
| The with-rule finding was located on the `import { db }` line, outside RO1's span, so the scorer called it MISSED | `alt_locations` per defect in expected.json (RO1: line 3). The scorer still ignores `related_locations` on purpose |
| clean-python's coordinator **ran the project's code** to check inputs | SKILL.md ground rule 5: never execute the code under review |
| Model for a 1-run `tool-default` lens was undefined (two agents guessed opus) | config.md: first member of the tool's pair in Mode A, own model in Mode B |
| Claude Code's concurrent-subagent limit refused 4 of 5 launches; the agent relaunched them using the failure retry | orchestration.md: a concurrency limit isn't a failure. Launch the rest when slots free and keep Mode A |
| `.pre-pr-review.md` with no frontmatter: warn? | config.md: valid, context only, no warning |

The concurrency limit was probably caused by this eval setup (4 coordinators × 5 reviewers at once), not by normal use.
