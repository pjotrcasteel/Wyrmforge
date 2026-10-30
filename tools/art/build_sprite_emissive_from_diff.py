"""Build pixel-exact emissive atlases from approved art revisions, not RGB guesses.

An art revision that changes only glowing pixels can retain its original
albedo, alpha, silhouette, directions and poses. The difference between
two approved atlases is a precise author-defined emission mask. All input
paths and frame rules come from a data profile; no monster logic exists here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]


def _validated_atlas(path: Path, manifest: dict, cell: int, frames: int, directions: list[str]) -> np.ndarray:
    raw = path.read_bytes()
    expected = manifest.get("atlasSha256")
    if not expected or hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError(f"Source atlas SHA-256 mismatch: {path}")
    with Image.open(path) as image:
        actual_size = image.size
        if actual_size != (cell * frames, cell * len(directions)):
            raise ValueError(f"Atlas frame geometry changed: {path}: {actual_size}")
        return np.array(image.convert("RGBA"), dtype=np.uint8)


def generate_channel(root: Path, channel: dict) -> dict:
    approved_dir = root / channel["approvedExport"]
    approved = json.loads((approved_dir / "manifest.json").read_text(encoding="utf-8"))
    prior_dir = root / approved["priorExport"]
    prior = json.loads((prior_dir / "manifest.json").read_text(encoding="utf-8"))
    cell = int(channel["cell"])
    frames = int(channel["frames"])
    directions = approved["directions"]
    animation = approved["animation"]
    if not directions or frames != approved["framesPerDirection"]:
        raise ValueError("Invalid approved frame layout")
    if directions != prior["directions"] or frames != prior["framesPerDirection"]:
        raise ValueError("Emissive source and approved animation have different directions or frame counts")
    if int(approved.get("cell", approved.get("source", {}).get("frameWidth", 0))) != cell:
        raise ValueError("Approved atlas cell size changed")
    if int(prior.get("cell", prior.get("source", {}).get("frameWidth", 0))) != cell:
        raise ValueError("Source atlas cell size changed")
    filename = f"ashling-{animation}.png"
    before = _validated_atlas(prior_dir / filename, prior, cell, frames, directions)
    after = _validated_atlas(approved_dir / filename, approved, cell, frames, directions)
    if not np.array_equal(before[:, :, 3], after[:, :, 3]):
        raise ValueError("Emissive authoring may not change sprite alpha or silhouette")
    changed = np.any(before[:, :, :3] != after[:, :, :3], axis=2)
    if np.any(changed & (after[:, :, 3] == 0)):
        raise ValueError("Emissive pixels must be on visible source art")

    frame_counts: dict[str, list[int]] = {}
    for row, direction in enumerate(directions):
        frame_counts[direction] = []
        for frame in range(frames):
            selected = changed[row * cell:(row + 1) * cell, frame * cell:(frame + 1) * cell]
            count = int(np.count_nonzero(selected))
            if count > int(channel["maxPixelsPerFrame"]):
                raise ValueError(f"Out-of-bounds emission at {animation}/{direction}/{frame}: {count}")
            if direction in channel.get("unlitDirections", []) and count:
                raise ValueError(f"Hidden eyes should not emit through the back of the head: {direction}/{frame}")
            if frame >= channel.get("extinguishedFromFrame", frames) and count:
                raise ValueError(f"Eyes must extinguish during death: {direction}/{frame}")
            frame_counts[direction].append(count)

    # RGB carries the exact approved fiery palette; black means no emission.
    # Alpha is opaque throughout: the GPU emissive map uses RGB, never alpha,
    # while the albedo map remains the sole source of cutout transparency.
    result = np.zeros_like(after)
    result[:, :, :3] = np.where(changed[:, :, None], after[:, :, :3], 0)
    result[:, :, 3] = 255
    target = root / channel["output"]
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(result, "RGBA").save(target, optimize=True)
    return {"output": channel["output"], "bytes": target.stat().st_size,
            "emissivePixels": int(np.count_nonzero(changed)), "frames": frame_counts}


def generate(profile_path: Path, root: Path = ROOT) -> list[dict]:
    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    channels = profile["channels"]
    if not channels:
        raise ValueError("At least one emissive material channel is required")
    return [generate_channel(root, channel) for channel in channels]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(generate(args.profile), indent=2))
