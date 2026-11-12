# Tasks: pre-pr-review

Plan: [tasks/plan.md](plan.md) · Spec: [docs/specs/pre-pr-review.md](../docs/specs/pre-pr-review.md)

---

## Phase 1: Prove the risky parts

### Task 1: Platform capability spike: ✅ done 2026-11-12 (see `docs/research/platform-matrix.md`)
**Description:** Build a throwaway skill (`spike/hello-subagents/SKILL.md`) that launches two read-only subagents in parallel, one per requested model family. Each subagent reports its self-identified model and a timestamp, and the skill prints both. Run it in Cursor, Copilot (VS Code), and Claude Code, and record what actually happens.

**Acceptance criteria:**
- [ ] For each tool, the matrix in `docs/research/platform-matrix.md` records: skill discovered from `.claude/skills/`? slash-invocable? parallel subagents? model honored (requested vs self-reported)? read-only enforced?
- [ ] Copilot's `.github/agents/*.agent.md` `model:` tested with two agents pinned to different models
- [ ] A go/no-go decision is written down for the Copilot adapter and for the "degraded agreement" safeguard

**Verification:**
- [ ] Manual: user runs the spike in all three tools and pastes the output into the matrix

**Dependencies:** None
**Files:** `spike/hello-subagents/SKILL.md`, `spike/agents/*.agent.md`, `docs/research/platform-matrix.md`
**Scope:** S

### Task 2: Eval harness + first fixtures + schema: ✅ done 2026-11-12 (`is_match` rules: drop a leading `./`, lines overlap within 2, any reviewer counts)
**Description:** Create `findings.schema.json`, fixture setup scripts that build small git repos with a base commit and a feature commit, an `expected.json` per fixture, and `score.py`, which reports recall, noise, and schema validity.
*Implementation note:* one shared `evals/build-fixture.sh <name> <dest>` builds every fixture from its `base/` + `feature/` folders, instead of a `setup.sh` per fixture. It also creates a local bare `origin` so `origin/HEAD` resolves the way it does in a real clone, and builds give the same SHAs every time.

**Acceptance criteria:**
- [ ] 3 fixtures: `seeded-correctness` (≥ 3 bugs), `seeded-security` (≥ 3 vulns), `clean` (0 defects)
- [ ] `score.py` matches findings to seeded defects by file, overlapping lines, and lens, and prints recall, severity-weighted recall, and total findings on clean fixtures
- [ ] The schema covers: id, lens[], severity, confidence, agreement, models, location {file, start, end}, title, why, fix

**Verification:**
- [ ] `bash evals/fixtures/<name>/setup.sh /tmp/x` builds a repo with a reviewable diff
- [ ] `python3 evals/score.py evals/expected/seeded-correctness.json evals/samples/perfect.json` → recall 100%
- [ ] The same script with `evals/samples/empty.json` → recall 0%

**Dependencies:** None
**Files:** `skills/pre-pr-review/references/findings.schema.json`, `evals/fixtures/*/setup.sh`, `evals/expected/*.json`, `evals/score.py`, `evals/samples/*.json`
**Scope:** M

## Checkpoint 1 (review with user)
- [ ] Matrix filled with observed results
- [ ] Scorer verified against perfect and empty samples
- [ ] Copilot adapter decision made

---

## Phase 2: Single-model vertical slice (Mode B, runs: 1)

### Task 3: SKILL.md skeleton + scope resolution: ✅ done 2026-11-12 (`scripts/collect.sh` + `scripts/verify-writes.sh`, 7 scenarios verified on bash 3.2; stacked fixture added)
**Description:** Entry-point workflow plus `references/scope.md`. Covers: base resolution (`base=` → merge-base with `origin/HEAD`), the stacked-branch warning, the uncommitted-changes warning and `include-uncommitted`, skip patterns, and asking first for diffs over about 3k lines.

**Acceptance criteria:**
- [ ] Frontmatter is valid (`name` matches the directory, `description` ≤ 1024 chars, `argument-hint` set)
- [ ] The report header shows the base ref, head SHA, files and lines reviewed, and files skipped
- [ ] A stacked fixture (feature-2 on top of feature-1) triggers the stacked warning without `base=` and reviews only its own layer with `base=feature-1`

**Verification:**
- [ ] `npx skills-ref validate skills/pre-pr-review` (or the documented equivalent) passes
- [ ] Manual: run on the `clean` fixture and a stacked variant in Claude Code and check the header

