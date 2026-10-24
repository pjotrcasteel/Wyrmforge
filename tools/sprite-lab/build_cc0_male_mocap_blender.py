#!/usr/bin/env python3
"""Create a REAL human-base-mesh / CMU BVH Blender retarget checkpoint.

This is an editable anatomy/motion proof, NOT owner-approved Gothic wizard art,
nor a production game atlas. It never imports the discarded procedural wizard.
"""
from __future__ import annotations
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

STUDY_START=140
STUDY_END=314
SAMPLES=[STUDY_START+int((STUDY_END-STUDY_START)*i/16) for i in range(16)]
TARGET="GEO-body_male_realistic"

def insist(condition,message):
    if not condition:
        raise RuntimeError("Human retarget source: "+message)

def closest_distance(p,a,b):
    delta=b-a
    length_sq=delta.length_squared
    t=0 if length_sq<1e-9 else max(0,min(1,(p-a).dot(delta)/length_sq))
    return (p-(a+delta*t)).length

def import_source(bvh):
    before={o.name for o in bpy.data.objects}
    bpy.ops.import_anim.bvh(filepath=str(bvh),axis_forward="-Z",axis_up="Y",frame_start=1,
                            rotate_mode="NATIVE",use_fps_scale=False,update_scene_fps=False)
    armatures=[o for o in bpy.data.objects if o.type=="ARMATURE" and o.name not in before]
    insist(len(armatures)==1,"BVH import did not create exactly one rig")
    arm=armatures[0];arm.name="CMU Human Walk Rig | source 07_04"
    insist(len(arm.data.bones)>=25,"missing captured humanoid joints")
    insist(arm.animation_data and arm.animation_data.action,"BVH contains no armature animation")
    names={b.name for b in arm.data.bones}
    insist({"Hips","Head","LeftFoot","RightFoot","LeftLeg","RightLeg"}.issubset(names),
           "missing actual human skeleton")
    return arm

def append_male_source(bundle):
    with bpy.data.libraries.load(str(bundle),link=False) as (src,dst):
        insist(TARGET in src.objects,"No realistic male CC0 base mesh in bundle")
        dst.objects=[TARGET]
    body=dst.objects[0]
    insist(body is not None and body.type=="MESH","male body asset was not loaded")
    bpy.context.scene.collection.objects.link(body)
    body.name="CC0 Realistic Male | original UV topology"
    insist(len(body.data.vertices)>=10000 and len(body.data.uv_layers)>0,
           "body mesh missing original geometry or UVs")
    for modifier in list(body.modifiers):
        body.modifiers.remove(modifier)
    # Original bundle arranges ~380 demo variants in a showroom grid.
    # Center ONLY this original mesh, not the entire source file.
    body.parent=None
    body.matrix_world.identity()
    return body

def normalize_body(body,arm):
    vertices=[v.co.copy() for v in body.data.vertices]
    mins=Vector(tuple(min(v[k] for v in vertices) for k in range(3)))
    maxs=Vector(tuple(max(v[k] for v in vertices) for k in range(3)))
    center=(mins+maxs)*.5
    b=[bone for bone in arm.data.bones if bone.length>1e-4]
    insist(len(b)>20,"collapsed source armature")
    endpoints=[p.copy() for bone in b for p in (bone.head_local,bone.tail_local)]
    rig_min=Vector(tuple(min(v[k] for v in endpoints) for k in range(3)))
    rig_max=Vector(tuple(max(v[k] for v in endpoints) for k in range(3)))
    rig_height=rig_max.z-rig_min.z
    mesh_height=maxs.z-mins.z
    insist(rig_height>5 and mesh_height>.5,"invalid capture/base mesh heights")
    scale=rig_height/mesh_height*.94
    target=Vector(((rig_min.x+rig_max.x)*.5,(rig_min.y+rig_max.y)*.5,rig_min.z+.47*rig_height))
    for v in body.data.vertices:
        v.co=(v.co-center)*scale+target
    body.data.update()
    return scale

def bind_skin(body,arm):
    # Explicit source-bound linear skin weights are deterministic. Bone heat
    # frequently fails on imported BVH joints (zero-length hip placeholders).
    height=max(v.co.z for v in body.data.vertices)-min(v.co.z for v in body.data.vertices)
    bones=[b for b in arm.data.bones if b.length>height*.016 and
           b.name not in {"Hips","LHipJoint","RHipJoint"}]
    insist(len(bones)>=15,"not enough usable source deform segments")
    groups={b.name:body.vertex_groups.new(name=b.name) for b in bones}
    for vertex in body.data.vertices:
        dists=sorted(((closest_distance(vertex.co,b.head_local,b.tail_local),b.name) for b in bones),
                     key=lambda pair:pair[0])[:4]
        weights=[1/(max(d,height*.013)**4) for d,_ in dists]
        denom=sum(weights)
        for (dist,name),weight in zip(dists,weights):
            groups[name].add([vertex.index],float(weight/denom),"REPLACE")
    body.parent=arm
    body.matrix_parent_inverse.identity()
    deform=body.modifiers.new("Real CMU skeleton / weighted male UV anatomy","ARMATURE")
    deform.object=arm
    deform.use_deform_preserve_volume=True
    insist(any(m.type=="ARMATURE" and m.object==arm for m in body.modifiers),"skinning failed")
    return len(bones)

