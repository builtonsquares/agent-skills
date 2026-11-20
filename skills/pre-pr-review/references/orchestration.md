# Mode A: parallel reviewer subagents

In Mode A you are the **coordinator**. You launch one read-only reviewer subagent per (lens × run), all at once, then merge their results. You don't review the code yourself.

## 1. Choose the mode

Check your own tools:

| You have… | Mode |
|---|---|
| A subagent tool (Cursor: Task; Copilot VS Code: `runSubagent`; Copilot CLI: `task`; Claude Code: Agent) **that accepts a model per launch** | **A** |
| A subagent tool, but you **can't set a model** for a launch (no model parameter, the parameter isn't offered with your current main model, or you'd have to leave it unspecified) | **A, one run per lens** on the tool's default. **Never launch two runs of one lens without a model for each:** they'd almost certainly be the same model, which costs a launch and adds no second opinion. Record `runs_completed: 1`, `families: ["unknown"]`, `models_requested: ["unspecified"]`, and Step 7 offers the second run |
| No subagent tool | **B** (SKILL.md Step 3) |

Record the result in `run.mode`. If the user passed `sequential`, use B.

**Your main model is a router** ("Auto", "Copilot Fusion", or anything else that picks the model for you): the tool may ignore the model you pass per launch and send every reviewer to whatever it picks. Tell the user first, in one line: "Your main model is <router>, which may override the reviewer models. For a real two-model review, pick a specific model (e.g. Claude Opus 5.5) and run again." Then:
- if you **can** pass a model per launch, use Mode A as normal and check what actually ran (section 4);
- if you **can't** (common with a router: the model parameter may be missing), use the "can't set a model" row above: **one run per lens**, never two on the default.

## 2. Plan the launches

Using the lens settings from Step 2 (`config.md`), build one launch per run:

| Launch | lens | run | family | model ID for your tool |
|---|---|---|---|---|
| e.g. 1 | correctness | 1 | opus | `claude-opus-5-5-high` |
| e.g. 2 | correctness | 2 | gpt-terra | `gpt-5.6-terra-high` |

Resolve each family with the table and rules in `config.md`. Unset `models` means your tool's recommended pair (Claude Code: `opus` + `sonnet`). Pick each ID from your tool's model list (newest version in the family, `config.md` rules 1–2), not from memory. A configured family your tool doesn't offer gets the substitute and warning from `config.md` rule 4.

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
- **Model ID refused or retired** (e.g. "model not available", "deprecated", "unsupported"): this is not a reviewer failure and doesn't use up the relaunch. Read your tool's model list again, pick the newest model in the **same family** (`config.md` rule 2) and relaunch. Never stop the review over a refused ID. Warn only if the family itself was unavailable (rule 4).
- `models_requested`: the model ID you passed, per successful run. `models_confirmed`: the model the **tool** reports for that run (e.g. Copilot CLI's `model_info`, or the model VS Code shows on the subagent), otherwise `null`.
- **Check that the requested models actually ran.** If the tool shows a different model than you requested for any run, the tool overrode your choice. Then:
  - record the model that ran in `models_confirmed`, and its family in `families` (map it to the nearest family, or use its own name, e.g. `gpt-luna`);
  - add the warning `<tool> ignored the requested models: <lens> run <n> asked for <requested>, ran on <actual>.` (one line, listing every mismatched run);
  - if both runs of a lens ran on the same model, set `agreement_degraded: true` for that lens;
  - if **every** 2-run lens is degraded, end your chat message (Step 7) with: "The two-model check didn't happen: every reviewer ran on <model>. Pick a specific main model (e.g. Claude Opus 5.5) instead of <router or current model> and run again."

  Never record a run as the model you asked for when the tool showed another.

Then go to Step 4 (synthesis). Synthesis step 1 (checking locations) is where you read the changed files yourself.
