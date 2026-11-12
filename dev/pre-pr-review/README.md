# pre-pr-review: development

Run every command here **from this folder** (`dev/pre-pr-review/`). Paths in the docs below are relative to it.

| Path | What |
|---|---|
| `docs/intent/`, `docs/specs/` | What the skill is for, and the approved spec |
| `docs/research/platform-matrix.md` | What each tool actually supports (observed) |
| `tasks/plan.md`, `tasks/todo.md` | Implementation plan and progress |
| `evals/fixtures/`, `evals/expected/` | Small test repos (planted bugs, or clean) and what a correct review finds |
| `evals/build-fixture.sh`, `evals/build-all.sh` | Build one or all test repos as real git repos |
| `evals/score.py`, `evals/summarize.py` | Score one run, or summarize every run as Markdown for an issue |
| `evals/make-perfect.py` | A "perfect" findings file per fixture, for checking the expected files |
| `evals/results/` | Recorded eval runs |

## Eval loop (any machine, nothing to copy)

1. **Install the skill** for yourself, from GitHub:
   ```bash
   npx skills add builtonsquares/agent-skills --skill pre-pr-review -g -a cursor github-copilot
   ```
2. **Get the test repos.** Clone this repo outside your work folders and build them:
   ```bash
   git clone --depth 1 https://github.com/builtonsquares/agent-skills.git ~/agent-skills
   cd ~/agent-skills/dev/pre-pr-review
   bash evals/build-all.sh ~/pre-pr-eval            # or name a few fixtures after the folder
   ```
3. **Run the review** in each folder under `~/pre-pr-eval/`: open it in the tool, choose a specific model (not Auto), type `/pre-pr-review` (or "run pre-pr-review").
4. **Summarize and report:**
   ```bash
   python3 evals/summarize.py ~/pre-pr-eval > results.md
   ```
   Open a new issue with the **Eval results** template and paste `results.md`. It holds only fixture names, scores, model names and titles of findings about fixture code.
5. **Clean up:** `rm -rf ~/pre-pr-eval` (the `*.origin.git` folders are inside it).

To update: `git -C ~/agent-skills pull` and `npx skills update pre-pr-review -g`. Build into a **new** folder for each round (`build-all.sh` refuses an existing one).

Never paste output from reviews of real work code into an issue. This repo is public.
