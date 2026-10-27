"""Regression coverage for deterministic browser sharding."""
import tempfile
import unittest
from pathlib import Path

import browser_shards


class BrowserShardTests(unittest.TestCase):
    def test_every_real_test_method_is_in_exactly_one_shard(self):
        methods = browser_shards.discover()
        self.assertGreaterEqual(len(methods), 95)
        groups = browser_shards.partition(methods, 4)
        names = [name for group in groups for name in group]
        self.assertEqual(sorted(name for name, _ in methods), sorted(names))
        self.assertEqual(len(names), len(set(names)))
        self.assertTrue(all(group for group in groups))

    def test_partition_is_deterministic_and_balances_parameterized_cases(self):
        methods = [("A.First", 6), ("A.Second", 5), ("B.Third", 2), ("B.Fourth", 1)]
        groups = browser_shards.partition(methods, 2)
        self.assertEqual(groups, browser_shards.partition(list(reversed(methods)), 2))
        weights = dict(methods)
        totals = [sum(weights[name] for name in group) for group in groups]
        self.assertLessEqual(max(totals) - min(totals), 2)

    def test_unparsable_test_attribute_fails_loudly(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "UnsafeTests.cs"
            source.write_text(
                "namespace Wyrmforge.Browser.Tests;\n"
                "[TestClass] public sealed class UnsafeTests {\n"
                "  [TestMethod]\n  private void InvisibleTest() {}\n}\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "discovered 0 of 1"):
                browser_shards.discover(Path(directory))

    def test_generates_exact_full_names_without_substring_overlap(self):
        filter_value = browser_shards.filter_for(["Game.WyrmforgeBrowserTests.A", "Game.WyrmforgeBrowserTests.AB"])
        self.assertEqual(
            filter_value,
            "FullyQualifiedName=Game.WyrmforgeBrowserTests.A|"
            "FullyQualifiedName=Game.WyrmforgeBrowserTests.AB",
        )


if __name__ == "__main__":
    unittest.main()
