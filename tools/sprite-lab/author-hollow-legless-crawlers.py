"""Two genuinely LEGLESS, separately animated Gothic Hollowed from real no-cape 3D.

Retains the four accepted starting upright bodies unchanged. Deletes genuine leg
and hanging skirt geometry from the existing skinned mesh, fills actual stump
boundaries, deforms the remaining 3D anatomy, and authors independent prone
hand-supported crawling cycles using a world-space hand contact target and
two-bone arm IK.  Never crop, turn, skew or warp 2D sprites.

Outputs editable .blend + true 8-direction-capable atlas candidates and 390px
visual QC. Runtime integration, crawler combat/death and C# speed remain gated.

Requires Python 3.11, bpy==4.5.15, Pillow==11.3.0.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE_STANDARD = MODEL / "rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend"
SOURCE_BROKEN_ARM = MODEL / "rigged-hollow-zombie-reach-v3-broken-arm-right/hollow-rigged.blend"
OUT = ROOT / "artifacts/hollow-legless-crawlers"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
FRAMES = 16
CELL = 96
ARCHETYPES = {
    "grave-dragger": {
        "source": SOURCE_STANDARD, "cut_z": -.13, "pitch": 73.0, "fps": 12, "shoulder_width": 1.12,
        "length": 1.07, "stride": .095, "bob": .012,
        "description": "No legs; broad-shouldered heavy torso, two deep alternating arm pulls.",
    },
    "crypt-scuttler": {
        "source": SOURCE_BROKEN_ARM, "cut_z": -.048, "pitch": 81.0, "fps": 21, "shoulder_width": 1.32,
        "length": .84, "stride": .16, "bob": .022,
        "description": "No legs; compact twisted ribcage, disproportionately wide fast grasping arms.",
    },
}
parser = argparse.ArgumentParser()
parser.add_argument("--variant", choices=(*ARCHETYPES, "both"), default="both")
parser.add_argument("--directions", choices=("S", "SE", "all"), default="S")
args = parser.parse_args()
TARGETS = list(ARCHETYPES) if args.variant == "both" else [args.variant]
RENDER_DIRECTIONS = DIRECTIONS if args.directions == "all" else ("S",) if args.directions == "S" else ("S", "E")
OUT.mkdir(parents=True, exist_ok=True)


def grounded_matrix(name: str, start: Vector, end: Vector, rest) -> Matrix:
    direction = end - start
    if direction.length < 1e-6:
        raise ValueError(f"Degenerate IK transform for {name}")
    orient = (rest[name].tail_local - rest[name].head_local).rotation_difference(direction)
    transform = (orient.to_matrix() @ rest[name].matrix_local.to_3x3()).to_4x4()
    transform.translation = start
    return transform


def joint(start, end, upper, lower, pole):
    line = end - start
    assert line.length > .0001
    reach = min(max(line.length, abs(upper - lower) + .0005), upper + lower - .0005)
    axis = line.normalized()
    along = (upper * upper - lower * lower + reach * reach) / (2 * reach)
    lateral = Vector(pole) - axis * Vector(pole).dot(axis)
    if lateral.length < 1e-5:
        lateral = Vector((0, 0, 1))
    lateral.normalize()
    elbow = start + axis * along + lateral * math.sqrt(max(0, upper * upper - along * along))
    return elbow, start + axis * reach


def remove_anatomical_legs(actor, spec):
    """Physically remove the two real weighted leg chains; never hide sprites."""
    mesh = actor.data.copy()
    actor.data = mesh
    original_vertices = len(mesh.vertices)
    groups = {g.index: g.name for g in actor.vertex_groups}
    leg_groups = {"thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"}
    discarded_cloth = {"cloth.L", "cloth.R"}
    seen_leg = {name: 0 for name in leg_groups}
    marked = []
    max_kept_leg_z = -10
    for v in mesh.vertices:
        weights = {groups[g.group]: g.weight for g in v.groups}
        for name in leg_groups:
            if weights.get(name, 0) > .3:
                seen_leg[name] += 1
        leg_weight = sum(weights.get(name, 0) for name in leg_groups)
        skirt_weight = sum(weights.get(name, 0) for name in discarded_cloth)
        pelvis_weight = weights.get("pelvis", 0)
        below = v.co.z < spec["cut_z"]
        # Cap stump just below hips; preserve belly, arms, skull and ribs.
        remove = below and (
            leg_weight > .20 or skirt_weight > .48 or
            (pelvis_weight > .65 and v.co.z < spec["cut_z"] - .035)
        )
        if remove:
            marked.append(v.index)
        elif leg_weight > .5:
            max_kept_leg_z = max(max_kept_leg_z, v.co.z)

    assert min(seen_leg.values()) > 1000, f"Missing actual weighted legs: {seen_leg}"
    assert original_vertices > 45000 and .22 < len(marked) / original_vertices < .59, (
        f"Leg removal must affect real substantial source geometry: {len(marked)}/{original_vertices}"
    )
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    removed = [bm.verts[index] for index in marked]
    bmesh.ops.delete(bm, geom=removed, context="VERTS")
    # Triangulate just the amputated torso/hip boundaries where possible.
    boundaries = [edge for edge in bm.edges if edge.is_boundary and
                  all(vertex.co.z < spec["cut_z"] + .055 for vertex in edge.verts)]
    if boundaries:
        bmesh.ops.holes_fill(bm, edges=boundaries, sides=0)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    # DIFFERENT physically sculpted torso volume on the real remaining vertices.
    # This is source geometry deformation, not a recolor or screen transform.
    for v in mesh.vertices:
        x, y, z = v.co
        chest = math.exp(-((z - .22) / .21) ** 2)
        if spec["shoulder_width"] < 1.2:
            v.co.x = x * (1 + .12 * chest)
            v.co.y = y - .035 * chest
            v.co.z = z + .020 * chest
        else:
            v.co.x = x * (1 + .32 * chest)
            v.co.y = y - .047 * chest
            v.co.z = z - .028 * chest
            # Collapsed ribcage versus broad, longer waist dragger.
            if z < .18:
                v.co.z = .86 * v.co.z + .02
    mesh.update()

    remaining_lower = [
        v.co.z for v in mesh.vertices
        if v.co.z < spec["cut_z"] - .10
    ]
    # Hands can extend down past the hip line; no anatomical leg vertex may.
    return {
        "originalMeshVertices": original_vertices,
        "physicallyRemovedVertices": len(marked),
        "remainingVertices": len(mesh.vertices),
        "lowerVertexCountIncludesArms": len(remaining_lower),
        "sourceLegGroupsVerified": seen_leg,
        "cutZ": spec["cut_z"],
        "closedStumpBoundaryCandidates": len(boundaries),
        "maxRetainedLegWeightedVertexZ": max_kept_leg_z,
        "meshPolygons": len(mesh.polygons),
    }


def force_arm(rig, side, goal_world, rest, lengths):
    """Move skinned shoulder/forearm/hand geometry, with grounded hand-target IK."""
    sign = 1 if side == "L" else -1
    bpy.context.view_layer.update()
    upper = "upper_arm." + side
    fore = "forearm." + side
    hand = "hand." + side
    shoulder = rig.pose.bones[upper].head.copy()
    local_goal = rig.matrix_world.inverted() @ goal_world
    elbow, wrist = joint(shoulder, local_goal, lengths[upper], lengths[fore],
                         (sign * 1.0, .25, .72))
    for key, a, b in ((upper, shoulder, elbow), (fore, elbow, wrist)):
        rig.pose.bones[key].matrix = grounded_matrix(key, a, b, rest)
        bpy.context.view_layer.update()
    tip = wrist + (local_goal - shoulder).normalized() * lengths[hand]
    rig.pose.bones[hand].matrix = grounded_matrix(hand, wrist, tip, rest)
    bpy.context.view_layer.update()


def author(name, spec):
    source = spec["source"]
    if not source.is_file() or source.open("rb").read(7) != b"BLENDER":
        raise RuntimeError(f"Actual cape-free source Blender scene is required: {source}")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    rig = bpy.data.objects["Hollow editable animation rig"]
    actor = bpy.data.objects["Hollow skinned character"]
    assert any(mod.type == "ARMATURE" and mod.object == rig for mod in actor.modifiers)
    assert rig.animation_data and rig.animation_data.action
    source_action = rig.animation_data.action
    anatomy = remove_anatomical_legs(actor, spec)
    rest = {bone.name: bone for bone in rig.data.bones}
    lengths = {bone.name: bone.length for bone in rig.data.bones}
    action = source_action.copy()
    action.name = "Hollow_Legless_" + name.replace("-", "_") + "_Crawl_v1"
    action.use_fake_user = True
    rig.animation_data.action = action
    yaw = rig.rotation_euler.z
    base_loc = rig.location.copy()
    bones = {p.name: p for p in rig.pose.bones}
    assert all(key in bones for key in ("upper_arm.L", "upper_arm.R", "forearm.L",
                                       "forearm.R", "hand.L", "hand.R", "chest", "head"))

    observations = []
    # Sixteen actual fully-skinned 3D poses; the two crawl actions have
    # different stride profiles, asymmetric support, bob and full-body posture.
    for index in range(FRAMES):
        frame = index + 1
        scene.frame_set(frame)
        t = index / FRAMES
        speed_phase = math.tau * t
        bob = spec["bob"] * (1 + math.sin(2 * speed_phase + .35)) / 2
        pitch = spec["pitch"] + (2.4 if name == "grave-dragger" else 4.0) * math.sin(speed_phase)
        rig.rotation_euler = (math.radians(pitch), 0, yaw)
        rig.location = base_loc + Vector((0, 0, -.34 + bob))
        rig.keyframe_insert("rotation_euler", frame=frame)
        rig.keyframe_insert("location", frame=frame)
        bpy.context.view_layer.update()
        # World horizontal chase axis: rotation-only yaw, not pitch.
        forward = Quaternion((0, 0, 1), yaw) @ Vector((0, -1, 0))
        across = Quaternion((0, 0, 1), yaw) @ Vector((1, 0, 0))
        contacts = {}
        for side, offset in (("L", 0.0), ("R", .5)):
            gait = (t + offset) % 1
            # Support-and-pull, then recovery swing, genuinely planted near floor.
            if gait < .60:
                pull = 1 - gait / .60
                lift = 0.0
                support = True
            else:
                recover = (gait - .60) / .40
                pull = recover
                lift = .085 * math.sin(math.pi * recover)
                support = False
            side_factor = 1 if side == "L" else -1
            origin = rig.location.copy()
            reach = .19 + (pull - .5) * spec["stride"]
            y = origin + forward * reach + across * (side_factor * (
                .235 if name == "crypt-scuttler" else .19))
            target = Vector((y.x, y.y, -.485 + lift))
            force_arm(rig, side, target, rest, lengths)
            hand_world = rig.matrix_world @ bones["hand." + side].tail
            contacts[side] = {"support": support, "handZ": round(hand_world.z, 4),
                              "targetZ": round(target.z, 4)}
        for key in bones:
            bone = bones[key]
            bone.rotation_mode = "QUATERNION"
            for prop in ("location", "rotation_quaternion", "scale"):
                bone.keyframe_insert(prop, frame=frame, group=key)
        observations.append({"frame": index, "pitch": pitch, "contacts": contacts})
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.fps = spec["fps"]
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 4
    scene.render.film_transparent = True
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"

    editable = OUT / f"{name}-real-legless-crawler.blend"
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(editable))
    atlas = Image.new("RGBA", (CELL * FRAMES, CELL * len(RENDER_DIRECTIONS)))
    directions = {}
    for row, direction in enumerate(RENDER_DIRECTIONS):
        full_row = DIRECTIONS.index(direction)
        frames = []
        for index in range(FRAMES):
            scene.frame_set(index + 1)
            # The animated source pose already pitches the REAL mesh. Rotate
            # the entire 3D actor to render independent directional views.
            rig.rotation_euler.z = yaw + math.radians(ROTATION + 180 - full_row * 45)
            bpy.context.view_layer.update()
            tmp = OUT / f"_crawler_{name}_{direction}_{index}.png"
            scene.render.filepath = str(tmp)
            bpy.ops.render.render(write_still=True)
            pic = Image.open(tmp).convert("RGBA")
            tmp.unlink()
            bound = pic.getbbox()
            if not bound or min(bound[:2]) < 0 or max(bound[2:]) > CELL:
                raise ValueError(f"No source crawler in image: {name}/{direction}/{index}: {bound}")
            atlas.alpha_composite(pic, (index * CELL, row * CELL))
            frames.append(pic)
        review = []
        for index, pose in enumerate(frames):
            panel = Image.new("RGBA", (196, 184), (20, 19, 24, 255))
            draw = ImageDraw.Draw(panel)
            draw.text((8, 8), "LEGLESS / " + name.upper(), fill=(211, 191, 173))
            draw.text((8, 27), f"{direction} 3D / {index+1:02} of {FRAMES}", fill=(142, 136, 129))
            draw.line((15, 145, 180, 145), fill=(75, 63, 63))
            panel.alpha_composite(pose, (50, 49))
            review.append(panel.convert("RGB"))
        path = OUT / f"{name}-{direction}.gif"
        review[0].save(path, save_all=True, append_images=review[1:],
                       duration=round(1000 / spec["fps"]), loop=0)
        directions[direction] = path.name
        print(f"Rendered {name}/{direction} — {FRAMES} actual skinned 3D crawl poses", flush=True)
    atlas_path = OUT / (name + "-candidate-atlas.png")
    atlas.save(atlas_path)
    report = {
        "actor": "Hollowed", "archetype": name, "description": spec["description"],
        "body": "physical 3D bilateral leg amputation, altered torso and source armature",
        "retainsOriginalFourUprightModels": True,
        "usesObsoleteCape": False, "sourceAction": source_action.name,
        "newAction": action.name, "sourceBlender": str(source.relative_to(ROOT)),
        "editableBlender": editable.name, "frames": FRAMES, "fps": spec["fps"],
        "cell": CELL, "directionsRendered": list(RENDER_DIRECTIONS),
        "atlas": atlas_path.name, "atlasSha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest(),
        "reviewGifs": directions, "anatomicalChanges": anatomy,
        "armSupportObservations": observations,
        "ownerApproved": False, "runtimeIntegrated": False,
        "actualCSharpSpeedChanged": False, "attackAndDeathAuthored": False,
    }
    (OUT / (name + "-manifest.json")).write_text(json.dumps(report, indent=2) + "\n")
    return report


results = [author(name, ARCHETYPES[name]) for name in TARGETS]
(OUT / "README.md").write_text(
    "# Two truly legless Gothic Hollowed — 3D source review only\n\n"
    + "Upright Hollowed original designs are unchanged. Both crawlers have real "
      "physically removed leg geometry and different source-skinned arm pull cycles. "
      "They are **not** 2D transformations, not in the game, and still need native "
      "Hunt-scale review, directional export, matched attacks/deaths and authoritative C# speeds.\n\n"
    + "\n".join(f"![{r['archetype']}]({r['reviewGifs'].get('S')})" for r in results)
    + "\n"
)
print(json.dumps([{"archetype": x["archetype"], "removedVertices": x["anatomicalChanges"]["physicallyRemovedVertices"],
                   "directions": x["directionsRendered"]} for x in results], indent=2))
