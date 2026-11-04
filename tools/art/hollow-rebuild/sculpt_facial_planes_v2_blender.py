#!/usr/bin/env python3
"""Subtle sculpted HUMAN facial planes — replaces REJECTED black orbital mask.

Actual source geometry is an added reversible shape key on the *connected*
CC0 skinned head, with asymmetric orbital depression and mandible shape.
First-hit evaluated skin selects dark eye-socket materials; NONE are
detached black buttons, emissive sprites, or pasted decals.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def bell(v,center,width):
    return math.exp(-((v-center)/width)**2)


def source_renderer():
    path=Path(__file__).with_name("evaluate_free_character_blender.py")
    spec=importlib.util.spec_from_file_location("source_render",path)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def skull_deformation(mesh):
    """Real connected facial planes; NO BLACK MASK OR DETACHED ORBITS.

    The rejected H1 v1 painted ~63 low-poly faces dark and looked like a
    cartoon Halloween mask. This study sculpts entirely in face geometry
    instead: bone brow, cheekbone, nasal ridge, modest orbital relief and an
    asymmetric mandible. All dimensions are physical 3D source metres.
    """
    keys=mesh.data.shape_keys.key_blocks if mesh.data.shape_keys else []
    if len(keys)<4:
        raise ValueError("Expected untouched CC0 source, torso and connected claws")
    previous=keys[-1]
    if previous.value<.99:
        raise ValueError("Last connected source shape key must be active")
    bpy.context.view_layer.update()
    dag=bpy.context.evaluated_depsgraph_get()
    evaluated=mesh.evaluated_get(dag)
    try:
        data=evaluated.to_mesh()
        if len(data.vertices)!=len(mesh.data.vertices):
            raise ValueError("Facial source topology changed")
        points=[(mesh.matrix_world@v.co,
                 (mesh.matrix_world.to_3x3()@v.normal).normalized())
                for v in data.vertices]
    finally:
        evaluated.to_mesh_clear()
    key=mesh.shape_key_add(
        name="H1 connected bone brow cheek and human jaw — NO FACE MASK",
        from_mix=False)
    key.relative_key=previous
    inv=mesh.matrix_world.inverted().to_3x3()
    changed=0
    maximum=0.
    face_changes=0
    for idx,(pos,norm) in enumerate(points):
        x,y,z=pos
        if z<2.685 or z>3.145 or norm.y>-.12:
            key.data[idx].co=previous.data[idx].co
            continue
        # Individual anatomical landmarks, with asymmetric sizes/depths.
        left_brow=bell(x,-.090,.077)*bell(z,2.943,.037)
        right_brow=bell(x,.095,.075)*bell(z,2.916,.035)
        left_orbit=bell(x,-.085,.055)*bell(z,2.879,.040)
        right_orbit=bell(x,.091,.050)*bell(z,2.854,.041)
        cheek=bell(x,-.148,.073)*bell(z,2.797,.064)
        other_cheek=bell(x,.151,.067)*bell(z,2.788,.070)
        nose_bridge=bell(x,.007,.044)*bell(z,2.855,.096)
        damaged_mandible=bell(x,.054,.137)*bell(z,2.716,.062)
        # Negative Y = bone extends naturally toward viewer. The subtle
        # orbital recesses are actually inward, not painted black buttons.
        relief=(-.030*left_brow-.024*right_brow
                +.020*left_orbit+.016*right_orbit
                -.024*nose_bridge-.014*cheek
                +.009*other_cheek+.022*damaged_mandible)
        sideways=.023*damaged_mandible-.014*cheek
        down=-.010*damaged_mandible
        delta=Vector((sideways,relief,down))
        if delta.length>.0015:
            key.data[idx].co=previous.data[idx].co + inv@delta
            changed+=1
            if (left_brow+right_brow+cheek+other_cheek+nose_bridge)>0.13:
                face_changes+=1
            maximum=max(maximum,delta.length)
        else:
            key.data[idx].co=previous.data[idx].co
    key.value=1.
    bpy.context.view_layer.update()
    if changed<10 or face_changes<5 or maximum>.070:
        raise ValueError(f"Face source lacks controlled real sculpt: count={changed}, "
                         f"landmarks={face_changes}, max={maximum}")
    return changed,round(maximum,5),face_changes


def material(name,color):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=.98
    shader.inputs["Emission Strength"].default_value=0.0
    return mat




def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    out=args.output.resolve()
    base=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not out.is_relative_to(base):
        raise ValueError("Skull source can only write isolated art review")
    out.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    mesh=next((o for o in bpy.data.objects
               if o.type=="MESH" and o.name.startswith("WyrmForge Hollowed")),None)
    rig=bpy.data.objects.get("Armature.002")
    if not mesh or rig is None or len(rig.data.bones)!=70:
        raise ValueError("Original connected human-undead source or rig missing")
    before=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups))
    if bpy.data.actions:
        raise ValueError("No action clips permitted in skull reconstruction")
    materials_before=len(mesh.data.materials)
    changed,maximum,landmarks=skull_deformation(mesh)
    if len(mesh.data.materials)!=materials_before:
        raise ValueError("Facial sketch must NOT add dark mask material")
    after=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups))
    if before!=after:
        raise ValueError("Actual source skull topology or bone weights were destroyed")
    render=source_renderer()
    clay=material("H1 light neutral clay — reveal face geometry",(.54,.52,.49))
    objs=[obj for obj in bpy.data.objects if obj.type=="MESH"]
    low,high=render.evaluated_mesh_bounds(objs)
    centre=tuple((low+high)/2)
    dims=high-low
    camera=bpy.context.scene.camera
    camera.data.ortho_scale=max(1.20*float(dims.z),
                                1.22*float(dims.x)*400/320,
                                1.22*float(dims.y)*400/320)
    render.render_study(out,camera,clay,"clay",centre)
    render.render_study(out,camera,clay,"material",centre)
    camera.location=(centre[0]+5,centre[1]-5,centre[2]+3)
    render.look_at(camera,centre)
    if bpy.data.actions:
        raise ValueError("Skull sculpt unexpectedly added an animation")
    bpy.context.preferences.filepaths.save_version=0
    target=out/"hollowed-h1-sculpted-facial-planes-v2-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    qc={
        "status":"H1 human skull anatomy source — VISUALLY UNAPPROVED",
        "source_original":"City Building Game Art CC0 Horror Monster",
        "connected_skull_vertices_sculpted":changed,
        "max_facial_shape_change_m":maximum,
        "facial_landmark_vertices":landmarks,
        "added_dark_orbital_mask_faces":0,
        "dark_face_materials_added":0,
        "original_source_rig_bones":len(rig.data.bones),
        "original_source_skin_topology_preserved":True,
        "created_mesh_fragments":0,
        "source_animation_actions":len(bpy.data.actions),
        "game_engine_modified":False,
        "owner_approved":False,
        "saved_blend":target.name,
    }
    (out/"h1-facial-planes-source-qc.json").write_text(json.dumps(qc,indent=2)+"\n",
                                               encoding="utf-8")
    print("SKULL SOURCE QA:",json.dumps(qc,sort_keys=True))


if __name__=="__main__":
    main()