**Dependencies:** Task 2
**Files:** `skills/pre-pr-review/SKILL.md`, `skills/pre-pr-review/references/scope.md`, `evals/fixtures/stacked/setup.sh`
**Scope:** S

### Task 4: Output contract: ✅ done 2026-11-12 (user rules: untested logic = medium, any hardcoded secret = critical, nits stay as one-liners)
**Description:** `references/severity.md` (severity + confidence rubric with one example per level), and `references/report-format.md` (Markdown rendering from `findings.json`, the "Worth a look" section, the honest "no issues found" output, and the `.pre-pr-review/<branch>/<sha>.md` layout).

**Acceptance criteria:**
- [ ] Every severity level and confidence level has a definition and a concrete example
- [ ] Rendering rules: low confidence → "Worth a look"; sort by severity → confidence → agreement
- [ ] First run suggests adding a `.gitignore` entry without editing the file

**Verification:**
- [ ] Manual: the agent renders `evals/samples/perfect.json` into Markdown that matches the format in the spec

**Dependencies:** Task 2
**Files:** `skills/pre-pr-review/references/severity.md`, `skills/pre-pr-review/references/report-format.md`, `skills/pre-pr-review/SKILL.md`
**Scope:** S

### Task 5: Correctness lens end to end: ✅ done 2026-11-12 (Claude Code eval: see evals/results/2026-11-12-claude-code-run1.md)
**Description:** `references/correctness.md` checklist plus a reviewer-prompt template (`references/reviewer-prompt.md`) shared by all lenses: inputs are the diff, full changed files, repo context, and the lens checklist. Output is lens-scoped findings JSON. Wire the single sequential pass into SKILL.md.

**Acceptance criteria:**
- [ ] The reviewer prompt requires the self-reported model, location ranges, and the "what NOT to report" section
- [ ] Recall ≥ 70% on `seeded-correctness`, 0 correctness findings rated high or above on `clean`

**Verification:**
- [ ] `python3 evals/score.py evals/expected/seeded-correctness.json <run>/findings.json`
- [ ] Output validates against `findings.schema.json`

**Dependencies:** Tasks 3, 4
**Files:** `skills/pre-pr-review/references/correctness.md`, `skills/pre-pr-review/references/reviewer-prompt.md`, `skills/pre-pr-review/SKILL.md`
**Scope:** S

### Task 6: Security lens (OWASP): ✅ done 2026-11-12 (Claude Code eval: see evals/results/2026-11-12-claude-code-run1.md)
**Description:** `references/security.md` built from the OWASP Top 10 and the relevant ASVS controls, written as concrete things to look for in a diff, not as a list of category names.

**Acceptance criteria:**
- [ ] Recall ≥ 70% on `seeded-security`, with every seeded critical or high found
- [ ] Repo context cannot disable the security lens (the instruction is stated explicitly)

**Verification:**
- [ ] `python3 evals/score.py evals/expected/seeded-security.json <run>/findings.json`

**Dependencies:** Task 5 (shared reviewer prompt)
**Files:** `skills/pre-pr-review/references/security.md`
**Scope:** XS

### Task 7: Quality lens + "what NOT to report": ✅ done 2026-11-12 (Claude Code eval: see evals/results/2026-11-12-claude-code-run1.md)
**Description:** `references/quality.md`, including an explicit list of things not to report (style a formatter or linter handles, preference-only renames, speculative refactors, nits with no concrete improvement).

**Acceptance criteria:**
- [ ] `clean` fixture: ≤ 1 quality finding, no medium or higher
- [ ] Seeded quality issues (duplicated utility, dead code) in `seeded-correctness` are found

**Verification:**
- [ ] `python3 evals/score.py` on `clean` and `seeded-correctness`

**Dependencies:** Task 5
**Files:** `skills/pre-pr-review/references/quality.md`
**Scope:** XS

### Task 8: Synthesis (single-run): ✅ done 2026-11-12 (Claude Code eval: see evals/results/2026-11-12-claude-code-run1.md)
**Description:** `references/synthesis.md` covers: merging lens outputs, deduplicating the same root cause across lenses (tagging multiple lenses), applying the confidence split, ranking, writing `findings.json`, and rendering Markdown.

**Acceptance criteria:**
- [ ] A bug that is also a security hole appears once, tagged `[correctness, security]`
- [ ] Re-running synthesis on the same inputs gives the same order

