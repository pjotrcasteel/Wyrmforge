#!/usr/bin/env python3
"""Produce a public-safe playtest snapshot without retrieving comments or report bodies.

Cloudflare's D1 query API returns aggregate SQL projections only. No user free text,
report identifiers (except the one synthetic record targeted for deletion), or run
seeds are fetched, printed, uploaded, or committed.
"""
import argparse
from datetime import datetime, timezone
import json
import os
import re
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MIN_COHORT = 10
MIN_CELL = 3
SYNTHETIC_TEST_ID = "e3626f65-00fd-4aa3-bb51-cb7259a51170"
VERSION_PATTERN = re.compile(r"0\.0\.[0-9]{1,4}\Z")

# D1 returns only cohorts that pass the overall public reporting threshold.
# Never fetch (or publish) version-specific rows for a smaller cohort.
VERSION_COHORTS_SQL = """
SELECT version, COUNT(*) AS reports
FROM reports WHERE id <> ?
GROUP BY version HAVING COUNT(*) >= ?
"""

TOTALS_SQL = """
SELECT COUNT(*) AS reports,
       COUNT(enjoyment) AS enjoyment_responses,
       ROUND(AVG(enjoyment), 2) AS enjoyment,
       COUNT(clarity) AS clarity_responses,
       ROUND(AVG(clarity), 2) AS clarity,
       SUM(CASE WHEN replay IS NOT NULL THEN 1 ELSE 0 END) AS replay_responses,
       SUM(CASE WHEN replay = 'yes' THEN 1 ELSE 0 END) AS replay_yes
FROM reports
WHERE id <> ? AND version = ?
"""
ISSUES_SQL = """
SELECT trouble_area AS category, COUNT(*) AS responses
FROM reports WHERE id <> ? AND version = ? AND trouble_area IS NOT NULL
GROUP BY trouble_area ORDER BY responses DESC, category
"""
DEVICES_SQL = """
SELECT kind AS category, COUNT(*) AS responses
FROM reports WHERE id <> ? AND version = ?
GROUP BY kind ORDER BY responses DESC, category
"""
RUNS_SQL = """
WITH unique_runs AS (
    SELECT json_extract(j.value, '$.runId') AS run_id,
           MAX(json_extract(j.value, '$.depth')) AS depth,
           MAX(json_extract(j.value, '$.durationSeconds')) AS duration_seconds,
           MAX(json_extract(j.value, '$.outcome')) AS outcome
    FROM reports r JOIN json_each(r.data, '$.recentRuns') j
    WHERE r.id <> ? AND r.version = ?
    GROUP BY json_extract(j.value, '$.runId')
)
SELECT COUNT(*) AS runs,
       ROUND(AVG(depth), 1) AS mean_depth,
       ROUND(AVG(duration_seconds), 0) AS mean_duration_seconds
FROM unique_runs WHERE run_id IS NOT NULL
"""
RUN_OUTCOMES_SQL = """
WITH unique_runs AS (
    SELECT json_extract(j.value, '$.runId') AS run_id,
           MAX(json_extract(j.value, '$.outcome')) AS outcome
    FROM reports r JOIN json_each(r.data, '$.recentRuns') j
    WHERE r.id <> ? AND r.version = ?
    GROUP BY json_extract(j.value, '$.runId')
)
SELECT outcome AS category, COUNT(*) AS responses
FROM unique_runs WHERE run_id IS NOT NULL
GROUP BY outcome ORDER BY responses DESC, category
"""
PURGE_SQL = "DELETE FROM reports WHERE id = ?"


class CollectorError(RuntimeError):
    pass


