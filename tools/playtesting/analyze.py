#!/usr/bin/env python3
"""Summarize voluntary WyrmForge playtest JSON reports. Standard library only; no upload or third-party processing."""
import argparse
from collections import Counter
import json
from pathlib import Path
import statistics
import sys

SCHEMA = "wyrmforge.playtest.report.v1"
ALLOWED_RATINGS = range(1, 6)


def load(paths):
    unique = {}
    for file in paths:
        try:
            report = json.loads(file.read_text(encoding="utf-8"))
            if report.get("schema") != SCHEMA or not isinstance(report.get("feedback"), dict):
                print(f"Skipped unsupported report: {file}", file=sys.stderr)
                continue
            identity = report.get("id")
            if not isinstance(identity, str) or not identity:
                print(f"Skipped report without ID: {file}", file=sys.stderr)
                continue
            unique[identity] = report
        except (OSError, ValueError, AttributeError) as error:
            print(f"Skipped invalid report {file}: {error}", file=sys.stderr)
    return list(unique.values())


def summary(reports):
    runs = {}
    for report in reports:
        for run in report.get("recentRuns", []):
            if isinstance(run, dict) and isinstance(run.get("runId"), str):
                runs[run["runId"]] = run
    feedback = [report["feedback"] for report in reports]
    outcome = Counter(run.get("outcome", "Unknown") for run in runs.values())
    replay = Counter(item.get("replay") for item in feedback if item.get("replay"))
    issues = Counter(item.get("troubleArea") for item in feedback if item.get("troubleArea"))
    devices = Counter(report.get("device", {}).get("kind", "unknown") for report in reports)
    depths = Counter(run.get("depth", 0) for run in runs.values() if isinstance(run.get("depth"), int))
    rating_lines = []
    for key, label in (("enjoyment", "Enjoyment"), ("clarity", "Objective clarity")):
        ratings = [item.get(key) for item in feedback if item.get(key) in ALLOWED_RATINGS]
        rating_lines.append(f"- {label}: {statistics.mean(ratings):.2f}/5 ({len(ratings)} responses)" if ratings else f"- {label}: no responses")
    lines = [
        "# WyrmForge community playtest evidence", "",
        f"Reports: **{len(reports)}** • Distinct recent runs: **{len(runs)}**", "",
        "## Player sentiment", *rating_lines,
        f"- Another run? {', '.join(f'{key}: {count}' for key, count in replay.most_common()) or 'no responses'}", "",
        "## Biggest reported problems",
        *([f"- {key}: {count}" for key, count in issues.most_common()] or ["- No categories selected"]),
        "", "## Recent run sample (distinct run IDs)",
        f"- Outcomes: {', '.join(f'{key}: {count}' for key, count in outcome.most_common()) or 'no runs shared'}",
        f"- Reached depths: {', '.join(f'{key}: {count}' for key, count in sorted(depths.items())) or 'no runs shared'}",
        f"- Devices (per report): {', '.join(f'{key}: {count}' for key, count in devices.most_common()) or 'none'}",
        "", "## Reproduction seeds",
    ]
    for run in list(runs.values())[-15:]:
        lines.append(f"- Seed {run.get('seed', '?')}, depth {run.get('depth', '?')}, "
                     f"{run.get('outcome', '?')}, {run.get('durationSeconds', '?')}s, "
                     f"{run.get('trailsCompleted', '?')} trails")
    lines.extend(["", "## Interpretation notes",
                  "- These are voluntarily shared reports, not a representative population sample.",
                  "- Runs are deduplicated by local random run ID; report IDs are deduplicated separately.",
                  "- Each report holds at most twelve recent runs; the sample is not a complete global funnel.",
                  "- Cumulative local start counts must not be summed across reports from the same player.",
                  "- Free-text feedback is intentionally not printed by this summary tool.",
                  "- For central, automatically submitted evidence, deploy an opt-in HTTPS intake with consent and abuse protection.",
                  ""])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Analyze shared WyrmForge playtest JSON files locally.")
    parser.add_argument("files", nargs="+", help="One or more JSON files or directories containing reports")
    args = parser.parse_args()
    paths = []
    for name in args.files:
        file = Path(name)
        paths.extend(sorted(file.glob("*.json")) if file.is_dir() else [file])
    reports = load(paths)
    print(summary(reports))


if __name__ == "__main__":
    main()
