#!/usr/bin/env python3
"""Local deterministic tests for source-art comparison probes; no game runtime involved."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE_PATH = Path(__file__).resolve().parents[1] / "build_ground_material_probe.py"
SPEC = importlib.util.spec_from_file_location("build_ground_material_probe", MODULE_PATH)
PROBE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PROBE)


class GroundMaterialProbeTests(unittest.TestCase):
    @staticmethod
    def noisy_image(size=(93, 79)):
        image = Image.new("RGB", size)
        pix = image.load()
        for y in range(size[1]):
            for x in range(size[0]):
                pix[x, y] = ((x * 7 + y * 11) % 256, (x * 23 + y * 3) % 256, (x * 17 + y * 29) % 256)
        return image

    def test_periodic_edges_are_exact_and_center_preserved(self):
        image = self.noisy_image()
        before = image.tobytes()
        self.assertGreater(PROBE.edge_error(image), 0)
        studied = PROBE.feather_opposite_edges(image)
        self.assertEqual(PROBE.edge_error(studied), 0)
        self.assertEqual(image.tobytes(), before, "Source image was modified")
        center = (image.width // 2, image.height // 2)
        self.assertEqual(studied.getpixel(center), image.getpixel(center))
        self.assertEqual(studied.size, image.size)

    def test_invalid_inputs_rejected(self):
        with self.assertRaises(ValueError):
            PROBE.feather_opposite_edges(self.noisy_image(), fraction=0)
        with self.assertRaises(ValueError):
            PROBE.feather_opposite_edges(self.noisy_image(), fraction=0.40)
        with self.assertRaises(ValueError):
            PROBE.feather_opposite_edges(Image.new("RGB", (6, 6)), fraction=0.1)
        with self.assertRaises(ValueError):
            PROBE.generate(Path("missing"), Path("unused"), tile_px=12)

    def test_review_output_cannot_land_in_source_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ValueError):
                PROBE.generate(root, root / "subfolder", tile_px=64)

    def test_synthetic_archive_makes_twelve_studies_without_writing_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "source"
            dest = Path(tmp) / "review"
            root.mkdir(parents=True)
            families = []
            bytes_before = {}
            for family in PROBE.SUPPORTED:
                variants = []
                for i in range(1, 7):
                    rel = f"{family}/variant-{i:02d}.webp"
                    path = root / rel
                    path.parent.mkdir(parents=True, exist_ok=True)
                    img = self.noisy_image((48, 48))
                    img.save(path, format="WEBP", quality=92)
                    raw = path.read_bytes()
                    bytes_before[rel] = raw
                    variants.append({
                        "id": f"{family}-{i:02d}", "file": rel, "size": [48, 48],
                        "sha256": hashlib.sha256(raw).hexdigest(), "approval": "unreviewed",
                    })
                families.append({"id": family, "variants": variants})
            (root / "manifest.json").write_text(json.dumps({
                "status": "review-only-not-approved", "families": families,
            }), encoding="utf-8")
            result = PROBE.generate(root, dest, tile_px=64)
            report = json.loads((dest / "review-metrics.json").read_text(encoding="utf-8"))
            self.assertEqual(len(result), 12)
            self.assertEqual(len(report["variants"]), 12)
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["lightingNeutral"])
            self.assertEqual(len(list(dest.glob("*-repeat.jpg"))), 12)
            self.assertTrue(all(x["studyEdgeMeanRgbGap"] == 0 for x in result))
            for rel, raw in bytes_before.items():
                self.assertEqual((root / rel).read_bytes(), raw)

    def test_changed_source_hash_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifest.json").write_text(json.dumps({
                "status": "review-only-not-approved",
                "families": [{"id": family, "variants": (
                    [{"id": f"{family}-01", "file": f"{family}/variant-01.webp", "size": [48, 48], "sha256": "0" * 64}] * 6
                )} for family in PROBE.SUPPORTED],
            }), encoding="utf-8")
            # A corrupted or missing source must prevent output; cannot silently substitute another.
            with self.assertRaises((ValueError, FileNotFoundError)):
                PROBE.generate(root, root / "review", tile_px=64)



AUDIT_PATH = Path(__file__).resolve().parents[1] / "audit_ground_source_art.py"
AUDIT_SPEC = importlib.util.spec_from_file_location("audit_ground_source_art", AUDIT_PATH)
AUDIT = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)


class GroundFullSourceAuditTests(unittest.TestCase):
    def test_detects_bordered_black_islands_as_warnings_not_certification(self):
        image = Image.new("RGB", (96, 96), (9, 11, 12))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(image)
        draw.rectangle((21, 21, 74, 74), fill=(108, 63, 35))
        result = AUDIT.analyze_image(image)
        self.assertTrue(result["possibleIsolatedPatchBlackMatte"])
        self.assertGreater(result["nearBlackFrameFraction"], result["nearBlackCenterFraction"])
        self.assertEqual(result["sourceHorizontalMeanRgbEdgeGap"], 0)
        self.assertEqual(result["sourceVerticalMeanRgbEdgeGap"], 0)

    def test_full_bleed_uniform_art_does_not_trigger_island_warning(self):
        image = Image.new("RGB", (96, 96), (72, 45, 23))
        result = AUDIT.analyze_image(image)
        self.assertFalse(result["possibleIsolatedPatchBlackMatte"])
        self.assertEqual(result["nearBlackFrameFraction"], 0)
        self.assertEqual(result["sourceHorizontalMeanRgbEdgeGap"], 0)

    def test_full_archive_is_immutable_and_hash_guarded(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "source"
            dest = Path(temp) / "output"
            root.mkdir()
            families = []
            for fid in AUDIT.FAMILIES:
                variants = []
                for idx in range(1, 7):
                    path = root / fid / f"variant-{idx:02d}.webp"
                    path.parent.mkdir(exist_ok=True)
                    Image.new("RGB", (64, 64), (80, 60, 40)).save(path, "WEBP", quality=92)
                    variants.append({
                        "id": f"{fid}-{idx:02d}", "file": f"{fid}/variant-{idx:02d}.webp",
                        "size": [64, 64], "approval": "unreviewed",
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    })
                families.append({"id": fid, "variants": variants})
            (root / "manifest.json").write_text(json.dumps({
                "status": "review-only-not-approved", "families": families,
            }), encoding="utf-8")
            originals = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in root.rglob("*") if p.is_file()}
            report = AUDIT.audit(root, dest)
            self.assertEqual(len(report["variants"]), 36)
            self.assertEqual(report["sourceApproval"], "none")
            self.assertEqual(report["runtimeMaterialsCreated"], 0)
            self.assertTrue((dest / "source-audit.md").is_file())
            self.assertTrue((dest / "source-audit.json").is_file())
            self.assertEqual(
                originals,
                {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in root.rglob("*") if p.is_file()},
            )
            with self.assertRaises(ValueError):
                AUDIT.audit(root, root / "wrong-location")
            corrupted = root / "grass-moss" / "variant-01.webp"
            corrupted.write_bytes(b"CORRUPTED")
            with self.assertRaises(ValueError):
                AUDIT.audit(root, dest)

if __name__ == "__main__":
    unittest.main()
