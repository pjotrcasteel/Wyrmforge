#!/usr/bin/env python3
"""Fit owner-drawn front+side skeleton to real Rotwalker Blender art-rig.

Not a pose guessed from rotation increments: each real pose-bone tail is
steered at an explicit 3D anatomical target reconstructed from the OWNER'S
original front/side artwork. The inputs are stylized illustrations, not
photogrammetry; joints remain soft constraints and the result must be
inspected by the owner. Uses only PR #399 independent source-art rig.
NO gameplay, universal animation engine modifications, or pixel export.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Quaternion, Vector
from PIL import Image, ImageDraw

ROOT = (Path.cwd() / "artifacts/hollowed-reference-v2").resolve()
FACINGS = ("front", "front-right", "right", "back-right",
           "back", "back-left", "left", "front-left")
FIT_ORDER = (
    "H_Pelvis", "H_SpineLumbar", "H_SpineThoracic", "H_Neck", "H_Head",
    "H_Clavicle_L", "H_UpperArm_L", "H_ForeArm_L", "H_ClawsRoot_L",
    "H_Clavicle_R", "H_UpperArm_R", "H_ForeArm_R", "H_ClawsRoot_R",
    "H_Thigh_L", "H_Shin_L", "H_Foot_L",
    "H_Thigh_R", "H_Shin_R", "H_Foot_R",
)
FRAMES = (1, 7, 13, 19, 25, 31, 37, 43)


def evaluated_world_vertices(body):
    deps = bpy.context.evaluated_depsgraph_get()
    obj = body.evaluated_get(deps)
    mesh = obj.to_mesh()
    try:
        return [obj.matrix_world @ v.co for v in mesh.vertices]
    finally:
        obj.to_mesh_clear()


def extents(coords):
    return (
        Vector(tuple(min(v[i] for v in coords) for i in range(3))),
        Vector(tuple(max(v[i] for v in coords) for i in range(3))),
    )


def target_points(path, body):
    """Reconstruct metric XYZ from traced FRONT x/z and SIDE x (depth).

    Back confirms shoulder alignment but is not independent calibrated
    geometry, so we do not overfit inconsistent illustrated perspectives.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    if data["schema"] != "wyrmforge/hollowed/reference-pose/1.0":
        raise ValueError("Wrong owner reference landmark contract")
    c = data["calibration"]
    front = data["landmarks"]["front"]
    side = data["landmarks"]["side"]
    if set(front) != set(side) or len(front) < 20:
        raise ValueError("Incomplete actual front/side landmark observations")
    lo, hi = extents(evaluated_world_vertices(body))
    center_x = (lo.x + hi.x) / 2
    center_y = (lo.y + hi.y) / 2
    # Root artwork coordinate system is a true measured source target, not
    # a generated 2D picture and not a pixelated sprite sheet.
    landmarks = {}
    for name in front:
        fx, fy = front[name]
        sx, sy = side[name]
        # Elevation is the AVERAGE of visible front and side projected
        # human anatomy; illustrated camera foreshortening is not exact.
        raw_z = ((c["ground_y_px"] - fy) + (c["ground_y_px"] - sy)) / 2
        landmarks[name] = Vector((
            center_x + (fx-c["front_center_px"])*c["front_m_per_px"],
            center_y - (sx-c["side_hip_center_px"])*c["side_depth_m_per_px"],
            lo.z + raw_z*c["vertical_m_per_px"],
        ))
    if landmarks["head"].y > landmarks["pelvis"].y - .46:
        raise ValueError("Reference side head must clearly project ahead of hips")
    if landmarks["Lclaws"].y > landmarks["Lshoulder"].y - .7:
        raise ValueError("Owner's long front-reaching claws were lost in conversion")
    target = {bone: landmarks[point] for bone, point in
              data["fit_end_effectors"].items()}
    missing = set(FIT_ORDER)-set(target)
    if missing:
        raise ValueError(f"Missing required actual artist bone markers: {missing}")
    return data, landmarks, target


