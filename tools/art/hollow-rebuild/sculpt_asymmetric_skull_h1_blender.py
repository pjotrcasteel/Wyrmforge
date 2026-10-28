#!/usr/bin/env python3
"""Original HUMAN-undead skull-source reconstruction, no animations.

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
    keys=mesh.data.shape_keys.key_blocks if mesh.data.shape_keys else []
    if len(keys)<4:
        raise ValueError("Source requires original, torso, and connected claw keys")
    previous=keys[-1]
    if previous.value<.99:
        raise ValueError("Connected claw source key must be active")
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    evaluated=mesh.evaluated_get(deps)
    data=evaluated.to_mesh()
    try:
        if len(data.vertices)!=len(mesh.data.vertices):
            raise ValueError("Head reconstruction lost original skin topology")
        world_normals=[(mesh.matrix_world@v.co,
                        (mesh.matrix_world.to_3x3()@v.normal).normalized())
                       for v in data.vertices]
    finally:
        evaluated.to_mesh_clear()
    skull=mesh.shape_key_add(name="H1 3D asymmetrical bone orbits and human mandible — UNAPPROVED",
                              from_mix=False)
    skull.relative_key=previous
    inverse=mesh.matrix_world.inverted().to_3x3()
    changed=0
    max_depth=0.
    for idx,(loc,normal) in enumerate(world_normals):
        x,y,z=loc
        if z<2.72 or z>3.35 or normal.y>-.20:
            skull.data[idx].co=previous.data[idx].co
            continue
        # Unequal orbital hollows. Brow/lid edges rise as the orbital
        # centre recedes. The original full HEAD remains a connected mesh.
        orbits=(
            (-.085,2.885,.082,.065,.068),
            (.092,2.855,.074,.065,.050)
        )
        relief=0.
        for xc,zc,rx,rz,depth in orbits:
            radial=math.sqrt(((x-xc)/rx)**2+((z-zc)/rz)**2)
            inside=max(0.,1.-radial**2)
            raised=.030*bell(radial,1.02,.20)
            relief+=depth*inside - raised
        # A battered human cheek and asymmetrical jaw, not a wolf muzzle.
        left_cheek=bell(x,-.135,.085)*bell(z,2.755,.075)
        right_cheek=bell(x,.145,.080)*bell(z,2.780,.075)
        relief+=.040*right_cheek-.022*left_cheek
        jaw=bell(z,2.705,.09)*bell(x,.02,.175)
        side_shift=.030*jaw
        source_delta=Vector((side_shift,relief+.026*jaw,-.019*jaw))
        if source_delta.length>.002:
            skull.data[idx].co=previous.data[idx].co+inverse@source_delta
            changed+=1
            max_depth=max(max_depth,relief)
        else:
            skull.data[idx].co=previous.data[idx].co
    skull.value=1.
    bpy.context.view_layer.update()
    if changed<10:
        raise ValueError("Head sculpt didn't change enough connected human skull vertices")
    return changed,round(max_depth,5)


def material(name,color):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=.98
    shader.inputs["Emission Strength"].default_value=0.0
    return mat


def add_orbit_material(mesh):
    """Select only first front hits on evaluated human skull surface."""
    black=material("Hollowed recessed bone orbit shadow — NO glow",(.030,.024,.021))
    skin_slots=len(mesh.data.materials)
    mesh.data.materials.append(black)
    dag=bpy.context.evaluated_depsgraph_get()
    tree=BVHTree.FromObject(mesh,dag)
    local=mesh.matrix_world.inverted()
    direction=local.to_3x3()@Vector((0,1,0))
    max_distance=18*direction.length
    direction.normalize()
    eye_sets=[]
    eye_centres=(
        (-.085,2.885,.093,.073),
        (.092,2.855,.084,.074),
    )
    for xc,zc,rx,rz in eye_centres:
        selected=set()
        for row in range(13):
            z=zc-rz+2*rz*row/12
            for col in range(13):
                x=xc-rx+2*rx*col/12
                radial=((x-xc)/rx)**2+((z-zc)/rz)**2
                if radial>1.0:
                    continue
                start=local@Vector((x,-9,z))
                point,normal,index,distance=tree.ray_cast(start,direction,max_distance)
                if point is None or index is None:
                    continue
                selected.add(index)
        eye_sets.append(selected)
    if min(len(s) for s in eye_sets)<1:
        raise ValueError(f"At least one orbital region has no real first-hit face: {[len(s) for s in eye_sets]}")
    front_faces=eye_sets[0]|eye_sets[1]
    for polygon in mesh.data.polygons:
        if polygon.index in front_faces:
            polygon.material_index=skin_slots
    return len(eye_sets[0]),len(eye_sets[1]),len(front_faces)


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
    changed,depth=skull_deformation(mesh)
    left,right,faces=add_orbit_material(mesh)
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
    target=out/"hollowed-h1-skull-ribcage-connected-claws-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    qc={
        "status":"H1 human skull anatomy source — VISUALLY UNAPPROVED",
        "source_original":"City Building Game Art CC0 Horror Monster",
        "connected_skull_vertices_sculpted":changed,
        "maximum_orbital_depth_m":depth,
        "orbital_left_faces":left,
        "orbital_right_faces":right,
        "actual_visible_orbit_faces":faces,
        "original_source_rig_bones":len(rig.data.bones),
        "original_source_skin_topology_preserved":True,
        "created_mesh_fragments":0,
        "source_animation_actions":len(bpy.data.actions),
        "game_engine_modified":False,
        "owner_approved":False,
        "saved_blend":target.name,
    }
    (out/"h1-skull-source-qc.json").write_text(json.dumps(qc,indent=2)+"\n",
                                               encoding="utf-8")
    print("SKULL SOURCE QA:",json.dumps(qc,sort_keys=True))


if __name__=="__main__":
    main()
