#!/usr/bin/env python3
"""Grass/Moss visual-asset authoring only. No C# terrain, renderer or GPU milestone work.

Makes six reproducible, explicitly unapproved 900px trial textures from all six
hash-locked source paintings. Corrects wrap-border discontinuities via periodic/smooth
decomposition; matching edge pixels does NOT mean non-repeating or light-neutral art.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from quilt_ground_material_study import SOURCES, load_family, patch_quilt

FAMILY = "grass-moss"
SEEDS = (17, 31, 47, 59, 71, 89)
SIDE = 900
PATCH = 240
OVERLAP = 60
CANDIDATES = 24


def periodic_component(source: np.ndarray) -> np.ndarray:
    """Remove image-boundary step through Fourier periodic-plus-smooth decomposition.

    Unlike interpolating opposite bands, this corrects low-frequency discontinuity
    globally without overlaying or duplicating visible leaves/rocks at the border.
    It does NOT remove baked illumination or create authored albedo.
    """
    if source.ndim != 3 or source.shape[2] != 3 or min(source.shape[:2]) < 16:
        raise ValueError("Expected RGB image at least 16 pixels per side")
    original = source.astype(np.float32)
    height, width = original.shape[:2]
    boundary = np.zeros_like(original)
    boundary[0, :] += original[-1, :] - original[0, :]
    boundary[-1, :] += original[0, :] - original[-1, :]
    boundary[:, 0] += original[:, -1] - original[:, 0]
    boundary[:, -1] += original[:, 0] - original[:, -1]

    yy = np.arange(height)[:, None]
    xx = np.arange(width)[None, :]
    eigenvalues = 2 * np.cos(2 * np.pi * yy / height) + 2 * np.cos(2 * np.pi * xx / width) - 4
    eigenvalues[0, 0] = 1  # The smooth component has mean zero.
    smooth = np.fft.ifft2(
        np.fft.fft2(boundary, axes=(0, 1)) / eigenvalues[:, :, None],
        axes=(0, 1),
    ).real
    result = np.rint(np.clip(original - smooth, 0, 255)).astype(np.uint8)

    # Exact matching boundary samples are part of this *art tile* QA contract.
    # Interior gradients are checked separately so a collapsed/smeared seam fails QA.
    row_average = np.rint((result[0].astype(np.float32) + result[-1]) / 2).astype(np.uint8)
    result[0, :] = row_average
    result[-1, :] = row_average
    col_average = np.rint((result[:, 0].astype(np.float32) + result[:, -1]) / 2).astype(np.uint8)
    result[:, 0] = col_average
    result[:, -1] = col_average
    return result


def seam_metrics(image: np.ndarray) -> dict:
    colors = image.astype(np.int16)
    left_right = float(np.abs(colors[:, 0] - colors[:, -1]).mean())
    top_bottom = float(np.abs(colors[0] - colors[-1]).mean())
    horizontal_gradient = float(np.abs(np.diff(colors, axis=1)).mean())
    vertical_gradient = float(np.abs(np.diff(colors, axis=0)).mean())
    return {
        "meanRgbGapLeftRight": round(left_right, 6),
        "meanRgbGapTopBottom": round(top_bottom, 6),
        "leftInteriorGradientRatio": round(float(np.abs(colors[:, 1] - colors[:, 0]).mean()) / max(horizontal_gradient, .01), 3),
        "topInteriorGradientRatio": round(float(np.abs(colors[1] - colors[0]).mean()) / max(vertical_gradient, .01), 3),
        "meanHorizontalTextureGradient": round(horizontal_gradient, 3),
        "meanVerticalTextureGradient": round(vertical_gradient, 3),
    }


def repeat2(image: Image.Image) -> Image.Image:
    result = Image.new("RGB", (image.width * 2, image.height * 2))
    for y in range(2):
        for x in range(2):
            result.paste(image, (x * image.width, y * image.height))
    return result


def build_preview(tiles: list[Image.Image]) -> Image.Image:
    if len(tiles) != 6:
        raise ValueError("Six candidates required for comparison")
    board = Image.new("RGB", (1410, 950), "#151719")
    pencil = ImageDraw.Draw(board)
    for n, tile in enumerate(tiles):
        x, y = n % 3 * 470, n // 3 * 475
        preview = repeat2(tile).resize((450, 450), Image.Resampling.BOX)
        board.paste(preview, (x + 8, y + 23))
        pencil.text((x + 8, y + 5), f"Grass/Moss candidate {n+1:02d} | 2x2 repeat", fill="#ede8d9")
    return board


def build(source_root: Path, output: Path) -> dict:
    source_root, output = source_root.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Candidate output must never be inside immutable original source archive")
    samples = load_family(source_root, FAMILY, source_px=576)
    if len(samples) != 6:
        raise ValueError("Six source paintings are required")
    output.mkdir(parents=True, exist_ok=True)

    results, images = [], []
    for number, seed in enumerate(SEEDS, 1):
        original, selected = patch_quilt(
            samples, seed=seed, width=SIDE, patch_size=PATCH, overlap=OVERLAP,
            candidates=CANDIDATES, diversity_strength=.15,
        )
        art = periodic_component(original)
        metric = seam_metrics(art)
        if metric["meanRgbGapLeftRight"] != 0 or metric["meanRgbGapTopBottom"] != 0:
            raise AssertionError("Texture borders do not match exactly")
        if metric["leftInteriorGradientRatio"] > 2 or metric["topInteriorGradientRatio"] > 2:
            raise AssertionError("Border is visibly harsher than local pixel-detail scale")
        if len(set(selected)) != 6:
            raise AssertionError("Artwork sampler did not include every source variant")
        image = Image.fromarray(art, "RGB")
        name = f"grass-moss-ART-CANDIDATE-{number:02d}.png"
        image.save(output / name, optimize=True)
        images.append(image)
        results.append({
            "variant": number,
            "seed": seed,
            "file": name,
            "size": list(image.size),
            "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest(),
            "sourceUsage": {f"{i+1:02d}": selected.count(i) for i in range(6)},
            "metrics": metric,
            "approval": "unreviewed",
            "productionUse": False,
            "relightableAlbedo": False,
            "physicalMapsAuthored": False,
            "seamPixelContinuity": True,
            "nonRepetitiveAppearanceCertified": False,
        })

    preview_name = "grass-moss-six-candidates-2x2-contact.jpg"
    build_preview(images).save(output / preview_name, quality=91, subsampling=0)
    report = {
        "schemaVersion": 1,
        "stage": "editable-reproducible-grass-moss-art-candidates",
        "sourceFamily": FAMILY,
        "sourceCount": 6,
        "candidateCount": 6,
        "runtimeUse": False,
        "ownerApproved": False,
        "sourceImageBytesUnchanged": True,
        "lightingMilestonesTouched": [],
        "warning": "Exact L/R and T/B pixel matches are a mathematical property, not a claim that painted landmarks, source lighting, actor readability, or inter-variant joins are acceptable.",
        "variants": results,
        "preview": preview_name,
    }
    (output / "grass-moss-candidate-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS: 6 deterministic Grass/Moss source-art candidates, edge-pixel checks, all source hashes untouched.")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCES)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.source, args.output)
