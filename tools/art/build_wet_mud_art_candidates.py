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
from PIL import Image

from quilt_ground_material_study import SOURCES, load_family, patch_quilt
from build_grass_moss_art_candidates import (
    SEEDS, SIDE, PATCH, OVERLAP, CANDIDATES,
    build_preview, periodic_component, seam_metrics,
)
from build_grass_moss_compatible_bank import shared_edge_bank, edge_pair_error, bank_contact

FAMILY = "wet-mud"


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
    if family not in ("wet-mud", "trampled-earth"):
        raise ValueError("Unsupported source-art family")
    sources = load_family(source_root, family, source_px=source_px)
    if len(sources) != 6:
        raise ValueError("Six source paintings are required")

    # Build in memory before writing: a bad sample must not create partial exports.
    independent, records = [], []
    for number, seed in enumerate(SEEDS, 1):
        raw, choices = patch_quilt(
            sources, seed=seed, width=side, patch_size=patch_size,
            overlap=overlap, candidates=candidates, diversity_strength=.15,
        )
        if set(choices) != set(range(6)):
            raise AssertionError("Each trial must consume all six source artworks")
        finished = periodic_component(raw)
        metrics = seam_metrics(finished)
        if metrics["meanRgbGapLeftRight"] or metrics["meanRgbGapTopBottom"]:
            raise AssertionError("Individual borders do not match")
        if metrics["leftInteriorGradientRatio"] > 2 or metrics["topInteriorGradientRatio"] > 2:
            raise AssertionError("Excessive boundary gradient in independent artwork")
        independent.append(finished)
        records.append({
            "candidate": number, "seed": seed, "size": [side, side],
            "sourceUsage": {f"{j + 1:02d}": choices.count(j) for j in range(6)},
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

    repeated = "wet-mud-six-independent-2x2-UNAPPROVED.jpg"
    mixed = "wet-mud-six-variants-3x3-UNAPPROVED.jpg"
    build_preview([Image.fromarray(art) for art in independent]).save(output / repeated, quality=91)
    bank_contact(compatible).save(output / mixed, quality=91, subsampling=0)
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
