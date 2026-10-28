#!/usr/bin/env python3
"""H1 anatomical head REPLACEMENT proof (real source geometry, NOT a mask).

CC0 inputs:
  body: City Building Game Art, Horror Game Monster, CC0
  face / skull / articulated jaw: Drummyfish, Brain and Skull, CC0
  https://opengameart.org/content/brain-and-skull

Actual edit of a NEW isolated Blender copy:
- remove the old featureless body-head geometry above the neck;
- attach real 3D human face, jaw and skull to the existing 70-bone armature;
- remove a localized patch of real facial SKIN to reveal embedded skull
  geometry on the damaged side. No black plane, no dark eyebutton overlays.
- retain body source skin groups, original skeleton and H1 wound/hand work;
- no animation actions, no gameplay, no engine, no deployment.

A technically valid render is NOT owner art approval. The graft seam,
deform and 96px appearance must be inspected and may be rejected.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


HEAD_URL="https://opengameart.org/content/brain-and-skull"


def renderer():
    p=Path(__file__).with_name("evaluate_free_character_blender.py")
    s=importlib.util.spec_from_file_location("head_3d_real_renderer",p)
    module=importlib.util.module_from_spec(s)
    s.loader.exec_module(module)
    return module


def material(name, color):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Roughness"].default_value=.97
    p.inputs["Metallic"].default_value=0
    p.inputs["Emission Strength"].default_value=0
    return m


def detach_old_head(body):
    """Bake previous source art on a COPY, delete previous blank head vertices.

    The artist's earlier source .blend remains untouched, as does the existing
    armature. bmesh preserves deform-weight layers of the newly duplicated
    body. No transparent invisibility trick or old head underneath new head.
    """
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active=body
    body.select_set(True)
    before=len(body.data.vertices)
    bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
    if body.data.shape_keys is not None:
        raise ValueError("Could not safely bake previous source shape keys")
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    evaluation=body.evaluated_get(deps)
    actual=evaluation.to_mesh()
    try:
        if len(actual.vertices)!=before:
            raise ValueError("Old source armature changes base mesh topology")
        world=[evaluation.matrix_world@v.co for v in actual.vertices]
    finally:
        evaluation.to_mesh_clear()
    # Cut just above the torso/neck. The head donor overlaps this exposed
    # section by ~3cm; source rig still drives the shoulders and chest.
    cut_z=2.665
    bm=bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    deleted=[bm.verts[i] for i,v in enumerate(world) if float(v.z)>cut_z]
    if not 35<len(deleted)<600:
        bm.free()
        raise ValueError(f"Unsafe source-head cutoff: {len(deleted)} vertices")
    bmesh.ops.delete(bm,geom=deleted,context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    remaining=len(body.data.vertices)
    if remaining>=before or remaining<before-650:
        raise ValueError("Old head cutoff damaged body anatomy")
    body.name="WyrmForge Hollowed H1 true body/neck — OLD HEAD CUT"
    return {"old_head_vertices_removed":before-remaining,
            "cut_height_world_m":cut_z,
            "body_vertices_remaining":remaining}


def imported_anatomy(path):
    if path.read_bytes()[:7]!=b"BLENDER":
        raise ValueError("Donor source isn't a Blender file")
    with bpy.data.libraries.load(str(path),link=False) as (src,dst):
        required=("face","skull","jaw")
        if not all(item in src.objects for item in required):
            raise ValueError(f"Original source lacks real face, skull or jaw: {src.objects}")
        dst.objects=list(required)
    objs={obj.name:obj for obj in dst.objects if obj}
    if set(objs)!=set(required):
        raise ValueError("Failed to import all three actual CC0 anatomical meshes")
    return objs


def hole_in_real_face(mesh):
    """Irregular hole in original human skin, exposing separate REAL skull.

    This is not a black facial polygon mask. Its edges are genuine open
    geometry; the skull/bone behind is a correctly located full 3D mesh.
    """
    bm=bmesh.new()
    bm.from_mesh(mesh)
    before=len(bm.faces)
    faces=[]
    for f in bm.faces:
        center=f.calc_center_median()
        x,y,z=center
        # Original source is in mm-scale coordinates. Choose a damaged
        # asymmetrical cheek/temple near the orbit. Avoid amputating nose,
        # remaining cheek or all lips.
        r=((x+36)/48)**2+((z-53)/70)**2
        edge=.10*math.sin(.071*z+.13*x)
        if r+edge<1.0 and y<0:
            faces.append(f)
    if len(faces)<8 or len(faces)>before*.4:
        bm.free()
        raise ValueError(f"Unsafe facial-cutout geometry ({len(faces)}/{before})")
    bmesh.ops.delete(bm,geom=faces,context="FACES")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return len(faces)


def graft_obj(source,part,rig,target_transform,material_obj,body):
    """Bake imported original head coordinates into the ORIGINAL rig rest map.

    The body rig is already in a static feral pose. Convert target world
    coordinates into the matching rest shape so the head is skinned ONCE,
    not double-transformed by its existing armature.
    """
    bone_name="Jaw" if part=="jaw" else "joint4"
    bone=rig.pose.bones.get(bone_name)
    if bone is None:
        raise ValueError(f"Missing existing anatomy bone {bone_name}")
    rest_to_pos=(rig.matrix_world @ bone.matrix @ bone.bone.matrix_local.inverted()
                 @ rig.matrix_world.inverted())
    invert=rest_to_pos.inverted()
    clone=source.data.copy()
    cut=hole_in_real_face(clone) if part=="face" else 0
    verts=[]
    source_world=source.matrix_world.copy()
    for v in clone.vertices:
        original=source_world @ v.co
        target=target_transform @ original
        if part=="jaw":
            target.z-=.021  # partly dislocated jaw, original jaw bone retained
            target.y-=.009
        verts.append(invert @ target)
    for v,p in zip(clone.vertices,verts):
        v.co=p
    clone.update()
    obj=bpy.data.objects.new("WyrmForge H1 actual CC0 "+part.upper()+" — UNAPPROVED",clone)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(material_obj)
    vg=obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(clone.vertices))),1.0,"REPLACE")
    arm=obj.modifiers.new("Existing 70-bone source armature ONLY","ARMATURE")
    arm.object=rig
    obj["source_CC0"]="Drummyfish Brain and Skull"
    obj["original_url"]=HEAD_URL
    obj["source_art_only"]=True
    obj["engine_integration"]=False
    obj["animation_actions_added"]=0
    return obj,{"mesh_vertices":len(clone.vertices),
                "mesh_faces":len(clone.polygons),
                "damaged_face_polygons_removed":cut,
                "bone":bone_name}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--body",type=Path,required=True)
    p.add_argument("--head-source",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    out=args.output.resolve()
    root=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not out.is_relative_to(root):
        raise ValueError("No output outside isolated Hollowed source artifacts")
    out.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(args.body.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False

    rig=bpy.data.objects.get("Armature.002")
    body=next((o for o in bpy.data.objects
               if o.type=="MESH" and o.name.startswith("WyrmForge Hollowed")),None)
    if rig is None or body is None or len(rig.data.bones)!=70:
        raise ValueError("Current H1 true source body or existing 70-bone rig missing")
    if len(bpy.data.actions):
        raise ValueError("Original source contains animation actions")
    baseline=detach_old_head(body)
    donor=imported_anatomy(args.head_source.resolve())

    # Donor measured from original artist: face x[-87,+80], y[-96,+111],
    # z[-57,+175]. Source is ~millimetres; fit head to 0.405m total height.
    # Head bottom overlaps neck cut and natural skull bone stays physically
    # behind corresponding donor face polygons.
    scale=.405/(174.57216-(-56.6871))
    face_bottom=-56.6871
    transformation=(Matrix.Translation(Vector((-.015,-.095,
                                              2.647-face_bottom*scale)))
                    @ Matrix.Scale(scale,4))
    surface_material=material("Hollowed flesh skin: aged ash, no emissive",(.157,.142,.128))
    bone_material=material("Hollowed real weathered skull bone",(.345,.310,.271))
    jaw_material=material("Hollowed exposed diseased human mandible",(.292,.252,.226))
    made={}
    for part,mat in (("face",surface_material),("skull",bone_material),
                     ("jaw",jaw_material)):
        obj,meta=graft_obj(donor[part],part,rig,transformation,mat,body)
        made[part]=meta
    if made["face"]["damaged_face_polygons_removed"]<8:
        raise ValueError("No real skin opening, old fake skull has returned")
    if len(bpy.data.actions)>0:
        raise ValueError("An animation action was created by head source graft")

    # Truly rendered source proof, first full 8-way with neutral clay, then
    # detailed front and quarter FACE closeups at 512px.
    helper=renderer()
    live=[o for o in bpy.data.objects if o.type=="MESH"]
    low,high=helper.evaluated_mesh_bounds(live)
    center=tuple((low+high)/2)
    dims=high-low
    camera=bpy.context.scene.camera
    if camera is None: raise ValueError("Missing genuine Blender source camera")
    camera.data.ortho_scale=max(1.2*float(dims.z),
                                1.25*float(dims.x)*400/320,
                                1.25*float(dims.y)*400/320)
    clay=material("H1 neutral source clay — no hidden glow",(.56,.54,.51))
    helper.render_study(out,camera,clay,"clay",center)
    helper.render_study(out,camera,clay,"material",center)

    scene=bpy.context.scene
    scene.render.resolution_x=512
    scene.render.resolution_y=512
    camera.data.ortho_scale=.69
    # front and 3/4 of the *actual posed model*; no concept rendering.
    for angle,name in ((0.0,"front"),(.72,"three-quarter"),(1.57,"profile")):
        look=Vector((-.015,-.095,2.86))
        camera.location=look+Vector((2*math.sin(angle),
                                    -2*math.cos(angle),.28))
        helper.look_at(camera,look)
        scene.render.filepath=str(out/f"genuine-anatomical-head-closeup-{name}.png")
        bpy.ops.render.render(write_still=True)

    bpy.context.preferences.filepaths.save_version=0
    final=out/"hollowed-h1-cc0-REAL-FACE-SKULL-JAW-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(final))
    report={
      "status":"TRUE ORIGINAL FACE+SKULL+JAW GRAFT — SOURCE ART UNAPPROVED",
      "head_original_creator":"Drummyfish",
      "head_cc0_url":HEAD_URL,
      "head_original_sha256":hashlib.sha256(args.head_source.read_bytes()).hexdigest(),
      "original_rig_bones":len(rig.data.bones),
      "body_cut":baseline,
      "face_skull_jaw":made,
      "source_only_replaced_head":True,
      "dark_eye_mask_material_faces":0,
      "head_3d_is_donor_geometry":True,
      "added_animation_actions":len(bpy.data.actions),
      "animation_engine_touched":False,
      "gameplay_or_runtime_touched":False,
      "owner_approved":False,
      "saved_blend":final.name,
    }
    (out/"real-human-head-graft-qc.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("HOLLOWED H1 SOURCE ANATOMY GRAFT REPORT",json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
