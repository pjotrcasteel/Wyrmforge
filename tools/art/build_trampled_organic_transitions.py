#!/usr/bin/env python3
"""Art-only organic, detail-preserving cross-variant transitions for Trampled Earth.

Input: six UNAPPROVED full RGB path strips from a source-backed segment bank.
Output: six derived PNG review compositions, low-res preview, comparison, provenance.
This DOES NOT create road/world geometry, albedo, masks for runtime or lighting.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image, ImageDraw

ROLES = (
    "subtle-footpath", "heavy-wear", "cart-ruts", "muddy-wear", "broken-edges", "chaotic-wear"
)
STUDY_SUFFIX = "three-segment-strip.png"


def _data(source: Path, name: str) -> bytes:
    if source.is_dir():
        return (source / name).read_bytes()
    with zipfile.ZipFile(source) as archive:
        return archive.read(name)


def load_unapproved(source: Path) -> tuple[list[Image.Image], list[dict]]:
    metadata = json.loads(_data(source, "manifest.json"))
    if metadata.get("status") != "unapproved-art-study":
        raise ValueError("Review bank must be explicitly unapproved")
    records = metadata.get("variants")
    if not isinstance(records, list) or len(records) != 6:
        raise ValueError("Expected exactly six source-backed variant strips")
    images, origins = [], []
    dimensions = None
    for number, role in enumerate(ROLES, 1):
        entry = records[number - 1]
        expected = f"{number:02d}-{role}-{STUDY_SUFFIX}"
        if (entry.get("role") != role or entry.get("strip") != expected
                or entry.get("approved") is not False or entry.get("gameIntegration") is not False):
            raise ValueError(f"Invalid unapproved role/strip: {role}")
        data = _data(source, expected)
        digest = hashlib.sha256(data).hexdigest()
        if entry.get("sha256") != digest:
            raise ValueError("Source-backed review art hash does not match its bank manifest")
        with Image.open(io.BytesIO(data)) as opened:
            if opened.mode != "RGB":
                raise ValueError("RGB source-backed strips required")
            art = opened.copy()
        if art.width < 128 or art.height < art.width * 2:
            raise ValueError("Strips must contain multiple vertical art segments")
        if dimensions is not None and art.size != dimensions:
            raise ValueError("All six strips must share dimensions")
        dimensions = art.size
        images.append(art)
        origins.append({"role": role, "file": expected, "sha256": digest, "size": list(art.size)})
    return images, origins


def boundary(width: int, height: int, seed: int) -> np.ndarray:
    """Continuous irregular boundary. No independent per-pixel noise or checkerboard dither."""
    x = np.arange(width, dtype=np.float64) / (width - 1)
    phase = .29 + seed * .173
    shape = (.115 * np.sin(2 * math.pi * (1.15 * x + phase))
             + .047 * np.sin(2 * math.pi * (2.8 * x + .33 * seed))
             + .018 * np.cos(2 * math.pi * (5.5 * x - .21 * seed)))
    return np.clip(height * (.49 + shape), height * .27, height * .72)


def compose(first: Image.Image, second: Image.Image, seed: int) -> tuple[Image.Image, Image.Image, dict]:
    if first.size != second.size or first.mode != "RGB" or second.mode != "RGB":
        raise ValueError("Same-sized RGB source images required")
    width, height = first.size
    edge = boundary(width, height, seed)
    y = np.arange(height, dtype=np.float32)[:, None]
    # Only a 2-pixel anti-alias band blends RGB; all other pixels are source exact.
    delta = y - edge[None, :]
    coverage = np.clip((delta + 1.0) / 2.0, 0, 1).astype(np.float32)
    alpha = coverage[:, :, None]
    a = np.asarray(first, dtype=np.uint8)
    b = np.asarray(second, dtype=np.uint8)
    mixed = np.clip(np.rint(a.astype(np.float32) * (1 - alpha) + b.astype(np.float32) * alpha), 0, 255).astype(np.uint8)
    binary = Image.fromarray(np.where(coverage >= .5, 255, 0).astype(np.uint8), mode="L")
    transition = np.count_nonzero((coverage > 0) & (coverage < 1))
    assert np.array_equal(mixed[:int(height*.20)], a[:int(height*.20)])
    assert np.array_equal(mixed[int(height*.80):], b[int(height*.80):])
    report = {
        "minBoundaryRow": int(np.min(edge)), "maxBoundaryRow": int(np.max(edge)),
        "antialiasPixels": int(transition), "antialiasFraction": round(transition / (width * height), 7),
        "noDitherOrCheckerboard": True, "worldShapeAuthored": False,
        "outputIsTileable": False, "relightableMaterial": False,
    }
    return Image.fromarray(mixed, mode="RGB"), binary, report


def build(source: Path, output: Path) -> dict:
    source = source.resolve()
    output = output.resolve()
    if source.is_dir() and (output == source or source in output.parents):
        raise ValueError("Cannot write inside review source bank")
    images, origins = load_unapproved(source)
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    tile_w, tile_h, margin = 240, 600, 18
    compare = Image.new("RGB", (6 * (tile_w + margin) + margin, tile_h + 72), "#181b18")
    painter = ImageDraw.Draw(compare)
    mobile = Image.new("RGB", (6 * (180 + margin) + margin, 484), "#181b18")
    mobile_pen = ImageDraw.Draw(mobile)
    for i, start in enumerate(ROLES):
        finish = ROLES[(i + 1) % 6]
        result, mask, stats = compose(images[i], images[(i+1) % 6], i+1)
        stem = f"{i+1:02d}-{start}-to-{finish}"
        name = f"{stem}-ORGANIC-V3-UNAPPROVED.png"
        mask_name = f"{stem}-ART-BOUNDARY-QA.png"
        thumb_name = f"{stem}-MOBILE-240.png"
        result.save(output / name, optimize=True)
        mask.save(output / mask_name, optimize=True)
        result.resize((240, 600), Image.Resampling.LANCZOS).save(output / thumb_name)
        x = margin + i * (tile_w + margin)
        painter.text((x, 14), start, fill="#f0e9da")
        painter.text((x, 32), f"to {finish}", fill="#d5bda0")
        compare.paste(result.resize((tile_w, tile_h), Image.Resampling.LANCZOS), (x, 58))
        mx = margin + i * (180 + margin)
        mobile_pen.text((mx, 14), f"{i+1:02d} {start}", fill="#eae3d7")
        mobile.paste(result.resize((180, 432), Image.Resampling.LANCZOS), (mx, 36))
        entries.append({"from": start, "to": finish, "seed": i+1,
                        "file": name, "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest(),
                        "boundaryQA": mask_name, "mobilePreview": thumb_name, "approved": False,
                        **stats})
    sheet = "TRAMPLED-EARTH-ORGANIC-TRANSITIONS-V3-REVIEW.png"
    compare.save(output / sheet, optimize=True)
    mobile_sheet = "TRAMPLED-EARTH-ORGANIC-V3-MOBILE-REVIEW.png"
    mobile.save(output / mobile_sheet, optimize=True)
    report = {
        "schemaVersion": 1, "status": "unapproved-art-study", "method": "source-backed organic contiguous two-pixel-antialiased boundary",
        "source": origins, "transitions": entries,
        "artOnly": True, "runtimeUse": False, "worldGeometryAuthored": False, "lightingEngineTouched": False,
        "sourceImagesUnmodified": True, "reviewSheet": sheet, "mobileSheet": mobile_sheet,
        "warning": "Visible discontinuities and painterly baked lighting may remain. No artist approval, no automatic tiling."
    }
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bank", type=Path, required=True, help="Source-backed unapproved segment bank directory or ZIP")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = build(args.bank, args.output)
    print(f"Exported {len(report['transitions'])} organic art-only transition studies: {args.output}")