def rotate_real_bone_to_target(rig, bone_name, target, max_scale):
    """One segment world-space aim + bounded anatomical Y-scale.

    All quaternion updates are computed in the ACTUAL evaluated bone basis,
    not guessed coordinate axes. Translation and matching are measured after
    Blender evaluates the weighted parent hierarchy.
    """
    bone = rig.pose.bones[bone_name]
    bone.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()
    head = rig.matrix_world @ bone.head
    tail = rig.matrix_world @ bone.tail
    source = tail-head
    wanted = target-head
    if source.length < .01 or wanted.length < .02:
        raise ValueError(f"Unusable source / target segment {bone_name}")
    scale = max(.75, min(max_scale, wanted.length / source.length))
    bone.scale.y *= scale
    bpy.context.view_layer.update()
    head = rig.matrix_world @ bone.head
    tail = rig.matrix_world @ bone.tail
    src_axis = (tail-head).normalized()
    dest_axis = (target-head).normalized()
    diff_world = src_axis.rotation_difference(dest_axis)
    local_to_world = (rig.matrix_world @ bone.matrix).to_quaternion()
    correction = local_to_world.inverted() @ diff_world @ local_to_world
    bone.rotation_quaternion = bone.rotation_quaternion @ correction
    bpy.context.view_layer.update()
    actual = rig.matrix_world @ bone.tail
    return {
        "target": [round(float(a),4) for a in target],
        "actual": [round(float(a),4) for a in actual],
        "error_m": round(float((target-actual).length),4),
        "source_bone_stretch_y": round(float(bone.scale.y),3),
    }


