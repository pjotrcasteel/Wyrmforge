"""Publish owner-approved source-mesh Hollowed fracture atlases after the full
Blender/geometry CI gate. Keeps the raw editable rig and diagnostics as artifacts.

The owner approved the direction on 2026-10-26. This is an explicit deployment
step, not a flag inside the model renderer: the render itself stays unapproved
as generated evidence until these eight files have been checked.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "artifacts/hollow-source-fracture"
TARGET = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/death/fracture"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


def main() -> None:
    data = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    if (data.get("actor"), data.get("clip"), data.get("sourceGeometry")) != (
        "hollowed", "fracture", "original-skinned-blender-mesh"
    ):
        raise ValueError("Only original skinned Hollowed source-mesh fragments can be released")
    if data.get("frames") != 24 or data.get("fps") != 12 or data.get("cell") != 128:
        raise ValueError("Fracture clip is incompatible with the Hunt playback contract")
    if data.get("anchor") != [64, 88] or data.get("worldSize") != 124:
        raise ValueError("Fracture origin/pivot does not match the source Hollowed")
    if data.get("injury") != "standard" or data.get("directions") != list(DIRECTIONS):
        raise ValueError("A complete eight-facing, intact Hollowed clip is required")
    if data.get("directionsRendered") != list(DIRECTIONS):
        raise ValueError("Partial South-only QC is not a releasable runtime atlas")
    if set(data.get("parts", {})) != {
        "skull", "thorax", "pelvis", "arm.L", "arm.R", "leg.L", "leg.R"
    }:
        raise ValueError("Seven original anatomical regions required")
    diagnostics = json.loads((SOURCE / "geometry-diagnostics.json").read_text())
    if set(diagnostics.get("parts", {})) != set(data["parts"]):
        raise ValueError("Incomplete source-rig geometry diagnostics")

    for direction in DIRECTIONS:
        record = data["atlases"].get(direction)
        expected = f"fracture-{direction}.png"
        if not record or record.get("file") != expected:
            raise ValueError(f"Missing original Blender atlas: {direction}")
        image_path = SOURCE / expected
        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        if record.get("sha256") != digest:
            raise ValueError(f"Corrupt or stale fracture atlas: {direction}")
        with Image.open(image_path) as image:
            if image.size != (24 * 128, 128) or image.mode != "RGBA":
                raise ValueError(f"Invalid directional atlas dimensions: {direction}")
            image.verify()
        if data.get("splitSilhouetteOverlap", {}).get(direction, 0) < .36:
            raise ValueError(f"Anatomy continuity gate failed: {direction}")
        if len(data.get("boundingBoxes", {}).get(direction, [])) != 24:
            raise ValueError(f"Missing per-frame bounds checks: {direction}")

    TARGET.mkdir(parents=True, exist_ok=True)
    for direction in DIRECTIONS:
        shutil.copyfile(SOURCE / f"fracture-{direction}.png", TARGET / f"fracture-{direction}.png")

    data["ownerApproved"] = True
    data["approvalDate"] = "2026-10-26"
    data["status"] = "owner-approved source geometry, released after Blender CI"
    data["releasedToHunts"] = True
    (TARGET / "manifest.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: owner-approved original Hollowed fracture production atlases: {len(DIRECTIONS)} directions")


if __name__ == "__main__":
    main()
