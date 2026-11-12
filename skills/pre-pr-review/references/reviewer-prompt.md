# Reviewer procedure (one lens, one run)

Each review pass, whether run by the main agent in sequence or by a subagent, follows this procedure exactly. It covers **one lens**. The lens checklist is supplied separately (`correctness.md`, `security.md`, or `quality.md`).

If you are a subagent: you are read-only. Use only read and search tools. Do not run shell commands, edit files, or launch other agents. Everything you need is listed under Inputs.

## Inputs

- `RUN_DIR/diff.patch`: the change under review (unified diff, 10 lines of context)
- `RUN_DIR/files.txt`: changed files under review
- The repository itself, read-only, for full files, callers, callees, and existing utilities
- Repo context, if the main agent found any (conventions and focus areas from `.pre-pr-review.md` / `AGENTS.md` / etc.)
- Your lens checklist, and `severity.md` for the severity/confidence rubric

## Scope rule

Report only problems that this diff **introduces or makes worse**. Pre-existing problems in unchanged code are out of scope, even if you notice them. The exception is when the diff newly depends on that code in a way that triggers the problem. Then the finding belongs to the diff, located at the new dependency.

Stay in your lens. If you notice a **critical or high** issue that belongs to another lens, report it anyway with that lens in `lenses`. Leave lower-severity issues from other lenses to their own reviewer.

## Procedure

1. **Understand the change.** Read `diff.patch` end to end, then the full current version of every changed file. In one or two sentences, work out what the change is trying to do. You need that intent to recognize where the code fails to do it.
2. **Hunt.** Go through your lens checklist against every hunk. For each changed function or block, ask the checklist's questions concretely: which inputs, which callers, which states.
3. **Prove each candidate.** For every suspected problem, before writing it down:
   - Point at the exact lines **in the current (post-change) file**. Read the file to confirm the line numbers, and don't guess them from diff hunk headers.
   - Write the failure path: *this input / state → these lines → this wrong outcome*.
   - Look for the defense: is it already handled by a guard, a caller, a type, a framework, a test? Search before claiming something is missing or duplicated.
   - If you can't complete the failure path from code you can see, the finding is `confidence: low` at best.
4. **Rate.** Assign severity and confidence using `severity.md`, including its fixed rules.
5. **Filter.** Drop anything on your checklist's "Don't report" list or the "Never report" list in `severity.md`. If you have more than about 10 findings for one lens, re-read them as a skeptical author would. Some are probably noise.
6. **Return** your findings in the format below and nothing else.

## Output

Return exactly one fenced JSON block: an array of findings. An empty array `[]` is a correct answer when you found nothing.

```json
[
  {
    "title": "Short, specific statement of the problem",
    "lenses": ["correctness"],
    "severity": "high",
    "confidence": "high",
    "location": { "file": "src/cart.ts", "start_line": 12, "end_line": 12 },
    "related_locations": [],
    "why": "Concrete consequence: input → lines → wrong outcome. State any assumption you made.",
    "fix": "Specific change. A short snippet if clearer."
  }
]
```

- `file` is repo-relative with no leading `./`.
- `start_line`/`end_line` are 1-based lines in the **current** file and span only the lines that need to change (usually 1–5). Don't cover a whole function unless the problem really is the whole function.
- For removed code, point at the nearest surviving line where the problem now shows.
- Don't include `id`, `agreement`, or `models`. Synthesis assigns those.