def fit_full_reference_pose(rig, body, global_root, data, target):
    # The old idle generated via uncalibrated rotations is not the new
    # authoritative pose. Clear ONLY source-art actions on NEW art rig.
    for obj in (rig, global_root):
        if obj.animation_data:
            obj.animation_data_clear()
    bpy.context.scene.frame_set(1)
    global_root.location=(0,0,0)
    rig.location=(0,0,0)
    for pb in rig.pose.bones:
        pb.rotation_mode="QUATERNION"
        pb.rotation_quaternion=Quaternion()
        pb.location=(0,0,0)
        pb.scale=(1,1,1)
    bpy.context.view_layer.update()

    # Distinguish the real traced pose from the anatomy-constrained pose.
    # Original joint targets are never edited: reports/render overlays still
    # show the drawing's exact traced locations. An illustrated leg can be
    # farther from the hip than the selected sculpt's bones can reach.
    effective_target=dict(target)
    source_low,source_high=extents(evaluated_world_vertices(body))
    body_center=Vector(((source_low.x+source_high.x)/2,
                        (source_low.y+source_high.y)/2,source_low.z))
    for key,bone in (
        ("left_ankle_effective_target_m_relative_to_body_center","H_Shin_L"),
        ("left_toe_effective_target_m_relative_to_body_center","H_Foot_L"),
    ):
        effective_target[bone]=body_center+Vector(data["constraints"][key])
    results={}
    for name in FIT_ORDER:
        results[name] = rotate_real_bone_to_target(
            rig, name, effective_target[name],
            data["max_bone_stretch"].get(name,1.4)
        )
        results[name]["original_trace_target"]= [
            round(float(v),4) for v in target[name]
        ]
        results[name]["original_trace_residual_m"]=round(
            float((target[name]-(rig.matrix_world@rig.pose.bones[name].tail)).length),4
        )
        results[name]["anatomy_constrained_target_used"] = (
            name in ("H_Shin_L","H_Foot_L")
        )

    initial_lo,_=extents(evaluated_world_vertices(body))
    global_root.location.z -= float(initial_lo.z)
    bpy.context.view_layer.update()
    grounded_lo,_=extents(evaluated_world_vertices(body))
    if abs(grounded_lo.z)>.025:
        raise ValueError(f"Global root failed real mesh ground contact: {grounded_lo.z}")
    # A ONE-foot contact check is a false positive for the owner's wide,
    # asymmetrical pose. Both feet must visibly support the 3D weight.
    body_coordinates=evaluated_world_vertices(body)
    xmid=(grounded_lo.x+extents(body_coordinates)[1].x)/2
    contacts={}
    for side,sign in (("L",-1),("R",1)):
        candidates=[v.z for v in body_coordinates
                    if sign*(v.x-xmid)>.24 and v.z<.75]
        if not candidates:
            raise ValueError(f"No real source vertices near {side} foot")
        contacts[side]=float(min(candidates))
    if abs(contacts["L"]-contacts["R"])>.085:
        raise ValueError(
            f"Owner pose has only one supported foot, not stable gait: "
            f"left_z={contacts['L']:.4f}, right_z={contacts['R']:.4f}"
        )
    # Protect a *sole patch*, not just one lowest protruding toe. Genuine
    # deformed source mesh vertices close to the floor must show front-to-
    # back coverage on BOTH boots. Report the exact patch evidence.
    foot_patches={}
    for side,sign in (("L",-1),("R",1)):
        near=[v for v in body_coordinates
              if sign*(v.x-xmid)>.28 and v.z<contacts[side]+.095]
        if len(near)<8:
            raise ValueError(f"Only isolated toe touches source ground: {side}, count={len(near)}")
        footprint=round(float(max(v.y for v in near)-min(v.y for v in near)),4)
        if footprint < .095:
            raise ValueError(
                f"Standing on a boot tip, not a planted foot: {side} "
                f"source vertices={len(near)}, contact longitudinal footprint={footprint}m"
            )
        foot_patches[side]={"source_vertices_near_floor":len(near),
                            "longitudinal_footprint_m":footprint}


    # Check the specific OWNER visual identity, not small rotation deltas.
    head_world=rig.matrix_world @ rig.pose.bones["H_Head"].head
    pelvis_world=rig.matrix_world @ rig.pose.bones["H_Pelvis"].head
    shoulder_y=sum((rig.matrix_world @ rig.pose.bones[
        f"H_UpperArm_{side}"].head).y for side in ("L","R")) / 2
    forward_head=float(pelvis_world.y-head_world.y)
    if forward_head < .43:
        raise ValueError(
            f"Reference head-led predatory hunch not achieved: {forward_head:.4f}m"
        )
    hand_stats={}
    for side in ("L","R"):
        shoulder=rig.matrix_world @ rig.pose.bones[f"H_UpperArm_{side}"].head
        claw=rig.matrix_world @ rig.pose.bones[f"H_ClawsRoot_{side}"].tail
        forward=float(shoulder.y-claw.y)
        below=float(shoulder.z-claw.z)
        if forward < .40 or below < .55:
            raise ValueError(f"Reference claw too high or too far back: {side}"
                             f" forward={forward:.3f} down={below:.3f}")
        hand_stats[side]={"forward_from_shoulder_m":round(forward,4),
                          "below_shoulder_m":round(below,4)}
    errors=[v["error_m"] for v in results.values()]
    return {
        "bone_positions":results,
        "fitted_bones":len(results),
        "mean_joint_target_error_m":round(sum(errors)/len(errors),4),
        "worst_joint_target_error_m":max(errors),
        "measured_head_forward_vs_pelvis_m":round(forward_head,4),
        "real_3d_claw_reach":hand_stats,
        "real_mesh_ground_z":round(float(grounded_lo.z),5),
        "per_foot_real_mesh_ground_contact_z": {
            k:round(v,5) for k,v in contacts.items()
        },
        "real_weight_bearing_sole_patches": foot_patches,
        "owner_traced_targets_preserved":True,
        "limb_bone_stretch_anatomically_bounded":True,
        "old_incremental_pose_discarded":True,
        "actual_source_skeleton_targets_reconstructed_from_2d":True,
        "source_art_only":True,
    }


