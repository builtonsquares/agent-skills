---
# pre-pr-review configuration. Copy this file to your repo root as .pre-pr-review.md.
# Everything is optional; delete what you don't need. Reference: references/config.md
reviewers:
  correctness: { runs: 2 }                       # 1 or 2. Default 2.
  security:    { runs: 2 }                       # 1 or 2. Default 2. Can't be turned off.
  quality:     { runs: 1 }                       # 1 or 2. Default 1.
  # Pin model families per lens (one per run). Unset = recommended pair: opus + gpt-terra.
  # correctness: { runs: 2, models: [opus, gpt-terra] }
---

# Repo context for reviewers

Everything below the frontmatter is read by every reviewer as context. It can add checks
and conventions. It can't disable the security lens or relax the read-only rules.

## Conventions
<!-- e.g. "Errors are returned as Result<T, AppError>; never throw from services." -->

## Focus areas
<!-- e.g. "Anything under src/billing/ moves money: treat double-charge risks as high." -->

## Known exceptions
<!-- e.g. "src/legacy/ is frozen; don't report quality issues there unless the diff touches it." -->