def execute_d1(sql, params):
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    database = os.environ.get("WYRMFORGE_D1_DATABASE_ID", "")
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not all((account, database, token)):
        raise CollectorError("Cloudflare D1 environment credentials are missing")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query"
    payload = json.dumps({"sql": sql, "params": params}).encode("utf-8")
    request = Request(url, data=payload, method="POST", headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    try:
        with urlopen(request, timeout=25) as response:
            result = json.load(response)
    except HTTPError as error:
        raise CollectorError(f"Cloudflare D1 returned HTTP {error.code}") from None
    except (URLError, TimeoutError, ValueError):
        raise CollectorError("Cloudflare D1 query failed or returned invalid JSON") from None
    if not result.get("success") or not isinstance(result.get("result"), list) or len(result["result"]) != 1:
        raise CollectorError("Cloudflare D1 returned an unsuccessful query response")
    page = result["result"][0]
    if page.get("success") is not True or not isinstance(page.get("results"), list):
        raise CollectorError("Cloudflare D1 query result was not successful")
    return page["results"]


def numeric(record, key):
    value = record.get(key) if record else None
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def rate(numerator, denominator):
    return int(round(100 * numerator / denominator / 10) * 10) if denominator >= MIN_COHORT else None


def publishable_categories(rows, permitted):
    return [str(row["category"]) for row in rows if row.get("category") in permitted
            and (numeric(row, "responses") or 0) >= MIN_CELL]


def render(totals, issues, devices, runs, outcomes, as_of, version=None):
    count = int(numeric(totals, "reports") or 0)
    header = [
        "# WyrmForge — anonymized playtest insights", "",
        f"Updated: {as_of} (UTC)",
        "",
        "> **PUBLIC AGGREGATES ONLY.** Individual reports, text, seeds, report IDs,",
        "> device fingerprints and raw session evidence are never published here.",
        "> Results represent voluntary reports, not unique people or all visitors.",
        "",
    ]
    if count < MIN_COHORT:
        return "\n".join(header + [
            "## Waiting for the first testing cohort", "",
            "Not enough voluntary real-player submissions to publish meaningful statistics.",
            f"A privacy threshold of at least {MIN_COHORT} reports is required.",
            "No individual tester's results are exposed while the cohort is small.", "",
        ])

    sections = header + [
        f"## Feedback overview — version {version}" if version else "## Feedback overview", "",
        f"- **Sample:** at least {MIN_COHORT} consented reports (rolling D1 retention window).",
        f"- **Enjoyment:** {totals['enjoyment']:.1f}/5" if
            (numeric(totals, "enjoyment_responses") or 0) >= MIN_COHORT and numeric(totals, "enjoyment") is not None
            else "- **Enjoyment:** insufficient answered ratings.",
        f"- **Clarity:** {totals['clarity']:.1f}/5" if
            (numeric(totals, "clarity_responses") or 0) >= MIN_COHORT and numeric(totals, "clarity") is not None
            else "- **Clarity:** insufficient answered ratings.",
    ]
    replay = rate(numeric(totals, "replay_yes") or 0, numeric(totals, "replay_responses") or 0)
    sections.append(f"- **Want to play another run:** approximately {replay}% of answered reports." if
                    replay is not None else "- **Replay intent:** insufficient answered reports.")
    issue_names = publishable_categories(issues, {
        "onboarding", "movement", "combat", "rewards", "forge", "wyrms", "performance", "other"
    })
    sections.extend(["", "## Recurring problems", "",
                     "Ranked categories selected by multiple testers; low-frequency categories are hidden."])
    sections.extend([f"- {issue.replace('_', ' ').title()}" for issue in issue_names] or
                    ["- No category has reached the reporting threshold."])

    device_names = publishable_categories(devices, {"touch", "pointer", "unknown"})
    sections.extend(["", "## Input and device context", "",
                     "- " + ", ".join(device_names) if device_names else "- Insufficient grouped device evidence."])

    run_count = int(numeric(runs, "runs") or 0)
    sections.extend(["", "## Recent shared run sample", ""])
    if run_count >= MIN_COHORT:
        sections += [
            f"- **Average deepest depth:** {numeric(runs, 'mean_depth'):.1f}" if
                numeric(runs, "mean_depth") is not None else "- **Average depth:** unavailable.",
            f"- **Average duration:** about {round(numeric(runs, 'mean_duration_seconds') / 10) * 10:.0f} seconds" if
                numeric(runs, "mean_duration_seconds") is not None else "- **Average duration:** unavailable.",
        ]
        ending_names = publishable_categories(outcomes, {"Extracted", "Defeated", "Abandoned", "Interrupted", "Unknown"})
        sections.append("- **Common endings:** " + ", ".join(ending_names) if ending_names else "- **Endings:** no repeated category.")
    else:
        sections.append("- Not enough distinct volunteered run samples to show outcome metrics.")

    priorities = []
    if numeric(totals, "clarity") is not None and (numeric(totals, "clarity_responses") or 0) >= MIN_COHORT and totals["clarity"] < 4:
        priorities.append("Improve clarity of objectives, route selection and first-run onboarding.")
    if numeric(totals, "enjoyment") is not None and (numeric(totals, "enjoyment_responses") or 0) >= MIN_COHORT and totals["enjoyment"] < 4:
        priorities.append("Investigate combat feel and early-run rewards before expanding endgame content.")
    if replay is not None and replay < 60:
        priorities.append("Increase reasons to replay: clear milestones, discoveries and satisfying build growth.")
    if issue_names:
        priorities.append("Start the next round of usability fixes with: " + issue_names[0].replace("_", " ") + ".")
    sections += [
        "", "## Candidate next actions", "",
        *[f"- {priority}" for priority in (priorities or ["- Continue collecting feedback before changing the gameplay roadmap."])],
        "", "## Interpretation", "",
        "- Submitted reports are not necessarily unique players; repeat submissions can bias ratings.",
        "- The run sample covers only the most recent runs each tester chose to share.",
        "- No unobserved visitors or drop-offs can be measured from this opt-in collector.",
        "- No verbatim tester comments or reproduction seeds are included in this public report.",
        "- Private originals are retained in Cloudflare D1 under the collector's retention policy.",
        "",
    ]
    return "\n".join(sections)


def qualifying_versions(rows):
    """Only supported game versions with >=10 consented reports can be published."""
    valid = []
    for row in rows:
        version = row.get("version")
        if isinstance(version, str) and VERSION_PATTERN.fullmatch(version) and (numeric(row, "reports") or 0) >= MIN_COHORT:
            valid.append(version)
    return sorted(set(valid), key=lambda version: int(version.rsplit(".", 1)[1]), reverse=True)[:2]


def comparison_rating(totals, value, answered):
    if (numeric(totals, answered) or 0) < MIN_COHORT or numeric(totals, value) is None:
        return "withheld"
    return f"{numeric(totals, value):.1f}/5"


def comparison_cell(cohort, field):
    totals, runs = cohort["totals"], cohort["runs"]
    if field == "enjoyment":
        return comparison_rating(totals, "enjoyment", "enjoyment_responses")
    if field == "clarity":
        return comparison_rating(totals, "clarity", "clarity_responses")
    if field == "replay":
        percent = rate(numeric(totals, "replay_yes") or 0, numeric(totals, "replay_responses") or 0)
        return f"~{percent}%" if percent is not None else "withheld"
    if field == "duration":
        duration = numeric(runs, "mean_duration_seconds")
        return f"~{round(duration / 10) * 10:.0f}s" if (numeric(runs, "runs") or 0) >= MIN_COHORT and duration is not None else "withheld"
    if field == "issue":
        names = publishable_categories(cohort["issues"], {
            "onboarding", "movement", "combat", "rewards", "forge", "wyrms", "performance", "other"
        })
        return names[0].replace("_", " ").title() if names else "withheld"
    raise ValueError("Unsupported comparison field")


def render_cohorts(cohorts, as_of):
    """Show one version's actions and optionally compare two independent qualifying cohorts."""
    safe = [cohort for cohort in cohorts
            if isinstance(cohort.get("version"), str) and VERSION_PATTERN.fullmatch(cohort["version"])
            and (numeric(cohort.get("totals"), "reports") or 0) >= MIN_COHORT]
    if not safe:
        return render({"reports": 0}, [], [], {}, [], as_of) + (
            "\nStatistics are withheld until a single game version has at least "
            f"{MIN_COHORT} consented reports. Versions are never pooled.\n"
        )
    safe.sort(key=lambda cohort: int(cohort["version"].rsplit(".", 1)[1]), reverse=True)
    safe = safe[:2]
    latest = safe[0]
    report = render(latest["totals"], latest["issues"], latest["devices"], latest["runs"],
                    latest["outcomes"], as_of, version=latest["version"])
    report = report.replace("## Feedback overview", (
        f"**Latest eligible game version: {latest['version']}.** All feedback and run statistics below "
        "are scoped to this release, not pooled with earlier versions.\n\n## Feedback overview"
    ), 1)
    if len(safe) < 2:
        return report + "\nOnly one version currently meets the reporting threshold; no comparison is published.\n"

    older = safe[1]
    table = [
        "", "## Comparison of eligible game versions", "",
        "These are separate opt-in report cohorts, **not** matched players. A difference is not proof of a release effect.",
        "Answered rating/intent groups and unique shared-run samples require at least 10 within **each** version.",
        "Low-frequency problem categories are withheld. No individual feedback or exact version counts are published.",
        "",
        f"| Measure | {older['version']} | {latest['version']} |",
        "| --- | --- | --- |",
    ]
    for label, field in [
        ("Enjoyment", "enjoyment"), ("Clarity", "clarity"), ("Replay intent", "replay"),
        ("Common reported problem", "issue"), ("Shared-run average duration", "duration")
    ]:
        table.append(f"| {label} | {comparison_cell(older, field)} | {comparison_cell(latest, field)} |")
    return report + "\n".join(table + [""])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    # This exact ID belongs to the owner's acknowledged synthetic integration test.
    # Idempotent deletion prevents it from contaminating any later cohort summary.
    execute_d1(PURGE_SQL, [SYNTHETIC_TEST_ID])

    version_rows = execute_d1(VERSION_COHORTS_SQL, [SYNTHETIC_TEST_ID, MIN_COHORT])
    cohorts = []
    for version in qualifying_versions(version_rows):
        params = [SYNTHETIC_TEST_ID, version]
        totals = execute_d1(TOTALS_SQL, params)
        if len(totals) != 1:
            raise CollectorError("D1 version totals query must return exactly one row")
        if int(numeric(totals[0], "reports") or 0) < MIN_COHORT:
            continue  # Retention may have expired a cohort between queries.
        issues = execute_d1(ISSUES_SQL, params)
        devices = execute_d1(DEVICES_SQL, params)
        sample = execute_d1(RUNS_SQL, params)
        if len(sample) != 1:
            raise CollectorError("D1 version run aggregate must return exactly one row")
        outcomes = execute_d1(RUN_OUTCOMES_SQL, params)
        cohorts.append({"version": version, "totals": totals[0], "issues": issues,
                        "devices": devices, "runs": sample[0], "outcomes": outcomes})

    # Timestamp is a day, not a precise ingestion timestamp.
    date = datetime.now(timezone.utc).date().isoformat()
    content = render_cohorts(cohorts, date)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print("Privacy-safe playtest insight summary generated; no raw submissions exported.")


if __name__ == "__main__":
    try:
        main()
    except CollectorError as error:
        print(f"Playtest insight generation failed: {error}", file=sys.stderr)
        sys.exit(1)
