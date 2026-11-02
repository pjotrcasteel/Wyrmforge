"""Shared-master structural checks. Passing these tests is not artistic approval."""
import hashlib
import importlib.util
import json
import runpy
import sys
import unittest
from pathlib import Path
from PIL import Image

MODULE_FILE = Path(__file__).resolve().parents[1] / "experiments" / "shared-wizard-master-v001" / "master.py"
SPEC = importlib.util.spec_from_file_location("wizard_shared_master", MODULE_FILE)
wizard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = wizard
SPEC.loader.exec_module(wizard)


class SharedMasterTests(unittest.TestCase):
    def test_owner_liked_pose_is_unchanged_by_material_pass(self):
        contract_file = MODULE_FILE.parent / "pose-lock.json"
        contract = json.loads(contract_file.read_text(encoding="utf-8"))
        source = MODULE_FILE.read_text(encoding="utf-8")
        sections = {
            "geometryGitBlobSha": source[source.index("def build_master():"):source.index("\ndef project(")],
            "cameraGitBlobSha": source[source.index("def project("):source.index("\ndef render(")],
        }
        for key, section in sections.items():
            data = section.encode("utf-8")
            git_blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
            digest = hashlib.sha1(git_blob).hexdigest()
            self.assertEqual(contract[key], digest, key)
        self.assertEqual((wizard.WIDTH, wizard.HEIGHT), tuple(contract["dimensions"]))
        self.assertEqual((wizard.FOOT_X, wizard.FOOT_Y), tuple(contract["feetAnchor"]))
        self.assertEqual(wizard.SCALE, contract["worldScalePixelsPerUnit"])
        self.assertEqual(wizard.DIRECTIONS, contract["directionYawDegrees"])
        self.assertIn("appearance-not-approved", contract["status"])

    def test_robe_seam_material_is_garment_local_and_named(self):
        self.assertEqual(3, len(wizard.ROBE_SEAMS))
        self.assertEqual(3, len({name for name, *_ in wizard.ROBE_SEAMS}))
        for name, azimuth, start_y, end_y in wizard.ROBE_SEAMS:
            self.assertLess(start_y, end_y, name)
            self.assertGreaterEqual(azimuth, 0)
            self.assertLess(azimuth, 360)

    def test_every_facing_uses_identical_unrotated_geometry(self):
        before = tuple((face.feature, face.points) for face in wizard.build_master())
        self.assertGreater(len(before), 2000)
        for direction in wizard.DIRECTIONS:
            wizard.render(direction)
            after = tuple((face.feature, face.points) for face in wizard.faces)
            self.assertEqual(before, after)

    def test_staff_and_robe_damage_are_shared_mesh_features(self):
        faces = wizard.build_master()
        labels = [face.feature for face in faces]
        self.assertGreater(labels.count("right-hand-staff"), 0)
        self.assertGreater(labels.count("permanent-cloth-rip"), 0)
        self.assertGreater(labels.count("outer-robe"), 100)
        self.assertEqual(3, len(set(face.points for face in faces if face.feature == "permanent-cloth-rip")))
        self.assertEqual(3, labels.count("frayed-rip-edge"))

    def test_garment_damage_ledger_is_permanent_and_nonuniform(self):
        self.assertEqual(24, len(wizard.ROBE_HEM_OFFSETS))
        self.assertGreater(max(wizard.ROBE_HEM_OFFSETS) - min(wizard.ROBE_HEM_OFFSETS), .30)
        self.assertEqual(11, len(wizard.ROBE_OPEN_SECTORS))
        self.assertEqual(3, len(wizard.ROBE_SCARS))
        self.assertEqual(3, len({mark[0] for mark in wizard.ROBE_SCARS}))
        outer_vertices = {
            round(point[1], 3)
            for face in wizard.build_master() if face.feature == "outer-robe"
            for point in face.points if point[1] < .5
        }
        self.assertGreater(len(outer_vertices), 10)
        with self.assertRaises(ValueError):
            wizard.revolve([(.1,.2,0,0),(.2,.2,0,0)], "555555", "invalid", 8, hem_offsets=[0]*7)

    def test_native_pixel_outputs_and_directional_differences(self):
        output = {}
        for direction in wizard.DIRECTIONS:
            img = wizard.render(direction)
            self.assertEqual((64, 80), img.size)
            self.assertEqual("RGBA", img.mode)
            low, high = img.getchannel("A").getextrema()
            self.assertEqual((0, 255), (low, high))
            output[direction] = img.tobytes()
        self.assertEqual(8, len(set(output.values())))

    def test_camera_turns_one_geometry_nose_to_screen_right(self):
        nose = (0, 2.85, .5)
        x_s = wizard.project(nose, wizard.DIRECTIONS["S"])[0]
        x_se = wizard.project(nose, wizard.DIRECTIONS["SE"])[0]
        x_e = wizard.project(nose, wizard.DIRECTIONS["E"])[0]
        self.assertLess(x_s, x_se)
        self.assertLess(x_se, x_e)

    def test_right_hand_staff_flame_remains_visible_in_every_facing(self):
        for direction in wizard.DIRECTIONS:
            frame = wizard.render(direction)
            raw = frame.tobytes()
            flame_pixels = sum(
                1 for i in range(0, len(raw), 4)
                if raw[i+3] and raw[i] >= 170 and raw[i+1] >= 55 and raw[i+2] <= 90
            )
            self.assertGreaterEqual(flame_pixels, 10, direction)

    def test_front_decal_cannot_move_holes_or_paint_unseen_back(self):
        reference = Image.new("RGBA", (64, 80), (118, 113, 108, 255))
        changed = {}
        for direction in wizard.DIRECTIONS:
            original = wizard.render(direction)
            painted = wizard.render(direction, reference)
            self.assertEqual(original.getchannel("A").tobytes(), painted.getchannel("A").tobytes())
            self.assertEqual(painted.tobytes(), wizard.render(direction, reference).tobytes())
            a, b = original.tobytes(), painted.tobytes()
            changed[direction] = sum(a[i:i+3] != b[i:i+3] for i in range(0, len(a), 4))
        self.assertGreater(changed["S"], 300)
        self.assertLess(changed["N"], 20)
        with self.assertRaises(ValueError):
            wizard.render("S", Image.new("RGBA", (63, 80)))
        with self.assertRaises(ValueError):
            wizard.comparison_sheet(None)
        self.assertEqual((1656, 684), wizard.comparison_sheet(reference).size)

    def test_shared_robe_uv_is_valid_and_cannot_change_pose_alpha(self):
        texture_path = MODULE_FILE.parent / "robe-uv-v001.png"
        robe_uv = Image.open(texture_path).convert("RGBA")
        self.assertEqual((96, 128), robe_uv.size)
        self.assertEqual((1656, 684), wizard.comparison_sheet(None, robe_uv).size)
        for direction in wizard.DIRECTIONS:
            original = wizard.render(direction)
            painted = wizard.render(direction, robe_uv=robe_uv)
            self.assertEqual(
                original.getchannel("A").tobytes(),
                painted.getchannel("A").tobytes(),
                direction,
            )
            self.assertNotEqual(original.tobytes(), painted.tobytes(), direction)
            self.assertEqual(painted.tobytes(), wizard.render(direction, robe_uv=robe_uv).tobytes())
        with self.assertRaises(ValueError):
            wizard.render("S", robe_uv=Image.new("RGBA", (95, 128)))

    def test_robe_uv_generator_repeats_and_matches_study_asset(self):
        source = runpy.run_path(str(MODULE_FILE.parent / "robe_uv.py"))
        self.assertEqual(
            tuple(sorted(wizard.ROBE_OPEN_SECTORS)),
            tuple(sorted(source["OPEN_PANEL_CELLS"])),
        )
        self.assertEqual((.20, .55, .90, 1.08, 1.32), source["GARMENT_RINGS"])
        self.assertEqual(
            tuple(mark[1] for mark in wizard.ROBE_SEAMS),
            source["SEAM_AZIMUTHS"],
        )
        self.assertEqual(
            tuple((mark[1], mark[2], mark[3]) for mark in wizard.ROBE_SCARS),
            source["SCAR_MARKS"],
        )
        generate = source["make_robe_uv"]
        first = generate()
        second = generate()
        actual = Image.open(MODULE_FILE.parent / "robe-uv-v001.png").convert("RGBA")
        self.assertEqual((96, 128), first.size)
        self.assertEqual(first.tobytes(), second.tobytes())
        self.assertEqual(first.tobytes(), actual.tobytes())

    def test_repeat_render_is_pixel_deterministic(self):
        self.assertEqual(wizard.render("SE").tobytes(), wizard.render("SE").tobytes())


if __name__ == "__main__":
    unittest.main()