**Verification:**
- [ ] Manual: synthesize `evals/samples/overlap/*.json` (prepared lens outputs with a known overlap) and check there's 1 merged finding
- [ ] Full run on all 3 fixtures and score them

**Dependencies:** Tasks 5–7
**Files:** `skills/pre-pr-review/references/synthesis.md`, `skills/pre-pr-review/SKILL.md`, `evals/samples/overlap/*.json`
**Scope:** S

## Checkpoint 2 (review with user)
- [x] Single-model full report on all fixtures in Claude Code ✅ **and** Cursor ✅ (evals/results/2026-11-12-cursor-run1.md)
- [x] Recall ≥ 70%, clean ≤ 2 findings with no high or critical, schema valid (both tools: 100% / 100% high+; clean: CC 1 nit on v2, Cursor 0 on v3)
- [x] `git status` in the fixture shows changes only under `.pre-pr-review/` (both tools)

---

## Phase 3: Multi-model

### Task 9: Configuration ✅
**Description:** `references/config.md`: the `.pre-pr-review.md` frontmatter schema (`reviewers.<lens>.runs/models`), defaults (2/2/1), the family-to-model resolution table, the cross-vendor pair recommendation when models are unset, and run arguments (`runs=1`) that override config. Plus `templates/pre-pr-review.example.md`.

**Acceptance criteria:**
- [x] Zero-config run uses 2/2/1 and the header shows the recommended pair
- [x] Config `quality: {runs: 2}` changes the run count. An invalid config produces a clear warning and falls back to defaults, never a failure
- [x] A family that isn't available falls back to the tool default and the report notes it

**Verification:**
- [x] Manual: 3 runs (no config, valid config, invalid config) on `clean`, checking the header each time

**Dependencies:** Checkpoint 2
**Files:** `skills/pre-pr-review/references/config.md`, `skills/pre-pr-review/templates/pre-pr-review.example.md`, `skills/pre-pr-review/SKILL.md`
**Scope:** S
**Result (2026-11-12):** 3 Claude Code runs on `clean` (no config / valid / invalid) all met acceptance. Agent-reported ambiguities fixed: the config file no longer counts as uncommitted (collect.sh), singular warnings, `models_source`/`families`/`models_requested` rules, second-family precedence, "family not available in this tool" wording for Step 7, warning order, and the order of the closing chat lines.

### Task 10: Mode A orchestration ✅
**Description:** Capability detection (parallel subagents? model per subagent?) and launching every lens × run reviewer in one parallel batch, read-only. Records the requested models (and confirmed models only where the harness exposes them, never self-reports) and applies the degraded-agreement rule when both runs resolve to the same family. Includes the partial path: parallel subagents without model choice → Mode A on one model, then offer the Mode B second run.

