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


if __name__ == "__main__":
    unittest.main()
