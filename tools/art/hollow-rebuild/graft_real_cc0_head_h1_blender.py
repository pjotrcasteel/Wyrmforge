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

import bpy  # Register Blender's bundled native Python modules first.
import bmesh
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
    # The CC0 face is substantially denser than the earlier mannequin.
    # Audit the spatial extent and the percentage of the ORIGINAL source
    # skin instead of assuming a head always has <600 vertices.
    removed_world=[world[v.index] for v in deleted]
    outer=[p for p in removed_world
           if abs(p.x)>.46 or abs(p.y)>.52]
    max_allowed=min(950,int(before*.52))
    print("HEAD CUT AUDIT",{
        "all_skin_vertices":before,
        "vertices_above_neck":len(deleted),
        "max_allowed":max_allowed,
        "out_of_head_envelope":len(outer),
        "world_cut_z":cut_z,
        "min_world_z":round(min(p.z for p in removed_world),5),
        "max_world_z":round(max(p.z for p in removed_world),5),
    })
    if not 100<len(deleted)<max_allowed or outer:
        bm.free()
        raise ValueError(
            f"Unsafe source-head cutoff: {len(deleted)}/{before} vertices, "
            f"{len(outer)} outside the allowed anatomical head envelope")
    bmesh.ops.delete(bm,geom=deleted,context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()
    remaining=len(body.data.vertices)
    if remaining>=before or remaining<before-max_allowed:
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
    # The CC0 source has under 1,000 face polygons. Before making a real
    # torn skin boundary, create enough anatomical edge resolution to avoid
    # the rejected blocky polygon staircase across the brow and cheek.
    bmesh.ops.subdivide_edges(
        bm,edges=list(bm.edges),cuts=1,use_grid_fill=True)
    before=len(bm.faces)
    faces=[]
    for f in bm.faces:
        center=f.calc_center_median()
        x,y,z=center
        # Original source is in mm-scale coordinates. Choose a damaged
        # asymmetrical cheek/temple near the orbit. Avoid amputating nose,
        # remaining cheek or all lips.
        # Concentrate the opening around one damaged orbit and zygomatic
        # cheek instead of erasing the entire left face and forehead.
        # Unequal radii and a low-amplitude irregular boundary create
        # torn skin, not an artificial half-skull / terminator mask.
        r=((x+40)/35)**2+((z-62)/49)**2
        edge=(.075*math.sin(.095*z+.16*x)
              +.045*math.sin(.23*z-.11*x))
        if r+edge<1.0 and y<0:
            faces.append(f)
    if len(faces)<8 or len(faces)>before*.4:
        bm.free()
        raise ValueError(f"Unsafe facial-cutout geometry ({len(faces)}/{before})")
    bmesh.ops.delete(bm,geom=faces,context="FACES")
    # Give the wound border actual tissue thickness, without detached
    # decal planes, dark face buttons or emissive masking.
    for vert in bm.verts:
        x,y,z=vert.co
        if vert.is_boundary and y<0 and -82<x<5 and 4<z<117:
            vert.co.y-=2.0+1.25*math.sin(.16*x+.19*z)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return len(faces)


def retain_only_anatomical_neck_tissue(mesh):
    """Use true skull/bone facial anatomy instead of a half-human face mask.

    Remove the *facial skin* above the throat, retain the CC0 neck section
    and flare its existing topology to meet the injured shoulder area.
    There is no black mask, hidden human head, or detached cosmetic overlay.
    """
    bm=bmesh.new()
    bm.from_mesh(mesh)
    total=len(bm.faces)
    removed=[face for face in bm.faces
             if face.calc_center_median().z > -22.0]
    if not total*.65<len(removed)<total*.99:
        bm.free()
        raise ValueError(
            f"Neck preservation unexpectedly retained a normal face: {len(removed)}/{total}")
    bmesh.ops.delete(bm,geom=removed,context="FACES")
    # Discard truly orphaned cut-skin vertices: otherwise disconnected
    # landmarks can survive the cut as little bright spots above the skull.
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm,geom=loose,context="VERTS")
    flared=0
    for vert in bm.verts:
        x,y,z=vert.co
        if z< -22:
            taper=max(0.0,min(1.0,(-22-z)/35))
            vert.co.x=x*(1+.38*taper)
            vert.co.y=y*(1+.31*taper)
            flared+=1
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if flared<20 or not mesh.polygons:
        raise ValueError("Skull-dominant candidate lost the physical neck tissue")
    return len(removed)


