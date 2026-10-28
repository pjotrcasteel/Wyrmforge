#!/usr/bin/env python3
"""Screen an authored anatomical CC0 human skull + face as real Blender data.

Separately examines a possible anatomically correct source head, without
using AI concepts, creating an animation or touching WyrmForge runtime.
Original source file is downloaded in CI. No arbitrary third-party scripts
are executed; Blender library objects only, with actions stripped.

This is not a graft or production asset. Geometry, orientation, source
objects, actual camera renders and license evidence come first.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import bpy


def helper():
    path=Path(__file__).with_name("evaluate_free_character_blender.py")
    spec=importlib.util.spec_from_file_location("cc0_head_source_inspector_helper",path)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def inspect(src, out):
    h=helper()
    meshes=h.load_source(src)
    metadata=[]
    for obj in meshes:
        low,high=h.evaluated_mesh_bounds([obj])
        metadata.append({
            "name":obj.name,
            "vertices":len(obj.data.vertices),
            "faces":len(obj.data.polygons),
            "materials":[mat.name for mat in obj.data.materials if mat],
            "world_bounds_low":[round(float(v),5) for v in low],
            "world_bounds_high":[round(float(v),5) for v in high],
            "modifiers":[m.type for m in obj.modifiers],
            "hidden":bool(obj.hide_render),
        })
        obj.hide_render=False
    if len(meshes)<2:
        raise ValueError("Reference should include real skull + skin layers, not just a prop")
    if len(bpy.data.actions)>0:
        raise ValueError("Untrusted model imported executable/animation action")
    # Original author models in millimetre-scale Blender units. A camera
    # 7 units from a ~230-unit head was INSIDE the skull, showing black caps.
    # For a real proof normalize the whole original source to a fixed 3.1m
    # inspection height, preserve its geometry, then put cameras OUTSIDE.
    normalized=h.normalize(meshes,target_height=3.1)
    if abs(normalized["normalized_evaluated_height"]-3.1)>.06:
        raise ValueError("Camera is still inside the original oversized head")
    camera,clay,center=h.studio(meshes)
    h.render_study(out,camera,clay,"clay",center)
    h.render_study(out,camera,clay,"material",center)
    for variant, names in (
       ("external-skull-only",("skull","jaw")),
       ("external-face-only",("face",))
    ):
        for obj in meshes:
            obj.hide_render = obj.name.lower() not in names
        bpy.context.view_layer.update()
        camera.location=(center[0],center[1]-7,center[2]+3.35)
        h.look_at(camera,center)
        bpy.context.view_layer.material_override=clay
        bpy.context.scene.render.filepath=str(out/(variant+"-real-BLENDER.png"))
        bpy.ops.render.render(write_still=True)
        bpy.context.view_layer.material_override=None
    for obj in meshes:
        obj.hide_render=False
    bpy.context.view_layer.update()
    camera.location=(center[0]+5,center[1]-5,center[2]+3.0)
    h.look_at(camera,center)
    bpy.context.preferences.filepaths.save_version=0
    target=out/"external-anatomical-head-only-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    info={
        "external_author":"Drummyfish",
        "url":"https://opengameart.org/content/brain-and-skull",
        "license":"CC0-1.0 Universal, original source",
        "sha256":hashlib.sha256(src.read_bytes()).hexdigest(),
        "source_name":src.name,
        "geometry_objects":metadata,
        "normalized_source":normalized,
        "mesh_count":len(meshes),
        "total_vertices":sum(x["vertices"] for x in metadata),
        "animation_actions":len(bpy.data.actions),
        "candidate_approved":False,
        "grafted_to_wyrmforge":False,
        "gameplay_or_animation_engine_modified":False,
    }
    (out/"head-source-audit.json").write_text(json.dumps(info,indent=2)+"\n",encoding="utf-8")
    print("HEAD SOURCE MODEL INVENTORY",json.dumps(info,sort_keys=True))
    return info


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True,type=Path)
    p.add_argument("--output",required=True,type=Path)
    x=p.parse_args()
    output=x.output.resolve()
    permitted=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not output.is_relative_to(permitted):
        raise ValueError("Source heads must stay isolated")
    output.mkdir(parents=True,exist_ok=True)
    inspect(x.input.resolve(),output)
