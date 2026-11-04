#!/usr/bin/env python3
"""Rasterize explicitly hand-authored source-art annotations for review, never production water."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
DEFAULT_ANNOTATION = SOURCE / "annotations/wet-mud-01-water-study.json"
STATUS = "manual-rough-study-not-approved"


def read_candidate(source_root: Path, annotation_path: Path) -> tuple[Image.Image, list[list[tuple[float, float]]], dict]:
    manifest = json.loads((source_root / "manifest.json").read_text(encoding="utf-8"))
    annotation = json.loads(annotation_path.read_text(encoding="utf-8"))
    if manifest.get("status") != "review-only-not-approved":
        raise ValueError("Only unapproved source archives may be inspected")
    if (annotation.get("schemaVersion") != 1
            or annotation.get("annotationStatus") != STATUS
            or annotation.get("layer") != "water-surface-candidate"
            or annotation.get("coordinateSpace") != "normalized-uv-top-left"
            or annotation.get("runtimeUse") is not False
            or annotation.get("physicalWaterGeometry") is not False):
        raise ValueError("Unapproved manual semantic source annotation required")
    asset_id = annotation.get("assetId")
    image_candidates = [
        entry for family in manifest["families"] for entry in family["variants"]
        if entry["id"] == asset_id
    ]
    if len(image_candidates) != 1:
        raise ValueError("Annotation must target one known candidate")
    entry = image_candidates[0]
    if (entry["approval"] != "unreviewed"
            or entry["file"] != annotation.get("sourcePath")
            or entry["sha256"] != annotation.get("sourceSha256")
            or entry["sourcePngSha256"] != annotation.get("sourcePngSha256")):
        raise ValueError("Annotation source identity or approval does not match manifest")
    path = (source_root / entry["file"]).resolve()
    if not path.is_relative_to(source_root.resolve()):
        raise ValueError("Source image must live inside the immutable archive")
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
        raise ValueError("Source image hash does not match manifest")
    with Image.open(path) as source:
        if list(source.size) != entry["size"]:
            raise ValueError("Image dimensions changed")
        original = source.convert("RGB")
    raw_polygons = annotation.get("polygons")
    if not isinstance(raw_polygons, list) or not 1 <= len(raw_polygons) <= 64:
        raise ValueError("Requires 1–64 explicitly positioned water-study polygons")
    polygons = []
    for shape in raw_polygons:
        if not isinstance(shape, list) or not 3 <= len(shape) <= 128:
            raise ValueError("Each polygon needs 3–128 explicit vertices")
        points = []
        for xy in shape:
            if (not isinstance(xy, list) or len(xy) != 2
                    or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in xy)):
                raise ValueError("Each vertex must contain finite normalized UV coordinates")
            points.append((float(xy[0]), float(xy[1])))
        if len(set(points)) < 3:
            raise ValueError("Degenerate water polygon")
        polygons.append(points)
    return original, polygons, annotation


def rasterize(size: tuple[int, int], polygons: list[list[tuple[float, float]]]) -> Image.Image:
    w, h = size
    if w < 32 or h < 32:
        raise ValueError("Image dimensions are too small")
    mask = Image.new("L", size, 0)
    pen = ImageDraw.Draw(mask)
    for shape in polygons:
        pen.polygon([(round(x * (w - 1)), round(y * (h - 1))) for x, y in shape], fill=255)
    return mask


def render(source_root: Path, annotation_path: Path, output: Path, preview_side: int = 640) -> dict:
    source_root, annotation_path, output = source_root.resolve(), annotation_path.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Derived QA output cannot overwrite original art")
    if not 320 <= preview_side <= 1024:
        raise ValueError("Preview size must be between 320 and 1024px")
    source, polygons, annotation = read_candidate(source_root, annotation_path)
    mask = rasterize(source.size, polygons)
    histogram = mask.histogram()
    coverage = histogram[255] / (source.width * source.height)
    if not .001 < coverage < .60:
        raise ValueError("Manual annotation covers implausibly little or too much of the painting")
    output.mkdir(parents=True, exist_ok=True)
    stem = annotation["assetId"]
    mask_path = output / f"{stem}-UNAPPROVED-puddle-region-mask.png"
    mask.save(mask_path)
    base = source.resize((preview_side, preview_side), Image.Resampling.LANCZOS).convert("RGBA")
    reduced = mask.resize((preview_side, preview_side), Image.Resampling.NEAREST)
    tint = Image.new("RGBA", base.size, (39, 174, 216, 0))
    tint.putalpha(reduced.point(lambda a: 96 if a else 0))
    candidate = Image.alpha_composite(base, tint)
    pen = ImageDraw.Draw(candidate)
    for i, shape in enumerate(polygons):
        vertices = [(round(x * (preview_side - 1)), round(y * (preview_side - 1))) for x, y in shape]
        pen.line(vertices + vertices[:1], fill=(99, 251, 247, 255), width=2)
        pen.text(vertices[0], str(i + 1), fill=(255, 255, 255, 255))
    gutter, title = 14, 40
    review = Image.new("RGB", (preview_side * 2 + gutter * 3, preview_side + title + gutter), "#171919")
    labels = ImageDraw.Draw(review)
    labels.text((gutter, 10), "Unchanged source • original painterly puddles", fill="#e7e3dc")
    labels.text((preview_side + gutter * 2, 10), "Hand-drawn rough water regions • NOT production masks", fill="#e7e3dc")
    review.paste(base.convert("RGB"), (gutter, title))
    review.paste(candidate.convert("RGB"), (preview_side + gutter * 2, title))
    preview_path = output / f"{stem}-UNAPPROVED-puddle-region-review.jpg"
    review.save(preview_path, quality=93, subsampling=0)
    report = {
        "schemaVersion": 1,
        "assetId": stem,
        "sourceSha256": annotation["sourceSha256"],
        "sourcePngSha256": annotation["sourcePngSha256"],
        "annotationStatus": STATUS,
        "sourceImageUnchanged": True,
        "runtimeUse": False,
        "physicalWaterGeometry": False,
        "gpuMaterialCreated": False,
        "puddlePolygons": len(polygons),
        "coverageFraction": round(coverage, 5),
        "maskSha256": hashlib.sha256(mask_path.read_bytes()).hexdigest(),
        "maskFile": mask_path.name,
        "comparisonFile": preview_path.name,
        "warnings": [
            "Only a vector annotation of visible still art; no neutral albedo is authored.",
            "Polygon boundaries overlap some rocks/soil and miss small glints; require manual refinement.",
            "A visual candidate water region does not imply real C# water or reflection geometry.",
            "Never infer physical roughness, normals, emissive light or collision from this RGB mask.",
            "Keep this layer out of the runtime until owner approval and shared GPU acceptance.",
        ],
    }
    (output / f"{stem}-UNAPPROVED-review.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(polygons)} rough manual puddle regions, coverage={coverage:.2%}, no game assets changed.")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--annotation", type=Path, default=DEFAULT_ANNOTATION)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    render(args.source, args.annotation, args.output)


if __name__ == "__main__":
    main()
