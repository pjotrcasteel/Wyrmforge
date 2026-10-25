#!/usr/bin/env python3
"""Experimental source-only minimum-error seam-cut quilting, NOT production albedo."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "user_handover_files/concepts/arena-v2/wet-forest/ground-materials/v1"
FAMILIES = ("grass-moss", "wet-mud", "trampled-earth")


def load_family(source_root: Path, family_id: str, source_px: int = 600) -> list[np.ndarray]:
    if family_id not in FAMILIES:
        raise ValueError("Only explicitly supported source-art families are allowed; Trampled Earth remains semantic path artwork, not a continuous terrain substrate")
    manifest = json.loads((source_root / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "review-only-not-approved":
        raise ValueError("Research requires unapproved source-only artwork")
    family = next((family for family in manifest["families"] if family["id"] == family_id), None)
    if family is None or len(family["variants"]) != 6:
        raise ValueError("Missing six source variations")
    output = []
    for i, entry in enumerate(family["variants"], 1):
        expected = f"{family_id}/variant-{i:02d}.webp"
        if entry["file"] != expected or entry["approval"] != "unreviewed":
            raise ValueError("Unexpected source path or approval")
        path = source_root / expected
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError(f"Corrupt source hash: {expected}")
        with Image.open(path) as img:
            if list(img.size) != entry["size"]:
                raise ValueError(f"Image size differs from manifest: {expected}")
            output.append(np.asarray(img.convert("RGB").resize((source_px, source_px), Image.Resampling.BOX), dtype=np.uint8))
    return output


def min_error_boundary(error: np.ndarray) -> np.ndarray:
    """A minimum-cost, adjacent-pixel path across the width of a nonnegative error strip."""
    height, width = error.shape
    if not height or not width:
        raise ValueError("Seam strip cannot be empty")
    costs = error[:, 0].astype(np.float64).copy()
    parents = np.empty((width, height), dtype=np.int16)
    for x in range(1, width):
        updated = np.empty(height, dtype=np.float64)
        for y in range(height):
            first, last = max(0, y - 1), min(height, y + 2)
            target = first + int(np.argmin(costs[first:last]))
            parents[x, y] = target
            updated[y] = costs[target] + float(error[y, x])
        costs = updated
    path = np.empty(width, dtype=np.int16)
    path[-1] = int(np.argmin(costs))
    for x in range(width - 1, 0, -1):
        path[x - 1] = parents[x, path[x]]
    return path


def mismatch(existing: np.ndarray, candidate: np.ndarray, top: bool, left: bool, overlap: int) -> float:
    strips = []
    if top:
        strips.append((existing[:overlap].astype(np.float32) - candidate[:overlap]) ** 2)
    if left:
        strips.append((existing[:, :overlap].astype(np.float32) - candidate[:, :overlap]) ** 2)
    return float(np.mean([float(s.mean()) for s in strips])) if strips else 0.0


def patch_quilt(
    images: list[np.ndarray], *, seed: int = 17, width: int = 720,
    patch_size: int = 180, overlap: int = 44, candidates: int = 36,
    diversity_strength: float = 0.15,
) -> tuple[np.ndarray, list[int]]:
    if len(images) != 6 or any(i.shape != images[0].shape or i.ndim != 3 or i.shape[-1] != 3 for i in images):
        raise ValueError("Exactly six equal RGB sources are required")
    if not 4 <= overlap < patch_size // 2 or width < patch_size or any(min(i.shape[:2]) < patch_size for i in images):
        raise ValueError("Invalid quilt patch size/overlap")
    if candidates < len(images):
        raise ValueError("Each source variant requires at least one candidate per patch")
    if not 0 <= diversity_strength <= 1:
        raise ValueError("Diversity strength must be between 0 and 1")
    canvas = np.zeros((width, width, 3), dtype=np.uint8)
    rng = np.random.default_rng(seed)
    step = patch_size - overlap
    grid = (width - patch_size + step - 1) // step + 1
    chosen = []
    source_usage = np.zeros(len(images), dtype=np.int32)
    for row in range(grid):
        for col in range(grid):
            y, x = row * step, col * step
            height, span = min(patch_size, width - y), min(patch_size, width - x)
            if height < overlap or span < overlap:
                continue
            target = canvas[y:y + height, x:x + span]
            top, left = row > 0, col > 0
            options = []
            for attempt in range(candidates):
                # Always offer at least one crop of every artwork before random samples.
                which = attempt if attempt < len(images) else int(rng.integers(0, len(images)))
                sample = images[which]
                yy = int(rng.integers(0, sample.shape[0] - height + 1))
                xx = int(rng.integers(0, sample.shape[1] - span + 1))
                patch = sample[yy:yy + height, xx:xx + span]
                cost = mismatch(target, patch, top, left, overlap)
                options.append((cost, which, patch))
            if top or left:
                absolute_best = min(option[0] for option in options)
                # Avoid sacrificing an arbitrarily bad visible seam just to balance usage.
                candidates_in_budget = [option for option in options
                    if option[0] <= absolute_best * 1.45 + 100.0]
                best = min(candidates_in_budget, key=lambda option: (
                    option[0] + max(absolute_best, 100.0) * diversity_strength * source_usage[option[1]],
                    option[0], option[1],
                ))
            else:
                # No existing pixels to match for the first patch; choose by seeded RNG.
                best = options[int(rng.integers(0, len(options)))]
            _, variant, patch = best
            source_usage[variant] += 1
            chosen.append(variant)
            new_pixel = np.ones((height, span), dtype=bool)
            if top:
                difference = target[:overlap].astype(np.float32) - patch[:overlap]
                error = np.mean(difference * difference, axis=2)
                seam = min_error_boundary(error)
                new_pixel[:overlap] &= np.arange(overlap)[:, None] >= seam[None, :]
            if left:
                difference = target[:, :overlap].astype(np.float32) - patch[:, :overlap]
                error = np.mean(difference * difference, axis=2)
                seam = min_error_boundary(error.T)
                new_pixel[:, :overlap] &= np.arange(overlap)[None, :] >= seam[:, None]
            target[new_pixel] = patch[new_pixel]
    return canvas, chosen


def edge_feather(image: np.ndarray, fraction: float = 0.12) -> np.ndarray:
    """Comparison baseline only: color-match opposed outer bands without making new material maps."""
    result = image.astype(np.float32).copy()
    h, w = image.shape[:2]
    for axis, count in ((1, w), (0, h)):
        band = max(2, round(count * fraction))
        for i in range(band):
            t = i / (band - 1)
            blend = (1 - t * t * (3 - 2 * t)) / 2
            if axis == 1:
                old_a, old_b = result[:, i].copy(), result[:, w - 1 - i].copy()
                result[:, i] = old_a * (1 - blend) + old_b * blend
                result[:, w - 1 - i] = old_b * (1 - blend) + old_a * blend
            else:
                old_a, old_b = result[i].copy(), result[h - 1 - i].copy()
                result[i] = old_a * (1 - blend) + old_b * blend
                result[h - 1 - i] = old_b * (1 - blend) + old_a * blend
    return np.rint(result).clip(0, 255).astype(np.uint8)


def comparison(images: list[np.ndarray], seed: int, family: str) -> tuple[Image.Image, dict]:
    source = images[0]
    raw = np.tile(source, (2, 2, 1))
    feather = np.tile(edge_feather(source), (2, 2, 1))
    quilt, variants = patch_quilt(images, seed=seed)
    sample_px = 420
    page = Image.new("RGB", (1320, 510), "#151719")
    label = ImageDraw.Draw(page)
    for n, (text, content) in enumerate((
        ("Naive 2x2 repeat", raw), ("Feathered 2x2 repeat", feather), ("Six-source seam-cut study", quilt)
    )):
        x = 15 + n * 435
        page.paste(Image.fromarray(content).resize((sample_px, sample_px), Image.Resampling.BOX), (x, 60))
        label.text((x, 21), text, fill="#efe8df")
    label.text((15, 489), f"{family}: unapproved research, not physically neutral albedo, not a gameplay capture", fill="#d0c5b6")
    usage = {f"{index + 1:02d}": variants.count(index) for index in range(len(images))}
    return page, {
        "family": family,
        "seed": seed,
        "selectedSourceIndices": variants,
        "sourceCount": len(images),
        "selectedSourceUsage": usage,
        "sourcesRepresented": sum(count > 0 for count in usage.values()),
        "quiltPolicy": "bounded-overlap-error-with-usage-penalty",
        "diversityStrength": 0.15,
        "approved": False,
    }


def create(source_root: Path, output: Path, seed: int = 17) -> None:
    source_root, output = source_root.resolve(), output.resolve()
    if output == source_root or source_root in output.parents:
        raise ValueError("Never write generated studies inside the original art archive")
    output.mkdir(parents=True, exist_ok=True)
    metadata = []
    for family in FAMILIES:
        preview, summary = comparison(load_family(source_root, family), seed, family)
        preview.save(output / f"{family}-three-methods.jpg", "JPEG", quality=90, subsampling=0)
        metadata.append(summary)
    (output / "quilt-study.json").write_text(json.dumps({
        "stage": "source research only",
        "runtimeUse": False,
        "lightingNeutral": False,
        "seamlessCertification": False,
        "seed": seed,
        "comparisons": metadata,
    }, indent=2) + "\n", encoding="utf-8")
    print("PASS: two source-only quilt comparisons; no original image changes or game integration.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCES)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=17)
    options = parser.parse_args()
    create(options.source, options.output, options.seed)


if __name__ == "__main__":
    main()
