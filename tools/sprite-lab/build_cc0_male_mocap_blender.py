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

def fit_mocap_rest_legs_to_anatomy(raw_arm):
    """Preserve source BVH, fit an independently animated target armature.

    The source BVH's rest knees/feet flare more than 3x a realistic male
    stance: foot bones sit several bone units OUTSIDE the CC0 legs. No
    automatic skin weighting algorithm can compensate for bad rest geometry.

    Retain source keyed motion unchanged. Duplicate it into a separate
    deform rig, compress only the outward rest-leg displacement, preserving
    full captured bone rotation keys, durations and all upper-body anatomy.
    This is a source RETARGET, not a six-school special-case shader/renderer.
    """
    target=raw_arm.copy()
    target.data=raw_arm.data.copy()
    bpy.context.scene.collection.objects.link(target)
    target.name="CC0 Male fitted deform rig | CMU captured movement"
    target.data.name="Male gait anatomically fitted source skeleton"
    # NEVER play raw BVH rotation F-curves on a different rest skeleton:
    # even with constrained ankles that doubles rotations at hips/chest.
    # Only explicit transferred target motion is allowed on this armature.
    target.animation_data_clear()
    insist(target.animation_data is None,"target retained incompatible BVH action")
    raw_arm.name="Original CMU BVH 07_04 | PROVENANCE | do not skin"
    raw_arm.hide_render=True
    raw_arm.hide_set(True)
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active=target
    bpy.ops.object.mode_set(mode="EDIT")
    rest=target.data.edit_bones
    compression=.15
    metrics={}
    for side in ("Left","Right"):
        hip=rest[side+"UpLeg"].head.copy()
        names=[side+"UpLeg",side+"Leg",side+"Foot",side+"ToeBase"]
        original={}
        for name in names:
            insist(name in rest,"captured foot anatomy lacks "+name)
            bone=rest[name]
            original[name]=(bone.head.copy(),bone.tail.copy())
        # Modify every joint/segment in consistent source-local coordinates.
        # Z (height), Y (forward) and all source animation channels are kept.
        # Edit bones ordered parent->child; connected segments share endpoints.
        for name in names:
            bone=rest[name]
            h,t=original[name]
            h.x=hip.x+(h.x-hip.x)*compression
            t.x=hip.x+(t.x-hip.x)*compression
            bone.head=h;bone.tail=t
        metrics[side]={
            "hipX":round(float(hip.x),4),
            "sourceAnkleX":round(float(original[side+"Foot"][0].x),4),
            "fittedAnkleX":round(float(rest[side+"Foot"].head.x),4)}
    bpy.ops.object.mode_set(mode="OBJECT")
    target["OriginalBVHSourceUnmodified"]=True
    target["RetargetRestLegLateralScale"]=compression
    target["AuthorApproved"]=False
    return target,metrics


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
    # Original bundle arranges demo variants in a showroom grid. The
    # imported BVH bones are in ARMATURE-LOCAL coordinates, possibly with a
    # non-identity object transform from axis conversion. Match that basis.
    # Previously the mesh had identity world transform while its vertex
    # coordinates were re-centered against local BVH bone locations: bone heat
    # then saw misaligned legs and distributed tiny wrong-side weights.
    body.parent=None
    body.matrix_world.identity()
    return body

def normalize_body(body,arm):
    # All computed source vertices are in the same LOCAL space as edit bones.
    # They enter world space via exactly ONE matching armature object basis.
    body.matrix_world=arm.matrix_world.copy()
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
    """Use Blender's geometry-aware automatic weights, NOT nearest-bone guesses.

    A wrong nearest-segment assignment pulled real mesh chest, shoulders and
    crossing legs apart. Bone heat considers the original continuous surface
    when distributing humanoid skin weights.
    """
    height=max(v.co.z for v in body.data.vertices)-min(v.co.z for v in body.data.vertices)
    deform_bones=[]
    for b in arm.data.bones:
        b.use_deform=b.length>height*.016 and b.name not in {"Hips","LHipJoint","RHipJoint"}
        if b.use_deform:
            deform_bones.append(b.name)
    insist(len(deform_bones)>=15,"insufficient meaningful deform bones")
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode!="OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True);arm.select_set(True)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO",keep_transform=True)
    insist(body.parent==arm,"automatic heat solver failed to parent actual male mesh")
    mods=[m for m in body.modifiers if m.type=="ARMATURE" and m.object==arm]
    insist(len(mods)>0,"no evaluated deform modifier")
    for m in mods:
        m.use_deform_preserve_volume=True
    count=sum(1 for name in deform_bones if body.vertex_groups.get(name) is not None)
    insist(count>=15,"automatic heat weights failed to cover deform skeleton")
    uncovered=0
    group_ids={v.index for v in body.vertex_groups}
    for vertex in body.data.vertices:
        if not any(group.group in group_ids and group.weight>.0001 for group in vertex.groups):
            uncovered+=1
    insist(uncovered<len(body.data.vertices)*.04,
           f"excess unweighted body vertices: {uncovered}")
    return count

