#!/usr/bin/env python3
"""Unapproved native-resolution Wizard gait study from one immutable master mesh.

This is an isolated animation authoring experiment, not accepted character art.
Do not import these frames into the WyrmForge game.
"""
from __future__ import annotations

import argparse
import importlib.util
import math
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("wizard_walk_master", HERE / "master.py")
master = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = master
_SPEC.loader.exec_module(master)

KEY_POSES = 4
GAIT_STEP_METRES = 0.34
FOOT_LIFT_METRES = 0.16
LEFT_ARM_SWING_METRES = 0.10
GARMENT_SWAY_METRES = 0.035
CANONICAL_DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
LEG_FEATURES = frozenset({"trouser", "boots", "boot-toe", "boot-cuff"})
GARMENT_FEATURES = frozenset({"outer-robe", "under-robe", "permanent-cloth-rip", "frayed-rip-edge"})


def transform_walk_face(face, phase):
    """Keep equipment, identity and topology fixed while posing two alternating legs."""
    feature = face.feature
    if feature not in LEG_FEATURES | GARMENT_FEATURES | {"left-sleeve", "left-hand"}:
        return face

    # The Wizard's right leg is on local -X, as in the authoritative master.
    # Determining the side from the *unrotated* mesh prevents left/right swaps
    # when the camera turns; the same pose is used by all eight directions.
    cx = sum(point[0] for point in face.points) / len(face.points)
    right_leg = cx < 0
    stride = math.cos(phase) if right_leg else -math.cos(phase)
    lift = max(0.0, math.sin(phase) if right_leg else -math.sin(phase))

    points = []
    for x, y, z in face.points:
        if feature in LEG_FEATURES:
            # The upper leg stays attached to the pelvis; lower-leg and boot
            # positions follow a smooth stride, including foot clearance.
            weight = max(0.0, min(1.0, (1.22 - y) / 1.06)) if feature == "trouser" else 1.0
            z += GAIT_STEP_METRES * stride * weight
            y += FOOT_LIFT_METRES * lift * weight
        elif feature in GARMENT_FEATURES:
            # The same physical tears and scar triangles move with the cloth.
            # This is intentionally subtle so they never swim between facings.
            weight = max(0.0, min(1.0, (1.60 - y) / 1.40))
            z += GARMENT_SWAY_METRES * math.sin(2.0 * phase) * weight
        else:
            # Only the free *left* arm swings. Right hand, staff and flame are
            # completely untouched so grip and equipment continuity are exact.
            weight = max(0.0, min(1.0, (2.48 - y) / 1.12))
            z += LEFT_ARM_SWING_METRES * math.cos(phase) * weight
        points.append((x, y, z))
    return master.Face(tuple(points), face.color, feature)


def pose(frame_index, frame_count=KEY_POSES):
    """Return one reproducible 3D walk pose; does not mutate frozen idle geometry."""
    if frame_count < KEY_POSES or frame_count % KEY_POSES:
        raise ValueError("walk frame count must be a multiple of four")
    if not 0 <= frame_index < frame_count:
        raise ValueError("walk frame index outside clip")
    phase = 2.0 * math.pi * frame_index / frame_count
    return tuple(transform_walk_face(face, phase) for face in master.build_master())


def render_frame(direction, frame_index, frame_count=KEY_POSES, *, use_materials=True):
    if direction not in CANONICAL_DIRECTIONS:
        raise ValueError("unsupported facing")
    materials = {}
    if use_materials:
        for name, path in (
            ("robe_uv", HERE / "robe-uv-v001.png"),
            ("upper_uv", HERE / "upper-cloth-uv-v001.png"),
            ("head_uv", HERE / "head-uv-v001.png"),
        ):
            materials[name] = Image.open(path).convert("RGBA")
    return master.render(direction, posed_faces=pose(frame_index, frame_count), **materials)


def contact_sheet(frame_count=KEY_POSES):
    """Show actual 64x80 frames at nearest-neighbour zoom, never concept art."""
    zoom = 3
    cell_w, cell_h = master.WIDTH * zoom, master.HEIGHT * zoom
    pad, top = 8, 26
    result = Image.new(
        "RGBA",
        (len(CANONICAL_DIRECTIONS) * (cell_w + pad) + pad,
         frame_count * (cell_h + pad) + top + pad),
        (22, 27, 32, 255),
    )
    draw = ImageDraw.Draw(result)
    for col, direction in enumerate(CANONICAL_DIRECTIONS):
        x = pad + col * (cell_w + pad)
        draw.text((x + 5, 7), direction, fill=(232, 229, 218, 255))
        for frame in range(frame_count):
            y = top + frame * (cell_h + pad)
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), fill=(46, 50, 56, 255))
            image = render_frame(direction, frame, frame_count)
            result.alpha_composite(image.resize((cell_w, cell_h), Image.Resampling.NEAREST), (x, y))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", type=Path, help="Output a labelled review contact PNG")
    parser.add_argument("--frames", type=Path, help="Output individual native RGBA frames")
    parser.add_argument("--count", type=int, default=KEY_POSES, help="4 or 16 frames per direction")
    args = parser.parse_args()
    if not args.preview and not args.frames:
        parser.error("provide --preview or --frames")
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        contact_sheet(args.count).save(args.preview)
    if args.frames:
        for direction in CANONICAL_DIRECTIONS:
            folder = args.frames / direction
            folder.mkdir(parents=True, exist_ok=True)
            for index in range(args.count):
                render_frame(direction, index, args.count).save(folder / f"{index:02d}.albedo.png")


if __name__ == "__main__":
    main()
