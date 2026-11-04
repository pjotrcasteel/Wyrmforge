"""Continue the AN Hollowed art candidate without changing animation or gameplay.

Run with Blender 4.5 (not ordinary Python):
  blender -b -t 2 --python tools/art/hollowed/continue_existing_source.py -- \
    --source artifacts/animation/hollow-foundation.blend \
    --output artifacts/hollowed-art-v2/hollow-art-v2.blend

Input MUST be the already trimmed, internally smouldering AN foundation model.
This never overwrites the source, animation tools, atlas or production assets.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "animation"))
from hollow_source_embers import REGIONS  # Keep Work's authentic ember placement.

CLOTH = frozenset(("cloth.L", "cloth.R"))
LEGS = frozenset(("thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"))


def weight_map(vertex, group_names):
    return {group_names[group.group]: group.weight for group in vertex.groups}


def remove_remaining_long_cloth(actor):
    """Only remove obviously cloth-dominated lower remnants; preserve all leg skin."""
    mesh = actor.data
    group_names = {group.index: group.name for group in actor.vertex_groups}
    if not CLOTH.issubset(group_names.values()):
        raise ValueError("Cloth-weight groups are missing; source is not compatible")

    selected = []
    protected = 0
    for vertex in mesh.vertices:
        weights = weight_map(vertex, group_names)
        cloth = sum(weights.get(name, 0.0) for name in CLOTH)
        legs = sum(weights.get(name, 0.0) for name in LEGS)
        # Work's first cleanup stops around the hip. This deliberately finishes
        # only residual skirt-like weighted geometry below the short ragged hem.
        # The first pass leaves a skirt-like band in true profile views.
        # Cut remaining clearly cloth-dominated hip/upper-thigh panels, but
        # protect any anatomy with meaningful leg weights.
        hem = 0.070 + 0.024 * math.sin(vertex.co.x * 27 + vertex.co.y * 13)
        if legs >= 0.18:
            protected += 1
            continue
        if cloth >= 0.42 and vertex.co.z < hem:
            selected.append(vertex.index)

    if len(selected) > max(1, int(len(mesh.vertices) * 0.15)):
        raise ValueError("Too much residual cloth: requires visual/source inspection")
    if selected:
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(
            bm, geom=[bm.verts[index] for index in selected], context="VERTS"
        )
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
    if not mesh.polygons or not protected:
        raise ValueError("Post-cleanup mesh/leg preservation check failed")
    return {"removedResidualClothVertices": len(selected),
            "protectedLegWeightedVertices": protected,
            "vertexCountAfter": len(mesh.vertices)}


def inspect_islands(actor):
    """Report disconnected visible islands; never automatically delete anatomy."""
    mesh = actor.data
    used = set()
    neighbours = {}
    for face in mesh.polygons:
        verts = tuple(face.vertices)
        used.update(verts)
        for a in verts:
            neighbours.setdefault(a, set()).update(v for v in verts if v != a)

    group_names = {group.index: group.name for group in actor.vertex_groups}
    remaining = set(used)
    suspicious = []
    while remaining:
        start = remaining.pop()
        component = {start}
        pending = [start]
        while pending:
            for neighbour in neighbours[pending.pop()]:
                if neighbour in remaining:
                    remaining.remove(neighbour)
                    component.add(neighbour)
                    pending.append(neighbour)
        if len(component) > 100:
            continue
        weights = [weight_map(mesh.vertices[index], group_names)
                   for index in component]
        cloth = sum(sum(w.get(name, 0) for name in CLOTH)
                    for w in weights) / len(weights)
        legs = max((sum(w.get(name, 0) for name in LEGS)
                    for w in weights), default=0)
        lowest = min(mesh.vertices[index].co.z for index in component)
        if cloth > 0.55 and legs < 0.18 and lowest < 0.08:
            suspicious.append({"vertices": len(component),
                               "minZ": round(lowest, 5),
                               "meanClothWeight": round(cloth, 3)})
    return {"unreferencedVertices": len(mesh.vertices) - len(used),
            "suspiciousClothIslands": suspicious}



def remove_detached_cloth_scraps(actor):
    """Delete only detached tiny cloth-only components and unreferenced vertices.

    Connected anatomy and larger ragged details are deliberately left alone.
    A wrong source mesh must fail closed instead of having fingers amputated.
    """
    mesh = actor.data
    group_names = {group.index: group.name for group in actor.vertex_groups}
    used = set()
    neighbours = {}
    for polygon in mesh.polygons:
        verts = tuple(polygon.vertices)
        used.update(verts)
        for vertex in verts:
            neighbours.setdefault(vertex, set()).update(
                other for other in verts if other != vertex
            )
    unreferenced = set(range(len(mesh.vertices))) - used
    remaining = set(used)
    detached = []
    removed_components = []
    while remaining:
        first = remaining.pop()
        component = {first}
        todo = [first]
        while todo:
            for neighbor in neighbours[todo.pop()]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    todo.append(neighbor)
        if len(component) > 24:
            continue
        weights = [weight_map(mesh.vertices[index], group_names)
                   for index in component]
        cloth = sum(sum(weight.get(name, 0.0) for name in CLOTH)
                    for weight in weights) / len(weights)
        legs = max((sum(weight.get(name, 0.0) for name in LEGS)
                    for weight in weights), default=0)
        min_z = min(mesh.vertices[index].co.z for index in component)
        if cloth >= 0.70 and legs < 0.18 and min_z < 0.08:
            detached.extend(component)
            removed_components.append(len(component))
    total = len(unreferenced) + len(detached)
    if total > 200:
        raise ValueError(f"Unexpected floating debris ({total} vertices), inspect")
    if total:
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(
            bm, geom=[bm.verts[i] for i in sorted(unreferenced.union(detached))],
            context="VERTS"
        )
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
    return {
        "deletedUnreferencedVertices": len(unreferenced),
        "deletedTinyClothIslands": len(removed_components),
        "deletedTinyClothIslandVertices": len(detached),
        "removedIslandSizes": removed_components,
    }

def add_ash_crust(actor):
    """Matte, localized ash around Work's existing real mesh-bound embers.

    Insert crust into the *base* shader before Work's additive inner-fire node.
    This preserves the fire shader and all animation-driven emission controls.
    """
    mesh = actor.data
    heat = mesh.attributes.get("hollow_inner_fire")
    if heat is None or heat.domain != "POINT":
        raise ValueError("Existing skinned inner-fire attribute is missing")
    if len(heat.data) != len(mesh.vertices):
        raise ValueError("Inner-fire attribute no longer matches the source mesh")

    ash = mesh.attributes.get("hollow_ash_crust")
    if ash is None:
        ash = mesh.attributes.new("hollow_ash_crust", "FLOAT", "POINT")
    ash_count = 0
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        damage = 0.0
        for _, cx, cz, rx, rz, energy in REGIONS:
            distance = ((x - cx) / (rx * 2.9)) ** 2 + \
                       ((z - cz) / (rz * 2.6)) ** 2
            # Surface-bound, not a particle or an emission halo.
            damage = max(damage, energy * math.exp(-0.90 * distance))
        value = min(0.78, 0.09 + 0.58 * damage +
                    0.13 * heat.data[vertex.index].value)
        ash.data[vertex.index].value = value
        ash_count += value > 0.25

    for material in mesh.materials:
        if not material or not material.use_nodes:
            raise ValueError("Expected Work's existing source-node materials")
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        output = next((node for node in nodes
                       if node.type == "OUTPUT_MATERIAL"), None)
        if not output or not output.inputs["Surface"].is_linked:
            raise ValueError("Material output has no source shader")
        fire_add = output.inputs["Surface"].links[0].from_node
        if fire_add.type != "ADD_SHADER" or not fire_add.inputs[0].is_linked:
            raise ValueError("Cannot preserve original inner-fire layering")
        if not fire_add.inputs[1].is_linked:
            raise ValueError("Existing source-bound fire is missing")
        ember_shader = fire_add.inputs[1].links[0].from_node
        if ember_shader.type != "EMISSION" or not ember_shader.inputs["Strength"].is_linked:
            raise ValueError("Existing mesh-bound ember shader changed")
        ember_control = ember_shader.inputs["Strength"].links[0].from_node
        if ember_control.type != "MATH" or ember_control.operation != "MULTIPLY":
            raise ValueError("Existing authored ember strength control changed")
        # Modest art-candidate enhancement; retain exactly the same vertex mask
        # and socket so future engine-driven attack charge/cooling still works.
        ember_control.inputs[1].default_value = max(
            1.2, ember_control.inputs[1].default_value
        )
        base_link = fire_add.inputs[0].links[0]
        base_socket = base_link.from_socket
        links.remove(base_link)

        attribute = nodes.new("ShaderNodeAttribute")
        attribute.attribute_name = "hollow_ash_crust"
        factor = nodes.new("ShaderNodeMath")
        factor.operation = "MULTIPLY"
        factor.inputs[1].default_value = 0.76
        links.new(attribute.outputs["Fac"], factor.inputs[0])
        charcoal = nodes.new("ShaderNodeBsdfPrincipled")
        charcoal.inputs["Base Color"].default_value = (0.028, 0.020, 0.016, 1)
        charcoal.inputs["Roughness"].default_value = 0.97
        mix = nodes.new("ShaderNodeMixShader")
        links.new(factor.outputs[0], mix.inputs[0])
        links.new(base_socket, mix.inputs[1])
        links.new(charcoal.outputs["BSDF"], mix.inputs[2])
        links.new(mix.outputs[0], fire_add.inputs[0])

    return {"ashMappedVertices": ash_count,
            "materialsWithRetainedInternalFire": len(mesh.materials)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:]
                             if "--" in sys.argv else [])
    source = args.source.resolve()
    output = args.output.resolve()
    if source == output or output.exists():
        raise ValueError("Output must be a NEW versioned file, never overwrite")
    manifest = source.with_name("source-manifest.json")
    if not manifest.exists():
        raise ValueError("Foundation manifest missing; cannot prove provenance")
    foundation = json.loads(manifest.read_text(encoding="utf-8"))
    if not foundation.get("cloth", {}).get("removedLongClothVertices"):
        raise ValueError("Input lacks the earlier AN hanging-cloth correction")
    if not foundation.get("emissionRegions"):
        raise ValueError("Input lacks the earlier source-based ember treatment")

    bpy.ops.wm.open_mainfile(filepath=str(source))
    actor = bpy.data.objects.get("Hollow skinned character")
    rig = bpy.data.objects.get("Hollow editable animation rig")
    if actor is None or rig is None or actor.type != "MESH":
        raise ValueError("Existing AN Blender source actors not found")
    if not any(mod.type == "ARMATURE" for mod in actor.modifiers):
        raise ValueError("Source skinning/animation rig was not preserved")
    bone_names = tuple(bone.name for bone in rig.data.bones)
    actor.data = actor.data.copy()
    cloth = remove_remaining_long_cloth(actor)
    debris = remove_detached_cloth_scraps(actor)
    islands = inspect_islands(actor)
    if islands["unreferencedVertices"] or islands["suspiciousClothIslands"]:
        raise ValueError(f"Detached cloth/loose vertices remain: {islands}")
    ash = add_ash_crust(actor)
    if bone_names != tuple(bone.name for bone in rig.data.bones):
        raise ValueError("Animation bone hierarchy changed during art polish")

    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    report = {
        "status": "ART_CANDIDATE_NOT_APPROVED",
        "source": str(source),
        "output": str(output),
        "existingClothFixRetained": True,
        "existingInternalEmbersRetained": True,
        "skeletonUnchanged": True,
        "cloth": cloth, "removedDetachedDebris": debris,
        "islands": islands, "ash": ash,
        "needsNativeAndMobileVisualReview": True,
        "animationEngineModified": False,
        "productionAssetsModified": False,
    }
    report_path = output.with_name("art-qc.json")
    report_path.write_text(json.dumps(report, indent=2) + "\n",
                           encoding="utf-8")
    print("HOLLOW_ART_QC", json.dumps(report))


if __name__ == "__main__":
    main()
