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
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("wizard_walk_master", HERE / "master.py")
master = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = master
_SPEC.loader.exec_module(master)

KEY_POSES = 4
GAIT_STEP_METRES = 0.40
FOOT_LIFT_METRES = 0.16
LEFT_ARM_SWING_METRES = 0.14
GARMENT_SWAY_METRES = 0.07
CANONICAL_DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
LEG_FEATURES = frozenset({"trouser", "boots", "boot-toe", "boot-cuff"})
GARMENT_FEATURES = frozenset({"outer-robe", "under-robe", "permanent-cloth-rip", "frayed-rip-edge"})


def root_motion(phase):
    """Support-leg weight shift and lifted passing step (same local axes for 8 views)."""
    return (-0.10 * math.cos(phase), 0.095 * abs(math.sin(phase)), 0.045 * math.sin(phase))


def foot_trajectory(side, phase):
    """Local +Z stride: ground-locked stance, then a lifted forward swing.

    A constant-speed actor moves 4*GAIT_STEP_METRES per full gait loop.
    Each planted foot moves rearward by 2*GAIT_STEP_METRES over half a
    cycle; the world-space contact is stationary when runtime speed and
    animation FPS are synchronized. Swing eases back->front in the air.
    """
    if side not in (-1, 1):
        raise ValueError("leg side must be -1 (right) or +1 (left)")
    gait_phase = (phase + (math.pi if side == 1 else 0.0)) % (2.0 * math.pi)
    if gait_phase <= math.pi:
        return GAIT_STEP_METRES * (1.0 - 2.0 * gait_phase / math.pi), 0.0
    t = (gait_phase - math.pi) / math.pi
    eased = t * t * (3.0 - 2.0 * t)
    forward_z = GAIT_STEP_METRES * (2.0 * eased - 1.0)
    height = FOOT_LIFT_METRES * math.sin(math.pi * t)
    return forward_z, height


def travel_per_cycle_metres():
    """Ideal level-ground translation for one gait cycle without foot skating."""
    return 4.0 * GAIT_STEP_METRES


def leg_joint_positions(side, phase):
    """Reach a grounded foot from a moving hip using two constant-length bones."""
    if side not in (-1, 1):
        raise ValueError("leg side must be -1 (right) or +1 (left)")
    forward_z, foot_lift = foot_trajectory(side, phase)
    root_x, root_y, root_z = root_motion(phase)
    hip = (side * 0.31 + root_x, 1.22 + root_y, root_z)
    ankle = (side * 0.31, 0.25 + foot_lift, forward_z)
    upper, lower = 0.56, 0.55
    dx, dy, dz = (ankle[i] - hip[i] for i in range(3))
    distance = math.sqrt(dx * dx + dy * dy + dz * dz)
    if not abs(upper - lower) < distance < upper + lower:
        raise ValueError("foot placement is unreachable for the two-bone leg")
    along = (upper * upper - lower * lower + distance * distance) / (2.0 * distance)
    perpendicular = math.sqrt(max(0.0, upper * upper - along * along))
    # The knee always bends toward the character's local forward direction.
    sagittal = math.hypot(dy, dz)
    bend_y, bend_z = (dz / sagittal, -dy / sagittal)
    knee = (
        hip[0] + along * dx / distance,
        hip[1] + along * dy / distance + perpendicular * bend_y,
        hip[2] + along * dz / distance + perpendicular * bend_z,
    )
    return hip, knee, ankle


def articulated_leg_faces(side, phase):
    """Build articulated upper/shin trouser segments without changing master."""
    hip, knee, ankle = leg_joint_positions(side, phase)
    return (
        master.sleeve_tube_faces(hip, knee, .195, color="393437", feature="trouser")
        + master.sleeve_tube_faces(knee, ankle, .172, color="393437", feature="trouser")
    )


def transform_walk_face(face, phase):
    """Retarget free arm and worn cloth; all physical holes follow their mesh."""
    feature = face.feature
    if feature not in LEG_FEATURES | GARMENT_FEATURES | {"left-sleeve", "left-hand"}:
        return face
    if feature == "trouser":
        raise ValueError("trouser faces must be replaced by articulated leg bones")

    cx = sum(point[0] for point in face.points) / len(face.points)
    right_side = cx < 0
    forward_z, foot_lift = foot_trajectory(-1 if right_side else 1, phase)
    relative_lift = foot_lift / FOOT_LIFT_METRES

    points = []
    for x, y, z in face.points:
        if feature in {"boots", "boot-toe", "boot-cuff"}:
            z += forward_z
            y += foot_lift
        elif feature in GARMENT_FEATURES:
            # A physically shared hem drapes outward and briefly clears the
            # lifted leg. No garment faces, scars or mesh tears are added/removed.
            low = max(0.0, min(1.0, (1.20 - y) / 1.00))
            front = max(0.0, min(1.0, z / .50))
            z += GARMENT_SWAY_METRES * math.sin(phase + .5) * low
            y += .12 * relative_lift * low * front
            x += (.055 if x >= 0 else -.055) * abs(forward_z / GAIT_STEP_METRES) * low
        else:
            # The staff is in the unchanged RIGHT hand; swing only left arm.
            weight = max(0.0, min(1.0, (2.48 - y) / 1.12))
            z += LEFT_ARM_SWING_METRES * math.cos(phase) * weight
        points.append((x, y, z))
    return master.Face(tuple(points), face.color, feature)


