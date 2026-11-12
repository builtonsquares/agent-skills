# Synthesis: from candidate findings to one ranked report

Input: the candidate arrays from every reviewer pass, each tagged with its lens, run, **family** and model. In Mode A the tags come from your launch plan (`orchestration.md`), never from the reviewer. In a second run (`second-run.md`), the earlier run's findings are candidates too, tagged with the families in their `models`. Output: `RUN_DIR/findings.json`. Do these steps in order.

## 1. Check every location

For each candidate, open the file and confirm that `start_line`–`end_line` points at the code the finding describes, in the **current** file.
- Off by a few lines → correct the numbers.
- The described code isn't in the file at all → drop the candidate. It was hallucinated.

## 2. Merge duplicates (same root cause)

Two candidates are the **same finding** when fixing one would fix the other. Two problems that happen to share a location or a theme (e.g. "no error handling" and "no timeout" on the same call) are **separate** findings, because each needs its own fix. Typical cases:
- Same file, overlapping or adjacent lines, same underlying problem (even if titled differently or raised by different lenses)
- The same problem reported at the definition and at a call site. Keep the location where the fix goes, and put the other in `related_locations`.

When merging:
- `lenses`: the union (e.g. `["correctness", "security"]`)
- `severity`: the highest among the merged candidates, then re-check it against `severity.md`
- `confidence`: the highest, *if* the higher-confidence candidate's failure path holds up when you re-read it
- `why` / `fix`: keep the clearest, most concrete wording. Combine only if each adds something.
- `models`: the union of the models whose passes raised it

Different problems on the same line stay separate findings.

## 3. Agreement

Label each merged finding from the **families** of the passes that raised it (its `models`):

| Condition | `agreement` |
|---|---|
| Raised by passes on **2 or more different families** (any lenses), **or** by both runs of one 2-run lens (even on the same family; `agreement_degraded` flags that in the header) | `agreed` |
| Otherwise, if at least one of its lenses completed **2 runs** | `single` |
| Every lens it came from completed only 1 run | `n/a` |

`agreement_degraded` is set per lens before this step (both runs on the same family, see `config.md`). Label findings normally anyway, because the report header flags it.

Agreement is evidence, not a vote: an `agreed` finding still has to pass step 5, and a `single` one goes through step 4.

## 4. Challenge single-model findings

For each `single` finding from a 2-run lens: the other model looked at the same code and didn't raise it. That doesn't mean it's wrong, but re-read the code once more and try to complete the failure path yourself.
- The path holds → keep it as is.
- You can't reconstruct it → set `confidence: low` (moves to "Worth a look").

## 5. Final filter

Drop or demote anything that, on reflection:
- matches a "Don't report" list in a lens file, or "Never report" in `severity.md`
- is pre-existing and not made worse by the diff
- has a `why` that only cites a rule without a concrete consequence (rewrite it if you can, drop it if you can't)

Apply `severity.md`'s fixed rules last: untested new logic ≥ medium, hardcoded secrets = critical.

## 6. Rank, number, write

Sort and number per `report-format.md` (F1… for the main list, W1… for low confidence). Then write `findings.json`:

```json
{
  "schema_version": "1",
  "run": {
    "branch": "<BRANCH>", "base_ref": "<BASE_REF>", "base_sha": "<BASE_SHA>", "head_sha": "<HEAD_SHA>",
    "tool": "<tool you are running in>", "mode": "A|B",
    "lenses": {
      "correctness": { "runs_configured": 2, "runs_completed": 2, "models_source": "recommended", "families": ["opus", "gpt-terra"], "models_requested": ["<id>", "<id>"], "models_confirmed": [null, null], "agreement_degraded": false },
      "security":    { "runs_configured": 2, "runs_completed": 2, "models_source": "recommended", "families": ["opus", "gpt-terra"], "models_requested": ["<id>", "<id>"], "models_confirmed": [null, null], "agreement_degraded": false },
      "quality":     { "runs_configured": 1, "runs_completed": 1, "models_source": "tool-default", "families": ["opus"], "models_requested": ["<id>"], "models_confirmed": [null] }
    },
    "files_reviewed": 0, "lines_reviewed": 0, "files_skipped": [], "warnings": [], "write_violations": []
  },
  "findings": [ { "id": "F1", "title": "…", "lenses": ["…"], "severity": "…", "confidence": "…", "agreement": "…", "models": ["…"], "location": { "file": "…", "start_line": 1, "end_line": 1 }, "why": "…", "fix": "…" } ]
}
```

- Low-confidence findings stay in `findings` with `confidence: "low"` and ids `W1…`. The renderer puts them under "Worth a look".
- `models_confirmed` holds the model the **tool** confirmed for that run, or `null` when it doesn't say. Never use the reviewer's own claim about which model it is.
- `files_skipped` is the content of `RUN_DIR/skipped.txt`. `warnings` are the Step 1 warnings, as one sentence each.