def animate_base_as_organic_preview(scene,rig,body,root):
    """Delayed spine/breath/head/hand offsets around FITTED REFERENCE pose.

    Avoid resetting to old T-pose or applying a single shared sinusoid.
    World grounding is evaluated at each sample. Not a full locomotion
    cycle or foot IK, and never presented as production animation.
    """
    base={
        pb.name:(pb.rotation_quaternion.copy(),pb.scale.copy())
        for pb in rig.pose.bones
    }
    original_root=root.location.copy()
    scene.render.fps=12
    scene.frame_start=1
    scene.frame_end=49
    samples=[]
    for frame in tuple(range(1,50,6)) + (49,):
        scene.frame_set(frame)
        theta=math.tau*(frame-1)/48
        root.location=original_root.copy()
        for pb in rig.pose.bones:
            q,scale=base[pb.name]
            pb.rotation_quaternion=q.copy()
            pb.scale=scale.copy()
        offsets={
            "H_Pelvis": ((0,1,0),.021*math.sin(theta+.4)),
            "H_SpineLumbar": ((1,0,0),.043*math.sin(theta)),
            "H_SpineThoracic": ((1,0,0),.058*math.sin(theta-.35)),
            "H_Neck": ((1,0,0),-.040*math.sin(theta-.58)),
            "H_Head": ((0,0,1),.037*math.sin(theta-.92)),
            "H_UpperArm_L": ((0,0,1),.050*math.sin(theta-.45)),
            "H_UpperArm_R": ((0,0,1),-.073*math.sin(theta-.90)),
            "H_ForeArm_L": ((1,0,0),.068*math.sin(theta-1.0)),
            "H_ForeArm_R": ((1,0,0),-.058*math.sin(theta-.52)),
            "H_Thigh_L": ((1,0,0),.028*math.sin(theta-.20)),
            "H_Thigh_R": ((1,0,0),-.029*math.sin(theta+.25)),
            "H_Shin_L": ((1,0,0),.027*math.sin(theta-.68)),
            "H_Shin_R": ((1,0,0),-.028*math.sin(theta-.35)),
        }
        for name,(axis,angle) in offsets.items():
            pb=rig.pose.bones[name]
            pb.rotation_quaternion=pb.rotation_quaternion@Quaternion(Vector(axis),angle)
        bpy.context.view_layer.update()
        lo,_=extents(evaluated_world_vertices(body))
        correction=-float(lo.z)
        if abs(correction)>.12:
            raise ValueError(f"Art reference idle ground correction far too large: {frame} {correction}")
        root.location.z+=correction
        bpy.context.view_layer.update()
        lo,_=extents(evaluated_world_vertices(body))
        if abs(lo.z)>.015:
            raise ValueError(f"Ground contact failed reference-fitted cycle: {frame}")
        for pb in rig.pose.bones:
            pb.keyframe_insert("rotation_quaternion",frame=frame,group=pb.name)
            pb.keyframe_insert("scale",frame=frame,group=pb.name)
        root.keyframe_insert("location",frame=frame,group="Reference world root")
        samples.append({"frame":frame,"ground_z":round(float(lo.z),5),
                        "compensation_m":round(correction,5)})
    for action in bpy.data.actions:
        if action.name.startswith("Hollowed M1 source-only"):
            continue
        if action.users>0:
            action.name="Hollowed M1 2D-REFERENCE-FITTED 3D organic idle STUDY"
    scene.frame_set(1)
    return {"source_preview_frames":49,"real_3d_pose_samples":len(samples),
            "ground_contact_samples":samples,
            "not_a_walk_or_game_animation":True}


