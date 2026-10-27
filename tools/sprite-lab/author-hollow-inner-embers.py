"""Source-skinned Hollowed internal fire candidates, matching the Ashling workflow.

Offline Blender ART authoring only, never a second in-game lighting renderer.
Light in Hunts must come from hollow-inner-fire.js standard universal emitters.

For each actual no-cape mesh we mark a handful of *front-surface* pixels inside
eyes, jaw/mouth and open injury pockets and render baseline and fire at EXACT
same pose. Their delta becomes an optional emissive atlas for the one GPU engine.
This is a review candidate, not a production override or accepted wound sculpt.

Run with bpy 4.5.15:
 python tools/sprite-lab/author-hollow-inner-embers.py --variant standard --directions S
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from PIL import Image, ImageChops, ImageDraw
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
BASE = "rigged-hollow-zombie-reach-v3"
VARIANTS = ("standard", "broken-arm-right", "one-arm-left", "broken-leg-left")
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
FRAMES = 16
CELL = 96
ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
OUT = ROOT / "artifacts/hollow-internal-embers"

parser = argparse.ArgumentParser()
parser.add_argument("--variant", choices=VARIANTS, default="standard")
parser.add_argument("--directions", choices=("S", "SE", "all"), default="S")
parser.add_argument("--source-blend", type=Path, help="A separately authored real 3D crawler source, once available")
args = parser.parse_args()

SOURCE = args.source_blend or MODEL / f"{BASE}-{args.variant}/hollow-rigged.blend"
RENDER_DIRECTIONS = DIRECTIONS if args.directions == "all" else (
    ("S", "E") if args.directions == "SE" else ("S",)
)
NAME = args.source_blend.stem if args.source_blend else args.variant
DEST = OUT / NAME
DEST.mkdir(parents=True, exist_ok=True)


def fire_regions(vertices):
    """Infer true front-facing surface depth from the source geometry.

    The coordinates are real source mesh coordinates. Backward facings stay
    hidden naturally because the original skinned 3D mesh still occludes them.
    The sockets follow the deforming skinned surface in every authored frame.
    """
    sources = (
        ("eye-left", -.036, .425, .017, .015, .78),
        ("eye-right", .036, .425, .017, .015, .78),
        ("open-mouth", 0, .387, .027, .015, .85),
        ("rib-wound", -.085, .237, .038, .047, .52),
        ("abdomen-wound", .047, .116, .038, .048, .38),
        # The actual source reach attacks have fiery hand/forearm contact,
        # like Ashling. On amputated bodies, no vertex = no invented limb.
        ("striking-hand-left", -.258, -.11, .040, .050, .64),
        ("striking-hand-right", .258, -.11, .040, .050, .64),
    )
    records = []
    for label, x, z, rx, rz, heat in sources:
        nearby = [v.co.y for v in vertices
                  if abs(v.co.x - x) < rx * 1.35 and abs(v.co.z - z) < rz * 1.35]
        if len(nearby) < 4:
            raise ValueError(f"Missing actual cape-free surface for {label}; no fake screen-space glow")
        front = sorted(nearby)[max(0, int(len(nearby) * .08) - 1)]
        records.append((label, x, front, z, rx, rz, heat))
    return records


def author_surface_mask(mesh):
    regions = fire_regions(mesh.vertices)
    attr = mesh.attributes.get("hollow_inner_fire")
    if attr:
        mesh.attributes.remove(attr)
    attr = mesh.attributes.new(name="hollow_inner_fire", type="FLOAT", domain="POINT")
    totals = {region[0]: 0 for region in regions}
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        weighted = []
        for label, cx, front, cz, rx, rz, heat in regions:
            dx = (x - cx) / rx
            dz = (z - cz) / rz
            depth = max(0.0, (y - front) / .038)
            value = math.exp(-1.4 * (dx*dx + dz*dz) - 3.0 * depth*depth) * heat
            if value >= .10:
                totals[label] += 1
            weighted.append(value)
        attr.data[vertex.index].value = min(1, max(weighted))
    if totals["eye-left"] < 3 or totals["eye-right"] < 3 or totals["open-mouth"] < 3:
        raise ValueError(f"Source eye/mouth mesh not suitable for authored sockets: {totals}")
    return [{
        "name": name, "position": [x, y, z], "radiusX": rx,
        "radiusZ": rz, "weightedSurfaceVertices": totals[name],
    } for name, x, y, z, rx, rz, _ in regions]


def attach_emissive_material(actor):
    # Keep the original skin/albedo/normal shader. Add SOURCE-MASKED emission
    # through its material, not through a separate after-dark Canvas spotlight.
    if not len(actor.data.materials):
        raise ValueError("Missing original skinned Hollowed palette material")
    for i, original in enumerate(list(actor.data.materials)):
        material = original.copy()
        material.name = original.name + " | source-scored inner fire candidate"
        material.use_nodes = True
        tree = material.node_tree
        output = next((node for node in tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is None or not output.inputs["Surface"].is_linked:
            raise ValueError("Source material missing its lit surface shader")
        old = output.inputs["Surface"].links[0].from_socket
        tree.links.remove(output.inputs["Surface"].links[0])

        attr = tree.nodes.new("ShaderNodeAttribute")
        attr.attribute_name = "hollow_inner_fire"
        emission = tree.nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (1, .23, .018, 1)
        mult = tree.nodes.new("ShaderNodeMath")
        mult.operation = "MULTIPLY"
        tree.links.new(attr.outputs["Fac"], mult.inputs[0])
        tree.links.new(mult.outputs[0], emission.inputs["Strength"])
        add = tree.nodes.new("ShaderNodeAddShader")
        tree.links.new(old, add.inputs[0])
        tree.links.new(emission.outputs[0], add.inputs[1])
        tree.links.new(add.outputs[0], output.inputs["Surface"])
        actor.data.materials[i] = material
        return mult.inputs[1]
    raise ValueError("No skinned source material")


def render_png(scene, filepath):
    scene.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)
    image = Image.open(filepath).convert("RGBA")
    filepath.unlink(missing_ok=True)
    if image.size != (CELL, CELL):
        raise ValueError("Sprite exported at unexpected native dimensions")
    return image


def emissive_delta(base, fired):
    # Emissive atlas contains ONLY source-mesh-visible changed pixels; never
    # a broad screen overlay. All original actor alpha geometry is preserved.
    if base.getchannel("A").tobytes() != fired.getchannel("A").tobytes():
        raise ValueError("Emissive authoring changed the actor silhouette")
    delta = ImageChops.difference(base.convert("RGB"), fired.convert("RGB")).convert("L")
    diff = Image.new("RGBA", base.size)
    for y in range(CELL):
        for x in range(CELL):
            intensity = delta.getpixel((x, y))
            if intensity < 6:
                continue
            alpha = min(base.getpixel((x, y))[3], min(255, intensity * 2))
            if alpha < 12:
                continue
            diff.putpixel((x, y), (247, 129, 50, alpha))
    return diff


def main():
    if not SOURCE.is_file() or SOURCE.open("rb").read(7) != b"BLENDER":
        raise FileNotFoundError(f"Missing REAL no-cape 3D rig: {SOURCE}")
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene = bpy.context.scene
    actor = bpy.data.objects["Hollow skinned character"]
    rig = bpy.data.objects["Hollow editable animation rig"]
    assert actor.type == "MESH" and rig.type == "ARMATURE"
    assert any(m.type == "ARMATURE" and m.object == rig for m in actor.modifiers)
    assert rig.animation_data and rig.animation_data.action
    mask_regions = author_surface_mask(actor.data)
    fire = attach_emissive_material(actor)
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_animated_seed = False
    scene.cycles.seed = 23
    scene.render.film_transparent = True
    scene.render.resolution_x = CELL
    scene.render.resolution_y = CELL
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    yaw = rig.rotation_euler.z
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST / f"{NAME}-source-inner-fire.blend"))
    atlas = Image.new("RGBA", (CELL * FRAMES, CELL * len(RENDER_DIRECTIONS)))
    emissive = Image.new("RGBA", atlas.size)
    evidence = []
    review = []
    for row, direction in enumerate(RENDER_DIRECTIONS):
        frames = []
        for index in range(FRAMES):
            scene.frame_set(index + 1)
            rig.rotation_euler.z = yaw + math.radians(ROTATION + 180 - DIRECTIONS.index(direction) * 45)
            bpy.context.view_layer.update()
            fire.default_value = 0
            original = render_png(scene, DEST / "_base.png")
            # Opening mouth and wounded skin become brighter as reach peaks.
            phase = index / (FRAMES - 1)
            strength = .95 + 1.7 * math.exp(-((phase - .45) / .21) ** 2)
            fire.default_value = strength
            glowing = render_png(scene, DEST / "_fired.png")
            mask = emissive_delta(original, glowing)
            x = index * CELL
            y = row * CELL
            atlas.alpha_composite(glowing, (x, y))
            emissive.alpha_composite(mask, (x, y))
            changed = sum(1 for pixel in mask.getchannel("A").getdata() if pixel > 0)
            evidence.append({"direction": direction, "frame": index, "emissivePixels": changed,
                             "attackStrength": round(strength, 3)})
            board = Image.new("RGB", (CELL * 4, CELL * 2), (18, 17, 22))
            draw = ImageDraw.Draw(board)
            board.paste(original.resize((CELL * 2, CELL * 2), Image.Resampling.NEAREST), (0, 0),
                        original.getchannel("A").resize((CELL * 2, CELL * 2), Image.Resampling.NEAREST))
            board.paste(glowing.resize((CELL * 2, CELL * 2), Image.Resampling.NEAREST), (CELL * 2, 0),
                        glowing.getchannel("A").resize((CELL * 2, CELL * 2), Image.Resampling.NEAREST))
            draw.text((8, 5), "source Hollowed", fill=(215, 206, 198))
            draw.text((CELL * 2 + 8, 5), "internal fire / candidate", fill=(254, 184, 112))
            frames.append(board)
        review_path = DEST / f"{NAME}-{direction}-internal-fire-review.gif"
        frames[0].save(review_path, save_all=True, append_images=frames[1:], duration=83, loop=0)
        review.append(review_path.name)
        print(f"Source-mesh inner fire: {NAME} {direction} {FRAMES} source animated poses", flush=True)
    atlas_file = DEST / f"{NAME}-fire-attack-candidate.png"
    mask_file = DEST / f"{NAME}-emissive-mask-candidate.png"
    atlas.save(atlas_file)
    emissive.save(mask_file)
    if max(item["emissivePixels"] for item in evidence) == 0:
        raise ValueError("No visible source-bound eye/mouth/wound emission was rendered")
    manifest = {
        "actor": "Hollowed", "source": str(SOURCE.relative_to(ROOT)) if SOURCE.is_relative_to(ROOT) else str(SOURCE),
        "variant": NAME, "capeFree": True, "sourceMeshSkinningPreserved": True,
        "emissionSource": "front-facing skinned mesh point-domain attribute",
        "regionWeights": mask_regions,
        "emissiveAtlas": mask_file.name, "colorAtlas": atlas_file.name,
        "emissiveSha256": hashlib.sha256(mask_file.read_bytes()).hexdigest(),
        "directions": list(RENDER_DIRECTIONS), "frames": FRAMES, "cell": CELL,
        "review": review, "perFrameEvidence": evidence,
        "attackEmissionFollowsReal3DPose": True, "universalGpuLightOnly": True,
        "canvasLightEngineAdded": False,
        "ownerApproved": False, "runtimeIntegrated": False,
        "pending": "sculpt open jaw/wound cavities, validate eight directions and all six source bodies, approve mobile appearance",
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"actor":NAME, "regions":mask_regions,
        "nonemptyEmissiveFrames":sum(row["emissivePixels"] > 0 for row in evidence)},indent=2))


if __name__ == "__main__":
    main()
