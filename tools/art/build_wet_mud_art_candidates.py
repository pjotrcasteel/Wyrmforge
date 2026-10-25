#!/usr/bin/env python3
"""Create twelve Wet Mud art candidates (6 independent, 6 cross-compatible).

This is source-art production, not water geometry, relightable albedo, C# terrain,
a renderer or any G1–G5 milestone. All original painted puddle highlights remain.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from quilt_ground_material_study import SOURCES, load_family, patch_quilt
from build_grass_moss_art_candidates import (
    SEEDS, SIDE, PATCH, OVERLAP, CANDIDATES,
    build_preview, periodic_component, seam_metrics,
)
from build_grass_moss_compatible_bank import shared_edge_bank, edge_pair_error, bank_contact

FAMILY = "wet-mud"
TRAMPLED_REVIEW_ROLES = (
    "subtle-footpath", "heavily-worn", "cart-ruts",
    "muddier-wear", "broken-edge", "chaotic-wear",
)


def create(
    source_root: Path, output: Path, *,
    side: int = SIDE, source_px: int = 576, patch_size: int = PATCH,
    overlap: int = OVERLAP, candidates: int = CANDIDATES, border: int = 32, family: str = FAMILY,
) -> dict:
    source_root, output = source_root.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Never write generated art into the immutable source archive")
    if (side < 96 or side > 2048 or source_px < patch_size or border < 8
        or border > side // 8):
        raise ValueError("Invalid artwork dimension/edge-band configuration")
    if family not in ("wet-mud", "trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank"):
        raise ValueError("Unsupported source-art family")
    sources = load_family(source_root, family, source_px=source_px)
    if len(sources) != 6:
        raise ValueError("Six source paintings are required")

    # Build in memory before writing: a bad sample must not create partial exports.
    independent, records = [], []
    for number, seed in enumerate(SEEDS, 1):
        raw, choices = patch_quilt(
            sources, seed=seed, width=side, patch_size=patch_size,
            overlap=overlap, candidates=candidates,
            diversity_strength=.15 if family == "wet-mud" else .06,
            preferred_source=number - 1 if family in ("trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank") else None,
            preference_weight=.75 if family in ("trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank") else 0.0,
        )
        if family == "wet-mud" and set(choices) != set(range(6)):
            raise AssertionError("Wet Mud trials must consume all six source artworks")
        if family in ("trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank"):
            if choices.count(number - 1) <= max(choices.count(j) for j in range(6) if j != number - 1):
                raise AssertionError(f"{family} candidate {number} must have a uniquely dominant source painting")
        finished = periodic_component(raw)
        metrics = seam_metrics(finished)
        if metrics["meanRgbGapLeftRight"] or metrics["meanRgbGapTopBottom"]:
            raise AssertionError("Individual borders do not match")
        if metrics["leftInteriorGradientRatio"] > 2 or metrics["topInteriorGradientRatio"] > 2:
            raise AssertionError("Excessive boundary gradient in independent artwork")
        independent.append(finished)
        records.append({
            "candidate": number, "seed": seed, "size": [side, side],
            "reviewIntent": TRAMPLED_REVIEW_ROLES[number - 1] if family == "trampled-earth" else ("historic-stone-study" if family == "old-paving" else ("charred-soil-study" if family == "scorched-ground" else ("wetland-bank-study" if family == "marsh-wet-bank" else "wet-mud-variation"))),
            "visualRoleVerified": False,
            "dominantSourceIntent": number if family in ("trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank") else None,
            "sourceUsage": {f"{j + 1:02d}": choices.count(j) for j in range(6)},
            "dominantSourceActual": max(range(6), key=lambda j: choices.count(j)) + 1,
            "preferredSourcePatchShare": round(choices.count(number - 1) / len(choices), 4) if family != "wet-mud" else None,
            "independentSeam": metrics,
            "approved": False,
        })

    compatible = shared_edge_bank(independent, band=border)
    for a in compatible:
        for b in compatible:
            if any(edge_pair_error(a, b).values()):
                raise AssertionError("Cross-variant shared edges do not match exactly")
    for art in compatible:
        metrics = seam_metrics(art)
        if metrics["leftInteriorGradientRatio"] > 2 or metrics["topInteriorGradientRatio"] > 2:
            raise AssertionError("Shared border transition is too harsh")
    output.mkdir(parents=True, exist_ok=True)

    for index, (original, compatible_art) in enumerate(zip(independent, compatible), 1):
        for label, pixels in (("INDEPENDENT", original), ("COMPATIBLE", compatible_art)):
            filename = f"{family}-{label}-ART-CANDIDATE-{index:02d}.png"
            Image.fromarray(pixels).save(output / filename, optimize=True)
            records[index - 1][label.lower()] = {
                "file": filename,
                "sha256": hashlib.sha256((output / filename).read_bytes()).hexdigest(),
                "matchesOtherCandidateEdges": label == "COMPATIBLE",
            }

    repeated = f"{family}-six-independent-2x2-UNAPPROVED.jpg"
    mixed = f"{family}-six-variants-3x3-UNAPPROVED.jpg"
    build_preview([Image.fromarray(art) for art in independent], family_label=family.replace("-", " ").title()).save(output / repeated, quality=91)
    bank_contact(compatible).save(output / mixed, quality=91, subsampling=0)
    role_review = None
    if family == "trampled-earth":
        thumb, margin, label_height = 224, 16, 36
        sheet = Image.new("RGB", (3 * thumb + 4 * margin, 2 * (thumb + label_height) + 3 * margin), "#17191b")
        painter = ImageDraw.Draw(sheet)
        for index, (art, role) in enumerate(zip(independent, TRAMPLED_REVIEW_ROLES)):
            x = margin + (index % 3) * (thumb + margin)
            y = margin + (index // 3) * (thumb + label_height + margin)
            sheet.paste(Image.fromarray(art).resize((thumb, thumb), Image.Resampling.BOX), (x, y))
            painter.text((x + 3, y + thumb + 8), f"{index + 1:02d} {role} [UNVERIFIED]", fill="#e6e0d7")
        role_review = "trampled-earth-six-visual-roles-UNAPPROVED.jpg"
        sheet.save(output / role_review, quality=92, subsampling=0)

    report = {
        "schemaVersion": 1,
        "family": family,
        "status": "unapproved-artwork",
        "sourceCount": 6,
        "independentArtCount": 6,
        "crossCompatibleArtCount": 6,
        "identicalCrossTileEdgeComparisons": 72,
        "compatibleEdgeMeanRgbGap": 0,
        "sharedBoundaryBandPixels": border,
        "lightingEngineTouched": False,
        "rendererIntegration": False,
        "runtimeUse": False,
        "sourceArtworkUnchanged": True,
        "waterGeometryAuthored": False,
        "neutralDiffuseAuthored": False,
        "physicalMaterialMapsAuthored": False,
        "warning": "Original painted details remain embedded in these candidate RGBs. Matching edges do not prove non-repetition, neutral albedo, scene-light compatibility or user art approval.",
        "variants": records,
        "independentReview": repeated,
        "mixedVariantReview": mixed,
        "semanticRoleReview": role_review,
    }
    (output / f"{family}-art-candidates.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS: six independent and six mutually compatible source-art candidates, 72 ordered edge pairs; no game changes.")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCES)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    create(args.source, args.output)
