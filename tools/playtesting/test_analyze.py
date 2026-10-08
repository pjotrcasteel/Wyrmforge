import json
from pathlib import Path
import tempfile
import unittest
from analyze import load, summary


class AnalyzeTests(unittest.TestCase):
    def test_duplicate_report_and_run_are_not_double_counted(self):
        report = {
            "schema": "wyrmforge.playtest.report.v1", "id": "report-1",
            "feedback": {"enjoyment": 4, "clarity": 3, "replay": "yes", "troubleArea": "combat"},
            "device": {"kind": "touch"},
            "recentRuns": [{"runId": "r1", "seed": 123, "outcome": "Defeated", "depth": 2, "durationSeconds": 90}],
        }
        with tempfile.TemporaryDirectory() as folder:
            a, b = Path(folder) / "a.json", Path(folder) / "b.json"
            a.write_text(json.dumps(report), encoding="utf-8")
            b.write_text(json.dumps(report), encoding="utf-8")
            reports = load([a, b])
            text = summary(reports)
            self.assertEqual(1, len(reports))
            self.assertIn("Distinct recent runs: **1**", text)
            self.assertIn("Seed 123", text)
            self.assertIn("Enjoyment: 4.00/5", text)

    def test_unsupported_or_invalid_reports_skipped(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / "invalid.json"
            p.write_text('{"schema":"unrecognized","id":"1","feedback":{}}', encoding="utf-8")
            self.assertEqual([], load([p]))


if __name__ == "__main__":
    unittest.main()
