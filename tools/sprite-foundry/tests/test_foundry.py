"""Deterministic checks for the standalone, non-runtime sprite packer."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE_FILE = Path(__file__).resolve().parents[1] / "foundry.py"
SPEC = importlib.util.spec_from_file_location("sprite_foundry", MODULE_FILE)
foundry = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(foundry)


def sample_project(frames=1):
    return {
        "schema": "wyrmforge.sprite-foundry.v1",
        "character": "grey-wizard",
        "cell": [64, 80],
        "feetAnchor": [32, 74],
        "directions": list(foundry.DIRECTIONS),
        "clips": {"idle": {"frames": frames, "fps": 8}},
    }


def draw_frame(path: Path, color=(165, 100, 52, 255), opacity=255):
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
    for y in range(14, 75):
        for x in range(25, 39):
            image.putpixel((x, y), (*color[:3], opacity))
    image.save(path)


class FoundryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "sources"
        self.out = self.root / "draft"

    def seed(self, frames=1):
        for direction in foundry.DIRECTIONS:
            for i in range(frames):
                draw_frame(self.source / "idle" / direction / f"{i:02d}.albedo.png")

    def test_complete_eight_direction_atlas_keeps_alpha_and_grid(self):
        self.seed()
        report = foundry.build(sample_project(), self.source, self.out, False)
        self.assertEqual("technical-pass", report["technicalStatus"])
        self.assertEqual("NOT_APPROVED", report["artApproval"])
        with Image.open(self.out / "idle.albedo.png") as atlas:
            self.assertEqual((64, 8 * 80), atlas.size)
            self.assertEqual(0, atlas.getpixel((0, 0))[3])
            self.assertEqual(255, atlas.getpixel((32, 74))[3])
            self.assertEqual(255, atlas.getpixel((32, 7 * 80 + 74))[3])
        metadata = json.loads((self.out / "manifest.json").read_text(encoding="utf-8"))
        self.assertFalse(metadata["approved"])
        self.assertEqual(list(foundry.DIRECTIONS), metadata["directions"])

    def test_missing_direction_is_not_a_passing_build(self):
        draw_frame(self.source / "idle" / "S" / "00.albedo.png")
        report = foundry.build(sample_project(), self.source, self.out, False)
        self.assertEqual("invalid", report["technicalStatus"])
        self.assertEqual(7, report["missingFrames"])
        self.assertTrue(report["errors"])

    def test_partial_review_is_explicitly_incomplete(self):
        draw_frame(self.source / "idle" / "S" / "00.albedo.png")
        report = foundry.build(sample_project(), self.source, self.out, True)
        self.assertEqual("incomplete", report["technicalStatus"])
        self.assertFalse(report["errors"])

    def test_material_alpha_must_match_actor_alpha(self):
        self.seed()
        bad = self.source / "idle" / "N" / "00.emission.png"
        Image.new("RGBA", (64, 80), (255, 0, 0, 255)).save(bad)
        report = foundry.build(sample_project(), self.source, self.out, False)
        self.assertEqual("invalid", report["technicalStatus"])
        self.assertTrue(any("alpha differs" in error for error in report["errors"]))
        self.assertTrue(any("material must exist" in error for error in report["errors"]))

    def test_no_opaque_background_can_pass(self):
        self.seed()
        Image.new("RGBA", (64, 80), (13, 14, 15, 255)).save(
            self.source / "idle" / "E" / "00.albedo.png"
        )
        report = foundry.build(sample_project(), self.source, self.out, False)
        self.assertEqual("invalid", report["technicalStatus"])
        self.assertTrue(any("no transparent pixels" in issue for issue in report["errors"]))

    def test_bad_manifest_rejected(self):
        project = sample_project()
        project["directions"][0] = "W"
        path = self.root / "project.json"
        path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "canonical"):
            foundry.read_project(path)


if __name__ == "__main__":
    unittest.main()