def audit_rest_binding(body,arm):
    """Inspect actual rest-world alignment, never silently approve it."""
    names=("LeftUpLeg","RightUpLeg","LeftLeg","RightLeg","LeftFoot","RightFoot")
    points={name:arm.matrix_world@arm.data.bones[name].head_local for name in names}
    vertices=[body.matrix_world@v.co for v in body.data.vertices]
    groups={g.name:g.index for g in body.vertex_groups}
    data={"armatureTransform":[[round(float(x),5) for x in row] for row in arm.matrix_world],
          "bodyTransform":[[round(float(x),5) for x in row] for row in body.matrix_world],
          "boneWorld":{name:[round(float(v),4) for v in p] for name,p in points.items()},
          "weights":{}}
    for name in ("LeftFoot","RightFoot","LeftLeg","RightLeg"):
        idx=groups.get(name)
        weights=[(v.index,max((item.weight for item in v.groups if item.group==idx),default=0.))
                 for v in body.data.vertices]
        active=[(i,w) for i,w in weights if w>.02]
        total=sum(w for _,w in active)
        world=sum((vertices[i]*w for i,w in active),Vector((0.,0.,0.)))/total if total>.001 else None
        data["weights"][name]={"nonzero":len(active),
            "strong":sum(1 for _,w in active if w>=.35),
            "max":round(max((w for _,w in active),default=0.),4),
            "weightedWorldCentroid":[round(float(c),4) for c in world] if world else None,
            "restBoneDistance":round(min(((points[name]-p).length for p in vertices),default=1e6),4)}
    return data


def isolate_left_right_leg_weights(body,arm):
    """Prevent opposite-leg bone heat influences pulling the LOWER legs across.

    Never edit captured motion, foot x targets, knees or the upper pelvis.
    Only surface vertices anatomically well inside the lower LEFT/RIGHT limb
    transfer an erroneously opposite leg-group contribution to the MATCHING
    side and segment. Keep a neutral midline seam for sensible deformation.
    """
    names=("UpLeg","Leg","Foot","ToeBase")
    left={suffix:body.vertex_groups.get("Left"+suffix) for suffix in names}
    right={suffix:body.vertex_groups.get("Right"+suffix) for suffix in names}
    insist(all(left.values()) and all(right.values()),"missing left/right bone-heat leg groups")
    lhip=arm.data.bones["LeftUpLeg"].head_local
    rhip=arm.data.bones["RightUpLeg"].head_local
    lknee=arm.data.bones["LeftLeg"].head_local
    rknee=arm.data.bones["RightLeg"].head_local
    axis=rhip-lhip
    width=axis.length
    insist(width>.1,"invalid anatomical hip width")
    axis.normalize()
    hip_center=(lhip+rhip)*.5
    # BVH import may retain Y-up ARMATURE-LOCAL coordinates even when the
    # evaluated character is world Z-up. Never assume local .z is height.
    knee_mid=(lknee+rknee)*.5
    thigh_down=knee_mid-hip_center
    thigh_down-=axis*thigh_down.dot(axis)
    thigh_length=thigh_down.length
    insist(thigh_length>.5,"invalid anatomical thigh direction")
    thigh_down.normalize()
    to_rig=arm.matrix_world.inverted()@body.matrix_world
    group_by_index={group.index:group.name for group in body.vertex_groups}
    swaps=0
    transferred=0.
    limit=0.
    corrected=[]
    for vertex in body.data.vertices:
        coord=to_rig @ vertex.co
        # Bone-derived anatomical downward direction, not hardcoded .z.
        # Only below mid-thigh; never touch pelvis and groin vertices.
        if (coord-hip_center).dot(thigh_down)<thigh_length*.5:continue
        side=(coord-hip_center).dot(axis)
        if abs(side)<width*.18:continue
        wrong=right if side<0 else left
        correct=left if side<0 else right
        old={group_by_index[item.group]:item.weight for item in vertex.groups
             if item.group in group_by_index and item.weight>0}
        wrong_weight=sum(old.get(group.name,0) for group in wrong.values())
        if wrong_weight<=1e-5:continue
        matching=sum(old.get(group.name,0) for group in correct.values())
        # Large opposite-side binding indicates incompatible rest orientations,
        # not ordinary bone heat overspill. Reject rather than 'fix' blindly.
        if wrong_weight>.55 and matching<.08:
            limit+=1
            continue
        corrected.append((vertex.index,[
            (suffix,old.get(wrong[suffix].name,0),
             old.get(correct[suffix].name,0)) for suffix in names]))
        transferred+=wrong_weight
        swaps+=1
    insist(limit==0,f"{int(limit)} lower-leg vertices bound to opposite skeleton: rest alignment invalid")
    for index,weights in corrected:
        for suffix,wrong_weight,original in weights:
            if wrong_weight<=1e-5:continue
            wrong=(right if (to_rig@body.data.vertices[index].co-hip_center).dot(axis)<0 else left)[suffix]
            correct=(left if (to_rig@body.data.vertices[index].co-hip_center).dot(axis)<0 else right)[suffix]
            wrong.remove([index])
            correct.add([index],original+wrong_weight,"REPLACE")
    return {"correctedLowerLegVertices":swaps,"transferredWeight":round(transferred,4),
            "rejectedOppositeRestVertices":int(limit),"hipWidth":round(width,4)}


