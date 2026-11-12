# Second run: completing an earlier review of the same commit

Use this when Step 1 printed **`PRIOR_RUN: incomplete`**. An earlier review of this exact commit and base ran only the first model for some lenses. `PRIOR_PENDING` lists those lenses and the family that already ran them, e.g. `correctness(opus),security(opus)`.

The value of a second opinion is that it's **independent**, so the order below matters.

## 1. Don't look yet

Until step 4, **do not open** `RUN_DIR/findings.json`, `RUN_DIR/report.md` or anything under `RUN_DIR/previous/`. Don't search them either. You may read everything else (the diff, the code, repo context).

## 2. Check your model is different

For each lens in `PRIOR_PENDING`, compare your model's family with the family that already ran it.

- **Same family for every pending lens:** stop without reviewing. Tell the user: "The first run of <lenses> already used <family>. Switch your model to **<second family>** (see `config.md`) and run `/pre-pr-review` again." Don't touch any files.
- **Same family for some:** review only the lenses where you differ, and name the others in the final message.

In **Mode A**, don't use your own family: launch only the pending runs, each on its configured second family (`config.md`, `orchestration.md`).

## 3. Review only the pending lenses, then save

Run **only** the pending lenses (Mode B: separate passes, as in SKILL.md Step 3; Mode A: launches). Lenses that are already complete don't run again.

Write the new candidates to `RUN_DIR/second-run.json` **before reading anything from the earlier run**: one JSON array, each candidate in the reviewer-prompt.md format plus `"family": "<your family>"`.

## 4. Merge

Now read `RUN_DIR/findings.json` (the earlier run). Then run synthesis (SKILL.md Step 4, `synthesis.md`) over:

- **every finding from the earlier run**, including `confidence: low` ones, each treated as a candidate from the families in its `models`, and
- **every candidate in `second-run.json`**.

Agreement then works exactly as it would have in Mode A. A finding both runs raised is `agreed`. One that only one run raised is `single` and gets challenged (synthesis step 4). A finding the first run put in "Worth a look" and this run raises with a full failure path can move up to the main list.

Update `run` from the earlier run's `run`: for each lens you completed, add 1 to `runs_completed` and append your family and model to `families` and `models_requested` (and `null` to `models_confirmed`). Keep `mode` as it was, and keep the earlier run's warnings unless they no longer apply.

Then continue with Step 5 (write check), Step 6 (which overwrites `findings.json`, `report.md` and `state.txt`) and Step 7.
