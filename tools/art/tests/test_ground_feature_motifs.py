"""Test source-art annotation contracts without GPU/C#/runtime integration."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE = Path(__file__).resolve().parents[1] / "review_ground_feature_motifs.py"
SPEC = importlib.util.spec_from_file_location("review_ground_feature_motifs", MODULE)
SCRIPT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SCRIPT)


class FeatureMotifSourceTests(unittest.TestCase):
    def fixture(self, working: Path):
        root = working / "source"
        root.mkdir()
        roles = json.loads((SCRIPT.SOURCE / "material-family-roles.json").read_text(encoding="utf-8"))
        (root / "material-family-roles.json").write_text(json.dumps(roles), encoding="utf-8")
        entries, families, originals = [], [], {}
        for layer, (family, role) in SCRIPT.LAYER_ROLES.items():
            image_path = root / family / "variant-01.webp"
            image_path.parent.mkdir(exist_ok=True)
            Image.new("RGB", (96, 96), (81, 52, 30)).save(image_path, "WEBP", quality=92)
            raw = image_path.read_bytes()
            original_sha = hashlib.sha256(raw).hexdigest()
            originals[str(image_path)] = raw
            source_entry = {
                "id": f"{family}-01", "file": f"{family}/variant-01.webp", "size": [96, 96],
                "sha256": original_sha, "sourcePngSha256": "a" * 64,
                "approval": "unreviewed", "lightNeutral": False,
            }
            families.append({"id": family, "variants": [source_entry]})
            entries.append({
                "assetId": source_entry["id"], "sourcePath": source_entry["file"],
                "sourceSha256": original_sha, "sourcePngSha256": "a" * 64,
                "role": role, "layer": layer,
                "polygons": [[[.1,.1],[.5,.1],[.5,.5],[.1,.5]]],
            })
        (root / "manifest.json").write_text(json.dumps({
            "status": "review-only-not-approved", "families": families,
        }), encoding="utf-8")
        annotation = working / "annotations.json"
        data = {
            "schemaVersion": 1, "status": "manual-artwork-study-not-approved",
            "runtimeUse": False, "physicalSceneGeometry": False,
            "derivedNormalRoughnessOrEmission": False,
            "items": entries,
        }
        annotation.write_text(json.dumps(data), encoding="utf-8")
        return root, annotation, data, originals

    def test_review_produces_three_binary_art_masks_without_modifying_originals(self):
        with tempfile.TemporaryDirectory() as directory:
            place = Path(directory)
            source, annotation, data, originals = self.fixture(place)
            results = SCRIPT.build(source, annotation, place / "review", preview_size=320)
            self.assertEqual(len(results), 3)
            board = place / "review" / "PAINTED-MOTIF-COMPOSITION-REVIEW-UNAPPROVED.jpg"
            self.assertTrue(board.is_file())
            with Image.open(board) as sheet:
                self.assertEqual(sheet.size, (640, 3 * (320 + 52)))
            metadata = json.loads((place / "review" / "SOURCE-MOTIF-STUDY.json").read_text())
            self.assertFalse(metadata["compositionReviewIsGameScene"])
            self.assertFalse(metadata["compositionReviewIsTileable"])
            self.assertEqual({item["semanticLayer"] for item in results}, set(SCRIPT.LAYER_ROLES))
            for item in results:
                self.assertFalse(item["authoritativeCsharpGeometry"])
                self.assertFalse(item["emissionAuthored"])
                self.assertFalse(item["runtimeEligible"])
                self.assertFalse(item["lightingUsed"])
                self.assertFalse(item["ownerApproved"])
                self.assertLess(item["coverageFraction"], .20)
                with Image.open(place / "review" / item["maskFile"]) as m:
                    self.assertEqual(set(m.getdata()), {0,255})
                    self.assertEqual(m.size, (96,96))
                self.assertTrue((place / "review" / item["previewFile"]).is_file())
                self.assertTrue(item["sourceRgbCropPixelsUnchanged"])
                self.assertFalse(item["cropIsTileable"])
                self.assertFalse(item["cropIsRuntimeAlpha"])
                self.assertFalse(item["annotatedIsolationPreviewIsRuntimeAsset"])
                self.assertFalse(item["paintedFeatureCompositionIsRuntimeAsset"])
                self.assertFalse(item["mobileReviewIsGameScreenshot"])
                with Image.open(place / "review" / item["mobileFeatureReviewFile"]) as mobile:
                    self.assertEqual(mobile.size, (240, 240))
                with Image.open(place / "review" / item["mobileComparisonReviewFile"]) as mobile_board:
                    self.assertEqual(mobile_board.size, (480, 284))
                self.assertFalse(item["paintedFeatureCompositionIsTileable"])
                with Image.open(place / "review" / item["paintedFeatureCompositionFile"]) as composed:
                    self.assertEqual(composed.mode, "RGB")
                    self.assertEqual(composed.size, (96, 96))
                with Image.open(place / "review" / item["paintedFeatureArtDirectionReview"]) as art_direction:
                    self.assertEqual(art_direction.size, (960, 388))
                with Image.open(place / "review" / item["annotatedIsolationPreviewFile"]) as isolation:
                    self.assertEqual(isolation.mode, "RGB")
                    with Image.open(place / "review" / item["sourceRgbCropFile"]) as crop_check:
                        self.assertEqual(isolation.size, crop_check.size)
                        self.assertNotEqual(isolation.getpixel((0, 0)), crop_check.getpixel((0, 0)))
                with Image.open(place / "review" / item["sourceRgbCropFile"]) as crop:
                    self.assertEqual(crop.mode, "RGB")
                    self.assertGreater(crop.width, 0)
                    self.assertGreater(crop.height, 0)
                    original = Image.open(source / item["semanticLayer"].replace("painted-trail-motif", "trampled-earth").replace("painted-charred-motif", "scorched-ground").replace("painted-marshland-motif", "marsh-wet-bank") / "variant-01.webp").convert("RGB")
                    self.assertEqual(crop.tobytes(), original.crop(tuple(item["sourceRgbCropBounds"])).tobytes())
            self.assertEqual({name: Path(name).read_bytes() for name in originals}, originals)
            self.assertEqual(json.loads(annotation.read_text()), data)

    def test_refuses_tampered_source_undeclared_role_and_promotion(self):
        with tempfile.TemporaryDirectory() as directory:
            place = Path(directory)
            root, annotation, good, _ = self.fixture(place)
            for change in (
                {"runtimeUse": True},
                {"physicalSceneGeometry": True},
                {"derivedNormalRoughnessOrEmission": True},
                {"status": "approved"},
            ):
                annotation.write_text(json.dumps({**good, **change}), encoding="utf-8")
                with self.assertRaises(ValueError):
                    SCRIPT.load_studies(root, annotation)
            for edit in (
                {"role": "continuous-substrate-candidate"},
                {"layer": "physically-emissive"},
                {"sourceSha256": "x" * 64},
                {"assetId": "trampled-earth-99"},
                {"polygons": [[[.1,.1],[.2,.2],[2,.2]]]},
                {"polygons": [[[.1,.1],[.1,.1],[.1,.1]]]},
            ):
                invalid = json.loads(json.dumps(good))
                invalid["items"][0].update(edit)
                annotation.write_text(json.dumps(invalid), encoding="utf-8")
                with self.assertRaises(ValueError):
                    SCRIPT.load_studies(root, annotation)
            annotation.write_text(json.dumps(good), encoding="utf-8")
            (root / "trampled-earth" / "variant-01.webp").write_bytes(b"INVALID")
            with self.assertRaises(ValueError):
                SCRIPT.load_studies(root, annotation)

    def test_refuses_archive_writes_before_reading_annotation(self):
        with tempfile.TemporaryDirectory() as directory:
            place = Path(directory)
            root, annotation, _, _ = self.fixture(place)
            with self.assertRaises(ValueError):
                SCRIPT.build(root, annotation, root / "generated")
            self.assertFalse((root / "generated").exists())

    def test_polygon_validation_preserves_exact_uv_geometry(self):
        region = [[.2,.2],[.45,.2],[.45,.5],[.2,.5]]
        shapes = SCRIPT.verify_polygons([region])
        self.assertEqual(shapes[0][0], (.2,.2))
        img = SCRIPT.rasterize((100,100), shapes)
        self.assertEqual(img.getpixel((0,0)),0)
        self.assertEqual(img.getpixel((30,30)),255)
        self.assertEqual(img.getpixel((80,80)),0)
        for bad in ([[[0,0],[1,1]]], [[[-.1,0],[0,1],[1,1]]], [[]], []):
            with self.assertRaises(ValueError):
                SCRIPT.verify_polygons(bad)


if __name__ == "__main__":
    unittest.main()