**Acceptance criteria:**
- [x] Claude Code: 5 reviewers launch in a single parallel batch with the requested models (opus+sonnet, since gpt-terra isn't in CC)
- [x] Agreement labels are `agreed`/`single`/`n/a` and are correct on the seeded fixtures (CC ✅; Cursor ✅)
- [x] A forced same-model run produces the "degraded agreement" note

**Verification:**
- [x] Manual in Claude Code ✅ and Cursor ✅ (100% recall, clean 0, opus + gpt-terra in parallel). `score.py` recall is no worse than in Checkpoint 2

**Dependencies:** Task 9
**Files:** `skills/pre-pr-review/SKILL.md`, `skills/pre-pr-review/references/synthesis.md`, `skills/pre-pr-review/references/reviewer-prompt.md`
**Scope:** M
**Results:** evals/results/2026-11-12-claude-code-modeA.md

### Task 11: Mode B second run ✅ (slim: prior-run states + independent merge; Claude Code pair = opus + sonnet)
**Description:** When a `findings.json` exists for the same base and head SHA with lenses still waiting for a second run: run only those lenses, independently, before reading the prior findings, then merge with agreement labels. A different SHA means a fresh run with a note that the earlier run is stale.

**Acceptance criteria:**
- [x] Second run re-reviews only `runs: 2` lenses
- [x] The prior findings file is not read until the independent pass has written its findings (the order is explicit in the instructions)
- [x] The merged report matches what Mode A would produce for the same two models

**Verification:**
- [x] Manual: run, switch model, run again on `seeded-correctness`, then check agreement labels and that the scores aren't worse

**Dependencies:** Task 10
**Files:** `skills/pre-pr-review/SKILL.md`, `skills/pre-pr-review/references/synthesis.md`
**Scope:** S
**Results:** evals/results/2026-11-12-claude-code-modeA.md (Task 11 section)

## Checkpoint 3 (review with user)
- [x] Mode A in Claude Code + Cursor and Mode B in at least one tool, with correct agreement labels and requested-vs-actual models shown

---

## Phase 4: Portability + hardening

### Task 12: Adapters + install docs ✅ (Cursor/Copilot install checks move to Task 14)
**Description:** `adapters/copilot/` (two pinned read-only reviewer `.agent.md` files, if Task 1 said go), `adapters/cursor/README.md` (model-pinning caveats), `adapters/claude-code/README.md`, and the root `README.md` (install with `npx skills add` and by manual copy into `.claude/skills/`).

**Acceptance criteria:**
- [x] Installing with `npx skills add <this-repo> --skill pre-pr-review` into a scratch repo works for the cursor and claude-code targets (layout verified; full Claude Code run from the installed copy: clean, Mode A, write check clean)
- [~] The manual-copy path is documented and works in all three tools (documented; Cursor/Copilot runs in Task 14)

**Verification:**
- [ ] Manual: fresh scratch repo, install both ways, run on `clean`

**Dependencies:** Checkpoint 3
**Files:** `README.md`, `skills/pre-pr-review/adapters/copilot/*.agent.md`, `skills/pre-pr-review/adapters/cursor/README.md`, `skills/pre-pr-review/adapters/claude-code/README.md`
**Scope:** M
**Notes (2026-11-12):** `npx skills` puts Cursor and Copilot on the shared `.agents/skills/` folder, gives Claude Code a symlink, and writes `skills-lock.json`. It doesn't install agent files, so the `agents/` reviewer definitions are an optional manual copy. Bugs fixed from the real install: the symlink broke the snapshot hash; the installed skill files were counted as uncommitted and listed under "Not reviewed" (now excluded by exact install path); a tooling-only diff crashed under pipefail.

### Task 13: Expand fixtures ✅
**Description:** Add 5 or more seeded fixtures covering different languages and defect types (concurrency, authz, a migration missing from a config change, injection, an error swallowed in a catch), 2 more clean fixtures, and a `repo-override` fixture whose `.pre-pr-review.md` contains a repo-specific rule.

**Acceptance criteria:**
- [x] ≥ 8 seeded, ≥ 3 clean, 1 override fixture, each with `expected.json` (8 seeded incl. repo-override, 4 clean incl. stacked)
- [x] At least 2 languages besides the first fixtures' language (Python ×4, Go ×2)

**Verification:**
- [x] Every fixture builds and `score.py` PASSes against the perfect sample (`evals/make-perfect.py`)

**Dependencies:** Task 2 (can run in parallel with Phase 3)
**Files:** `evals/fixtures/*`, `evals/expected/*` (split into sub-tasks of ≤ 5 files)
**Scope:** M
**Added (2026-11-12):** py-concurrency, py-error-swallow, py-injection, go-authz, go-concurrency, ts-migration (seeded); clean-python, clean-large (263-line, 13-file refactor); repo-override (`.pre-pr-review.md` layering rule). Also `evals/make-perfect.py` and `feature.delete` support in build-fixture.sh. The Python and TS fixtures' tests pass, and tsc is clean (checked by the authoring agent). Go has not been compiled because no toolchain is available. **Focused skill run** (evals/results/2026-11-12-claude-code-task13.md): clean-large 0, clean-python 0, repo-override PASS. The rule raises RO1 from low/medium (inferred convention) to medium/high (cites the rule). The other 6 new seeded fixtures run in Task 14.

### Task 14: Full portability eval + tuning
**Description:** Run every fixture in all three tools and record the mode used. Hand-label each main-list finding as real or false. Tune the checklists and the "what NOT to report" lists until the targets are met.

**Acceptance criteria:**
- [ ] `evals/results/<date>.md` records recall, precision, noise, and mode per tool
- [ ] All 7 spec success criteria met

**Verification:**
- [ ] The results file reviewed with the user

**Dependencies:** Tasks 12, 13
**Files:** `evals/results/*.md`, `skills/pre-pr-review/references/{correctness,security,quality}.md`
**Scope:** M

## Checkpoint 4: Done
- [ ] Success criteria 1–7 met with evidence
- [ ] User sign-off before sharing with the team
