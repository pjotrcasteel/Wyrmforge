import unittest
from collector_admin import dashboard


class CollectorDashboardTests(unittest.TestCase):
    def test_dashboard_safely_escapes_labels_and_keeps_only_aggregates(self):
        result = dashboard({
            "aggregate": {"reports": 3, "enjoyment": 4.3, "clarity": 3.5, "sharedRunSamples": 6},
            "issues": [{"area": "<img src=x onerror=alert(1)>", "count": 2}],
            "replayIntent": [{"replay": "yes", "count": 2}],
        })
        self.assertIn("Reports", result)
        self.assertIn("4.3", result)
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", result)
        self.assertNotIn("<img src=x", result)
        self.assertNotIn("script src=", result)

    def test_private_dashboard_displays_aggregate_ai_cost_without_raw_session_data(self):
        result = dashboard({
            "aggregate": {"reports": 2, "sharedRunSamples": 2},
            "ai": {"runs": 2, "meanP95Ms": 8.5, "peakMs": 24,
                   "maxPopulation": 64, "maxCommitted": 2,
                   "maxSightQueries": 32, "maxPathQueries": 32},
        })
        self.assertIn("Consented AI playtest profiling", result)
        self.assertIn("8.5", result)
        self.assertIn("Largest AI population", result)
        self.assertIn("64", result)
        self.assertNotIn("runId", result)
        self.assertNotIn("seed", result)


if __name__ == "__main__":
    unittest.main()
