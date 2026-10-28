#!/usr/bin/env python3
"""Source-only artwork QA for all 36 Wet Forest concepts. Produces evidence, never approvals."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
FAMILIES = (
    "grass-moss", "wet-mud", "old-paving", "trampled-earth",
    "scorched-ground", "marsh-wet-bank",
)


def analyze_image(image: Image.Image, *, sample_side: int = 256) -> dict:
    """Obvious numerical QA, not a classifier of texture quality or surface physics.

    A source can have low seam gap and STILL be completely unsuitable as a repeated tile
    (e.g., a black matte around a recognizable isolated ground island).
    """
    rgb = image.convert("RGB")
    rgb.thumbnail((sample_side, sample_side), Image.Resampling.BOX)
    w, h = rgb.size
    if w < 8 or h < 8:
        raise ValueError("Insufficient image resolution for edge audit")
    px = rgb.load()
    border_x = 0
    border_y = 0
    for y in range(h):
        left, right = px[0, y], px[w - 1, y]
        border_x += sum(abs(a - b) for a, b in zip(left, right))
    for x in range(w):
        top, bottom = px[x, 0], px[x, h - 1]
        border_y += sum(abs(a - b) for a, b in zip(top, bottom))

    # Detect apparent near-black backgrounds without claiming every black pixel is matte.
    # Larger 7% frame avoids classifying a single unusually dark image edge.
    band = max(1, round(min(w, h) * 0.07))
    x0, x1 = round(w * .25), round(w * .75)
    y0, y1 = round(h * .25), round(h * .75)
    near_black_frame = frame_count = near_black_center = center_count = 0
    for y in range(h):
        for x in range(w):
            color = px[x, y]
            near_black = max(color) <= 32
            if x < band or x >= w - band or y < band or y >= h - band:
                frame_count += 1
                near_black_frame += int(near_black)
            if x0 <= x < x1 and y0 <= y < y1:
                center_count += 1
                near_black_center += int(near_black)
    frame_fraction = near_black_frame / frame_count
    center_fraction = near_black_center / center_count
    matte_warning = frame_fraction >= .35 and frame_fraction - center_fraction >= .20
    return {
        "sourceHorizontalMeanRgbEdgeGap": round(border_x / (3 * h), 3),
        "sourceVerticalMeanRgbEdgeGap": round(border_y / (3 * w), 3),
        "nearBlackFrameFraction": round(frame_fraction, 3),
        "nearBlackCenterFraction": round(center_fraction, 3),
        "possibleIsolatedPatchBlackMatte": matte_warning,
        "analysisPixels": [w, h],
    }


def audit(source: Path, out: Path) -> dict:
    source = source.resolve()
    out = out.resolve()
    if out == source or source in out.parents:
        raise ValueError("Audit output cannot be inside immutable source archive")
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "review-only-not-approved":
        raise ValueError("Source collection must stay unapproved")
    if tuple(f["id"] for f in manifest["families"]) != FAMILIES:
        raise ValueError("Unexpected source-art families")
    rows = []
    for family in manifest["families"]:
        if len(family["variants"]) != 6:
            raise ValueError(f"Expected exactly six variants of {family['id']}")
        for number, entry in enumerate(family["variants"], 1):
            rel = f"{family['id']}/variant-{number:02d}.webp"
            if entry["file"] != rel or entry["approval"] != "unreviewed":
                raise ValueError(f"Unexpected identity or approval for {rel}")
            raw = (source / rel).read_bytes()
            if hashlib.sha256(raw).hexdigest() != entry["sha256"]:
                raise ValueError(f"Source hash mismatch for {rel}")
            with Image.open(source / rel) as img:
                dimensions = list(img.size)
                stats = analyze_image(img)
            if dimensions != entry["size"]:
                raise ValueError(f"Stored dimensions differ for {rel}")
            rows.append({
                "id": entry["id"],
                "path": rel,
                "size": dimensions,
                "sha256": entry["sha256"],
                **stats,
                "sourceApproved": False,
                "seamlesslyTileable": "not verified",
                "relightableMaterial": "not authored",
            })
    if len(rows) != 36:
        raise ValueError("Expected exactly 36 candidates")

    output = {
        "schemaVersion": 1,
        "purpose": "source-geometry-and-matte-screening",
        "sourceApproval": "none",
        "runtimeMaterialsCreated": 0,
        "caveats": [
            "Numerical edge gaps do not prove a texture can tile: a black matte can fake a low gap.",
            "Near-black matte screening is heuristic and may flag genuine dark soil.",
            "Baked reflections, fire/emission, rock relief and vegetation need physically authored separate passes.",
            "Human review and actual shared GPU illumination / mobile scale tests remain mandatory.",
        ],
        "variants": rows,
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "source-audit.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Wet Forest — automated candidate source QA (unapproved)",
        "",
        "These checks are **indicators, not pass/fail judgements on art**. No files were",
        "edited, material maps were generated, or owner approvals were assigned.",
        "",
        "| Family | Variant | L/R edge gap | T/B edge gap | Near-black border | Possible matte |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['id'].rsplit('-', 1)[0]} | {row['id'].rsplit('-', 1)[1]} | "
            f"{row['sourceHorizontalMeanRgbEdgeGap']:.1f} | "
            f"{row['sourceVerticalMeanRgbEdgeGap']:.1f} | "
            f"{row['nearBlackFrameFraction']:.1%} | "
            f"{'Review' if row['possibleIsolatedPatchBlackMatte'] else 'No obvious border cue'} |"
        )
    lines.extend(["", "Do not reinterpret low numerical gaps as an approved seamless or light-neutral map.", ""])
    (out / "source-audit.md").write_text("\n".join(lines), encoding="utf-8")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ARCHIVE)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = audit(args.source, args.output)
    n = sum(v["possibleIsolatedPatchBlackMatte"] for v in data["variants"])
    print(f"PASS: 36 immutable source images audited; {n} potential black-matte border warnings; no approvals assigned.")


if __name__ == "__main__":
    main()
