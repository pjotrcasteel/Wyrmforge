#!/usr/bin/env python3
"""Non-destructive 6x6 Wet Forest source-image repeat probes. NO runtime assets or approvals."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = REPO_ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
SUPPORTED = ("grass-moss", "wet-mud")


def edge_error(image: Image.Image) -> float:
    """Mean source-tile boundary RGB gap (0 does not guarantee a visually seamless repeat)."""
    rgb = image.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    total = 0
    for y in range(h):
        for c in range(3):
            total += abs(px[0, y][c] - px[w - 1, y][c])
    for x in range(w):
        for c in range(3):
            total += abs(px[x, 0][c] - px[x, h - 1][c])
    return round(total / (3 * (w + h)), 3)


def feather_opposite_edges(image: Image.Image, fraction: float = 0.10) -> Image.Image:
    """Diagnostic periodic-edge study; deliberately NOT neutral albedo or production tiling.

    Blend opposing border bands symmetrically, leaving most interior details intact.
    Exact first/last RGB edge equality is guaranteed, NOT invisible joins or variation.
    """
    if not 0 < fraction <= 0.25:
        raise ValueError("Edge-band fraction must be in (0, 0.25]")
    out = image.convert("RGB").copy()
    w, h = out.size
    if min(w, h) < 8:
        raise ValueError("Image is too small")
    px = out.load()

    for axis, dimension, other in (("x", w, h), ("y", h, w)):
        band = max(2, round(dimension * fraction))
        for i in range(band):
            t = i / (band - 1)
            smooth = t * t * (3 - 2 * t)
            mix = (1 - smooth) * 0.5
            a, b = i, dimension - 1 - i
            for j in range(other):
                xy_a = (a, j) if axis == "x" else (j, a)
                xy_b = (b, j) if axis == "x" else (j, b)
                left = px[xy_a]
                right = px[xy_b]
                new_a = tuple(round(v * (1 - mix) + u * mix) for v, u in zip(left, right))
                new_b = tuple(round(u * (1 - mix) + v * mix) for v, u in zip(left, right))
                px[xy_a] = new_a
                px[xy_b] = new_b
    return out


def repeated(image: Image.Image, tile_px: int) -> Image.Image:
    # BOX filtering reduces enormous source tiles down to a phone-sized preview without
    # falsely implying that the raw source pixel grid equals the final gameplay scale.
    sample = ImageOps.fit(image.convert("RGB"), (tile_px, tile_px), method=Image.Resampling.BOX)
    sheet = Image.new("RGB", (3 * tile_px, 3 * tile_px))
    for row in range(3):
        for col in range(3):
            sheet.paste(sample, (col * tile_px, row * tile_px))
    return sheet


def comparison(original: Image.Image, studied: Image.Image, tile_px: int, label: str) -> Image.Image:
    gutter, header = 16, 54
    size = tile_px * 3
    page = Image.new("RGB", (2 * size + gutter, size + header), "#151719")
    pen = ImageDraw.Draw(page)
    font = ImageFont.load_default()
    pen.text((8, 8), f"{label}   |   source on left / edge-feather study on right", fill="#f0f0f0", font=font)
    pen.text((8, 28), "Both images repeat 3x3. Study is NOT approved or lighting-neutral.", fill="#c0b9aa", font=font)
    page.paste(repeated(original, tile_px), (0, header))
    page.paste(repeated(studied, tile_px), (size + gutter, header))
    return page


def generate(source_root: Path, output: Path, tile_px: int = 240) -> list[dict]:
    if not 64 <= tile_px <= 512:
        raise ValueError("Review tile_px must be between 64 and 512")
    manifest = json.loads((source_root / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "review-only-not-approved":
        raise ValueError("This diagnostic accepts only the unapproved source archive")
    selected = [family for family in manifest["families"] if family["id"] in SUPPORTED]
    if [family["id"] for family in selected] != list(SUPPORTED):
        raise ValueError("Required first-pass families missing or reordered")
    if output.resolve() == source_root.resolve() or source_root.resolve() in output.resolve().parents:
        raise ValueError("Review output must be outside the immutable source-art directory")
    output.mkdir(parents=True, exist_ok=True)
    observations = []
    for family in selected:
        if len(family["variants"]) != 6:
            raise ValueError("Expected six variants per family")
        for item in family["variants"]:
            rel = item["file"]
            target = source_root / rel
            raw = target.read_bytes()
            if hashlib.sha256(raw).hexdigest() != item["sha256"]:
                raise ValueError(f"Source file checksum mismatch: {rel}")
            with Image.open(target) as loaded:
                src = loaded.convert("RGB")
            if list(src.size) != item["size"]:
                raise ValueError(f"Source dimensions mismatch: {rel}")
            studied = feather_opposite_edges(src)
            source_gap = edge_error(src)
            study_gap = edge_error(studied)
            if study_gap != 0:
                raise AssertionError(f"Probe borders do not match exactly: {rel} ({study_gap})")
            label = item["id"]
            comparison(src, studied, tile_px, label).save(output / f"{label}-repeat.jpg", quality=90, subsampling=0)
            observations.append({
                "id": label,
                "source": rel,
                "sourceSha256": item["sha256"],
                "sourceSize": list(src.size),
                "sourceEdgeMeanRgbGap": source_gap,
                "studyEdgeMeanRgbGap": study_gap,
                "repeatImage": f"{label}-repeat.jpg",
                "approval": "unreviewed",
                "studyUse": "visual-probe-only",
            })
    if len(observations) != 12:
        raise AssertionError("Expected exactly twelve first-pass source probes")
    report = {
        "schemaVersion": 1,
        "collectionStatus": "unapproved",
        "runtimeUse": False,
        "lightingNeutral": False,
        "waterOrEmissiveMasksAuthored": False,
        "repeatTilePreviewPixels": tile_px,
        "caveats": [
            "Left = 3x3 repeated original; right = mechanically edge-feathered repeated study.",
            "Matching opposite edge colors do not certify believable seamless tiling.",
            "These source paintings retain authored highlights, occlusion and specular/reflection cues.",
            "Do not use the study images as production albedo or ship to the runtime.",
            "Do not infer material masks or light emitters from painted RGB.",
            "The final game must be reviewed at 320px/390px with the universal GPU lighting engine.",
        ],
        "variants": observations,
    }
    (output / "review-metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (output / "README.txt").write_text(
        "WyrmForge Ground Source QA — 12 UNAPPROVED ART STUDIES\n"
        "Each JPEG compares 3x3 source repetition (left) with an experimental edge study (right).\n"
        "This is a structural repeat study, NOT light-neutral albedo, normal maps, or production textures.\n"
        "Source files remain untouched. Review the images for repeated objects, smeared edges and scale.\n",
        encoding="utf-8",
    )
    return observations


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_ROOT)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tile-px", type=int, default=240)
    args = parser.parse_args()
    result = generate(args.source, args.output, args.tile_px)
    print(f"PASS: {len(result)} unapproved source-repeat comparisons written to {args.output}")


if __name__ == "__main__":
    main()
