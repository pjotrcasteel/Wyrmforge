"""WyrmForge Arena Rebuild V2 · Stage 3: original editable woodland models.

Standalone Blender 4+ background authoring script. Does NOT read, modify, trace,
or import any old WyrmForge environment, Atlas or scene.
Builds one original tree asset from primitive meshes and procedural shading.
The saved .blend is canonical; transparent PNG is a derived review artifact.

blender -b -t 8 --python tools/art/step3_wet_forest.py -- \
  --asset ancient_oak --output-dir art/source/environment/wet-forest/ancient_oak

blender -b -t 8 --python tools/art/step3_wet_forest.py -- \
  --asset dead_elm --output-dir art/source/environment/wet-forest/dead_elm
"""

import argparse
import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ASSETS = {
    "ancient_oak": {
        "seed": 12043, "height": 8.4, "foliage": True, "width": 0.61,
        "description": "Weathered ancient oak, asymmetrical mossy canopy, gnarled exposed roots",
    },
    "dead_elm": {
        "seed": 12047, "height": 8.9, "foliage": False, "width": 0.48,
        "description": "Long-dead splintered elm with twisting naked crown and broken limbs",
    },
}


def material(name, dark, light, noise_scale, roughness=0.88):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    coordinates = nodes.new("ShaderNodeTexCoord")
    stretched_grain = nodes.new("ShaderNodeVectorMath")
    stretched_grain.operation = 'MULTIPLY'
    stretched_grain.inputs[1].default_value = (3.1, 3.1, .38)
    links.new(coordinates.outputs["Generated"], stretched_grain.inputs[0])
    tex = nodes.new("ShaderNodeTexNoise")
    links.new(stretched_grain.outputs["Vector"], tex.inputs["Vector"])
    tex.inputs["Scale"].default_value = noise_scale
    tex.inputs["Detail"].default_value = 5.0
    tex.inputs["Roughness"].default_value = 0.73
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (*dark, 1.0)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*light, 1.0)
    links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.24
    bump.inputs["Distance"].default_value = 0.055
    fissures = nodes.new("ShaderNodeTexNoise")
    fissures.inputs["Scale"].default_value = 41.0
    fissures.inputs["Detail"].default_value = 2.0
    links.new(stretched_grain.outputs["Vector"], fissures.inputs["Vector"])
    links.new(fissures.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def taper_segment(name, start, end, radius_start, radius_end, mat, rng, segments=11, rings=9):
    """Tapered, slightly crooked trunk/branch, not uniform cylinder primitives."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    if direction.length < 1e-6:
        return None
    u = direction.normalized()
    cross = u.cross(Vector((0, 0, 1)))
    if cross.length < 0.1:
        cross = u.cross(Vector((0, 1, 0)))
    cross.normalize()
    tangent = u.cross(cross).normalized()
    vertices = []
    polygons = []
    phase = rng.uniform(-math.pi, math.pi)
    wiggle = direction.length * 0.014
    for ring in range(rings + 1):
        t = ring / rings
        center = start.lerp(end, t)
        center += cross * (math.sin(t * 5.6 + phase) - math.sin(phase)) * wiggle
        center += tangent * math.sin(t * 8.3 + phase) * wiggle * 0.48
        radius = max(0.012, (1 - t) * radius_start + t * radius_end)
        for i in range(segments):
            theta = math.tau * i / segments
            rib = 1 + .075 * math.cos(theta * 5 + phase) + .04 * math.sin(theta * 9 + t * 8)
            vertices.append(center + radius * rib * (
                cross * math.cos(theta) + tangent * math.sin(theta)))
    for ring in range(rings):
        for i in range(segments):
            a = ring * segments + i
            b = ring * segments + (i + 1) % segments
            polygons.append((a, b, b + segments, a + segments))
    polygons += [tuple(reversed(tuple(range(segments)))),
                 tuple(rings * segments + i for i in range(segments))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], polygons)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def clusters(rng, origin, radius, amount, leaf_materials):
    """Real leaf silhouettes with air between clusters, not low-poly foliage blobs.

    One editable mesh per branch crown, made of individually oriented, bent
    four-triangle leaves. Leaf palette and geometry vary deterministically.
    The mesh has no background, ground decal, baked shadow or billboard atlas.
    """
    vertices, faces, face_materials = [], [], []
    up = Vector((0, 0, 1))
    for group in range(amount):
        center = origin + Vector((
            rng.gauss(0, .57) * radius,
            rng.gauss(0, .57) * radius,
            rng.uniform(-.36, .38) * radius,
        ))
        # The first/last sprays are deliberately sparse: holes make the crown
        # read as branching foliage instead of a single solid oval mass.
        leaf_count = rng.randint(13, 24)
        for leaf in range(leaf_count):
            anchor = center + Vector((
                rng.gauss(0, .16) * radius,
                rng.gauss(0, .16) * radius,
                rng.gauss(0, .12) * radius,
            ))
            direction = Vector((
                rng.uniform(-1, 1),
                rng.uniform(-1, 1),
                rng.uniform(-.25, .72),
            )).normalized()
            side = direction.cross(up)
            if side.length < .15:
                side = direction.cross(Vector((0, 1, 0)))
            side.normalize()
            size = radius * rng.uniform(.17, .33)
            width = size * rng.uniform(.24, .42)
            twist = rng.uniform(-.28, .28)
            middle = anchor + direction * (size * .53) + up * (size * twist)
            tip = anchor + direction * size + up * (size * twist * .35)
            first = len(vertices)
            vertices.extend((
                anchor,
                middle + side * width,
                middle + up * (size * .09),
                middle - side * width,
                tip,
            ))
            faces.extend((
                (first, first + 1, first + 2),
                (first, first + 2, first + 3),
                (first + 1, first + 4, first + 2),
                (first + 2, first + 4, first + 3),
            ))
            face_materials.extend([rng.randrange(len(leaf_materials))] * 4)

    mesh = bpy.data.meshes.new("Organic individual oak leaves")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Leaf sprays - independently editable", mesh)
    bpy.context.collection.objects.link(obj)
    for leaf_material in leaf_materials:
        obj.data.materials.append(leaf_material)
    for polygon, index in zip(obj.data.polygons, face_materials):
        polygon.material_index = index

def root_buttress(name, angle, distance, width, rng, bark):
    """Unbroken twisting root with a broad flared buttress and a buried tip.

    The flattened ellipsoidal rings make a plausible grounded root instead of
    two pointed cylinder segments; all portions remain editable in Blender.
    """
    sections = 18
    sides = 12
    vertices = []
    faces = []
    bend = rng.uniform(-.43, .43)
    drift = rng.uniform(-.22, .22)
    for step in range(sections + 1):
        t = step / sections
        theta = angle + bend * math.sin(t * math.pi) + drift * t
        reach = distance * (t ** .84)
        center = Vector((
            math.cos(theta) * reach,
            math.sin(theta) * reach,
            .095 + .28 * (1 - t) ** 3 - .060 * t + .018 * math.sin(math.pi * 2 * t),
        ))
        across = Vector((-math.sin(theta), math.cos(theta), 0))
        lateral = max(.015, width * ((1 - t) ** 1.8) + .02 * (1 - t))
        vertical = max(.012, lateral * (.73 - .27 * t))
        for side in range(sides):
            a = math.tau * side / sides
            crinkle = 1 + .06 * math.sin(a * 5 + t * 11 + angle)
            vertices.append(center + across * math.cos(a) * lateral * crinkle
                            + Vector((0, 0, math.sin(a) * vertical)))
    for step in range(sections):
        for side in range(sides):
            i = step * sides + side
            j = step * sides + (side + 1) % sides
            faces.append((i, j, j + sides, i + sides))
    faces.extend([tuple(reversed(range(sides))),
                  tuple(sections * sides + i for i in range(sides))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bark)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def trunk_flare(config, rng, bark):
    """Uneven buttressed collar growing into the lower trunk, without a decal."""
    ring_count, sides = 17, 24
    vertices, faces = [], []
    for ring in range(ring_count + 1):
        t = ring / ring_count
        z = .065 + 2.15 * t
        core = config["width"] * (1.0 + .51 * (1 - t) ** 3)
        for side in range(sides):
            angle = math.tau * side / sides
            lobes = 1 + (.21 * (1 - t) ** 2) * math.cos(angle * 7 + .32)
            uneven = 1 + .045 * math.cos(angle * 3 + t * 4)
            radial = core * lobes * uneven
            vertices.append((
                .026 * t + math.cos(angle) * radial,
                .025 * t + math.sin(angle) * radial,
                z + .055 * math.cos(angle * 7) * (1 - t),
            ))
    for ring in range(ring_count):
        for side in range(sides):
            i = ring * sides + side
            j = ring * sides + (side + 1) % sides
            faces.append((i, j, j + sides, i + sides))
    faces += [tuple(reversed(range(sides))),
              tuple(ring_count * sides + k for k in range(sides))]
    mesh = bpy.data.meshes.new("Asymmetric living root collar")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Buttressed trunk base", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(bark)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def build_tree(config):
    rng = random.Random(config["seed"])
    height = config["height"]
    living = config["foliage"]
    bark = material("Old wet fissured bark · longitudinal striations",
        (.034, .029, .024) if living else (.057, .054, .047),
        (.195, .147, .103) if living else (.232, .215, .177), 6.5)
    exposed = material("Original exposed wood · fracture grain",
        (.105, .080, .062), (.36, .28, .18), 6.2)
    moss = material("Original woodland moss",
        (.058, .085, .032), (.21, .29, .085), 9.0)
    leaves = [material("Oak foliage " + str(i),
        (.035 + i * .009, .059 + i * .006, .018),
        (.14 + i * .018, .19 + i * .012, .064 + i * .007), 15.0)
        for i in range(4)]

    root_centre = Vector((0, 0, .20))
    trunk_start = Vector((0, 0, .1))
    trunk_top = Vector((-.14, .15, height * .77))
    taper_segment("Main root collar and trunk", trunk_start, trunk_top,
        config["width"], .18, bark, rng, segments=17, rings=34)

    # An uneven flared root collar and curved roots replace the old radial
    # straight-spike starburst. The roots join the trunk but do not paint soil.
    trunk_flare(config, rng, bark)
    root_count = 7 if living else 6
    for root in range(root_count):
        phi = root * math.tau / root_count + rng.uniform(-.37, .37)
        distance = rng.uniform(1.15, 2.35) if living else rng.uniform(.83, 1.7)
        root_buttress(f"Curving anchored root {root:02d}", phi, distance,
                      rng.uniform(.19, .34), rng, bark)


    # An oak crown follows a loose spiral; the dead elm is fundamentally
    # different: a few snapped, bent limbs, gaps and uneven growth history.
    count = 12 if living else 11
    for n in range(count):
        t = .30 + .62 * (n / 16) if living else rng.uniform(.25, .84)
        around = n * 2.4 + rng.uniform(-.38, .38) if living else (
            n * 1.77 + rng.uniform(-.95, .95) + (.7 if n % 3 == 0 else -.25))
        start = trunk_start.lerp(trunk_top, t)
        length = (1.9 if living else 2.65) * (1.2 - t * .25) * (
            rng.uniform(.72, 1.28) if living else rng.uniform(.43, 1.45))
        end = start + Vector((math.cos(around) * length,
                              math.sin(around) * length,
                              rng.uniform(.6, 1.8) if living else rng.uniform(.05, 1.4)))
        if living:
            taper_segment("Asymmetric oak branch", start, end,
                .20 * (1 - t * .5), .025, bark, rng)
        else:
            elbow = start.lerp(end, rng.uniform(.37, .67))
            elbow += Vector((rng.uniform(-.38, .38), rng.uniform(-.38, .38),
                             rng.uniform(-.55, .22)))
            base_radius = .22 * (1 - t * .4)
            taper_segment("Twisting snapped elm leader", start, elbow,
                          base_radius, .085, bark, rng)
            taper_segment("Fractured elm leader tip", elbow, end,
                          .085, rng.uniform(.008, .038), exposed, rng)
        for fork in range(2 if living else rng.randrange(0, 3)):
            side = end + Vector((rng.uniform(-.85, .85),
                                 rng.uniform(-.85, .85),
                                 rng.uniform(.4, 1.25)))
            taper_segment("Secondary living twig" if living else "Dead limb fracture",
                start.lerp(end, .65), side, .068, .008,
                bark if living else exposed, rng)
        if living:
            clusters(rng, end + Vector((0, 0, .1)), rng.uniform(.85, 1.35),
                14 + rng.randrange(12), leaves)

    if living:
        clusters(rng, trunk_top + Vector((0, 0, .4)), 1.35, 22, leaves)
    else:
        # A shattered, leaning main leader; no Christmas-tree spear.
        fracture = trunk_top + Vector((-.55, .29, height * .10))
        taper_segment("Leaning snapped elm crown", trunk_top, fracture,
                      .18, .065, bark, rng)
        for n in range(3):
            splinter = fracture + Vector((
                rng.uniform(-.25, .25), rng.uniform(-.23, .23),
                rng.uniform(.16, .55)))
            taper_segment("Splintered pale heartwood", fracture, splinter,
                          .045, .008, exposed, rng, segments=7, rings=5)

    # Small clinging moss on the actual root-collar mesh only; no painted
    # patches, spherical pebbles or fake moss disks underneath the sprite.
    for n in range(25 if living else 7):
        phi = rng.uniform(0, math.tau)
        r = rng.uniform(.27, config["width"] * 1.20)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,
            radius=rng.uniform(.028, .09),
            location=(r * math.cos(phi), r * math.sin(phi), rng.uniform(.14, .91)))
        tuft = bpy.context.object
        tuft.name = "Clinging bark moss"
        tuft.scale = (1.0, .7, rng.uniform(.35, .65))
        tuft.data.materials.append(moss)


def setup_camera(height):
    focus = Vector((0, 0, height * .43))
    bpy.ops.object.camera_add(location=focus + Vector((10.2, -13.0, 8.6)))
    camera = bpy.context.object
    camera.name = "Shared 2.5D ortho camera — source of truth"
    direction = focus - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 12.6
    bpy.context.scene.camera = camera
    for name, location, energy, size in [
        ("Cool northern sky", (2.0, -4.0, 14), 1250, 8),
        ("Warm edge bounce", (-5.0, 3.0, 7), 630, 7),
    ]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (focus - light.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", choices=tuple(ASSETS), required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--force", action="store_true",
        help="Explicitly permit overwriting an editable .blend source")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    blend = args.output_dir / (args.asset + ".blend")
    png = args.output_dir / (args.asset + "-candidate.png")
    if blend.exists() and not args.force:
        parser.error(f"Refusing to overwrite source {blend}; pass --force consciously")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    config = ASSETS[args.asset]
    build_tree(config)
    setup_camera(config["height"])
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    # Ubuntu package builds of Blender may omit OpenImageDenoise entirely.
    # Explicitly disable denoising on CPU CI; no dependency on vendor binaries.
    if hasattr(scene.cycles, "use_denoising"):
        scene.cycles.use_denoising = False
    view_layer_cycles = getattr(bpy.context.view_layer, "cycles", None)
    if view_layer_cycles is not None and hasattr(view_layer_cycles, "use_denoising"):
        view_layer_cycles.use_denoising = False
    scene.render.film_transparent = True
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.render.filepath = str(png)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.render.render(write_still=True)
    manifest = {
        "id": args.asset, "source": str(blend.name),
        "preview": str(png.name), "seed": config["seed"],
        "description": config["description"], "sourceSystem": "original-blender-procedural",
        "render": {"projection": "orthographic-2.5d", "width": 768, "height": 768,
                   "transparent": True, "shadowBaked": False},
        "alignment": {"footOrigin": [0, 0, 0], "separateGroundShadow": True},
        "approval": "candidate-not-approved", "gameIntegration": False,
    }
    (args.output_dir / "production.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

