# Lens: quality

**Question:** will this change cost the team later, in time to understand, change, or trust the code, in a way the author would agree is worth fixing now?

Quality is the lens most prone to noise. The bar: **every finding names a concrete problem and a concrete fix.** If the honest fix is "it's fine, I'd just do it differently", don't report it.

## Look for

**Missing tests (this lens owns tests)**
- New logic (a new condition, error path, calculation, or state transition) with no test that exercises it: **medium** (`severity.md` fixed rule 1). Check the test folders and any test files in the diff before reporting. Say which behavior is untested, not just "add tests".
  - Report **one finding per changed source file**, not one per function. Point `location` at the most important untested function (its signature plus a few lines, not the whole file), put the other untested functions in `related_locations`, and list every untested behavior in `why`.
  - A test that exists but can't fail for the behavior it names counts as untested.
  - **No test setup in the repo at all** (no test files **and** no `test` script; a test library in the dependencies alone doesn't count): report **one** medium finding for the whole diff, titled along the lines of "Repo has no test setup; new behavior is untested". Point `location` at the most important untested function, put the others in `related_locations`, list the untested behaviors in `why`, and make the fix "add a test runner, then cover these behaviors first". One root cause gets one finding.
- Tests added in the diff that can't fail (asserting on mocks they set up, `expect(true)`, snapshot of nothing), or that assert the wrong expected value
- Pure wiring (re-exports, config plumbing, logging statements) is exempt

**Duplication**
- New code that reimplements a utility, helper, constant, or type the repo already has. **You must search the repo and name the existing one** (file + symbol) before reporting.
- Copy-pasted blocks within the diff that differ only in a value or two

**Dead or leftover code**
- Functions, variables, parameters, imports, or exports added in this diff and never used
- Unreachable branches, commented-out code, debug output (`console.log`, `print`, `debugger`) left in

**Misleading code**
- Names, comments, or docs that contradict what the code does (if the contradiction causes wrong behavior, that's correctness)
- Magic numbers or strings whose meaning isn't obvious and that already have a named constant elsewhere in the repo

**Complexity with a concrete simpler form**
- Logic that has a clearly simpler equivalent you can write out in the fix (not "this could be cleaner")
- Error messages or log lines that would be useless when debugging a production incident (no identifiers, swallowed causes)

**Repo conventions**
- Clear departures from conventions stated in repo context, or followed consistently by the surrounding code (error-handling pattern, module layout, naming scheme). Name the convention and an example of it.

## Don't report (quality)

- Formatting, whitespace, import order, quote style, line length: anything a formatter or linter enforces
- Naming preferences where the current name is accurate
- "Add a comment/docstring" unless the code is actively misleading without one
- Speculative refactors, design-pattern suggestions, or "extract this into a function" without a concrete duplication or complexity problem
- Type annotations that inference already covers
- Pre-existing quality issues in unchanged code