def fracture_surviving_skin(mesh):
    """Original asymmetric deformation of the surviving CC0 facial tissue.

    Do not hide a normal stock human behind shadows. The intact side still
    needs a sunken orbit and contracted jawline, without replacing the real
    anatomical surface with a black face-mask texture.
    """
    altered=0
    for vert in mesh.vertices:
        x,y,z=vert.co
        if y>9 or z< -50:
            continue
        cheek=math.exp(-(((x+37)/37)**2+((z-27)/42)**2))
        brow=math.exp(-(((x-18)/44)**2+((z-83)/26)**2))
        jaw=math.exp(-(((x-18)/33)**2+((z+18)/27)**2))
        dx=3.8*cheek-2.5*jaw
        dy=6.5*cheek+4.6*brow+4.5*jaw
        dz=-2.5*brow-3.0*jaw
        if abs(dx)+abs(dy)+abs(dz)>.025:
            vert.co.x+=dx
            vert.co.y+=dy
            vert.co.z+=dz
            altered+=1
    mesh.update()
    if altered<30:
        raise ValueError(f"Insufficient surviving face anatomy sculpt: {altered}")
    return altered


def graft_obj(source,part,rig,target_transform,material_obj,body,variant):
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
    cut=0
    changed_skin=0
    if part=="face":
        if variant=="skull-dominant":
            cut=retain_only_anatomical_neck_tissue(clone)
        else:
            cut=hole_in_real_face(clone)
            changed_skin=fracture_surviving_skin(clone)
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
    # Source facial topology is low-poly; restoring one level of the
    # author's original subdivision makes actual cheek/jaw contours legible.
    smooth=obj.modifiers.new("Anatomical source curvature","SUBSURF")
    smooth.levels=1
    smooth.render_levels=1
    obj["source_CC0"]="Drummyfish Brain and Skull"
    obj["original_url"]=HEAD_URL
    obj["source_art_only"]=True
    obj["engine_integration"]=False
    obj["animation_actions_added"]=0
    return obj,{"mesh_vertices":len(clone.vertices),
                "mesh_faces":len(clone.polygons),
                "sculpted_surviving_face_vertices":changed_skin,
                "damaged_face_polygons_removed":cut,
                "bone":bone_name}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--body",type=Path,required=True)
    p.add_argument("--head-source",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--variant",choices=("skull-dominant","facial-cutaway"),
                   default="skull-dominant")
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
        obj,meta=graft_obj(donor[part],part,rig,transformation,mat,body,args.variant)
        made[part]=meta
    if made["face"]["damaged_face_polygons_removed"]<8:
        raise ValueError("No real skin opening, old fake skull has returned")
    # Original donor datablocks are NOT scene meshes and must not influence
    # framing or silently remain as giant offstage source parts in the .blend.
    for original in donor.values():
        bpy.data.objects.remove(original,do_unlink=True)
    if args.variant=="skull-dominant" and made["face"]["sculpted_surviving_face_vertices"]!=0:
        raise ValueError("Skull candidate must not keep the old half-human face sculpt")
    if len(bpy.data.actions)>0:
        raise ValueError("An animation action was created by head source graft")

    # Truly rendered source proof, first full 8-way with neutral clay, then
    # detailed front and quarter FACE closeups at 512px.
    helper=renderer()
    live=[o for o in bpy.context.scene.objects
          if o.type=="MESH" and not o.hide_render]
    low,high=helper.evaluated_mesh_bounds(live)
    center=tuple((low+high)/2)
    dims=high-low
    if not 2.0<float(dims.z)<5.0:
        raise ValueError(f"Source scene framing includes a stray donor: {tuple(dims)}")
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
      "head_appearance_variant":args.variant,
      "active_visible_source_meshes":len(live),
      "framed_model_height_m":round(float(dims.z),4),
      "framed_model_width_m":round(float(dims.x),4),
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
