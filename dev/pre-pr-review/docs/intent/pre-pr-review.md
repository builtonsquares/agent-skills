# Intent: Pre-PR Review Skill

Confirmed 2026-11-11 via interview.

- **Outcome:** A portable skill that reviews the whole diff for a branch or stack before the PR is opened. It reports a ranked list of findings, each with a file and line, a severity, why it matters and a suggested fix. It covers correctness, security and code quality.
- **User:** An engineer at the user's day job who drove an agent to produce a feature and needs to review it properly before handing it to peers.
- **Why now:** Agents are producing a lot of code. Human reviewers are overloaded, and GitHub Copilot's PR review sees only a snapshot of the PR, not the whole feature.
- **Success:** Peer reviewers stop finding problems the author could have caught. Engineers trust the report and keep running it. Every finding is worth reading: medium, low and nit findings are fine when they're real, and nothing is there just to make the list longer.
- **Constraint:** Portability comes first: Cursor, then Copilot, then Claude Code. It does a thorough job with no setup, and a repo can optionally add its own context. Parallel reviewers on two different models are the preferred design, and their findings are combined into one list. Where a tool can't do that, it runs one thorough pass, saves the findings to a file and offers a manual second run on a different model. That second run is merged in the same way. Low-confidence findings are reported separately from confident ones.
- **Out of scope:** Fixing anything, editing code, updating development-process documents (a separate skill will handle that), opening or commenting on PRs, and running in CI or on GitHub.

## Context

- Mirrors the existing internal SDLC practice of dry-running multiple models over spec creation and synthesizing the output.
- Workflow position: feature complete → **this skill** → engineer remediates (separate SDLC skill) → open PR → peer review.
- Precision over recall: no filler findings. Low-confidence findings are reported separately from confident ones.
