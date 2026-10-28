"""Manual water-annotation QA: provenance and explicit vectors, NEVER paint-color inference."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / "review_ground_semantic_mask.py"
SPEC = importlib.util.spec_from_file_location("review_ground_semantic_mask", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GroundSemanticMaskTests(unittest.TestCase):
    def make_study(self, place: Path):
        source = place / "assets"
        source.mkdir()
        (source / "wet-mud").mkdir()
        candidate = source / "wet-mud/variant-01.webp"
        Image.new("RGB", (96, 96), (71, 46, 27)).save(candidate, "WEBP", quality=92)
        checksum = hashlib.sha256(candidate.read_bytes()).hexdigest()
        entry = {
            "id": "wet-mud-01", "file": "wet-mud/variant-01.webp",
            "size": [96, 96], "sha256": checksum,
            "sourcePngSha256": "1" * 64, "approval": "unreviewed",
        }
        manifest = {"status": "review-only-not-approved",
                    "families": [{"id": "wet-mud", "variants": [entry]}]}
        (source / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        annotation = {
            "schemaVersion": 1, "assetId": "wet-mud-01",
            "sourcePath": entry["file"],
            "sourceSha256": checksum,
            "sourcePngSha256": "1" * 64,
            "coordinateSpace": "normalized-uv-top-left",
            "layer": "water-surface-candidate",
            "annotationStatus": MODULE.STATUS,
            "runtimeUse": False,
            "physicalWaterGeometry": False,
            "polygons": [[[.1,.1],[.6,.1],[.6,.6],[.1,.6]]],
        }
        annotation_path = place / "annotation.json"
        annotation_path.write_text(json.dumps(annotation), encoding="utf-8")
        return source, candidate, annotation_path, annotation

    def test_valid_annotation_generates_binary_candidate_mask_without_modifying_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            place = Path(tmp)
            source, candidate, annotation_path, original = self.make_study(place)
            original_bytes = candidate.read_bytes()
            output = place / "review"
            report = MODULE.render(source, annotation_path, output, preview_side=320)
            self.assertEqual(report["puddlePolygons"], 1)
            self.assertFalse(report["runtimeUse"])
            self.assertFalse(report["gpuMaterialCreated"])
            self.assertFalse(report["physicalWaterGeometry"])
            self.assertGreater(report["coverageFraction"], .20)
            self.assertLess(report["coverageFraction"], .30)
            with Image.open(output / report["maskFile"]) as mask:
                self.assertEqual(set(mask.getdata()), {0,255})
                self.assertEqual(mask.size, (96, 96))
            self.assertTrue((output / report["comparisonFile"]).is_file())
            self.assertEqual(original_bytes, candidate.read_bytes())
            self.assertEqual(original, json.loads(annotation_path.read_text(encoding="utf-8")))
            self.assertEqual(hashlib.sha256((output / report["maskFile"]).read_bytes()).hexdigest(), report["maskSha256"])

    def test_prevents_output_inside_source_and_tampered_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            place = Path(tmp)
            source, candidate, annotation_path, _ = self.make_study(place)
            with self.assertRaises(ValueError):
                MODULE.render(source, annotation_path, source / "review")
            candidate.write_bytes(b"INVALID SOURCE BYTES")
            with self.assertRaises(ValueError):
                MODULE.render(source, annotation_path, place / "review")
            self.assertFalse((place / "review").exists())

    def test_rejects_unapproved_to_runtime_promotion_and_bad_vectors(self):
        with tempfile.TemporaryDirectory() as tmp:
            place = Path(tmp)
            source, _, annotation_path, annotation = self.make_study(place)
            for change in (
                {"runtimeUse": True},
                {"physicalWaterGeometry": True},
                {"annotationStatus": "approved"},
                {"sourceSha256": "f" * 64},
                {"coordinateSpace": "pixels"},
                {"polygons": []},
                {"polygons": [[[.1,.1], [.2,.2], [1.1,.3]]]},
                {"polygons": [[[.1,.1], [.1,.1], [.1,.1]]]},
                {"polygons": [[[.1,.1], [.2, float("nan")], [.3,.3]]]},
            ):
                changed = {**annotation, **change}
                annotation_path.write_text(json.dumps(changed), encoding="utf-8")
                with self.assertRaises(ValueError):
                    MODULE.read_candidate(source, annotation_path)

    def test_rasterized_polygon_respects_explicit_UV_bounds(self):
        mask = MODULE.rasterize((100, 100), [[(.2,.2),(.4,.2),(.4,.4),(.2,.4)]])
        self.assertEqual(mask.getpixel((0,0)), 0)
        self.assertEqual(mask.getpixel((30,30)), 255)
        self.assertEqual(mask.getpixel((80,80)), 0)
        with self.assertRaises(ValueError):
            MODULE.rasterize((12, 12), [[(.2,.2),(.4,.2),(.4,.4)]])


if __name__ == "__main__":
    unittest.main()
