#!/usr/bin/env python3
"""Read-only anatomical source audit of a real third-party model in Blender.

DO NOT use the previous Horror Game Monster/H1 body. This outputs an isolated
ARTIST MODEL CANDIDATE in neutral clay/silhouette for visual self-rejection.
It is NOT a Hollowed remake, an approved sculpt, an animation or gameplay.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw


VIEWS=("front", "front-right", "right", "back-right",
       "back", "back-left", "left", "front-left")


def bounds(meshes):
    graph=bpy.context.evaluated_depsgraph_get()
    low=Vector((float("inf"),)*3)
    high=Vector((float("-inf"),)*3)
    for obj in meshes:
        evaluated=obj.evaluated_get(graph)
        mesh=evaluated.to_mesh()
        try:
            for vert in mesh.vertices:
                p=evaluated.matrix_world @ vert.co
                for axis in range(3):
                    low[axis]=min(low[axis],p[axis])
                    high[axis]=max(high[axis],p[axis])
        finally:
            evaluated.to_mesh_clear()
    if not all(math.isfinite(v) for v in [*low,*high]):
        raise ValueError("Missing or invalid real 3D source mesh bounds")
    return low,high


def material(name,rgb,silhouette=False):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    node_tree=mat.node_tree
    if silhouette:
        node_tree.nodes.clear()
        output=node_tree.nodes.new("ShaderNodeOutputMaterial")
        emission=node_tree.nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value=(*rgb,1)
        node_tree.links.new(emission.outputs["Emission"],output.inputs["Surface"])
    else:
        bsdf=node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=(*rgb,1)
        bsdf.inputs["Roughness"].default_value=.92
        bsdf.inputs["Metallic"].default_value=0
    return mat


def look_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def render_views(path,meshes):
    scene=bpy.context.scene
    lo,hi=bounds(meshes)
    dims=hi-lo
    center=(lo+hi)/2
    camdata=bpy.data.cameras.new("Hollowed V2 actual-source audit camera")
    camera=bpy.data.objects.new("Hollowed V2 actual-source audit camera",camdata)
    scene.collection.objects.link(camera)
    scene.camera=camera
    camdata.type="ORTHO"
    camdata.ortho_scale=max(1.23*float(dims.z), 1.3*float(dims.x)*400/320,
                            1.3*float(dims.y)*400/320)
    for name,location,energy in (
        ("neutral left",Vector((-4,-5,6)),420),
        ("neutral right",Vector((4,3,5)),300)):
        src=bpy.data.lights.new(name,"AREA")
        obj=bpy.data.objects.new(name,src)
        scene.collection.objects.link(obj)
        obj.location=location
        src.energy=energy
        src.shape="DISK"
        src.size=4
        look_at(obj,center)
    scene.render.engine="CYCLES"
    scene.cycles.samples=8
    scene.render.resolution_x=320
    scene.render.resolution_y=400
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get("Background")
    clay=material("V2 candidate only NEUTRAL CLAY",(.63,.61,.57))
    dark=material("V2 candidate only BLACK SILHOUETTE",(.025,.026,.029),True)
    result={}
    for surface in ("clay","silhouette"):
        bpy.context.view_layer.material_override=clay if surface=="clay" else dark
        background.inputs["Color"].default_value=(
            (.075,.080,.089,1) if surface=="clay" else (.64,.64,.64,1))
        background.inputs["Strength"].default_value=1
        sheet=Image.new("RGB",(1280,800),(20,20,24))
        frames=[]
        for i,name in enumerate(VIEWS):
            angle=2*math.pi*i/8
            camera.location=(center.x+6*math.sin(angle),
                             center.y-6*math.cos(angle),center.z+.3)
            look_at(camera,center)
            scene.render.filepath=str(path/f"candidate-{surface}-{name}.png")
            bpy.ops.render.render(write_still=True)
            with Image.open(scene.render.filepath) as source:
                frame=source.convert("RGB")
            ImageDraw.Draw(frame).text((8,8),f"{name.upper()} | REAL 3D CANDIDATE",
                                       fill=(237,237,237) if surface=="clay"
                                       else (5,5,5))
            sheet.paste(frame,(i%4*320,i//4*400))
            frames.append(frame)
        sheet.save(path/f"candidate-{surface}-8VIEW-REAL-BLENDER.png")
        native=Image.new("RGB",(96*4,120*2))
        for i,frame in enumerate(frames):
            native.paste(frame.resize((96,120),Image.Resampling.BOX),
                         (i%4*96,i//4*120))
        native.save(path/f"candidate-{surface}-NATIVE96-REAL-BLENDER.png")
        if surface=="clay":
            frontsideback=Image.new("RGB",(960,400))
            for i,view in enumerate((0,2,4)):
                frontsideback.paste(frames[view],(i*320,0))
            frontsideback.save(path/"candidate-FRONT-SIDE-BACK-REAL-BLENDER.png")
    bpy.context.view_layer.material_override=None
    return {"evaluated_size_m":[round(float(x),4) for x in dims],
            "views":8,"native96_review":True,"actual_blender":True}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",required=True,type=Path)
    parser.add_argument("--output",required=True,type=Path)
    parser.add_argument("--license",required=True,type=Path)
    args=parser.parse_args()
    source=args.input.resolve()
    output=args.output.resolve()
    license_file=args.license.resolve()
    root=(Path.cwd()/"artifacts/hollowed-reference-v2").resolve()
    if output==root or not output.is_relative_to(root):
        raise ValueError("Candidate must remain in isolated source-audit artifacts")
    if not source.is_file() or not license_file.is_file():
        raise FileNotFoundError("Actual model source and provenance/license are mandatory")
    license_text=license_file.read_text(encoding="utf-8")
    if "CC BY 4.0" not in license_text or "Sotudios" not in license_text:
        raise ValueError("Candidate provenance is not verified")
    output.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source),automatic_bone_orientation=False)
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    if not meshes or sum(len(o.data.vertices) for o in meshes)<1000:
        raise ValueError("No genuine artist-authored candidate mesh imported")
    if bpy.data.actions:
        raise ValueError("No prior animation actions may affect source audit")
    for obj in meshes:
        if any(x in obj.name.lower() for x in
               ("horror game monster","hollowed h1","armature.002","drummyfish")):
            raise ValueError("Rejected old model lineage detected")
    original_lo,original_hi=bounds(meshes)
    if original_hi.z-original_lo.z<.01:
        raise ValueError("Artist model source is flattened")
    base_root=bpy.data.objects.new("Independent source-only candidate root",None)
    bpy.context.scene.collection.objects.link(base_root)
    for o in list(bpy.context.scene.objects):
        if o!=base_root and o.parent is None and o.type in {"MESH","ARMATURE","EMPTY"}:
            matrix=o.matrix_world.copy()
            o.parent=base_root
            o.matrix_world=matrix
    factor=2.8/float(original_hi.z-original_lo.z)
    base_root.scale=(factor,)*3
    bpy.context.view_layer.update()
    low,hi=bounds(meshes)
    base_root.location=(-(low.x+hi.x)/2,-(low.y+hi.y)/2,-low.z)
    bpy.context.view_layer.update()
    source_dims=bounds(meshes)
    view_qc=render_views(output,meshes)
    bpy.context.scene["hollowed_source_lineage"]="owner-reference-original-v2"
    bpy.context.scene["hollowed_source_author"]="Sotudios (independent third-party source)"
    bpy.context.scene["hollowed_provenance"]="https://sotudios.com/Assets/Undead-EnemyPack/"
    bpy.context.scene["hollowed_license"]="CC BY 4.0 attribution required"
    bpy.context.scene["candidate_only"]=True
    bpy.context.scene["owner_approved"]=False
    bpy.context.scene["previous_h1_reused"]=False
    bpy.context.preferences.filepaths.save_version=0
    dest=output/"ROTWalker-CANDIDATE-NOT-HOLLOWED-NOT-APPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    report={
      "warning":"UNAPPROVED THIRD-PARTY ANATOMY SOURCE: NOT THE HOLLOWED",
      "author":"Sotudios","original_model":source.name,
      "license":"CC BY 4.0 (attribution required)",
      "mesh_objects":len(meshes),
      "source_vertex_count":sum(len(o.data.vertices) for o in meshes),
      "source_actions":len(bpy.data.actions),
      "reused_previous_h1":False,
      "approved":False,
      "animation_engine_modified":False,
      "gameplay_modified":False,
      "view_qc":view_qc,
      "scene":dest.name,
    }
    (output/"candidate-audit.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("CANDIDATE ONLY, NOT APPROVED",json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
