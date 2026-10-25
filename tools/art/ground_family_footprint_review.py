#!/usr/bin/env python3
"""Mobile-footprint art study for all 36 Wet Forest concepts; NO runtime material exports."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
VIEWS = ((320, 568), (390, 844))
FAMILY_IDS = (
    "grass-moss", "wet-mud", "old-paving",
    "trampled-earth", "scorched-ground", "marsh-wet-bank",
)


def load_collection(root: Path) -> list[tuple[dict, list[Image.Image]]]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    roles = json.loads((root / "material-family-roles.json").read_text(encoding="utf-8"))
    if manifest.get("status") != "review-only-not-approved":
        raise ValueError("Only unapproved source collections may be previewed")
    if roles.get("status") != manifest["status"] or roles.get("runtimeEligible") is not False:
        raise ValueError("Production role definitions must remain review-only")
    if roles.get("sourceEntryCount") != 36 or roles.get("variantApproval") != "unreviewed":
        raise ValueError("Role document must explicitly cover 36 unapproved candidates")
    if [f["id"] for f in manifest["families"]] != list(FAMILY_IDS):
        raise ValueError("Unexpected or reordered source families")
    if [r["id"] for r in roles["roles"]] != list(FAMILY_IDS):
        raise ValueError("Role catalog must match exactly the six source families")

    images = []
    for family, role in zip(manifest["families"], roles["roles"]):
        if len(family["variants"]) != 6:
            raise ValueError("Six variants per family required")
        if role.get("role") not in (
            "continuous-substrate-candidate", "historical-site-footprint-candidate",
            "authoritative-road-detail-candidate", "fire-lineage-corruption-candidate",
            "wetland-bank-reference-candidate",
        ):
            raise ValueError("Unknown art-production role")
        if role.get("baseLayerEligibleAfterApproval") is True and family["id"] not in ("grass-moss", "wet-mud"):
            raise ValueError("Only the two full-bleed families may become continuous base layers")
        if family["id"] not in ("grass-moss", "wet-mud") and role.get("requiresManualFootprint") is not True:
            raise ValueError("Patch/path/scorch/marsh sources must require separate semantic footprints")
        family_images = []
        for idx, variant in enumerate(family["variants"], 1):
            expected = f"{family['id']}/variant-{idx:02d}.webp"
            if (variant.get("file") != expected or variant.get("id") != f"{family['id']}-{idx:02d}"
                    or variant.get("approval") != "unreviewed"
                    or variant.get("seamless") is not False
                    or variant.get("lightNeutral") is not False):
                raise ValueError(f"Unexpected source identity or approval: {expected}")
            path = (root / expected).resolve()
            if not path.is_relative_to(root.resolve()):
                raise ValueError("Source art path escapes archive")
            if hashlib.sha256(path.read_bytes()).hexdigest() != variant["sha256"]:
                raise ValueError(f"Source bytes changed: {expected}")
            with Image.open(path) as image:
                if list(image.size) != variant["size"]:
                    raise ValueError(f"Source dimensions changed: {expected}")
                family_images.append(image.convert("RGB"))
        images.append((role, family_images))
    return images


def scaled_original(image: Image.Image, size: int) -> Image.Image:
    """Keep whole original painting visible; never erase dark matte or claim tileable edges."""
    out = Image.new("RGB", (size, size), "#1b1b1b")
    scaled = ImageOps.contain(image, (size, size), method=Image.Resampling.BOX)
    out.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return out


def four_repeats(image: Image.Image, footprint: int) -> Image.Image:
    scaled = scaled_original(image, footprint)
    board = Image.new("RGB", (footprint * 2, footprint * 2))
    for y in range(2):
        for x in range(2):
            board.paste(scaled, (x * footprint, y * footprint))
    return board


def build_board(role: dict, variants: list[Image.Image], view: tuple[int, int]) -> Image.Image:
    width, height = view
    if view not in VIEWS or len(variants) != 6:
        raise ValueError("Use one of the two portrait review sizes and all six originals")

    pad = 12 if width == 390 else 8
    row_height = 164 if width == 390 else 124
    footprint = 112
    micro = 48 if width == 390 else 28
    top = 66 if width == 390 else 48
    col_width = (width - 3 * pad) // 2
    canvas = Image.new("RGB", (width, height), "#151616")
    pen = ImageDraw.Draw(canvas)
    pen.text((pad, 7), f"{role['id']} | {role['role']}", fill="#f3ebdc")
    pen.text((pad, 24), "6 UNAPPROVED originals | unlit | not an in-game screenshot", fill="#bcb7ae")
    if width == 390:
        pen.text((pad, 41), "112px footprint / smaller readability check", fill="#aeb2b3")

    for index, original in enumerate(variants):
        col, row = index % 2, index // 2
        x, y = pad + col * (col_width + pad), top + row * row_height
        base = scaled_original(original, footprint)
        canvas.paste(base, (x, y))
        canvas.paste(scaled_original(original, micro), (x + footprint + 4, y))
        pen.text((x, y + footprint + 4), f"variant-{index+1:02d}", fill="#e0ded6")
        if width == 390:
            pen.text((x, y + footprint + 18), "NO tile guarantee", fill="#a4a4a4")

    footer_top = top + row_height * 3 + 6
    pen.text((pad, footer_top), "2x2 RAW REPEAT (shows matte & recognisable seams)", fill="#d6ba91")
    repeat_side = 59 if width == 320 else 82
    for col, idx in enumerate((0, 3)):
        x = pad + col * (col_width + pad)
        thumb = four_repeats(variants[idx], repeat_side)
        y = footer_top + 17
        if y + thumb.height > height - 6:
            raise ValueError("Review footprint does not fit QA viewport")
        canvas.paste(thumb, (x, y))
    return canvas


def build(root: Path, output: Path) -> list[dict]:
    root, output = root.resolve(), output.resolve()
    if output == root or root in output.parents:
        raise ValueError("Never generate review data inside the immutable source directory")
    entries = load_collection(root)
    output.mkdir(parents=True, exist_ok=True)
    reviews = []
    for role, variants in entries:
        for size in VIEWS:
            board = build_board(role, variants, size)
            file = f"family-{role['id']}-{size[0]}x{size[1]}-UNAPPROVED.png"
            board.save(output / file)
            reviews.append({
                "family": role["id"],
                "role": role["role"],
                "viewport": list(size),
                "sourceImagesReviewed": 6,
                "artworkApproved": False,
                "seamlessProven": False,
                "lightNeutral": False,
                "usedInGame": False,
                "preview": file,
                "sha256": hashlib.sha256((output / file).read_bytes()).hexdigest(),
            })
    if len(reviews) != 12:
        raise AssertionError("Expected 6 families × 2 mobile viewports")
    (output / "family-role-review.json").write_text(json.dumps({
        "stage": "mobile-footprint-source-image-screening",
        "status": "UNAPPROVED",
        "sourceArtCount": 36,
        "reviewImages": reviews,
        "warning": "A source-only sizing and raw-repeat diagnostic. It does not represent scene lighting, physically authored materials, C# paths or actual device captures.",
    }, indent=2) + "\n", encoding="utf-8")
    print("PASS: twelve source-only family review sheets (six families × 320/390 portraits), all 36 hashes verified")
    return reviews


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.source, args.output)
