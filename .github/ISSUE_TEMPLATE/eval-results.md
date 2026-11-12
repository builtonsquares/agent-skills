---
name: Eval results
about: Results from running a skill's eval fixtures in one tool
title: "[eval] <skill> · <tool> · <main model>"
labels: eval
---

<!-- This repo is PUBLIC. Paste only output from the eval fixtures (summarize.py), never from real work code. -->

**Skill:** pre-pr-review
**Skill version / commit:** <!-- git -C ~/agent-skills rev-parse --short HEAD -->
**Tool:** <!-- Cursor · Copilot VS Code · Copilot CLI · Copilot JetBrains · Claude Code -->
**Main model:** <!-- e.g. Claude Opus 5.5 -->
**Installed via:** <!-- npx skills -g / project / manual copy; which folder the tool loaded it from -->

## Results

<!-- paste results.md here -->

## Observations

- Did reviewers run in parallel? Which models showed in the tool?
- Approval prompts (how many, for what)?
- Anything the agent skipped, improvised or got wrong:
- Unexpected findings: label each one real or false above
