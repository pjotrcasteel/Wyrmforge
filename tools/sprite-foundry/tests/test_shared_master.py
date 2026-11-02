"""Shared-master structural checks. Passing these tests is not artistic approval."""
import importlib.util
import sys
import unittest
from pathlib import Path

MODULE_FILE = Path(__file__).resolve().parents[1] / "experiments" / "shared-wizard-master-v001" / "master.py"
SPEC = importlib.util.spec_from_file_location("wizard_shared_master", MODULE_FILE)
wizard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = wizard
SPEC.loader.exec_module(wizard)


class SharedMasterTests(unittest.TestCase):
    def test_every_facing_uses_identical_unrotated_geometry(self):
        before = tuple((face.feature, face.points) for face in wizard.build_master())
        self.assertGreater(len(before), 2000)
        for direction in ("S", "SE", "E"):
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

    def test_repeat_render_is_pixel_deterministic(self):
        self.assertEqual(wizard.render("SE").tobytes(), wizard.render("SE").tobytes())


if __name__ == "__main__":
    unittest.main()
