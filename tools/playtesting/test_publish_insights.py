import json
import sqlite3
import unittest

from publish_insights import (MIN_COHORT, SYNTHETIC_TEST_ID, PURGE_SQL, TOTALS_SQL, ISSUES_SQL, DEVICES_SQL,
                              RUNS_SQL, RUN_OUTCOMES_SQL, VERSION_COHORTS_SQL, publishable_categories,
                              qualifying_versions, render, render_cohorts)


class PublishInsightsTests(unittest.TestCase):
    def setUp(self):
        self.totals = {
            "reports": 12, "enjoyment": 3.6, "enjoyment_responses": 12,
            "clarity": 3.2, "clarity_responses": 11, "replay_responses": 10, "replay_yes": 6,
        }
        self.issues = [{"category": "onboarding", "responses": 5},
                       {"category": "movement", "responses": 3},
                       {"category": "performance", "responses": 1}]
        self.devices = [{"category": "touch", "responses": 9}, {"category": "pointer", "responses": 3}]
        self.runs = {"runs": 12, "mean_depth": 1.7, "mean_duration_seconds": 133}
        self.outcomes = [{"category": "Defeated", "responses": 8}, {"category": "Extracted", "responses": 2},
                         {"category": "Abandoned", "responses": 2}]

    def render(self):
        return render(self.totals, self.issues, self.devices, self.runs, self.outcomes, "2026-10-08")

    def test_small_cohort_is_suppressed_even_if_ratings_present(self):
        self.totals["reports"] = MIN_COHORT - 1
        result = self.render()
        self.assertIn("Waiting for the first testing cohort", result)
        self.assertNotIn("3.6", result)
        self.assertNotIn("onboarding", result)
        self.assertNotIn("Defeated", result)

    def test_public_output_only_contains_grouped_metrics_and_actionable_priorities(self):
        result = self.render()
        self.assertIn("Enjoyment:** 3.6/5", result)
        self.assertIn("Clarity:** 3.2/5", result)
        self.assertIn("approximately 60%", result)
        self.assertIn("Onboarding", result)
        self.assertIn("Movement", result)
        self.assertNotIn("Performance", result)
        self.assertIn("Improve clarity", result)
        self.assertIn("Investigate combat feel", result)
        self.assertIn("Defeated", result)
        self.assertNotIn("Extracted", result)

    def test_does_not_include_identifiers_free_text_or_low_frequency_fields(self):
        unsafe = [{"category": "my email is alice@example.net", "responses": 30},
                  {"category": "onboarding", "responses": 2}]
        self.assertEqual([], publishable_categories(unsafe, {"onboarding", "movement"}))
        self.assertNotIn("alice", self.render())
        for sql in (TOTALS_SQL, ISSUES_SQL, DEVICES_SQL, RUNS_SQL, RUN_OUTCOMES_SQL, VERSION_COHORTS_SQL):
            self.assertNotIn("SELECT *", sql.upper())
            self.assertNotIn("bestMoment", sql)
            self.assertNotIn("improvement", sql)
            self.assertNotIn("seed", sql.lower())

    def test_aggregate_queries_run_against_real_sqlite_json_and_exclude_test_record(self):
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.executescript("""
            CREATE TABLE reports (
                id TEXT PRIMARY KEY, version TEXT, enjoyment INTEGER, clarity INTEGER,
                replay TEXT, trouble_area TEXT, kind TEXT, data TEXT
            );
        """)
        def insert(identifier, seed, value, version='0.0.81'):
            report = {"recentRuns": [{"runId": "run-" + str(seed), "depth": 2,
                "durationSeconds": 90, "outcome": "Defeated", "seed": seed,
                "playerName": "should never appear in an aggregate"}],
                "feedback": {"improvement": "a private comment"}}
            db.execute("INSERT INTO reports VALUES (?,?,?,?,?,?,?,?)",
                (identifier, version, value, 3, "yes", "combat", "touch", json.dumps(report)))
        insert(SYNTHETIC_TEST_ID, 999, 1)
        insert("live-report-1", 55, 5)
        insert("live-report-2", 55, 4)  # Repeated report of same run
        insert("other-version", 56, 1, "0.0.82")  # Must never influence the 0.0.81 cohort
        db.commit()

        before = dict(db.execute(TOTALS_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchone())
        self.assertEqual(2, before["reports"])
        self.assertEqual(4.5, before["enjoyment"])
        self.assertEqual(1, len(db.execute(ISSUES_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchall()))
        summary = dict(db.execute(RUNS_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchone())
        self.assertEqual(1, summary["runs"])
        endings = db.execute(RUN_OUTCOMES_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchall()
        self.assertEqual(1, len(endings))
        self.assertEqual("Defeated", endings[0]["category"])

        db.execute(PURGE_SQL, [SYNTHETIC_TEST_ID])
        db.commit()
        self.assertEqual(0, db.execute("SELECT COUNT(*) FROM reports WHERE id = ?", [SYNTHETIC_TEST_ID]).fetchone()[0])

    def test_missing_subratings_do_not_get_inferred(self):
        self.totals["clarity_responses"] = 2
        self.totals["replay_responses"] = 2
        result = self.render()
        self.assertIn("insufficient answered ratings", result)
        self.assertIn("insufficient answered reports", result)

    def cohort(self, version, reports=12, enjoyment=None, clarity=None):
        totals = {**self.totals, "reports": reports}
        if enjoyment is not None:
            totals["enjoyment"] = enjoyment
        if clarity is not None:
            totals["clarity"] = clarity
        return {"version": version, "totals": totals, "issues": self.issues,
                "devices": self.devices, "runs": self.runs, "outcomes": self.outcomes}

    def test_latest_qualifying_version_is_selected_numerically_and_not_pooled(self):
        rows = [{"version": "0.0.99", "reports": 13}, {"version": "0.0.111", "reports": 12},
                {"version": "0.0.110", "reports": 9}, {"version": "0.0.82", "reports": 10},
                {"version": "0.0.111\\ninjected", "reports": 30}]
        self.assertEqual(["0.0.111", "0.0.99"], qualifying_versions(rows))
        current = self.cohort("0.0.111", enjoyment=4.2)
        older = self.cohort("0.0.99", enjoyment=2.7)
        rendered = render_cohorts([older, current], "2026-10-14")
        self.assertIn("Latest eligible game version: 0.0.111", rendered)
        self.assertIn("Enjoyment:** 4.2/5", rendered)
        self.assertNotIn("Enjoyment:** 2.7/5", rendered)
        self.assertIn("| Enjoyment | 2.7/5 | 4.2/5 |", rendered)
        self.assertIn("**not** matched players", rendered)
        self.assertNotIn("0.0.110", rendered)
        self.assertNotIn("injected", rendered)

    def test_no_version_with_fewer_than_ten_reports_can_publish_metrics(self):
        withheld = self.cohort("0.0.111", reports=9, enjoyment=1.3)
        unsafe = self.cohort("not-a-game-version", reports=25)
        result = render_cohorts([withheld, unsafe], "2026-10-14")
        self.assertIn("Waiting for the first testing cohort", result)
        self.assertIn("Versions are never pooled", result)
        self.assertNotIn("1.3", result)
        self.assertNotIn("not-a-game-version", result)
        self.assertNotIn("0.0.111", result)

    def test_comparison_suppresses_sparse_answer_groups_and_run_samples(self):
        older = self.cohort("0.0.81")
        older["totals"]["clarity_responses"] = 4
        older["totals"]["replay_responses"] = 2
        older["runs"] = {"runs": 4, "mean_duration_seconds": 123}
        newer = self.cohort("0.0.82")
        result = render_cohorts([newer, older], "2026-10-14")
        self.assertIn("| Clarity | withheld | 3.2/5 |", result)
        self.assertIn("| Replay intent | withheld | ~60% |", result)
        self.assertIn("| Shared-run average duration | withheld | ~130s |", result)
        self.assertNotIn("123", result)

    def test_version_queries_enforce_sql_cohorts_and_real_sqlite_privacy_threshold(self):
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.execute("""CREATE TABLE reports (id TEXT PRIMARY KEY, version TEXT,
            enjoyment INTEGER, clarity INTEGER, replay TEXT, trouble_area TEXT, kind TEXT, data TEXT)""")
        for index in range(10):
            version = "0.0.81"
            data = json.dumps({"recentRuns": [{"runId": f"old-{index}", "depth": 3,
                "durationSeconds": 100, "outcome": "Defeated"}]})
            db.execute("INSERT INTO reports VALUES (?,?,?,?,?,?,?,?)",
                       (f"old-{index}", version, 4, 4, "yes", "combat", "touch", data))
        for index in range(9):
            version = "0.0.82"
            data = json.dumps({"recentRuns": [{"runId": f"new-{index}", "depth": 1,
                "durationSeconds": 25, "outcome": "Abandoned"}]})
            db.execute("INSERT INTO reports VALUES (?,?,?,?,?,?,?,?)",
                       (f"new-{index}", version, 1, 1, "no", "movement", "pointer", data))
        rows = db.execute(VERSION_COHORTS_SQL, [SYNTHETIC_TEST_ID, MIN_COHORT]).fetchall()
        self.assertEqual(["0.0.81"], qualifying_versions([dict(row) for row in rows]))
        old = dict(db.execute(TOTALS_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchone())
        new = dict(db.execute(TOTALS_SQL, [SYNTHETIC_TEST_ID, "0.0.82"]).fetchone())
        self.assertEqual((10, 4), (old["reports"], old["enjoyment"]))
        self.assertEqual((9, 1), (new["reports"], new["enjoyment"]))
        self.assertEqual(10, db.execute(RUNS_SQL, [SYNTHETIC_TEST_ID, "0.0.81"]).fetchone()["runs"])
        self.assertEqual("movement", db.execute(ISSUES_SQL, [SYNTHETIC_TEST_ID, "0.0.82"]).fetchone()["category"])
        self.assertEqual("pointer", db.execute(DEVICES_SQL, [SYNTHETIC_TEST_ID, "0.0.82"]).fetchone()["category"])
        self.assertEqual("Abandoned", db.execute(RUN_OUTCOMES_SQL, [SYNTHETIC_TEST_ID, "0.0.82"]).fetchone()["category"])
        db.execute("INSERT INTO reports VALUES (?,?,?,?,?,?,?,?)",
                   ("new-9", "0.0.82", 1, 1, "no", "movement", "pointer", "{}"))
        rows = db.execute(VERSION_COHORTS_SQL, [SYNTHETIC_TEST_ID, MIN_COHORT]).fetchall()
        self.assertEqual(["0.0.82", "0.0.81"], qualifying_versions([dict(row) for row in rows]))


if __name__ == "__main__":
    unittest.main()
