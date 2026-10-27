"""Actual-mesh Gothic Hollowed physical-variation proof on the CURRENT no-cape Blender rigs.

Never warp sprites, synthesize 2D cutouts, recolor the standard actor, or reuse the
obsolete caped model. This makes *new editable 3D geometry shape keys* which are
skinned by the original Armature and exports native-resolution eight-row-ready
source poses for visual QC. No gameplay or published runtime assets are changed.

Run: python tools/sprite-lab/author-hollow-body-diversity.py
Requires Blender 4.5 Python (bpy) and Pillow.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from PIL import Image, ImageChops, ImageDraw
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
OUT = ROOT / "artifacts/hollow-body-diversity"
STANDARD = MODEL / "rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend"
BROKEN = MODEL / "rigged-hollow-zombie-reach-v3-broken-leg-left/hollow-rigged.blend"
BROKEN_ARM = MODEL / "rigged-hollow-zombie-reach-v3-broken-arm-right/hollow-rigged.blend"
ONE_ARM = MODEL / "rigged-hollow-zombie-reach-v3-one-arm-left/hollow-rigged.blend"
CELL = 96
FRAMES = 16
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90

# These are deliberately separate *bodies*, not one RGB sprite recolored or
# a playback-rate setting. Source skeletal actions remain intact at this gate.
BODIES = (
    ("original", STANDARD, "Unmodified current no-cape anatomy (reference)"),
    ("ravenous", STANDARD, "Taller narrow torso; elongated grasping, forward-leaning silhouette"),
    ("grave-wretch", BROKEN_ARM, "Swollen hunched shoulders and existing right-arm fracture"),
    ("broken", BROKEN, "Asymmetrical bone structure with the genuine source broken left leg"),
    ("severed", ONE_ARM, "Missing left arm, displaced shoulder socket and collapsed narrow ribs"),
)

def smooth01(value):
    t = max(0.0, min(1.0, value))
    return t * t * (3.0 - 2.0 * t)

def gaussian(value, center, span):
    return math.exp(-((value - center) / span) ** 2)

def morph_vertex(name, co):
    """Move vertices IN actual source mesh local space, retaining real UV/skin weights."""
    x, y, z = co
    chest = gaussian(z, .13, .25)
    upper = smooth01((z + .12) / .48)
    trunk = gaussian(z, .04, .32)
    if name == "ravenous":
        # Long torso, narrow shoulders/waist and extended hunched neck.
        x = x * (1 - .33 * trunk) + .015 * upper
        y = y - .075 * upper - .018 * chest
        z = z + .103 * upper
        # Feet remain anchored; the physical shoulder/torso must change.
    elif name == "grave-wretch":
        # Rot-swollen and compact; broad shoulders and barrel-like ribs.
        x = x * (1 + .51 * chest)
        y = y * (1 + .44 * trunk) + .045 * chest
        z = z * (.88 if z > -.14 else 1.0) - .042 * upper
        # A real altered upper-back silhouette; no separate blob drawn above it.
        y += .074 * gaussian(z, .23, .12) * smooth01((y + .07) / .16)
    elif name == "broken":
        # The base model ALREADY contains an injured left leg.
        # Build permanent shoulder and rib asymmetry in the skin, not a camera lean.
        x += .061 * upper + .023 * chest
        z -= .048 * upper * smooth01((x + .18) / .32)
        y -= .048 * upper
        x *= 1 + .13 * chest
    elif name == "severed":
        # Missing left arm is source mesh, NOT a hidden sprite column.
        # Permanently collapse the ruined shoulder and cant the head.
        x -= .073 * upper
        z -= .062 * upper * smooth01((-.06 - x) / .28)
        y += .057 * gaussian(z, .19, .24)
        x *= 1 - .20 * trunk
    return (x, y, z)

def author_body(name, source, description):
    if not source.is_file():
        raise FileNotFoundError(f"Missing actual source .blend: {source}")
    with source.open("rb") as stream:
        if stream.read(7) != b"BLENDER":
            raise RuntimeError(f"Not an editable Blender source: {source}")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    rig = bpy.data.objects["Hollow editable animation rig"]
    actor = bpy.data.objects["Hollow skinned character"]
    assert actor.type == "MESH" and len(actor.data.polygons) > 1000
    assert any(mod.type == "ARMATURE" and mod.object == rig for mod in actor.modifiers)
    assert scene.camera and scene.camera.data.type == "ORTHO"
    assert rig.animation_data and rig.animation_data.action
    assert not any(obj.type == "MESH" and "cape" in obj.name.lower() for obj in bpy.data.objects)
    source_action = rig.animation_data.action.name
    # Do NOT alter the original data or its UV/texture. The morphological delta is
    # stored as a persistent Blender shape key and evaluated under the same rig.
    modified = 0
    max_delta = 0.0
    vertex_count = len(actor.data.vertices)
    if name != "original":
        if actor.data.shape_keys is None:
            actor.shape_key_add(name="Basis", from_mix=False)
        key = actor.shape_key_add(name="Hollow physical body - " + name, from_mix=False)
        base = actor.data.shape_keys.key_blocks[0]
        for index in range(vertex_count):
            pos = base.data[index].co
            new = Vector(morph_vertex(name, pos))
            displacement = (new - pos).length
            if displacement > .001:
                modified += 1
            max_delta = max(max_delta, displacement)
            key.data[index].co = new
        key.value = 1
        assert modified > vertex_count * .20, f"Insufficient true body deformation: {name}"
        assert .04 < max_delta < .25, f"Unexpected source morph bounds: {name}/{max_delta}"
    bpy.context.view_layer.update()
    out_blend = OUT / f"hollow-{name}-body.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(out_blend))
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
    scene.frame_start = 1
    scene.frame_end = FRAMES
    old_rotation = rig.rotation_euler.z

    # Native-size S and E animation loops, original source keyframes.
    clips = {}
    for direction in ("S", "E"):
        row = DIRECTIONS.index(direction)
        rig.rotation_euler.z = old_rotation + math.radians(ROTATION + 180 - row * 45)
        source_frames = []
        for index in range(FRAMES):
            scene.frame_set(index + 1)
            tmp = OUT / f"_frame_{name}_{direction}_{index}.png"
            scene.render.filepath = str(tmp)
            bpy.ops.render.render(write_still=True)
            frame = Image.open(tmp).convert("RGBA")
            tmp.unlink()
            bound = frame.getbbox()
            assert bound is not None and min(bound[:2]) > 0 and max(bound[2:]) < CELL, (
                f"Invalid/clipped body {name} {direction} {index}: {bound}"
            )
            source_frames.append(frame)

        cards = []
        for index, sprite in enumerate(source_frames):
            board = Image.new("RGBA", (196, 178), (22, 20, 27, 255))
            ink = ImageDraw.Draw(board)
            ink.text((10, 10), f"HOLLOWED / {name.upper()}", fill=(208, 193, 174))
            ink.text((10, 28), f"{direction} / mesh variant / frame {index+1:02}", fill=(145, 138, 137))
            ink.line((16, 139, 179, 139), fill=(56, 51, 54))
            board.alpha_composite(sprite, (50, 47))
            cards.append(board.convert("RGB"))
        gif = OUT / f"body-{name}-{direction}.gif"
        cards[0].save(gif, save_all=True, append_images=cards[1:],
                      duration=40, loop=0, optimize=False)
        clips[direction] = gif.name

        if direction == "S":
            # Keep alpha for directly comparable silhouette analysis.
            source_frames[4].save(OUT / f"silhouette-{name}.png")
        print(f"Source render: {name} {direction} 16 true Blender poses", flush=True)

    rig.rotation_euler.z = old_rotation
    return {
        "name": name, "source": str(source.relative_to(ROOT)),
        "design": description, "editableBlender": out_blend.name,
        "sourceAction": source_action, "vertexCount": vertex_count,
        "changedVertices": modified, "maxVertexDisplacement": max_delta,
        "shapeKey": None if name == "original" else f"Hollow physical body - {name}",
        "sourceSkinned3D": True, "sourceCapeFree": True, "recolors": False,
        "reviewClips": clips, "ownerApproved": False, "runtimeIntegrated": False,
    }

def build_comparison(records):
    all_clips = {}
    for entry in records:
        all_clips[entry["name"]] = {
            direction: Image.open(OUT / file) for direction, file in entry["reviewClips"].items()
        }
    screens = []
    for index in range(FRAMES):
        board = Image.new("RGB", (585, 372), (17, 16, 22))
        ink = ImageDraw.Draw(board)
        ink.text((8, 8), "HOLLOWED / FIVE ACTUAL PHYSICAL BODIES", fill=(214, 197, 174))
        ink.text((8, 24), "Current cape-free 3D source / South view / still pre-approval", fill=(138, 132, 132))
        for p, entry in enumerate(records):
            x = (p % 3) * 195
            y = 36 + (p // 3) * 168
            loop = all_clips[entry["name"]]["S"]
            loop.seek(index)
            board.paste(loop.convert("RGB").crop((0, 0, 195, 168)), (x, y))
        screens.append(board)
    compared = OUT / "hollow-five-body-morphology.gif"
    screens[0].save(compared, save_all=True, append_images=screens[1:],
                    duration=40, loop=0)
    for body in all_clips.values():
        for src in body.values():
            src.close()

    # Difference is based on true 3D rendered alpha, not a subjective label.
    base = Image.open(OUT / "silhouette-original.png").getchannel("A")
    differences = {}
    for entry in records:
        name = entry["name"]
        current = Image.open(OUT / f"silhouette-{name}.png").getchannel("A")
        mask = ImageChops.difference(current.point(lambda x: 255 if x >= 100 else 0),
                                     base.point(lambda x: 255 if x >= 100 else 0))
        changed = sum(1 for pixel in mask.getdata() if pixel > 0)
        differences[name] = changed
    return compared.name, differences

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = [author_body(name, source, description) for name, source, description in BODIES]
    comparison, different_pixels = build_comparison(rows)
    report = {
        "status": "owner-review-only",
        "actor": "hollowed", "source": "current cape-free weighted 3D Blender characters",
        "unapproved": True, "runtimeSpritesUntouched": True, "ashlingUntouched": True,
        "bodyCount": len(rows), "animationSource": "original cape-free 16-frame source actions",
        "preview": comparison, "bodySilhouetteChangedPixelCount": different_pixels,
        "variants": rows,
        "reviewGate": "Mobile/owner silhouette acceptance, genuine clip continuity, C# speeds and eight-direction integration remain",
    }
    assert all(different_pixels[name] > 12 for name in ("ravenous", "grave-wretch", "broken", "severed")), (
        f"Body variants cannot be near-identical to original: {different_pixels}"
    )
    (OUT / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    (OUT / "README.md").write_text(
        "# Hollowed: ACTUAL physical model variants (not color swaps)\n\n"
        + "Five different source-skinned 3D body models including the original, preserving the accepted cape-free family. "
          "Anatomy and 3D mesh alter physically and the original mesh/UV/weights remain editable. "
          "No gameplay or published runtime asset is changed.\n\n"
        + f"![All four physical bodies]({comparison})\n\n"
        + "\n".join(f"![{r['name']}]({r['reviewClips']['E']})" for r in rows)
        + "\n\nA true crawler requires authored ground-contact motion, altered rig and verified "
          "floor/hit anchors. Do not counterfeit it by scaling or rotating a walking sprite. "
          "These bodies are review candidates; owner approval is still REQUIRED.\n"
    )
    print(json.dumps({"comparison": comparison, "difference": different_pixels,
                      "bodyCount": len(rows)}, indent=2))

if __name__ == "__main__":
    main()
