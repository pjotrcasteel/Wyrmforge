"""Future actor and wizard animation evidence tests (not art-approval tests)."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from actor_motion_review import review_frames


class MotionReviewTests(unittest.TestCase):
    def render_source(self, root, motion=True):
        root.mkdir()
        for frame in range(4):
            image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            x = 10 + (frame * 8 if motion else 0)
            draw.rectangle((x, 16, x + 8, 38), fill=(128, 110, 99, 255))
            image.save(root / f"frame-{frame:02d}.png")

    def test_real_frames_become_contact_sheet_and_looping_gif(self):
        with TemporaryDirectory() as temp:
            source = Path(temp) / "frames"
            self.render_source(source)
            output = Path(temp) / "review"
            report = review_frames(source, output, 4, 12)
            self.assertEqual(report["frameCount"], 4)
            self.assertEqual(report["identicalAdjacentFrames"], [])
            self.assertFalse(report["silhouetteAndFootPlantArtistApproved"])
            for path in ("motion-contact-sheet.png", "motion-loop.gif", "motion-review.json"):
                self.assertTrue((output / path).is_file())
            with Image.open(output / "motion-loop.gif") as gif:
                self.assertEqual(gif.n_frames, 4)

    def test_frozen_gait_is_recorded(self):
        with TemporaryDirectory() as temp:
            source = Path(temp) / "frames"
            self.render_source(source, motion=False)
            report = review_frames(source, Path(temp) / "review", 4, 12)
            self.assertEqual(report["identicalAdjacentFrames"], [0, 1, 2, 3])

    def test_missing_authored_frame_rejected_before_any_output(self):
        with TemporaryDirectory() as temp:
            source = Path(temp) / "frames"
            self.render_source(source)
            (source / "frame-02.png").unlink()
            output = Path(temp) / "review"
            with self.assertRaises(FileNotFoundError):
                review_frames(source, output, 4, 12)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
