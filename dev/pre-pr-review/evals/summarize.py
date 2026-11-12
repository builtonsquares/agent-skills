#!/usr/bin/env python3
"""Score every fixture run under <dest-dir> and print one Markdown summary, ready to paste into a
GitHub issue ("Eval results" template).

    python3 evals/summarize.py <dest-dir> > results.md

Privacy: the output contains only fixture names, scores, model names and the titles of findings
about fixture code. No local paths, usernames or repo contents from the machine it runs on.
"""
import glob
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def latest_findings(repo: str):
    paths = glob.glob(os.path.join(repo, ".pre-pr-review", "*", "*", "findings.json"))
    return max(paths, key=os.path.getmtime) if paths else None


def models_line(run: dict) -> str:
    parts = []
    for lens, lr in (run.get("lenses") or {}).items():
        models = lr.get("models_confirmed") or []
        if not any(models):
            models = lr.get("models_requested") or []
        done, conf = lr.get("runs_completed", "?"), lr.get("runs_configured", "?")
        runs = f"x{done}" if done == conf else f"x{done} of {conf}"
        flag = " (degraded)" if lr.get("agreement_degraded") else ""
        parts.append(f"{lens} {runs} ({', '.join(str(m) for m in models)}){flag}")
    return " · ".join(parts)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: summarize.py <dest-dir>")
    dest = sys.argv[1]
    rows, details, header = [], [], None
    for repo in sorted(d for d in glob.glob(os.path.join(dest, "*")) if os.path.isdir(os.path.join(d, ".git"))):
        name = os.path.basename(repo)
        expected = os.path.join(HERE, "expected", f"{name}.json")
        if not os.path.exists(expected):
            continue
        fj = latest_findings(repo)
        if not fj:
            rows.append(f"| {name} | not run | | | | |")
            continue
        with open(fj, encoding="utf-8") as fh:
            doc = json.load(fh)
        run = doc.get("run", {})
        header = header or f"- **Tool / mode:** {run.get('tool', '?')} · Mode {run.get('mode', '?')}"
        res = subprocess.run(
            [sys.executable, os.path.join(HERE, "score.py"), expected, fj, "--json"],
            capture_output=True, text=True,
        )
        try:
            s = json.loads(res.stdout)
        except json.JSONDecodeError:
            rows.append(f"| {name} | score error | | | | |")
            continue
        if s["kind"] == "seeded":
            caught = sum(1 for d in s["defects"] if d["caught_by"])
            hp = [d for d in s["defects"] if d["severity"] in ("critical", "high")]
            hp_caught = sum(1 for d in hp if d["caught_by"])
            recall, hplus = f"{caught}/{len(s['defects'])}", f"{hp_caught}/{len(hp)}"
        else:
            recall, hplus = "—", "—"
        result = "PASS" if s["passed"] else "**FAIL**"
        rows.append(f"| {name} | {result} | {recall} | {hplus} | {s['main_findings']} | {s['worth_a_look_findings']} |")
        missed = [d["id"] for d in s.get("defects", []) if not d["caught_by"]]
        lines = [f"**{name}**: {models_line(run)}"]
        if run.get("warnings"):
            lines += [f"- warning: {w}" for w in run["warnings"]]
        if run.get("write_violations"):
            lines.append(f"- WRITE VIOLATIONS: {len(run['write_violations'])}")
        if missed:
            lines.append(f"- missed: {', '.join(missed)}")
        for u in s.get("unexpected", []):
            lines.append(f"- unexpected {u['id']} [{u['severity']}] {u['title']}  ← label: real / false")
        details.append("\n".join(lines))

    print("## Scores\n")
    if header:
        print(header + "\n")
    print("| Fixture | Result | Recall | High+ | Main | Worth a look |")
    print("|---|---|---|---|---|---|")
    print("\n".join(rows))
    print("\n## Per fixture\n")
    print("\n\n".join(details))


if __name__ == "__main__":
    main()