def look_at(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat("-Z","Y").to_euler()


def studio_mat(name,color):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=.93
    shader.inputs["Emission Strength"].default_value=0.
    return mat


def actual_render(output,scene,rig,body,target):
    scene.frame_set(1)
    low,high=extents(evaluated_world_vertices(body))
    center=(low+high)/2
    for obj in list(scene.objects):
        if obj.type in ("CAMERA","LIGHT"):
            bpy.data.objects.remove(obj,do_unlink=True)
    camera_data=bpy.data.cameras.new("M1 owner's 2D skeleton fit 3D orthographic")
    camera=bpy.data.objects.new("M1 owner's 2D skeleton fit 3D orthographic",camera_data)
    scene.collection.objects.link(camera)
    scene.camera=camera
    camera_data.type="ORTHO"
    camera_data.ortho_scale=max(float(high.z-low.z)*1.25,
                                float(high.x-low.x)*1.42*460/380)
    for name,pos,power in (
        ("Owner pose clay key",center+Vector((-4,-3.5,5.5)),490),
        ("Owner pose clay fill",center+Vector((4,2.5,4)),280)):
        light=bpy.data.lights.new(name,"AREA")
        obj=bpy.data.objects.new(name,light)
        scene.collection.objects.link(obj)
        obj.location=pos
        light.energy=power
        light.size=4
        look_at(obj,center)
    if scene.world is None:
        scene.world=bpy.data.worlds.new("Owner pose fitting")
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(.080,.085,.094,1)
    background.inputs["Strength"].default_value=1
    scene.render.engine="CYCLES"
    scene.cycles.samples=12
    scene.render.resolution_x=380
    scene.render.resolution_y=460
    scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    bpy.context.view_layer.material_override=studio_mat(
        "owner pose 3D true clay / no material distraction",(.61,.57,.52))
    def render(name,angle,frame,draw_targets=False):
        scene.frame_set(frame)
        camera.location=(center.x+6*math.sin(angle),
                         center.y-6*math.cos(angle),center.z+.4)
        look_at(camera,center)
        dest=output/f"{name}-{frame:03d}.png"
        scene.render.filepath=str(dest)
        bpy.ops.render.render(write_still=True)
        with Image.open(dest) as src:
            img=src.convert("RGB")
        dr=ImageDraw.Draw(img)
        dr.text((9,9),"REAL 3D / BONE FIT / "+name,fill=(245,245,245))
        if draw_targets:
            for bn in FIT_ORDER:
                pb=rig.pose.bones[bn]
                actual=rig.matrix_world@pb.tail
                desired=target[bn]
                a=world_to_camera_view(scene,camera,actual)
                t=world_to_camera_view(scene,camera,desired)
                ax,ay=int(a.x*380),int((1-a.y)*460)
                tx,ty=int(t.x*380),int((1-t.y)*460)
                if -20<ax<400 and -20<ay<480:
                    dr.ellipse((ax-3,ay-3,ax+3,ay+3),fill=(255,189,42))
                if -20<tx<400 and -20<ty<480:
                    dr.ellipse((tx-4,ty-4,tx+4,ty+4),
                               outline=(76,236,222),width=2)
                    dr.line(((ax,ay),(tx,ty)),fill=(238,80,89),width=2)
        return img
    views=[]
    for i,d in enumerate(FACINGS):
        views.append(render("reference-fitted-"+d,math.tau*i/8,1))
    atlas=Image.new("RGB",(380*4,460*2),(15,16,18))
    for i,img in enumerate(views):
        atlas.paste(img,(i%4*380,i//4*460))
    atlas.save(output/"M1-REFERENCE-FITTED-REAL-3D-EIGHT-ANGLES.png")
    tri=Image.new("RGB",(380*3,460))
    for k,i in enumerate((0,2,4)):
        tri.paste(views[i],(k*380,0))
    tri.save(output/"M1-REFERENCE-FITTED-REAL-3D-FRONT-SIDE-BACK.png")
    target_sheet=Image.new("RGB",(380*2,460))
    target_sheet.paste(render("front-joint-error-overlay",0,1,True),(0,0))
    target_sheet.paste(render("side-joint-error-overlay",math.pi/2,1,True),(380,0))
    target_sheet.save(output/"M1-ACTUAL-BONES-VERSUS-2D-REFERENCE-JOINTS.png")
    for direction,angle in (("front",0),("side",math.pi/2)):
        imgs=[render("reference-3D-"+direction+"-motion",angle,f) for f in FRAMES]
        sheet=Image.new("RGB",(380*4,460*2))
        for i,img in enumerate(imgs):
            sheet.paste(img,(i%4*380,i//4*460))
        sheet.save(output/f"M1-REFERENCE-3D-{direction.upper()}-MOTION.png")
        imgs[0].save(output/f"M1-REFERENCE-3D-{direction.upper()}-MOTION.gif",
                     save_all=True,append_images=imgs[1:],
                     duration=120,loop=0,optimize=False)
    bpy.context.view_layer.material_override=None
    return {"actual_blender_3d_views":8,"bone_vs_target_overlay":True,
            "real_3d_motion_views":16,"pixel_rendering":False}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--reference",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    a=parser.parse_args()
    out=a.output.resolve()
    if out==ROOT or not out.is_relative_to(ROOT):
        raise ValueError("Pose retarget output must stay in isolated source review folder")
    out.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(a.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    scene=bpy.context.scene
    if scene.get("hollowed_source_lineage")!="owner-reference-original-v2":
        raise ValueError("Rejected original H1 sculpt may not enter reference pose")
    rig=bpy.data.objects.get("Hollowed Rotwalker M1 genuine 3D art-rig")
    root=bpy.data.objects.get("Hollowed M1 SOURCE WORLD contact master")
    body=[x for x in scene.objects if x.type=="MESH"]
    if rig is None or root is None or len(body)!=1 or len(rig.data.bones)!=20:
        raise ValueError("Reference pose must use approved-source M1 20-bone art-rig")
    if scene.get("pixel_export_performed") is not False:
        raise ValueError("No premature game pixel conversion")
    data,landmarks,targets=target_points(a.reference,body[0])
    metrics=fit_full_reference_pose(rig,body[0],root,data,targets)
    motion=animate_base_as_organic_preview(scene,rig,body[0],root)
    visuals=actual_render(out,scene,rig,body[0],targets)
    scene["owner_reference_2d_3d_bone_fit"]=True
    scene["m1_reference_poses_owner_approved"]=False
    scene["pixel_export_performed"]=False
    scene["not_gameplay"]=True
    bpy.context.preferences.filepaths.save_version=0
    final=out/"Hollowed-M1-OWNER-2D-POSE-FITTED-REAL-3D-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(final))
    report={
        "status":"Source art 2D-joint-to-3D-bone fit: OWNER VISUAL APPROVAL REQUIRED",
        "reference_landmarks":{key:[round(float(c),4) for c in p]
                               for key,p in landmarks.items()},
        "fit":metrics,"motion":motion,"images":visuals,
        "source_rotwalker_topology_preserved":len(body[0].data.vertices)==31963,
        "source_rig_bone_count":len(rig.data.bones),
        "single_universal_animation_engine_untouched":True,
        "single_universal_lighting_engine_untouched":True,
        "gameplay_modified":False,
        "pixel_export_performed":False,
        "owner_approved":False,
        "blend_file":final.name,
    }
    (out/"owner-2d-3d-reference-fit-qc.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("OWNER ACTUAL 2D SKELETON FIT TO 3D",json.dumps({
        "error":metrics["mean_joint_target_error_m"],
        "head_forward":metrics["measured_head_forward_vs_pelvis_m"],
        "hands":metrics["real_3d_claw_reach"],"visuals":visuals
    }))


if __name__=="__main__":
    main()