def verify_deformed_leg_lanes(body,arm):
    """Measure actually deformed foot geometry and preserve full failure evidence.

    A zero/sparse Foot group is a real binding defect, NOT proof of midline
    crossing. Never silently infer approval from the correct IK bone alone.
    """
    left=arm.matrix_world @ arm.pose.bones["LeftUpLeg"].head
    right=arm.matrix_world @ arm.pose.bones["RightUpLeg"].head
    axis=right-left
    axis.z=0
    width=axis.length
    insist(width>.1,"bad evaluated pelvis width")
    axis.normalize()
    center=(right+left)*.5
    result={"footLaneValid":True}
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh()
    try:
        insist(len(mesh.vertices)==len(body.data.vertices),"deformed topology remapped")
        group_lookup={group.name:group.index for group in body.vertex_groups}
        for side,sign in (("Left",-1),("Right",1)):
            group_id=group_lookup.get(side+"Foot")
            # Compare only vertices that actually participate in ankle/foot
            # skinning. A lower threshold is diagnostic, not acceptance.
            entries=[]
            for vertex in body.data.vertices:
                weight=max((g.weight for g in vertex.groups if g.group==group_id),default=0.)
                if weight>.02:entries.append((vertex.index,weight))
            result[side.lower()+"FootVertexCount"]=len(entries)
            result[side.lower()+"FootStrongCount"]=sum(1 for _,w in entries if w>=.35)
            if len(entries)<10:
                result[side.lower()+"FootLane"]=None
                result["footLaneValid"]=False
                result[side.lower()+"FootReason"]="insufficient skin weights; not a motion result"
                continue
            # Weight the actual evaluated skin to avoid counting tiny
            # incidental bone-heat influences as though they were whole feet.
            total=sum(w for _,w in entries)
            point=sum((evaluated.matrix_world@mesh.vertices[i].co*w for i,w in entries),
                      Vector((0.,0.,0.)))/total
            clearance=sign*(point-center).dot(axis)/width
            result[side.lower()+"FootLane"]=round(clearance,4)
            if clearance<=.04:
                result["footLaneValid"]=False
                result[side.lower()+"FootReason"]="deformed foot geometry crosses hip-relative lane"
    finally:
        evaluated.to_mesh_clear()
    return result