def studio_scene(body,arm,output):
    scene=bpy.context.scene
    scene.render.engine="BLENDER_WORKBENCH"
    scene.render.resolution_x=384;scene.render.resolution_y=384
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False
    scene.display.shading.light="STUDIO"
    scene.display.shading.color_type="MATERIAL"
    material=bpy.data.materials.new("Neutral CC0 anatomy only | NOT Gothic art")
    material.diffuse_color=(.50,.47,.43,1)
    body.data.materials.clear();body.data.materials.append(material)
    # Bounds give a deterministic orthographic camera despite imported scale.
    coords=[v.co for v in body.data.vertices]
    bb_min=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
    bb_max=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    center=(bb_min+bb_max)*.5
    camera_data=bpy.data.cameras.new("Anatomy motion inspection camera")
    camera=bpy.data.objects.new("Anatomy motion inspection camera",camera_data)
    scene.collection.objects.link(camera)
    camera.location=center+Vector((0,-3.5,1.4))*((bb_max.z-bb_min.z)/2)
    target=center+Vector((0,0,-.08*(bb_max.z-bb_min.z)))
    direction=target-camera.location
    camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    camera_data.type="ORTHO";camera_data.ortho_scale=(bb_max.z-bb_min.z)*1.52
    scene.camera=camera
    scene.frame_start=SAMPLES[0]+1
    scene.frame_end=SAMPLES[-1]+1
    scene.render.filepath=str(output/"frame-00.png")
    return camera

def inspect_motion(body,arm,output):
    scene=bpy.context.scene
    data=[]
    root_initial=None
    # The import preserves the captured 120fps movement timeline. For review
    # the camera follows root translation, not by erasing true foot coordinates.
    camera=scene.camera
    camera_origin=camera.location.copy()
    for i,source_frame in enumerate(SAMPLES):
        scene.frame_set(source_frame+1)
        hips=arm.pose.bones.get("Hips")
        insist(hips is not None,"missing live hips pose")
        now=arm.matrix_world @ hips.head
        if root_initial is None:root_initial=now.copy()
        drift=now-root_initial
        camera.location=camera_origin+Vector((drift.x,drift.y,0))
        bpy.context.view_layer.update()
        left=arm.matrix_world @ arm.pose.bones["LeftFoot"].head
        right=arm.matrix_world @ arm.pose.bones["RightFoot"].head
        insist((left-right).length>.01,"feet collapsed into the same point")
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        evaluated_mesh=evaluated.to_mesh()
        try:
            insist(len(evaluated_mesh.vertices)>=10000,"evaluated humanoid mesh disappeared")
            # Movement check uses ACTUAL evaluated vertex positions, not just
            # Blender's armature bones and not a fabricated sprite.
            selected=evaluated_mesh.vertices[1024].co.copy()
            point=(evaluated.matrix_world @ selected)
        finally:
            evaluated.to_mesh_clear()
        filename=output/f"frame-{i:02d}.png"
        scene.render.filepath=str(filename)
        bpy.ops.render.render(write_still=True)
        insist(filename.exists() and filename.stat().st_size>3500,"missing Blender render "+filename.name)
        data.append({"sample":i,"sourceFrame":source_frame,
            "hip":[round(float(x),4) for x in now],
            "leftFoot":[round(float(x),4) for x in left],
            "rightFoot":[round(float(x),4) for x in right],
            "evaluatedVertex":[round(float(x),4) for x in point]})
    displacement=max(math.dist(data[0]["evaluatedVertex"],x["evaluatedVertex"]) for x in data[1:])
    insist(displacement>.02,"retargeted UV body remains static despite captured movement")
    return data,displacement

def main(opts):
    output=opts.output.resolve();output.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    arm=import_source(opts.bvh.resolve())
    body=append_male_source(opts.bundle.resolve())
    scale=normalize_body(body,arm)
    bound=bind_skin(body,arm)
    studio_scene(body,arm,output)
    report_data,displacement=inspect_motion(body,arm,output)
    scene=bpy.context.scene
    scene.frame_set(SAMPLES[0]+1)
    scene["WyrmForgeAssetStatus"]="Real CC0 male with 120fps CMU capture; NOT the Gothic wizard"
    scene["CapturedBVHSource"]="CMU 07_04 / Bruce Hahne conversion"
    scene["ArtistApproved"]=False
    scene["ProductionReady"]=False
    save=output/"cmu-realistic-male-retarget-source.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(save))
    report={"source":"Official Blender Studio CC0 realistic male / CMU subject 07_04",
            "maleMeshVertices":len(body.data.vertices),"uvLayers":len(body.data.uv_layers),
            "sourceBones":len(arm.data.bones),"weightedBones":bound,
            "nativeBlend":save.name,"heightScale":round(scale,6),
            "mocapFrameSamples":SAMPLES,
            "evaluatedBodyVertexDisplacement":round(displacement,5),
            "poses":report_data,
            "gothicWizardSourceComplete":False,"robed":False,"beardModeled":False,
            "retargetAcceptance":False,"productionAtlasComplete":False,
            "lightingApproved":False,"replacesTemporaryPlayer":False}
    (output/"native-retarget-validation.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!="poses"},indent=2))

if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p=argparse.ArgumentParser()
    p.add_argument("--bundle",type=Path,required=True)
    p.add_argument("--bvh",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    main(p.parse_args(args))
