"""Regression tests for six school overlays on one artist-drawn Wizard base."""
from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
STUDY = HERE.parent / "studies" / "anokolisa-wizard-v001"
SPEC = importlib.util.spec_from_file_location(
    "wyrmforge_school_visuals", STUDY / "generate_schools.py"
)
visuals = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(visuals)


class SchoolVisualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.styles = visuals.load_styles(STUDY / "school_styles.json")
        cls.foundations = {
            clip: visuals.read_frames(STUDY / name, count)
            for clip, (name, count) in visuals.CLIPS.items()
        }

    def test_all_six_canonical_schools_share_one_base(self):
        self.assertEqual(
            set(self.styles["schools"]),
            {"fire", "frost", "storm", "arcane", "necromancer", "summoner"}
        )
        self.assertEqual(self.styles["base"]["cell"], [64, 80])
        self.assertEqual(self.styles["base"]["feetAnchor"], [32, 74])

    def test_all_frames_preserve_alpha_foot_anchor_and_source(self):
        for school, style in self.styles["schools"].items():
            for clip, source_frames in self.foundations.items():
                for frame in source_frames:
                    original = frame.tobytes()
                    output = visuals.apply_school_overlay(frame, style, clip)
                    with self.subTest(school=school, clip=clip):
                        self.assertEqual(frame.tobytes(), original)
                        self.assertEqual(output.size, (64, 80))
                        self.assertEqual(
                            output.getchannel("A").tobytes(),
                            frame.getchannel("A").tobytes()
                        )
                        self.assertNotEqual(output.tobytes(), original)

    def test_school_changes_are_only_in_declared_garment_regions(self):
        for school, style in self.styles["schools"].items():
            for clip, frames in self.foundations.items():
                hat_start, hat_end = (18, 22) if clip == "run" else (22, 26)
                for frame in frames:
                    altered = visuals.apply_school_overlay(frame, style, clip)
                    source_pixels = frame.load()
                    result_pixels = altered.load()
                    for y in range(80):
                        for x in range(64):
                            if source_pixels[x, y] != result_pixels[x, y]:
                                self.assertTrue(
                                    hat_start <= y < hat_end or 56 <= y < 74,
                                    f"{school}/{clip} altered pixel outside garments: {(x, y)}"
                                )
                                self.assertNotEqual(source_pixels[x, y][3], 0)

    def test_schools_have_distinct_actual_rendered_pixels(self):
        for clip, frames in self.foundations.items():
            first_frame = frames[0]
            unique = {
                visuals.apply_school_overlay(
                    first_frame, style, clip
                ).tobytes()
                for style in self.styles["schools"].values()
            }
            self.assertEqual(len(unique), 6)

    def test_committed_school_atlases_are_reproducible(self):
        output = STUDY / "school-variants-v001"
        for school, style in self.styles["schools"].items():
            for clip, frames in self.foundations.items():
                generated = visuals.atlas_from_frames([
                    visuals.apply_school_overlay(frame, style, clip)
                    for frame in frames
                ])
                committed = output / school / f"{clip}-side-64x80.png"
                with self.subTest(school=school, clip=clip):
                    self.assertTrue(committed.is_file())
                    self.assertEqual(
                        generated.tobytes(),
                        visuals.Image.open(committed).convert("RGBA").tobytes()
                    )

    def test_rejects_invalid_color_and_incomplete_schools(self):
        with self.assertRaises(ValueError):
            visuals.parse_color("invalid")
        with self.assertRaises(ValueError):
            visuals.apply_school_overlay(
                self.foundations["run"][0],
                {"accentLight": "bad", "accentDark": "#123456"},
                "run"
            )
        with self.assertRaises(ValueError):
            visuals.apply_school_overlay(
                self.foundations["run"][0],
                self.styles["schools"]["fire"],
                "cast"
            )


if __name__ == "__main__":
    unittest.main()
