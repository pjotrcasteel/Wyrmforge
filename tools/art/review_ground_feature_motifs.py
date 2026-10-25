#!/usr/bin/env python3
"""Hash-verified artist annotations of PAINTED source motifs, not terrain geometry.

This exports ONLY review overlays and binary art-region samples. It does not infer alpha
from dark borders, normal/roughness/emission from RGB, game paths, or water physics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
ANNOTATIONS = SOURCE / "annotations/feature-motif-source-studies-v1.json"

LAYER_ROLES = {
    "painted-trail-motif": ("trampled-earth", "authoritative-road-detail-candidate"),
    "painted-charred-motif": ("scorched-ground", "fire-lineage-corruption-candidate"),
    "painted-marshland-motif": ("marsh-wet-bank", "wetland-bank-reference-candidate"),
}


def verify_polygons(raw) -> list[list[tuple[float, float]]]:
    if not isinstance(raw, list) or not 1 <= len(raw) <= 12:
        raise ValueError("Expected 1..12 hand-authored polygons")
    output = []
    for polygon in raw:
        if not isinstance(polygon, list) or not 3 <= len(polygon) <= 128:
            raise ValueError("Polygon needs 3..128 vertices")
        points = []
        for point in polygon:
            if (not isinstance(point, list) or len(point) != 2
                or any(type(v) not in (float, int) or not math.isfinite(v) or not 0 <= v <= 1 for v in point)):
                raise ValueError("Vertices must be finite normalized UV values")
            points.append((float(point[0]), float(point[1])))
        if len(set(points)) < 3:
            raise ValueError("Degenerate polygon")
        # Shoelace check refuses near-zero-area degenerate shapes.
        area = abs(sum(points[i][0] * points[(i + 1) % len(points)][1]
                       - points[(i + 1) % len(points)][0] * points[i][1]
                       for i in range(len(points))) / 2)
        if area <= .0001:
            raise ValueError("Nearly degenerate polygon")
        output.append(points)
    return output


def load_studies(root: Path, path: Path) -> list[tuple[dict, Image.Image, list]]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    roles = json.loads((root / "material-family-roles.json").read_text(encoding="utf-8"))
    annotations = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("status") != "review-only-not-approved" or roles.get("runtimeEligible") is not False:
        raise ValueError("Review-only unapproved artwork is required")
    if (annotations.get("schemaVersion") != 1
        or annotations.get("status") != "manual-artwork-study-not-approved"
        or annotations.get("runtimeUse") is not False
        or annotations.get("physicalSceneGeometry") is not False
        or annotations.get("derivedNormalRoughnessOrEmission") is not False):
        raise ValueError("Manual source studies cannot be promoted automatically")
    items = annotations.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 16:
        raise ValueError("Expected 1..16 annotated source motifs")
    families = {x["id"]: x for x in manifest["families"]}
    catalog = {x["id"]: x for x in roles["roles"]}
    encountered = set()
    studies = []
    for item in items:
        layer = item.get("layer")
        if layer not in LAYER_ROLES:
            raise ValueError("Unknown or physically suggestive annotation layer")
        family, role = LAYER_ROLES[layer]
        if item.get("role") != role or catalog[family].get("role") != role:
            raise ValueError("Role does not match canonical art-family role")
        asset_id = item.get("assetId")
        if asset_id in encountered:
            raise ValueError("Duplicate asset annotation")
        encountered.add(asset_id)
        choices = [v for v in families[family]["variants"] if v["id"] == asset_id]
        if len(choices) != 1:
            raise ValueError("Annotation asset does not belong to selected family")
        entry = choices[0]
        if (item.get("sourcePath") != entry["file"]
            or item.get("sourceSha256") != entry["sha256"]
            or item.get("sourcePngSha256") != entry["sourcePngSha256"]
            or entry.get("approval") != "unreviewed"
            or entry.get("lightNeutral") is not False):
            raise ValueError("Source identity, approval or paint-neutrality mismatch")
        source_file = (root / entry["file"]).resolve()
        if not source_file.is_relative_to(root.resolve()):
            raise ValueError("Source path must stay inside immutable archive")
        raw = source_file.read_bytes()
        if hashlib.sha256(raw).hexdigest() != entry["sha256"]:
            raise ValueError("Artwork bytes no longer match hash-locked manifest")
        with Image.open(source_file) as original:
            if list(original.size) != entry["size"]:
                raise ValueError("Artwork dimensions no longer match manifest")
            image = original.convert("RGB")
        studies.append((item, image, verify_polygons(item.get("polygons"))))
    return studies


def rasterize(size: tuple[int, int], polygons: list) -> Image.Image:
    mask = Image.new("L", size, 0)
    painter = ImageDraw.Draw(mask)
    for polygon in polygons:
        pts = [(round(x * (size[0] - 1)), round(y * (size[1] - 1))) for x, y in polygon]
        painter.polygon(pts, fill=255)
    return mask


def preview(image: Image.Image, polygons: list, layer: str, size: int) -> Image.Image:
    """Side-by-side full painting vs highlighted art annotation; NEVER export lit mockups."""
    original = ImageOps.contain(image, (size, size), method=Image.Resampling.BOX)
    margin, top = 14, 46
    sheet = Image.new("RGB", (size * 2 + margin * 3, size + top + margin), "#161819")
    painter = ImageDraw.Draw(sheet)
    painter.text((margin, 12), "Original source painting", fill="#f0e8dc")
    painter.text((size + margin * 2, 12), f"ARTWORK MOTIF ONLY: {layer}", fill="#e5e9d8")
    x0, y0 = margin, top
    x1 = size + margin * 2
    sheet.paste(original, (x0, y0))
    sheet.paste(original, (x1, y0))
    overlay = Image.new("RGBA", original.size, (0, 0, 0, 0))
    pen = ImageDraw.Draw(overlay)
    sx, sy = (original.width / image.width), (original.height / image.height)
    for index, region in enumerate(polygons, 1):
        coords = [(round(px * (image.width - 1) * sx), round(py * (image.height - 1) * sy)) for px, py in region]
        pen.polygon(coords, fill=(35, 163, 194, 95))
        pen.line(coords + coords[:1], fill=(123, 241, 246, 255), width=2)
        pen.text(coords[0], str(index), fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(20, 20, 20, 255))
    sheet.paste(Image.alpha_composite(original.convert("RGBA"), overlay).convert("RGB"), (x1, y0))
    return sheet


def build(root: Path, annotation_file: Path, output: Path, preview_size: int = 480) -> list[dict]:
    root, output = root.resolve(), output.resolve()
    if output == root or root in output.parents:
        raise ValueError("Review output cannot enter the original artwork archive")
    if not 320 <= preview_size <= 800:
        raise ValueError("Preview size out of bounds")
    studies = load_studies(root, annotation_file.resolve())
    output.mkdir(parents=True, exist_ok=True)
    reports = []
    for item, image, polygons in studies:
        mask = rasterize(image.size, polygons)
        count = sum(1 for v in mask.getdata() if v == 255)
        coverage = count / (image.width * image.height)
        if not .005 < coverage < .90:
            raise ValueError("Motif sample area too narrow or implausibly large")
        name = item["assetId"]
        mask_name = f"{name}-SOURCE-MOTIF-UNAPPROVED.png"
        preview_name = f"{name}-SOURCE-REVIEW-UNAPPROVED.jpg"
        mask.save(output / mask_name)
        preview(image, polygons, item["layer"], preview_size).save(output / preview_name, quality=91, subsampling=0)
        reports.append({
            "assetId": name,
            "semanticLayer": item["layer"],
            "sourceSha256": item["sourceSha256"],
            "coverageFraction": round(coverage, 5),
            "maskFile": mask_name,
            "maskSha256": hashlib.sha256((output / mask_name).read_bytes()).hexdigest(),
            "previewFile": preview_name,
            "runtimeEligible": False, "authoritativeCsharpGeometry": False,
            "emissionAuthored": False, "lightingUsed": False, "ownerApproved": False,
        })
    (output / "SOURCE-MOTIF-STUDY.json").write_text(json.dumps({
        "stage": "unapproved-artwork-feature-annotation",
        "sourceArtUnchanged": True,
        "allSourcePaintingHashesChecked": True,
        "meaning": "Extracted pixels describe existing PAINTED motifs, NOT world geometry, C# paths, light emitters, alpha transparency or relightable albedo.",
        "results": reports,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(reports)} editable author-only source motif overlays; no game integration.")
    return reports


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--annotation", type=Path, default=ANNOTATIONS)
    parser.add_argument("--output", type=Path, required=True)
    options = parser.parse_args()
    build(options.source, options.annotation, options.output)


if __name__ == "__main__":
    main()
