"""Validate ALL source-bound Hollowed fire frames before visual-art review.

Generated models and eight-direction frame atlases are ART CANDIDATES only.
The emitter is owned by WyrmForge's existing universal GPU lighting system.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
FACE_REGIONS = ("eye-left", "eye-right", "open-mouth")


def validate(manifest_path: Path) -> dict:
    base = manifest_path.parent
    record = json.loads(manifest_path.read_text(encoding="utf-8"))
    if record["actor"] != "Hollowed" or not record["capeFree"]:
        raise ValueError("Only actual cape-free Hollowed 3D source material is supported")
    if record["runtimeIntegrated"] or record["ownerApproved"]:
        raise ValueError("A source render cannot approve a production cutover")
    if not record["universalGpuLightOnly"] or record["canvasLightEngineAdded"]:
        raise ValueError("Fire must stay inside the one universal GPU lighting engine")
    directions = record["directions"]
    if directions != list(DIRECTIONS):
        raise ValueError(f"All eight actual directions required: {directions}")
    frames, cell = record["frames"], record["cell"]
    if frames != 16 or cell != 96:
        raise ValueError("Unexpected source attack clip timing or native sprite dimensions")
    regions = {r["name"]: r for r in record["regionWeights"]}
    for key in FACE_REGIONS:
        if regions.get(key, {}).get("weightedSurfaceVertices", 0) < 3:
            raise ValueError(f"Missing actual skinned facial source material for {key}")
    if len(record["perFrameEvidence"]) != frames * len(directions):
        raise ValueError("Missing per-frame directional mask diagnostics")

    color_path = base / record["colorAtlas"]
    mask_path = base / record["emissiveAtlas"]
    if hashlib.sha256(mask_path.read_bytes()).hexdigest() != record["emissiveSha256"]:
        raise ValueError("Emissive atlas hash differs from source-render manifest")

    detected = {}
    with Image.open(color_path) as color_source, Image.open(mask_path) as mask_source:
        color = color_source.convert("RGBA")
        mask = mask_source.convert("RGBA")
        expected_size = (frames * cell, len(directions) * cell)
        if color.size != expected_size or mask.size != expected_size:
            raise ValueError(f"Invalid eight-facing atlas geometry: {color.size}, {mask.size}")
        for row, direction in enumerate(directions):
            changes = []
            for i in range(frames):
                left = i * cell
                top = row * cell
                crop = (left, top, left + cell, top + cell)
                source_pixels = list(color.crop(crop).getdata())
                mask_pixels = list(mask.crop(crop).getdata())
                count = 0
                for src, ink in zip(source_pixels, mask_pixels):
                    if ink[3] > src[3]:
                        raise ValueError(f"Emissive pixels leak outside actual skinned mesh: {direction}/{i}")
                    if ink[3]:
                        count += 1
                expected = record["perFrameEvidence"][row * frames + i]
                if (expected["direction"], expected["frame"], expected["emissivePixels"]) != (
                    direction, i, count
                ):
                    raise ValueError(f"Directional evidence mismatch: {direction}/{i}")
                if count > 1200:
                    raise ValueError(f"Inner fire looks like a full-body repaint: {direction}/{i}: {count}")
                changes.append(count)
            detected[direction] = {"minPixels": min(changes), "maxPixels": max(changes),
                                   "nonemptyFrames": sum(count > 0 for count in changes)}
        if detected["S"]["nonemptyFrames"] != frames:
            raise ValueError("Visible South-facing internal fire missing in one or more attack poses")

    if len(record["review"]) != len(directions):
        raise ValueError("Missing full directional animation GIF reviews")
    for direction, review_name in zip(directions, record["review"]):
        review_path = base / review_name
        if not review_path.exists():
            raise ValueError(f"Missing visible animated review for {direction}")
        with Image.open(review_path) as gif:
            if gif.n_frames != frames:
                raise ValueError(f"Unexpected {direction} GIF frame count {gif.n_frames}")

    result = {"variant": record["variant"], "directionalEvidence": detected,
              "sourceMaskValidated": True, "allEightFacings": True, "ownerApproved": False}
    (base / "fire-qc-validation.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    print(json.dumps(validate(args.manifest), indent=2))


if __name__ == "__main__":
    main()
