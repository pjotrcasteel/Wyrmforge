#!/usr/bin/env python3
"""Source-art-only Grass/Moss cross-variant tile bank, NOT a game terrain system.

Makes SIX mutually edge-compatible review tiles by sharing a 32-pixel peripheral
sample band while leaving the central authored texture from each original candidate.
This is a *review technique*; common-edge motifs can look stamped at map scale.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from build_grass_moss_art_candidates import build as build_candidates, SIDE, seam_metrics

BAND = 32
PATTERN = (0, 1, 2, 3, 4, 5, 2, 0, 3)


def shared_edge_bank(tiles: list[np.ndarray], band: int = BAND) -> list[np.ndarray]:
    if len(tiles) != 6 or any(i.shape != tiles[0].shape or i.ndim != 3 or i.shape[2] != 3 for i in tiles):
        raise ValueError("Require six RGB tiles of equal dimensions")
    side = tiles[0].shape[0]
    if tiles[0].shape[1] != side or not 8 <= band <= side // 8:
        raise ValueError("Invalid shared-border art study size")
    # Base #01's already periodic edge becomes the shared visual boundary.
    yy, xx = np.indices((side, side))
    distance = np.minimum.reduce((xx, yy, side - 1 - xx, side - 1 - yy)).astype(np.float32)
    amount = np.clip(distance / band, 0, 1)
    amount = amount * amount * (3 - 2 * amount)
    common = tiles[0].astype(np.float32)
    bank = [
        np.rint(np.clip(common * (1 - amount[..., None]) + tile.astype(np.float32) * amount[..., None], 0, 255)).astype(np.uint8)
        for tile in tiles
    ]
    for tile in bank:
        if not np.array_equal(tile[:, 0], tiles[0][:, 0]) or not np.array_equal(tile[0], tiles[0][0]):
            raise AssertionError("Bank variants must inherit the exact common outer perimeter")
    return bank


def edge_pair_error(a: np.ndarray, b: np.ndarray) -> dict:
    return {
        "rightIntoLeftMeanRgbGap": float(np.abs(a[:, -1].astype(np.int16) - b[:, 0]).mean()),
        "bottomIntoTopMeanRgbGap": float(np.abs(a[-1].astype(np.int16) - b[0]).mean()),
    }


def bank_contact(tiles: list[np.ndarray]) -> Image.Image:
    # 3x3 arranged tiles, different in every cardinal neighbour, with no lighting/actor mockup.
    side = tiles[0].shape[0]
    canvas = Image.new("RGB", (side * 3, side * 3))
    for n, idx in enumerate(PATTERN):
        canvas.paste(Image.fromarray(tiles[idx]), ((n % 3) * side, (n // 3) * side))
    return canvas.resize((900, 900), Image.Resampling.BOX)


def build(source_root: Path, output: Path) -> dict:
    source_root, output = source_root.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Art review files must not overwrite immutable source art")
    # Build and validate the six individual, source-hash-locked paintings first.
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as temporary:
        existing = Path(temporary)
        base = build_candidates(source_root, existing)
        if len(base["variants"]) != 6:
            raise ValueError("Six individual candidates required")
        original = [
            np.asarray(Image.open(existing / entry["file"]).convert("RGB")).copy()
            for entry in base["variants"]
        ]
    bank = shared_edge_bank(original, BAND)
    for left in bank:
        for right in bank:
            if any(edge_pair_error(left, right).values()):
                raise AssertionError("Mixed candidate borders are incompatible")
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for i, image in enumerate(bank, 1):
        metrics = seam_metrics(image)
        if metrics["leftInteriorGradientRatio"] > 2 or metrics["topInteriorGradientRatio"] > 2:
            raise AssertionError("Art bank boundary has an excessive pixel-detail jump")
        filename = f"grass-moss-BANK-CANDIDATE-{i:02d}.png"
        Image.fromarray(image).save(output / filename, optimize=True)
        records.append({
            "candidate": i,
            "file": filename,
            "sha256": hashlib.sha256((output / filename).read_bytes()).hexdigest(),
            "referenceCandidate": 1,
            "sharedBorderPixels": BAND,
            "exactlyInterchangeableWithAllSixAtPixelBoundary": True,
            "visibleRepeatApproved": False,
            "shipped": False,
        })
    comparison_file = "grass-moss-cross-variant-3x3-UNAPPROVED.jpg"
    bank_contact(bank).save(output / comparison_file, quality=91, subsampling=0)
    report = {
        "schemaVersion": 1,
        "status": "SOURCE-ART-ONLY; NOT APPROVED",
        "family": "grass-moss",
        "candidateCount": 6,
        "runtimeUse": False,
        "lightingMilestonesTouched": [],
        "pairedEdgePixelTests": 6 * 6 * 2,
        "maxObservedMeanRgbGap": 0,
        "sharedBorderSource": "First source-backed, already periodic Grass/Moss art candidate",
        "drawback": "Identical peripheral motifs can still expose a subtle 900px grid. Human artistic inspection and physical albedo authoring remain required.",
        "interchangeableCandidates": records,
        "composition": list(PATTERN),
        "review": comparison_file,
    }
    (output / "grass-moss-compatibility-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS: six art variants with 72 exact mixed-neighbour comparisons; no gameplay or lighting changes")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=None)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    from quilt_ground_material_study import SOURCES
    build(args.source or SOURCES, args.output)
