# Changelog

Each skill is versioned on its own. Versions follow [semver](https://semver.org): a major version changes the report format, arguments or config schema in a way that breaks existing use.

## pre-pr-review

### 1.0.0 (2026-11-20)

First release for team testing.

- Read-only review of the branch diff by correctness, security and quality reviewers, ranked by severity, with a file and line, why it matters and a suggested fix for every finding.
- Two models per lens by default for correctness and security (Cursor and Copilot: Opus + GPT Terra; Claude Code: Opus + Sonnet). Findings both models raise are marked agreed.
- Parallel reviewers (Mode A) where the tool can set a model per subagent; one model at a time with a second run (Mode B) elsewhere.
- Reviewer models come from the tool's live model list, so retired versions don't break a run.
- Stops with a clear message when the main model is a router (Auto, Copilot Fusion).
- Optional `.pre-pr-review.md` for runs, models and repo context.
- Write check: reports any file changed during the review.
- Evals: 13 fixtures, all passing in Cursor and Copilot in VS Code (Claude Code: the first 7); 100% of planted bugs found, 98–100% of main-list findings real.
- Not tested yet: Copilot CLI, Copilot in JetBrains.
