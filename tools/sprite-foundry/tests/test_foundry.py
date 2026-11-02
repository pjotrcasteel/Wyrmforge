"""Deterministic checks for the standalone, non-runtime sprite packer."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageOps

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
        "directions": ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
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

    def test_direction_order_matches_existing_sprite_lab(self):
        self.assertEqual(("N", "NE", "E", "SE", "S", "SW", "W", "NW"), foundry.DIRECTIONS)

    def test_wizard_cannot_reuse_a_facing_for_another_direction(self):
        self.seed()
        project = sample_project()
        project["directionRules"] = {"requireDistinctFacings": True}
        report = foundry.build(project, self.source, self.out, False)
        self.assertEqual("invalid", report["technicalStatus"])
        self.assertTrue(any("identical N and NE" in issue for issue in report["errors"]))
        self.assertEqual("NOT_APPROVED", report["artApproval"])

    def test_mirrored_asymmetric_equipment_is_rejected(self):
        self.seed()
        north_path = self.source / "idle" / "N" / "00.albedo.png"
        east_path = self.source / "idle" / "E" / "00.albedo.png"
        with Image.open(north_path) as original:
            north = original.convert("RGBA")
        north.putpixel((18, 20), (255, 0, 0, 255))
        north.save(north_path)
        ImageOps.mirror(north).save(east_path)
        project = sample_project()
        project["directionRules"] = {"forbidMirroredFacings": True}
        report = foundry.build(project, self.source, self.out, False)
        self.assertEqual("invalid", report["technicalStatus"])
        self.assertTrue(any("E exactly mirrors N" in issue for issue in report["errors"]))

    def test_direction_rules_reject_unknown_or_non_boolean_values(self):
        project = sample_project()
        project["directionRules"] = {"requireDistinctFacings": "yes"}
        path = self.root / "invalid-rules.json"
        path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "booleans"):
            foundry.read_project(path)
        project["directionRules"] = {"guessAnatomy": True}
        path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "unknown"):
            foundry.read_project(path)

    def test_non_wizard_renderer_uses_same_generic_export_and_qa(self):
        project = sample_project()
        project["character"] = "ashling"
        project["directionRules"] = {"requireDistinctFacings": True, "forbidMirroredFacings": True}
        project["visualReview"] = ["Ashling eyes, limbs and flame influence remain consistent across all views"]

        def render(clip, direction, index):
            self.assertEqual(("idle", 0), (clip, index))
            number = foundry.DIRECTIONS.index(direction)
            color = (85 + number * 16, 104, 75, 255)
            frame = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
            for y in range(14, 75):
                for x in range(25, 39):
                    frame.putpixel((x, y), color)
            normal = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
            normal.paste((128, 128, 255, 255), (25, 14, 39, 75))
            return {"albedo": frame, "normal": normal}

        paths = foundry.export_rendered_source(project, self.source, render)
        self.assertEqual(16, len(paths))
        self.assertTrue((self.source / "idle" / "S" / "00.albedo.png").is_file())
        report = foundry.build(project, self.source, self.out, False)
        self.assertEqual("technical-pass", report["technicalStatus"])
        self.assertEqual(project["visualReview"], report["requiredVisualReview"])
        self.assertTrue((self.out / "idle.normal.png").is_file())
        with Image.open(self.out / "idle.albedo.png") as atlas:
            self.assertEqual((64, 640), atlas.size)

    def test_generic_review_defaults_are_character_neutral(self):
        self.seed()
        report = foundry.build(sample_project(), self.source, self.out, False)
        criteria = " ".join(report["requiredVisualReview"]).lower()
        self.assertNotIn("wizard", criteria)
        self.assertNotIn("staff", criteria)
        self.assertIn("character", criteria)

    def test_export_rejects_invalid_or_partial_materials_without_leaving_source(self):
        project = sample_project()

        def broken(clip, direction, index):
            frame = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
            frame.paste((90, 88, 80, 255), (25, 14, 39, 75))
            if direction == "NE":
                return {"albedo": frame}
            return {"albedo": frame, "normal": frame.copy()}

        with self.assertRaisesRegex(ValueError, "material layers"):
            foundry.export_rendered_source(project, self.source, broken)
        self.assertFalse(self.source.exists(), "invalid staging must not leave partial art")

    def test_export_never_overwrites_existing_source_art(self):
        self.source.mkdir()
        sentinel = self.source / "artist-work.txt"
        sentinel.write_text("keep", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            foundry.export_rendered_source(
                sample_project(),
                self.source,
                lambda clip, direction, index: {},
            )
        self.assertEqual("keep", sentinel.read_text(encoding="utf-8"))

    def test_review_ui_is_character_agnostic(self):
        page = (MODULE_FILE.parent / "review.html").read_text(encoding="utf-8")
        self.assertNotIn("Wizard", page)
        self.assertNotIn("anatomical right-hand staff", page)
        self.assertIn("any asymmetric equipment", page)

    def test_visual_review_validation_and_reusable_actor_template(self):
        project = sample_project()
        project["visualReview"] = ["short"]
        path = self.root / "bad-review.json"
        path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "8-180"):
            foundry.read_project(path)
        template_path = MODULE_FILE.parent / "examples" / "actor-template.project.json"
        actor = foundry.read_project(template_path)
        self.assertEqual("example-actor", actor["character"])
        self.assertEqual(list(foundry.DIRECTIONS), actor["directions"])
        self.assertTrue(actor["visualReview"])

    def test_bad_manifest_rejected(self):
        project = sample_project()
        project["directions"][0] = "W"
        path = self.root / "project.json"
        path.write_text(json.dumps(project), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "canonical"):
            foundry.read_project(path)


if __name__ == "__main__":
    unittest.main()
