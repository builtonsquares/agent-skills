#!/usr/bin/env python3
"""Score a pre-pr-review findings.json against a fixture's expected.json.

    python3 evals/score.py evals/expected/<fixture>.json <run>/findings.json [--json]

Exit codes: 0 = targets met, 1 = targets missed, 2 = invalid input.

What it measures
  seeded fixtures: recall (share of seeded defects matched by a main-list finding) and
                   high_plus_recall (same, for critical/high defects only).
  clean fixtures:  noise (main-list finding count) and high-plus noise.
  both:            unexpected findings, i.e. main-list findings that match no seeded defect.
                   These are NOT automatically false positives. A human labels them real/false
                   for the precision metric (spec success criterion 4).

Only the main list counts. Low-confidence findings ("Worth a look") never count toward
recall or noise. They're reported separately, so you can see when the skill found a defect
but filed it as unsure.
"""
import argparse
import json
import sys
from typing import Any, Dict, List, Optional

SEVERITIES = ["critical", "high", "medium", "low", "nit"]
HIGH_PLUS = {"critical", "high"}
CONFIDENCES = {"high", "medium", "low"}
AGREEMENTS = {"agreed", "single", "n/a"}
LENSES = {"correctness", "security", "quality"}

Finding = Dict[str, Any]
Defect = Dict[str, Any]


# --------------------------------------------------------------------------- validation
# Hand-rolled so the harness needs only the Python standard library. This checks the parts
# the scorer depends on. references/findings.schema.json is the full contract.

def validate(doc: Any) -> List[str]:
    errors: List[str] = []
    if not isinstance(doc, dict):
        return ["top level must be an object"]
    if doc.get("schema_version") != "1":
        errors.append("schema_version must be \"1\"")
    run = doc.get("run")
    if not isinstance(run, dict):
        errors.append("run must be an object")
    else:
        for key in ("base_ref", "base_sha", "head_sha", "mode", "lenses"):
            if key not in run:
                errors.append(f"run.{key} is required")
        if run.get("mode") not in ("A", "B"):
            errors.append("run.mode must be A or B")
    findings = doc.get("findings")
    if not isinstance(findings, list):
        return errors + ["findings must be an array"]

    for i, f in enumerate(findings):
        where = f"findings[{i}]"
        if not isinstance(f, dict):
            errors.append(f"{where} must be an object")
            continue
        for key in ("id", "title", "lenses", "severity", "confidence", "agreement", "location", "why", "fix"):
            if key not in f:
                errors.append(f"{where}.{key} is required")
        if f.get("severity") not in SEVERITIES:
            errors.append(f"{where}.severity invalid: {f.get('severity')!r}")
        if f.get("confidence") not in CONFIDENCES:
            errors.append(f"{where}.confidence invalid: {f.get('confidence')!r}")
        if f.get("agreement") not in AGREEMENTS:
            errors.append(f"{where}.agreement invalid: {f.get('agreement')!r}")
        lenses = f.get("lenses")
        if not isinstance(lenses, list) or not lenses or not set(lenses) <= LENSES:
            errors.append(f"{where}.lenses must be a non-empty subset of {sorted(LENSES)}")
        loc = f.get("location")
        if not isinstance(loc, dict) or not isinstance(loc.get("file"), str):
            errors.append(f"{where}.location.file is required")
        else:
            start, end = loc.get("start_line"), loc.get("end_line")
            if not (isinstance(start, int) and isinstance(end, int) and 1 <= start <= end):
                errors.append(f"{where}.location needs integer start_line <= end_line, both >= 1")
        for key in ("why", "fix"):
            if key in f and not str(f[key]).strip():
                errors.append(f"{where}.{key} must not be empty")
    return errors


# --------------------------------------------------------------------------- matching

def is_match(finding: Finding, defect: Defect) -> bool:
    """Return True if this finding counts as catching this seeded defect. This rule drives every recall number.

    Decided 2026-11-12:
      1. File: exact path after dropping a leading "./".
      2. Lines: an exact hit is best, but a nearby line (within LINE_SLACK) or a finding that spans
         the whole function also counts. Expected spans are written at function granularity, so a
         range overlap covers "exact" and "function" alike.
      3. Lens: loose. Any reviewer catching the defect counts, because the report is what the
         engineer reads. Per-lens attribution can be measured separately later.
      4. A defect may list `alt_locations`: other places a correct fix legitimately starts (e.g. the
         offending import as well as the offending calls). Only the finding's own location is
         matched, never its related_locations, so broad findings can't collect credit.
    """
    return any(_overlaps(finding["location"], loc) for loc in _defect_locations(defect))


def _defect_locations(defect: Defect) -> List[Dict[str, Any]]:
    return [defect["location"], *defect.get("alt_locations", [])]


def _overlaps(f: Dict[str, Any], d: Dict[str, Any]) -> bool:
    if _norm_path(f["file"]) != _norm_path(d["file"]):
        return False
    return f["start_line"] <= d["end_line"] + LINE_SLACK and f["end_line"] >= d["start_line"] - LINE_SLACK


LINE_SLACK = 2


def _norm_path(path: str) -> str:
    # removeprefix, not lstrip("./"): lstrip would also eat the dot in ".github/...".
    return path.removeprefix("./")


def _closeness(finding: Finding, defect: Defect):
    """Sort key among findings that all match one defect: lower is a better match.
    Prefers the same lens, then no line gap, then the narrowest span. Without this, a broad finding
    (e.g. "no tests for lines 18-59") listed earlier in the report steals credit for a precise one."""
    f = finding["location"]
    lens_miss = 0 if set(finding["lenses"]) & set(defect["lenses"]) else 1
    gap = min(
        max(0, f["start_line"] - d["end_line"], d["start_line"] - f["end_line"])
        for d in _defect_locations(defect)
        if _norm_path(d["file"]) == _norm_path(f["file"])
    )
    span = f["end_line"] - f["start_line"]
    return (lens_miss, gap, span)


