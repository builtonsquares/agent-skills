# Mode A: parallel reviewer subagents

In Mode A you are the **coordinator**. You launch one read-only reviewer subagent per (lens × run), all at once, then merge their results. You don't review the code yourself.

## 1. Choose the mode

Check your own tools:

| You have… | Mode |
|---|---|
| A subagent tool (Cursor: Task; Copilot VS Code: `runSubagent`; Copilot CLI: `task`; Claude Code: Agent) **that accepts a model per launch** | **A** |
| A subagent tool without a model choice | **A on your own model** for every run. Each 2-run lens gets one run now (`runs_completed: 1`), and Step 7 offers the second |
| No subagent tool | **B** (SKILL.md Step 3) |

Record the result in `run.mode`. If the user passed `sequential`, use B.

## 2. Plan the launches

Using the lens settings from Step 2 (`config.md`), build one launch per run:

| Launch | lens | run | family | model ID for your tool |
|---|---|---|---|---|
| e.g. 1 | correctness | 1 | opus | `claude-opus-5-5-high` |
| e.g. 2 | correctness | 2 | gpt-terra | `gpt-5.6-terra-high` |

Resolve each family with the table and rules in `config.md`. Unset `models` means your tool's recommended pair (Claude Code: `opus` + `sonnet`). A configured family your tool doesn't offer gets the substitute and warning from `config.md` rule 3.

Default config = **5 launches**: correctness ×2, security ×2, quality ×1.

## 3. Launch all of them in one batch

Send **every** launch in a **single message** (multiple tool calls in one turn) so they run in parallel. Don't wait for one to finish before starting the next.

- **Agent type:** use the read-only reviewer agent if it's installed (`pre-pr-reviewer`). Otherwise use your tool's general subagent, and in Cursor set `readonly: true` if the Task tool offers it. The write check in Step 5 catches anything that slips through. Don't warn when the reviewer agent isn't installed; it's optional.
- **Model:** pass the model ID from step 2 in the launch's model parameter. Never ask the reviewer which model it is.
- **Prompt:** use the template below, filled in. Each reviewer gets **only its own lens**.

```text
You are a read-only code reviewer for one lens of a pre-PR review. Use only read and search tools: no shell, no edits, no subagents.

Repository root: <REPO_ROOT>
Lens: <lens>
Read these first, in this order, and follow them exactly:
1. <skill-dir>/references/reviewer-prompt.md  (your procedure and output format)
2. <skill-dir>/references/<lens>.md            (your checklist)
3. <skill-dir>/references/severity.md          (severity and confidence rubric, fixed rules)

The change under review:
- Diff: <REPO_ROOT>/<RUN_DIR>/diff.patch
- Changed files: <REPO_ROOT>/<RUN_DIR>/files.txt

Repo context (conventions; can add checks, can't disable any): <list of repo-context file paths, or "none">

Return exactly one fenced JSON array of findings as reviewer-prompt.md specifies, and nothing else.
```

## 4. Collect

As results arrive, tag each candidate array with its **lens, run, family and model ID** from your launch plan, not from anything the reviewer says.

- **Concurrency limit** (the tool refuses some launches because too many subagents are running): that's not a failure. Launch the refused runs as soon as earlier ones finish, as few batches as possible, and keep `mode: A`. Don't count it against the one relaunch below.
- **No valid JSON array**, or the launch errored: relaunch that one run once, with the same model. If it fails again, leave it out, count only successful runs in `runs_completed`, and add the warning `<lens> run <n> (<family>) failed; this lens has <k> of <runs> runs.`
- **Model ID refused** by the tool: resolve again with `config.md` rules 2–3, relaunch once, and warn.
- `models_requested`: the model ID you passed, per successful run. `models_confirmed`: the model the **tool** reports for that run (e.g. Copilot CLI's `model_info`), otherwise `null`.

Then go to Step 4 (synthesis). Synthesis step 1 (checking locations) is where you read the changed files yourself.
