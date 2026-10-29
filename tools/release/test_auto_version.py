"""Check WyrmForge Pages numbering can never silently reuse 0.0.179."""
import tempfile
from pathlib import Path
import unittest

from auto_version import version_for_pages_run


class AutoVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.props = Path(self.temp.name) / "Directory.Build.props"
        self.props.write_text("<Project><PropertyGroup><VersionPrefix>0.0.179</VersionPrefix></PropertyGroup></Project>", encoding="utf-8")

    def test_next_release_advances_without_manual_patch_edit(self):
        self.assertEqual("0.0.179", version_for_pages_run(422, self.props))
        self.assertEqual("0.0.180", version_for_pages_run(423, self.props))
        self.assertEqual("0.0.181", version_for_pages_run(424, self.props))

    def test_rerunning_same_release_is_reproducible(self):
        self.assertEqual(version_for_pages_run(450, self.props), version_for_pages_run(450, self.props))

    def test_rejects_run_number_earlier_than_baseline(self):
        with self.assertRaisesRegex(ValueError, "predates"):
            version_for_pages_run(421, self.props)

    def test_rejects_invalid_version(self):
        self.props.write_text("<Project><PropertyGroup><VersionPrefix>bad</VersionPrefix></PropertyGroup></Project>", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "numeric"):
            version_for_pages_run(423, self.props)

    def test_rejects_version_component_overflow(self):
        with self.assertRaisesRegex(ValueError, "limit"):
            version_for_pages_run(70000, self.props)


if __name__ == "__main__":
    unittest.main()