def assign_matches(defects: List[Defect], findings: List[Finding]) -> Dict[str, Optional[int]]:
    """Greedy one-to-one assignment: each finding can satisfy at most one defect.
    All (defect, finding) matching pairs are taken in order of defect severity (worst first), then
    closeness, so among equally severe defects the closest pair wins. Otherwise an earlier defect
    could take a finding that sits exactly on a later one."""
    pairs = [
        (SEVERITIES.index(d["severity"]), _closeness(f, d), d["id"], i)
        for d in defects
        for i, f in enumerate(findings)
        if is_match(f, d)
    ]
    matches: Dict[str, Optional[int]] = {d["id"]: None for d in defects}
    used = set()
    for _, _, did, i in sorted(pairs):
        if matches[did] is None and i not in used:
            matches[did] = i
            used.add(i)
    return matches


# --------------------------------------------------------------------------- scoring

def score(expected: Dict[str, Any], doc: Dict[str, Any]) -> Dict[str, Any]:
    findings = doc["findings"]
    main = [f for f in findings if f["confidence"] != "low"]
    worth_a_look = [f for f in findings if f["confidence"] == "low"]
    defects: List[Defect] = expected["defects"]
    targets = expected.get("targets", {})

    main_matches = assign_matches(defects, main)
    matched_main_idx = {i for i in main_matches.values() if i is not None}
    missed = [d for d in defects if main_matches[d["id"]] is None]
    # A defect missed in the main list but caught in "Worth a look" is a calibration signal, not a miss.
    low_matches = assign_matches(missed, worth_a_look) if missed else {}

    result: Dict[str, Any] = {
        "fixture": expected.get("fixture"),
        "kind": expected.get("kind"),
        "main_findings": len(main),
        "worth_a_look_findings": len(worth_a_look),
        "unexpected": [
            {"id": f["id"], "title": f["title"], "severity": f["severity"], "location": f["location"]}
            for i, f in enumerate(main) if i not in matched_main_idx
        ],
        "defects": [
            {
                "id": d["id"],
                "severity": d["severity"],
                "caught_by": main[main_matches[d["id"]]]["id"] if main_matches[d["id"]] is not None else None,
                "only_in_worth_a_look": low_matches.get(d["id"]) is not None,
            }
            for d in defects
        ],
        "checks": {},
    }

    if expected.get("kind") == "seeded":
        caught = [d for d in defects if main_matches[d["id"]] is not None]
        high = [d for d in defects if d["severity"] in HIGH_PLUS]
        high_caught = [d for d in high if main_matches[d["id"]] is not None]
        recall = len(caught) / len(defects) if defects else 1.0
        high_recall = len(high_caught) / len(high) if high else 1.0
        result["recall"] = round(recall, 3)
        result["high_plus_recall"] = round(high_recall, 3)
        result["checks"]["recall"] = recall >= targets.get("recall", 0.7)
        result["checks"]["high_plus_recall"] = high_recall >= targets.get("high_plus_recall", 0.9)
    else:
        high_plus_noise = sum(1 for f in main if f["severity"] in HIGH_PLUS)
        result["high_plus_noise"] = high_plus_noise
        result["checks"]["max_findings"] = len(main) <= targets.get("max_findings", 2)
        result["checks"]["max_high_plus"] = high_plus_noise <= targets.get("max_high_plus", 0)

    result["passed"] = all(result["checks"].values())
    return result


def render(r: Dict[str, Any]) -> str:
    mark = lambda ok: "PASS" if ok else "FAIL"
    lines = [f"fixture: {r['fixture']} ({r['kind']})"]
    if r["kind"] == "seeded":
        lines.append(f"  recall:            {r['recall']:.0%}  [{mark(r['checks']['recall'])}]")
        lines.append(f"  high+ recall:      {r['high_plus_recall']:.0%}  [{mark(r['checks']['high_plus_recall'])}]")
        for d in r["defects"]:
            status = f"caught by {d['caught_by']}" if d["caught_by"] else (
                "MISSED (but in Worth a look)" if d["only_in_worth_a_look"] else "MISSED")
            lines.append(f"    {d['id']:<4} {d['severity']:<9} {status}")
    else:
        lines.append(f"  main findings:     {r['main_findings']}  [{mark(r['checks']['max_findings'])}]")
        lines.append(f"  high+ findings:    {r['high_plus_noise']}  [{mark(r['checks']['max_high_plus'])}]")
    lines.append(f"  worth-a-look:      {r['worth_a_look_findings']}")
    if r["unexpected"]:
        lines.append(f"  unexpected (label real/false by hand): {len(r['unexpected'])}")
        for u in r["unexpected"]:
            loc = u["location"]
            lines.append(f"    {u['id']:<4} {u['severity']:<9} {loc['file']}:{loc['start_line']}  {u['title']}")
    lines.append(f"RESULT: {mark(r['passed'])}")
    return "\n".join(lines)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("expected", help="evals/expected/<fixture>.json")
    parser.add_argument("findings", help="findings.json produced by the skill")
    parser.add_argument("--json", action="store_true", help="print machine-readable result")
    args = parser.parse_args(argv)

    try:
        with open(args.expected) as fh:
            expected = json.load(fh)
        with open(args.findings) as fh:
            doc = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    errors = validate(doc)
    if errors:
        print("findings.json is invalid:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    result = score(expected, doc)
    print(json.dumps(result, indent=2) if args.json else render(result))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
