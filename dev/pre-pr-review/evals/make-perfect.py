#!/usr/bin/env python3
"""Build a "perfect" findings.json from an expected.json: one finding per seeded defect, exactly
at its location. Scoring it must PASS with 100% recall; that checks the expected file and the scorer
agree, not the skill.

    python3 evals/make-perfect.py evals/expected/<fixture>.json > /tmp/perfect.json
    python3 evals/score.py evals/expected/<fixture>.json /tmp/perfect.json
"""
import json
import sys


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: make-perfect.py <expected.json>")
    with open(sys.argv[1], encoding="utf-8") as fh:
        expected = json.load(fh)
    findings = [
        {
            "id": f"F{n}",
            "title": d["summary"],
            "lenses": d["lenses"],
            "severity": d["severity"],
            "confidence": "high",
            "agreement": "n/a",
            "models": ["perfect"],
            "location": d["location"],
            "why": d["summary"],
            "fix": "n/a",
        }
        for n, d in enumerate(expected["defects"], start=1)
    ]
    one = {"runs_configured": 1, "runs_completed": 1, "models_requested": ["perfect"]}
    doc = {
        "schema_version": "1",
        "run": {
            "branch": "feature", "base_ref": "origin/main", "base_sha": "0000000", "head_sha": "1111111",
            "mode": "B", "lenses": {"correctness": one, "security": one, "quality": one},
        },
        "findings": findings,
    }
    json.dump(doc, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
