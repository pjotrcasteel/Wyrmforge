#!/usr/bin/env python3
"""Offline WyrmForge sprite authoring/QA packer. Never changes game assets."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

DIRECTIONS = ("S", "SE", "E", "NE", "N", "NW", "W", "SW")
LAYERS = ("albedo", "normal", "roughness", "emission", "depth")


def read_project(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != "wyrmforge.sprite-foundry.v1":
        raise ValueError("Unsupported project schema")
    name = data.get("character")
    if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9-]*", name):
        raise ValueError("character must use lowercase letters, digits and hyphens")
    size = data.get("cell")
    if not isinstance(size, list) or len(size) != 2 or not all(
        isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 512 for v in size
    ):
        raise ValueError("cell must contain two integer dimensions in [1, 512]")
    anchor = data.get("feetAnchor")
    if not isinstance(anchor, list) or len(anchor) != 2 or not all(
        isinstance(v, int) and not isinstance(v, bool) for v in anchor
    ) or not (0 <= anchor[0] < size[0] and 0 <= anchor[1] < size[1]):
        raise ValueError("feetAnchor must be inside the cell")
    if data.get("directions") != list(DIRECTIONS):
        raise ValueError("directions must follow the canonical S,SE,E,NE,N,NW,W,SW order")
    clips = data.get("clips")
    if not isinstance(clips, dict) or not clips:
        raise ValueError("clips must be a non-empty object")
    for name, config in clips.items():
        if not re.fullmatch(r"[a-z][a-z0-9-]*", name):
            raise ValueError("Invalid clip name")
        if not isinstance(config, dict):
            raise ValueError("clip configuration must be an object")
        frames, fps = config.get("frames"), config.get("fps")
        if not isinstance(frames, int) or isinstance(frames, bool) or not 1 <= frames <= 64:
            raise ValueError("frames must be an integer in [1, 64]")
        if not isinstance(fps, (int, float)) or isinstance(fps, bool) or not 1 <= fps <= 60:
            raise ValueError("fps must be within [1, 60]")
    return data


def checker(size: tuple[int, int], tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", size, (80, 80, 80, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(112, 112, 112, 255))
    return image


def load_frame(path: Path, cell: tuple[int, int]) -> Image.Image:
    with Image.open(path) as source:
        if source.format != "PNG":
            raise ValueError(f"{path}: expected PNG")
        if source.size != cell:
            raise ValueError(f"{path}: expected {cell}, got {source.size}")
        return source.convert("RGBA")


def check_albedo(image: Image.Image, path: Path) -> list[str]:
    alpha = image.getchannel("A")
    limits = alpha.getextrema()
    problems = []
    if limits[1] == 0:
        problems.append(f"{path}: fully transparent source frame")
    if limits[0] == 255:
        problems.append(f"{path}: no transparent pixels (likely painted background)")
    return problems


def build(project: dict, source: Path, out: Path, allow_incomplete: bool) -> dict:
    w, h = project["cell"]
    cell = (w, h)
    warnings: list[str] = []
    errors: list[str] = []
    outputs: dict[str, dict] = {}
    missing_count = 0
    out.mkdir(parents=True, exist_ok=True)
    for clip_name, config in project["clips"].items():
        count = config["frames"]
        layers = {layer: Image.new("RGBA", (count * w, len(DIRECTIONS) * h)) for layer in LAYERS}
        seen_layers: dict[str, set[str]] = {layer: set() for layer in LAYERS[1:]}
        valid_sources: set[str] = set()
        identical_frames = 0
        for row, direction in enumerate(DIRECTIONS):
            previous: bytes | None = None
            for index in range(count):
                key = f"{direction}/{index:02d}"
                base = source / clip_name / direction / f"{index:02d}"
                path = base.with_suffix(".albedo.png")
                if not path.exists():
                    missing_count += 1
                    warnings.append(f"{clip_name}/{key}: missing albedo")
                    continue
                try:
                    image = load_frame(path, cell)
                    errors.extend(check_albedo(image, path))
                except (OSError, ValueError) as exc:
                    errors.append(str(exc))
                    continue
                valid_sources.add(key)
                payload = image.tobytes()
                if count > 1 and payload == previous:
                    identical_frames += 1
                previous = payload
                layers["albedo"].paste(image, (index * w, row * h))
                alpha_mask = image.getchannel("A")
                for layer in LAYERS[1:]:
                    material_path = base.with_suffix(f".{layer}.png")
                    if not material_path.exists():
                        continue
                    try:
                        material = load_frame(material_path, cell)
                        # Material and albedo must share silhouette/UV pixels.
                        if material.getchannel("A").tobytes() != alpha_mask.tobytes():
                            errors.append(f"{material_path}: alpha differs from albedo")
                        layers[layer].paste(material, (index * w, row * h))
                        seen_layers[layer].add(key)
                    except (OSError, ValueError) as exc:
                        errors.append(str(exc))
        if identical_frames:
            warnings.append(f"{clip_name}: {identical_frames} neighboring frame pairs are identical")
        clip_outputs: dict[str, str] = {}
        for layer, image in layers.items():
            if layer != "albedo" and not seen_layers[layer]:
                continue
            if layer != "albedo" and seen_layers[layer] != valid_sources:
                errors.append(f"{clip_name}/{layer}: material must exist for every albedo frame")
            filename = f"{clip_name}.{layer}.png"
            image.save(out / filename)
            clip_outputs[layer] = filename
        outputs[clip_name] = {
            "fps": config["fps"],
            "framesPerDirection": count,
            "atlases": clip_outputs,
            "atlasColumns": count,
            "atlasRows": len(DIRECTIONS),
        }
        review = checker((count * w, len(DIRECTIONS) * h))
        review.alpha_composite(layers["albedo"])
        review.save(out / f"{clip_name}.checker-review.png")

    if missing_count and not allow_incomplete:
        errors.append(f"{missing_count} missing source frame(s); use --allow-incomplete for a draft review")
    state = "invalid" if errors else "incomplete" if missing_count else "technical-pass"
    report = {
        "schema": "wyrmforge.sprite-foundry.report.v1",
        "technicalStatus": state,
        "artApproval": "NOT_APPROVED",
        "gameplayApproval": "NOT_TESTED",
        "source": str(source),
        "missingFrames": missing_count,
        "warnings": warnings,
        "errors": errors,
        "requiredVisualReview": [
            "Eight independently authored views with consistent hat, hands and staff",
            "Actual gait: planted feet, passing poses, natural weight transfer",
            "Continuous directional turns and animation transitions",
            "Gothic readability at 320px and 390px in the real Hunt",
            "Shared G lighting/materials, foot-depth occlusion and mobile performance",
        ],
    }
    manifest = {
        "schema": "wyrmforge.sprite-foundry.atlas.v1",
        "character": project["character"],
        "cell": project["cell"],
        "feetAnchor": project["feetAnchor"],
        "directions": list(DIRECTIONS),
        "status": state,
        "approved": False,
        "clips": outputs,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (out / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, type=Path, help="Project JSON manifest")
    parser.add_argument("--source", required=True, type=Path, help="Editable exported PNG frame folder")
    parser.add_argument("--out", required=True, type=Path, help="Draft output folder, never the game assets")
    parser.add_argument("--allow-incomplete", action="store_true", help="Produce an explicitly incomplete draft")
    args = parser.parse_args()
    try:
        project = read_project(args.project)
        report = build(project, args.source, args.out, args.allow_incomplete)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Sprite Foundry error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({
        "technicalStatus": report["technicalStatus"],
        "artApproval": report["artApproval"],
        "missingFrames": report["missingFrames"],
        "errors": len(report["errors"]),
        "output": str(args.out),
    }, indent=2))
    return 2 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