def retarget_captured_feet_with_ik(source,target,start,end):
    """Transfer captured feet relative to the CAPTURED hips into a fitted rig.

    Key design rule: the BVH source animation and converted rest skeleton
    ARE DIFFERENT ANATOMIES. Do not copy bone Euler angles or absolute ankle
    coordinates. Sample the source motion in each leg's moving hip-local
    frame and transfer just the DIFFERENCE from the first sample into a
    properly bound male's unchanged rest pose. Feet and poles are per-frame
    keyed on the target leg controls, not on the source animation rig.
    """
    insist(target.animation_data is None,"raw BVH action still drives fitted rig")
    rest={}
    for side in ("Left","Right"):
        hip=target.matrix_world@target.data.bones[side+"UpLeg"].head_local
        knee=target.matrix_world@target.data.bones[side+"Leg"].head_local
        ankle=target.matrix_world@target.data.bones[side+"Foot"].head_local
        length=(hip-knee).length+(knee-ankle).length
        insist(length>1.,"target fitted leg length invalid")
        rest[side]={"hip":hip,"knee":knee,"ankle":ankle,"length":length}
    poses=[]
    minima={"Left":float("inf"),"Right":float("inf")}
    for frame in range(start,end+1):
        bpy.context.scene.frame_set(frame+1)
        r={"frame":frame+1}
        for side in ("Left","Right"):
            h=source.matrix_world@source.pose.bones[side+"UpLeg"].head
            k=source.matrix_world@source.pose.bones[side+"Leg"].head
            f=source.matrix_world@source.pose.bones[side+"Foot"].head
            r[side]={"hip":h.copy(),"kneeRelative":(k-h).copy(),
                     "footRelative":(f-h).copy()}
        poses.append(r)
    initial=poses[0]
    # Single constant motion scale (not framewise warping), preserving the
    # original recorded swing and foot-contact timing. Cap overly long reach.
    scales={}
    for side in ("Left","Right"):
        source_r=initial[side]
        source_length=source_r["kneeRelative"].length+(
            source_r["footRelative"]-source_r["kneeRelative"]).length
        insist(source_length>.1,"original motion source leg degenerate")
        scales[side]=min(.8,rest[side]["length"]/source_length)
    controls={}
    for side in ("Left","Right"):
        foot=bpy.data.objects.new("Fitted captured foot target "+side,None)
        knee=bpy.data.objects.new("Fitted captured knee pole "+side,None)
        bpy.context.scene.collection.objects.link(foot)
        bpy.context.scene.collection.objects.link(knee)
        foot.empty_display_size=.22;knee.empty_display_size=.22
        controls[side]=(foot,knee)
    for row in poses:
        for side in ("Left","Right"):
            foot,pole=controls[side]
            original=row[side]
            baseline=initial[side]
            delta_foot=(original["footRelative"]-baseline["footRelative"])*scales[side]
            delta_knee=(original["kneeRelative"]-baseline["kneeRelative"])*scales[side]
            target_foot=rest[side]["ankle"]+delta_foot
            # Pole starts on the anatomically fitted knee's outside arc.
            # Constraining the pole to the source knee motion, not forcing
            # arbitrary hip-width flares, protects groin and knee bending.
            target_pole=rest[side]["knee"]+delta_knee
            pole_bias=(rest[side]["knee"]-rest[side]["hip"]).cross(
                rest[side]["ankle"]-rest[side]["hip"])
            if pole_bias.length<1e-4:
                pole_bias=target.matrix_world.to_quaternion()@Vector((0.,-1.,0.))
            pole_bias.normalize()
            target_pole+=pole_bias*rest[side]["length"]*.12
            foot.location=target_foot;pole.location=target_pole
            foot.keyframe_insert(data_path="location",frame=row["frame"])
            pole.keyframe_insert(data_path="location",frame=row["frame"])
    for side in ("Left","Right"):
        foot,pole=controls[side]
        shin=target.pose.bones[side+"Leg"]
        insist(shin.parent and shin.parent.name==side+"UpLeg",
               "expected two-bone leg chain missing")
        constraint=shin.constraints.new("IK")
        constraint.name="Hip-relative CMU recorded leg swing"
        constraint.target=foot;constraint.pole_target=pole
        constraint.chain_count=2;constraint.pole_angle=0.
        constraint.use_stretch=False
    bpy.context.scene.frame_set(start+1)
    return {
        "source":"captured hip-relative CMU 07_04 ankle/knee trajectories",
        "sourceActionPreserved":True,
        "targetSourceActionRemoved":True,
        "footIKControls":len(controls),
        "captureFramesTransferred":len(poses),
        "perLegConstantMotionScale":{k:round(v,5) for k,v in scales.items()},
        "targetFootTargetAtFirstFrame":{
            k:[round(float(v),4) for v in controls[k][0].location]
            for k in controls},
        "nativeMotionReviewed":False,
    }


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
    # Camera framing MUST use evaluated animated world geometry. The original
    # mesh's undeformed local bounds caused a cropped walk contact sheet.
    scene.frame_set(SAMPLES[0]+1)
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    live=evaluated.to_mesh()
    try:
        insist(len(live.vertices)>=10000,"could not evaluate retargeted male topology")
        coords=[evaluated.matrix_world@v.co for v in live.vertices]
        bb_min=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
        bb_max=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
    finally:
        evaluated.to_mesh_clear()
    center=(bb_min+bb_max)*.5
    camera_data=bpy.data.cameras.new("Anatomy motion inspection camera")
    camera=bpy.data.objects.new("Anatomy motion inspection camera",camera_data)
    scene.collection.objects.link(camera)
    camera.location=center+Vector((0,-3.5,1.4))*((bb_max.z-bb_min.z)/2)
    target=center+Vector((0,0,-.08*(bb_max.z-bb_min.z)))
    direction=target-camera.location
    camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
    camera_data.type="ORTHO"
    camera_data.ortho_scale=max(bb_max.z-bb_min.z,bb_max.x-bb_min.x)*1.56
    scene["RetargetReviewCameraSource"]="evaluated animated UV mesh world bounds"
    scene.camera=camera
    scene.frame_start=SAMPLES[0]+1
    scene.frame_end=SAMPLES[-1]+1
    scene.render.filepath=str(output/"frame-00.png")
    return camera

