"""No approvals, file mutation or production usage in 36-image mobile footprint QA."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / "ground_family_footprint_review.py"
SPEC = importlib.util.spec_from_file_location("ground_family_footprint_review", SCRIPT)
STUDY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(STUDY)


class GroundFamilyFootprintReviewTests(unittest.TestCase):
    def make_fixture(self, root: Path):
        root.mkdir()
        source_roles = json.loads((STUDY.SOURCE / "material-family-roles.json").read_text(encoding="utf-8"))
        (root / "material-family-roles.json").write_text(json.dumps(source_roles), encoding="utf-8")
        families = []
        originals = {}
        for family_id in STUDY.FAMILY_IDS:
            variants = []
            for number in range(1, 7):
                rel = f"{family_id}/variant-{number:02d}.webp"
                path = root / rel
                path.parent.mkdir(exist_ok=True)
                Image.new("RGB", (144, 144), (15 + number * 6, 20 + number * 5, 27)).save(path, "WEBP", quality=92)
                data = path.read_bytes()
                originals[rel] = data
                variants.append({
                    "id": f"{family_id}-{number:02d}",
                    "file": rel,
                    "size": [144, 144],
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "approval": "unreviewed", "seamless": False, "lightNeutral": False,
                })
            families.append({"id": family_id, "variants": variants})
        (root / "manifest.json").write_text(json.dumps({
            "status": "review-only-not-approved",
            "families": families,
        }), encoding="utf-8")
        return originals

    def test_all_six_families_generate_mobile_size_review_without_modifying_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root, out = Path(directory) / "original", Path(directory) / "out"
            originals = self.make_fixture(root)
            result = STUDY.build(root, out)
            self.assertEqual(len(result), 12)
            self.assertEqual(sum(x["sourceImagesReviewed"] for x in result), 72)
            self.assertEqual(set(tuple(x["viewport"]) for x in result), set(STUDY.VIEWS))
            self.assertEqual(set(x["family"] for x in result), set(STUDY.FAMILY_IDS))
            for item in result:
                self.assertFalse(item["artworkApproved"])
                self.assertFalse(item["seamlessProven"])
                self.assertFalse(item["lightNeutral"])
                self.assertFalse(item["usedInGame"])
                path = out / item["preview"]
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), item["sha256"])
                with Image.open(path) as image:
                    self.assertEqual(image.size, tuple(item["viewport"]))
            self.assertEqual(originals, {key: (root / key).read_bytes() for key in originals})

    def test_source_and_role_integrity_rejects_tampered_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "original"
            self.make_fixture(root)
            meta = root / "material-family-roles.json"
            before = meta.read_text(encoding="utf-8")
            roles = json.loads(before)
            roles["roles"][3]["requiresManualFootprint"] = False
            meta.write_text(json.dumps(roles), encoding="utf-8")
            with self.assertRaises(ValueError):
                STUDY.load_collection(root)
            meta.write_text(before, encoding="utf-8")
            (root / "grass-moss/variant-01.webp").write_bytes(b"modified source")
            with self.assertRaises(ValueError):
                STUDY.load_collection(root)

    def test_no_art_approval_or_generated_files_in_source_folder(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "original"
            self.make_fixture(root)
            with self.assertRaises(ValueError):
                STUDY.build(root, root / "review")
            roles = json.loads((root / "material-family-roles.json").read_text(encoding="utf-8"))
            roles["runtimeEligible"] = True
            (root / "material-family-roles.json").write_text(json.dumps(roles), encoding="utf-8")
            with self.assertRaises(ValueError):
                STUDY.load_collection(root)

    def test_raw_repeats_and_source_pixel_dimensions(self):
        source = Image.new("RGB", (144, 144), (63, 40, 28))
        for width, height in STUDY.VIEWS:
            preview = STUDY.build_board(
                {"id": "grass-moss", "role": "continuous-substrate-candidate"},
                [source for _ in range(6)],
                (width, height),
            )
            self.assertEqual(preview.size, (width, height))
        self.assertEqual(STUDY.four_repeats(source, 60).size, (120, 120))
        with self.assertRaises(ValueError):
            STUDY.build_board({"id": "grass-moss", "role": "continuous-substrate-candidate"}, [source], (320, 568))
        with self.assertRaises(ValueError):
            STUDY.build_board({"id": "grass-moss", "role": "continuous-substrate-candidate"}, [source] * 6, (400, 844))


if __name__ == "__main__":
    unittest.main()
