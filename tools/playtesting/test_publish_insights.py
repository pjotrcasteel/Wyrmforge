import unittest

from publish_insights import (MIN_COHORT, TOTALS_SQL, ISSUES_SQL, RUNS_SQL,
                              RUN_OUTCOMES_SQL, publishable_categories, render)


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
        for sql in (TOTALS_SQL, ISSUES_SQL, RUNS_SQL, RUN_OUTCOMES_SQL):
            self.assertNotIn("SELECT *", sql.upper())
            self.assertNotIn("bestMoment", sql)
            self.assertNotIn("improvement", sql)
            self.assertNotIn("seed", sql.lower())

    def test_missing_subratings_do_not_get_inferred(self):
        self.totals["clarity_responses"] = 2
        self.totals["replay_responses"] = 2
        result = self.render()
        self.assertIn("insufficient answered ratings", result)
        self.assertIn("insufficient answered reports", result)


if __name__ == "__main__":
    unittest.main()