def evaluate_torso_edge_integrity(body,evaluated_mesh,hip_z):
    """Measure deformed waist/upper-leg edge stretching against source topology.

    A foot may sit on the correct side while the groin and belly tear apart.
    Check evaluated ORIGINAL mesh edge connectivity so technical 'success'
    cannot automatically approve a visibly broken torso.
    """
    waist_ratios=[]
    all_ratios=[]
    verts=body.data.vertices
    deformed=evaluated_mesh.vertices
    for edge in body.data.edges:
        i,j=edge.vertices
        original=(verts[i].co-verts[j].co).length
        if original<1e-5:continue
        ratio=(deformed[i].co-deformed[j].co).length/original
        all_ratios.append(ratio)
        mid_z=(verts[i].co.z+verts[j].co.z)*.5
        if hip_z-3.2<=mid_z<=hip_z+2.8:
            waist_ratios.append(ratio)
    insist(len(waist_ratios)>150,"too few stable topology edges at pelvis")
    waist_ratios.sort()
    all_ratios.sort()
    percentile=lambda values,q:values[min(len(values)-1,int((len(values)-1)*q))]
    result={"waistEdges":len(waist_ratios),
            "waistP99Stretch":round(percentile(waist_ratios,.99),3),
            "waistMaxStretch":round(waist_ratios[-1],3),
            "wholeMeshP99Stretch":round(percentile(all_ratios,.99),3),
            "waistFractionOver2x":round(sum(x>2. for x in waist_ratios)/len(waist_ratios),5)}
    result["surfaceValid"]=(result["waistP99Stretch"]<2.6 and
                            result["waistFractionOver2x"]<.02)
    return result


def inspect_motion(body,arm,output):
    scene=bpy.context.scene
    data=[]
    root_initial=None
    minimum_foot_lane={"left":float("inf"),"right":float("inf")}
    hip_z=(arm.data.bones["LeftUpLeg"].head_local.z+
           arm.data.bones["RightUpLeg"].head_local.z)*.5
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
        foot_lanes=verify_deformed_leg_lanes(body,arm)
        for side in ("left","right"):
            lane=foot_lanes.get(side+"FootLane")
            if lane is not None and minimum_foot_lane[side] is not None:
                minimum_foot_lane[side]=min(minimum_foot_lane[side],lane)
            else:
                minimum_foot_lane[side]=None
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        evaluated_mesh=evaluated.to_mesh()
        try:
            insist(len(evaluated_mesh.vertices)>=10000,"evaluated humanoid mesh disappeared")
            # Movement check uses ACTUAL evaluated vertex positions, not just
            # Blender's armature bones and not a fabricated sprite.
            selected=evaluated_mesh.vertices[1024].co.copy()
            point=(evaluated.matrix_world @ selected)
            torso=evaluate_torso_edge_integrity(body,evaluated_mesh,hip_z)
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
            "evaluatedVertex":[round(float(x),4) for x in point],
            "deformedFootLanes":foot_lanes,
            "torsoEdgeIntegrity":torso})
    displacement=max(math.dist(data[0]["evaluatedVertex"],x["evaluatedVertex"]) for x in data[1:])
    insist(displacement>.02,"retargeted UV body remains static despite captured movement")
    return data,displacement,minimum_foot_lane

