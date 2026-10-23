#!/usr/bin/env python3
"""Export ORIGINAL Blender tree geometry as a camera-space RGBA normal pass.

Usage (Blender 4.3.x in CI):
    blender -b -t 4 --python tools/art/render_tree_camera_normals.py -- \
      --blend artifacts/wet-forest/ancient_oak/ancient_oak.blend \
      --output artifacts/wet-forest/ancient_oak/ancient_oak-camera-normals.png

This NEVER saves/overwrites the original .blend or changes candidate albedo art.
The output is experimental review data (not an approved in-game normal atlas).
"""
import argparse
import sys
from pathlib import Path

import bpy


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--blend", type=Path, required=True)
    args.add_argument("--output", type=Path, required=True)
    options = args.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])

    source = options.blend.resolve()
    target = options.output.resolve()
    if not source.is_file() or source.suffix.lower() != ".blend":
        args.error("An existing editable .blend model is required")
    if source == target:
        args.error("Refusing to overwrite the editable source")
    target.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    if scene.camera is None:
        raise RuntimeError("Normal pass requires the same canonical 2.5D camera as albedo")

    # One temporary material override for every original 3D surface. Object
    # geometry, camera, silhouette and real face normals remain unchanged.
    normal_mat = bpy.data.materials.new("L4 technical camera-space normal pass (unsaved)")
    normal_mat.use_nodes = True
    nodes = normal_mat.node_tree.nodes
    links = normal_mat.node_tree.links
    nodes.clear()
    geometry = nodes.new("ShaderNodeNewGeometry")
    transform = nodes.new("ShaderNodeVectorTransform")
    transform.vector_type = 'NORMAL'
    transform.convert_from = 'WORLD'
    transform.convert_to = 'CAMERA'
    mapper = nodes.new("ShaderNodeVectorMath")
    mapper.operation = 'MULTIPLY_ADD'
    mapper.inputs[1].default_value = (0.5, 0.5, 0.5)
    mapper.inputs[2].default_value = (0.5, 0.5, 0.5)
    emission = nodes.new("ShaderNodeEmission")
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(geometry.outputs["Normal"], transform.inputs["Vector"])
    links.new(transform.outputs["Vector"], mapper.inputs[0])
    links.new(mapper.outputs["Vector"], emission.inputs["Color"])
    links.new(emission.outputs["Emission"], output.inputs["Surface"])

    bpy.context.view_layer.material_override = normal_mat
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    # Raw preserves the vector's 0..1 encoding without cinematic tone mapping.
    scene.view_settings.view_transform = "Raw"
    scene.render.filepath = str(target)
    bpy.ops.render.render(write_still=True)
    if not target.exists() or target.stat().st_size < 5000:
        raise RuntimeError(f"Camera normal pass missing or empty: {target}")
    print("Normal map generated from ORIGINAL Blender geometry:", target)
    print("Editable source remains unchanged:", source)


if __name__ == "__main__":
    main()
