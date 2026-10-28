#!/usr/bin/env python3
"""Source-only Grass/Moss ↔ Wet Mud transition study. Not scene, lighting, C# geometry or material approval."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from quilt_ground_material_study import SOURCES, load_family, patch_quilt

PHONE_SIZES = ((320, 568), (390, 844))
BAYER4 = np.array([
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
], dtype=np.float32)
STUDY_VERSION = 1


def material_fraction(width: int, height: int, seed: int, feather_pixels: float = 38) -> np.ndarray:
    """Illustrative continuous ground mixture, NOT C# road/water/collision geometry."""
    if width < 32 or height < 32 or feather_pixels <= 0:
        raise ValueError("Invalid transition dimensions")
    yy, xx = np.mgrid[:height, :width].astype(np.float32)
    phase = (seed % 47) * 0.103
    edge = (width * .49
            + np.sin(yy * .010 + phase) * width * .17
            + np.sin(yy * .029 + phase * .7) * width * .05)
    return np.clip(.5 + (xx - edge) / feather_pixels, 0, 1).astype(np.float32)


def combine(grass: np.ndarray, mud: np.ndarray, fraction: np.ndarray, method: str) -> np.ndarray:
    if grass.shape != mud.shape or grass.ndim != 3 or grass.shape[2] != 3:
        raise ValueError("Both study materials must be equal-sized RGB arrays")
    if fraction.shape != grass.shape[:2] or not np.isfinite(fraction).all():
        raise ValueError("Material fraction shape or values invalid")
    if float(fraction.min()) < 0 or float(fraction.max()) > 1:
        raise ValueError("Material fraction must be in [0, 1]")
    if method == "hard":
        mud_select = fraction >= .5
        return np.where(mud_select[..., None], mud, grass).astype(np.uint8)
    if method == "soft":
        alpha = fraction[..., None]
        return np.rint(grass * (1 - alpha) + mud * alpha).clip(0, 255).astype(np.uint8)
    if method == "pixel-dither":
        # 4x4 ordered coverage: choose a whole source pixel; no blurred fantasy wetness.
        h, w = fraction.shape
        threshold = (BAYER4[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4] + .5) / 16
        return np.where((fraction >= threshold)[..., None], mud, grass).astype(np.uint8)
    raise ValueError("Unknown diagnostic blend method")


def sample_materials(source_root: Path, seed: int, viewport_height: int) -> tuple[np.ndarray, np.ndarray, dict]:
    # Same two source families in all three comparison columns.
    # More world-sized pixels than the view permits a center crop, not image stretching.
    quilt_side = max(900, viewport_height + 64)
    portraits = []
    provenance = {}
    for family in ("grass-moss", "wet-mud"):
        source_images = load_family(source_root, family, source_px=600)
        quilt, choices = patch_quilt(
            source_images, seed=seed * 19 + (1 if family == "grass-moss" else 2),
            width=quilt_side, patch_size=180, overlap=44, candidates=36,
            diversity_strength=.15,
        )
        portraits.append(quilt)
        provenance[family] = {f"{i+1:02d}": int(choices.count(i)) for i in range(6)}
    return portraits[0], portraits[1], provenance


def create_preview(grass: np.ndarray, mud: np.ndarray, seed: int, width: int, height: int) -> tuple[Image.Image, dict]:
    if (width, height) not in PHONE_SIZES:
        raise ValueError("Only approved QA viewport sizes are supported")
    if grass.shape != mud.shape or grass.ndim != 3 or grass.shape[2] != 3:
        raise ValueError("Expected matching source-only RGB quilts")
    if grass.shape[0] < height or grass.shape[1] < width:
        raise ValueError("Study source canvas too small; do not stretch source pixels")
    y0 = (grass.shape[0] - height) // 2
    x0 = (grass.shape[1] - width) // 2
    a = grass[y0:y0+height, x0:x0+width]
    b = mud[y0:y0+height, x0:x0+width]
    fraction = material_fraction(width, height, seed)
    modes = ("hard", "soft", "pixel-dither")
    gap, top, footer = 12, 44, 36
    canvas = Image.new("RGB", (width * 3 + 4 * gap, height + top + footer), "#151719")
    marker = ImageDraw.Draw(canvas)
    digests = {}
    for index, method in enumerate(modes):
        blended = combine(a, b, fraction, method)
        x = gap + index * (width + gap)
        canvas.paste(Image.fromarray(blended), (x, top))
        marker.text((x, 12), f"{method} | {width}x{height} | seed {seed}", fill="#e8e3d7")
        digests[method] = hashlib.sha256(blended.tobytes()).hexdigest()
    marker.text((gap, height + top + 13),
                "UNLIT SOURCE-ART COMPOSITION • NOT IN-GAME • NO PHYSICAL WATER MASK",
                fill="#d7a989")
    return canvas, {
        "viewport": [width, height],
        "seed": seed,
        "methods": list(modes),
        "sha256ByMode": digests,
        "fractionRange": [round(float(fraction.min()), 3), round(float(fraction.max()), 3)],
        "materialMaskType": "procedural-illustration-only",
        "runtimeUse": False,
        "gpuLightingUsed": False,
        "ownerApproved": False,
    }


def build(source_root: Path, output: Path, seeds: tuple[int, ...] = (17, 47)) -> list[dict]:
    source_root, output = source_root.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Review output must be outside the immutable original-art directory")
    if not seeds or len(set(seeds)) != len(seeds):
        raise ValueError("Seeds must be nonempty and distinct")
    # Require verified original collection before creating derived research JPEGs.
    collection = json.loads((source_root / "manifest.json").read_text(encoding="utf-8"))
    if collection["status"] != "review-only-not-approved":
        raise ValueError("Never treat candidate art as approved")
    output.mkdir(parents=True, exist_ok=True)
    report = []
    for seed in seeds:
        grass, mud, usage = sample_materials(source_root, seed, max(height for _, height in PHONE_SIZES))
        for width, height in PHONE_SIZES:
            image, observation = create_preview(grass, mud, seed, width, height)
            file_name = f"ground-transition-source-{width}x{height}-seed-{seed}.jpg"
            image.save(output / file_name, "JPEG", quality=93, subsampling=0)
            observation["preview"] = file_name
            observation["sourceVariantsSelected"] = usage
            report.append(observation)
    (output / "transition-study.json").write_text(json.dumps({
        "schemaVersion": STUDY_VERSION,
        "purpose": "isolated-full-resolution-ground-transition-research",
        "lightingIntegration": "none; use only the universal PR #332 shared renderer later",
        "csharpTerrainAuthority": "unchanged",
        "sourceArtApproval": "unreviewed",
        "warning": "No actual phone capture, zero-light evidence or authored water/normal/roughness masks.",
        "observations": report,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(report)} source-only portrait transition comparisons produced, no runtime modified.")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCES)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seeds", type=int, nargs="+", default=[17, 47])
    opts = parser.parse_args()
    build(opts.source, opts.output, tuple(opts.seeds))


if __name__ == "__main__":
    main()