def main(opts):
    output=opts.output.resolve();output.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    original_arm=import_source(opts.bvh.resolve())
    arm,rest_fitting=fit_mocap_rest_legs_to_anatomy(original_arm)
    body=append_male_source(opts.bundle.resolve())
    scale=normalize_body(body,arm)
    bound=bind_skin(body,arm)
    binding_before=audit_rest_binding(body,arm)
    isolation=isolate_left_right_leg_weights(body,arm)
    binding_after=audit_rest_binding(body,arm)
    # After rest-anatomy skinning, transfer ACTUAL captured source ankle
    # trajectories to the independently fitted humanoid with two-bone IK.
    transfer=retarget_captured_feet_with_ik(original_arm,arm,STUDY_START,STUDY_END)
    studio_scene(body,arm,output)
    report_data,displacement,foot_lanes=inspect_motion(body,arm,output)
    scene=bpy.context.scene
    # Three-quarter game-angle source inspection: the exact same skinned
    # anatomical walk, not a second invented pose or sprite renderer.
    camera=scene.camera
    scene.frame_set(SAMPLES[4]+1)
    for f in (4,12):
        scene.frame_set(SAMPLES[f]+1)
        hips=arm.matrix_world@arm.pose.bones["Hips"].head
        height=max(v.co.z for v in body.data.vertices)-min(v.co.z for v in body.data.vertices)
        look=hips+Vector((0,0,height*.05))
        camera.location=look+Vector((2.1,-3.4,2.3))*height
        camera.rotation_euler=(look-camera.location).to_track_quat("-Z","Y").to_euler()
        scene.render.filepath=str(output/f"quarter-view-{f:02d}.png")
        bpy.ops.render.render(write_still=True)
    scene.frame_set(SAMPLES[0]+1)
    scene["WyrmForgeAssetStatus"]="Real CC0 male with 120fps CMU capture; NOT the Gothic wizard"
    scene["CapturedBVHSource"]="CMU 07_04 / Bruce Hahne conversion"
    scene["ArtistApproved"]=False
    scene["ProductionReady"]=False
    # Reject the result based on deformed geometry while retaining all 16
    # original review renders, 3/4 poses and editable Blender source.
    torso_failures=[{"frame":pose["sourceFrame"],
                     "stats":pose["torsoEdgeIntegrity"]}
                    for pose in report_data
                    if not pose["torsoEdgeIntegrity"]["surfaceValid"]]
    gait_failures=[
        {"frame":pose["sourceFrame"],"reasons":[
            pose["deformedFootLanes"].get(side+"FootReason")
            for side in ("left","right")
            if pose["deformedFootLanes"].get(side+"FootReason")
        ]} for pose in report_data if not pose["deformedFootLanes"]["footLaneValid"]
    ]
    save=output/"cmu-realistic-male-retarget-source.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(save))
    report={"source":"Official Blender Studio CC0 realistic male / CMU subject 07_04",
            "maleMeshVertices":len(body.data.vertices),"uvLayers":len(body.data.uv_layers),
            "sourceBones":len(arm.data.bones),"weightedBones":bound,"skinningMethod":"Blender bone-heat automatic armature weights",
            "nativeBlend":save.name,"heightScale":round(scale,6),
            "sourceRestAnatomyFitting":rest_fitting,
            "sourceAnimationPreserved":True,
            "capturedFootIKRetarget":transfer,
            "lowerLegWeightIsolation":isolation,"minDeformedFootLane":foot_lanes,
            "restBindingBeforeIsolation":binding_before,
            "restBindingAfterIsolation":binding_after,
            "mocapFrameSamples":SAMPLES,
            "evaluatedBodyVertexDisplacement":round(displacement,5),
            "footLaneFailures":gait_failures,"footLanesPassed":not gait_failures,
            "pelvisSurfaceFailures":torso_failures,
            "pelvisSurfacePassed":not torso_failures,
            "poses":report_data,
            "gothicWizardSourceComplete":False,"robed":False,"beardModeled":False,
            "retargetAcceptance":False,"productionAtlasComplete":False,
            "lightingApproved":False,"replacesTemporaryPlayer":False}
    (output/"native-retarget-validation.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!="poses"},indent=2),flush=True)
    if gait_failures or torso_failures:
        raise RuntimeError("REJECTED: "+str(len(gait_failures))+
                           " foot-lane failures, "+str(len(torso_failures))+
                           " pelvis deformation failures; inspect saved native review")

if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    p=argparse.ArgumentParser()
    p.add_argument("--bundle",type=Path,required=True)
    p.add_argument("--bvh",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    main(p.parse_args(args))