def apply_root_pose(face, phase):
    """Carry the head, torso and entire held staff together during a step."""
    if face.feature in LEG_FEATURES:
        return face
    dx, dy, dz = root_motion(phase)
    if face.feature in GARMENT_FEATURES:
        # Cloth follows the torso, but lower hem lags the body and foot contact.
        points = []
        for x, y, z in face.points:
            weight = 0.55 + 0.45 * max(0.0, min(1.0, y / 1.60))
            points.append((x + dx * weight, y + dy * weight, z + dz * weight))
    else:
        # Single rigid translation of staff, right grip, hair, hat and all
        # attached body parts keeps their relative anatomy exactly preserved.
        points = [(x + dx, y + dy, z + dz) for x, y, z in face.points]
    return master.Face(tuple(points), face.color, face.feature)


def pose(frame_index, frame_count=KEY_POSES):
    """Build isolated physical gait frames without mutating the idle master."""
    if frame_count < KEY_POSES or frame_count % KEY_POSES:
        raise ValueError("walk frame count must be a multiple of four")
    if not 0 <= frame_index < frame_count:
        raise ValueError("walk frame index outside clip")
    phase = 2.0 * math.pi * frame_index / frame_count
    original = master.build_master()
    shared = [apply_root_pose(transform_walk_face(face, phase), phase)
              for face in original if face.feature != "trouser"]
    shared.extend(articulated_leg_faces(-1, phase))
    shared.extend(articulated_leg_faces(1, phase))
    return tuple(shared)


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



def animated_review_frames(frame_count=16, zoom=4, *, use_materials=True):
    """Prepare a real native-pixel S/SE/E walk loop at nearest-neighbour zoom."""
    if frame_count < KEY_POSES or frame_count % KEY_POSES:
        raise ValueError("animation frames must be divisible by four")
    if not 1 <= zoom <= 10:
        raise ValueError("zoom must be between 1 and 10")
    directions = ("S", "SE", "E")
    tile_w, tile_h = master.WIDTH * zoom, master.HEIGHT * zoom
    margin, top = 12, 30
    width = margin + len(directions) * (tile_w + margin)
    height = tile_h + top + margin
    result = []
    for index in range(frame_count):
        canvas = Image.new("RGBA", (width, height), (23, 27, 34, 255))
        painter = ImageDraw.Draw(canvas)
        painter.text((margin, 7), "WIZARD WALK / NATIVE 64x80 / UNAPPROVED", fill=(220, 219, 206, 255))
        for col, direction in enumerate(directions):
            x = margin + col * (tile_w + margin)
            painter.rectangle((x, top, x + tile_w - 1, top + tile_h - 1), fill=(45, 49, 54, 255))
            actor = render_frame(direction, index, frame_count, use_materials=use_materials)
            canvas.alpha_composite(actor.resize((tile_w, tile_h), Image.Resampling.NEAREST), (x, top))
            painter.text((x + 4, top + 4), direction, fill=(227, 224, 211, 255))
        result.append(canvas)
    return result


def save_animation_gif(path, frame_count=16, fps=12):
    """Write an isolated looping review GIF. It is not a game sprite atlas."""
    if not 1 <= fps <= 30:
        raise ValueError("review fps must be between 1 and 30")
    previews = animated_review_frames(frame_count)
    reference = previews[0].convert("RGB").quantize(colors=128)
    frames = [reference]
    frames.extend(
        image.convert("RGB").quantize(palette=reference, dither=Image.Dither.NONE)
        for image in previews[1:]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / fps),
        loop=0,
        disposal=2,
        optimize=False,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", type=Path, help="Output a labelled review contact PNG")
    parser.add_argument("--frames", type=Path, help="Output individual native RGBA frames")
    parser.add_argument("--gif", type=Path, help="Output a looping S/SE/E motion review GIF")
    parser.add_argument("--gif-fps", type=int, default=12, help="Motion review playback FPS")
    parser.add_argument("--count", type=int, default=KEY_POSES, help="4 or 16 frames per direction")
    args = parser.parse_args()
    if not args.preview and not args.frames and not args.gif:
        parser.error("provide --preview, --frames or --gif")
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        contact_sheet(args.count).save(args.preview)
    if args.gif:
        save_animation_gif(args.gif, 16, args.gif_fps)
    if args.frames:
        for direction in CANONICAL_DIRECTIONS:
            folder = args.frames / direction
            folder.mkdir(parents=True, exist_ok=True)
            for index in range(args.count):
                render_frame(direction, index, args.count).save(folder / f"{index:02d}.albedo.png")


if __name__ == "__main__":
    main()
