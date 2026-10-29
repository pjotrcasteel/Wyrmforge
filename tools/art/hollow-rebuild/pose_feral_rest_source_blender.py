#!/usr/bin/env python3
"""Hollowed H1: one original feral REST STANCE from existing CC0 armature.

Input is already a separate, non-production Blender H1 source copy.
Change source pose matrices without ANY keyframes, NLA/actions, engine
controllers, attack clips, gameplay, sprite exports, or PR #387 edits.

Rest-stance placement is an ART / DEFORMATION REVIEW only, not animation
implementation. Bone hierarchy obtained by inspecting the real 70-bone
Armature.002 inside the CC0 Horror Game Maker original.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


SCOPE=(Path.cwd()/"artifacts/hollow-rebuild").resolve()


def read_helper():
    source=Path(__file__).with_name("evaluate_free_character_blender.py")
    spec=importlib.util.spec_from_file_location("original_hollowed_evidence",source)
    if not spec or not spec.loader:
        raise ValueError("Missing real Blender source preview helper")
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def rotate_world_axis(pose_bone, armature, axis, angle):
    """Turn a bone in 3D using the proper bone-local rest basis.

    In the CC0 rig bone display tail vectors do NOT align with the limbs,
    so measure actual finger/wrist world positions after applying pose.
    """
    basis=armature.matrix_world.to_3x3() @ pose_bone.bone.matrix_local.to_3x3()
    local_axis=basis.inverted() @ Vector(axis)
    local_axis.normalize()
    pose_bone.rotation_mode="QUATERNION"
    pose_bone.rotation_quaternion=Quaternion(local_axis,angle)


def world_bone_head(armature,bone_name):
    p=armature.pose.bones[bone_name]
    return armature.matrix_world @ p.head


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    source=args.input.resolve()
    output=args.output.resolve()
    if not output.is_relative_to(SCOPE) or output==SCOPE:
        raise ValueError("Feral rest pose may not write outside source-art artifacts")
    output.mkdir(parents=True,exist_ok=True)

    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    main_rig=bpy.data.objects.get("Armature.002")
    if main_rig is None or main_rig.type!="ARMATURE":
        raise ValueError("Author model's inspected 70-bone rig has changed")
    bones=main_rig.pose.bones
    for name in ("Clav_L","Clav_R","joint14","joint14.001",
                 "joint11","joint11.001","joint12","joint12.001",
                 "joint4","joint3"):
        if bones.get(name) is None:
            raise ValueError(f"Source skeleton missing anatomical bone {name}")
    if len(bpy.data.actions)!=0:
        raise ValueError("No source animation actions may enter H1")

    bpy.context.view_layer.update()
    wrist_before={
        "L":world_bone_head(main_rig,"joint12").copy(),
        "R":world_bone_head(main_rig,"joint12.001").copy()
    }
    # Raised but human scapulae and *connected* upper arms; rotation follows
    # the previously inspected L/R anatomical chain. Unlike T-pose, claws
    # hang below the sternum while one arm reaches farther into the space.
    rotate_world_axis(bones["joint14"],main_rig,(0,1,0),1.00)
    rotate_world_axis(bones["joint14.001"],main_rig,(0,1,0),-1.22)
    # Crooked forearm bend; small counter-rotations preserve the claw's
    # spatial envelope without allowing rubber-wrist elbow motion.
    rotate_world_axis(bones["joint11"],main_rig,(0,1,0),-.22)
    rotate_world_axis(bones["joint11.001"],main_rig,(0,1,0),.17)
    # One-sided head drop/hunger orientation, existing mesh stays human.
    rotate_world_axis(bones["joint4"],main_rig,(1,0,0),.15)
    # No keyframes are inserted. These are source-only posing matrices.
    bpy.context.view_layer.update()
    wrist_after={
        "L":world_bone_head(main_rig,"joint12").copy(),
        "R":world_bone_head(main_rig,"joint12.001").copy()
    }
    drops={side:round(float(wrist_before[side].z-wrist_after[side].z),4)
           for side in ("L","R")}
    if any(value<.22 for value in drops.values()):
        raise ValueError(f"Arms still T-posed or rotated upward: wrist height drops {drops}")
    if any(value>1.25 for value in drops.values()):
        raise ValueError(f"Distorted or physically impossible downward arm rotation: {drops}")

    helper=read_helper()
    meshes=[m for m in bpy.data.objects if m.type=="MESH"]
    if len(meshes)!=1:
        raise ValueError("Only the original CC0 body mesh should be present")
    camera=bpy.context.scene.camera
    if camera is None:
        raise ValueError("Actual Blender proof camera missing")
    clay=bpy.data.materials.new("Hollowed neutral original source clay — no emission")
    clay.use_nodes=True
    bsdf=clay.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(.57,.54,.50,1)
    bsdf.inputs["Roughness"].default_value=.98
    low,high=helper.evaluated_mesh_bounds(meshes)
    bounds=high-low
    center=tuple((low+high)/2)
    camera.data.ortho_scale=max(1.18*float(bounds.z),
                                1.20*float(bounds.x)*400/320,
                                1.20*float(bounds.y)*400/320)
    helper.render_study(output,camera,clay,"clay",center)
    helper.render_study(output,camera,clay,"material",center)
    camera.location=Vector((center[0]+4.95,center[1]-4.95,center[2]+3.0))
    helper.look_at(camera,center)

    main_rig["H1_source_only_static_pose"]=True
    main_rig["attack_animation_created"]=False
    main_rig["original_source_untouched"]=True
    main_rig["note"]="Armature has static source-rest study quaternion values; NO animation actions, no engine changes"
    main_rig["current_art_status"]="REVIEW REQUIRED, UNAPPROVED"
    if bpy.data.actions:
        raise ValueError("An animation action was unexpectedly added")
    bpy.context.preferences.filepaths.save_version=0
    final=output/"hollowed-h1-feral-rest-source-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(final))
    qc={
      "status":"H1 static FERAL source rest stance: NOT OWNER APPROVED",
      "source":source.name,
      "artist_root":"City Building Game Art, CC0-1.0",
      "source_bones":len(main_rig.data.bones),
      "skin_meshes":len(meshes),
      "source_actions":len(bpy.data.actions),
      "animation_engine_modified":False,
      "attack_clips_created":0,
      "bone_pose_changes_without_keyframes":["joint14","joint14.001","joint11",
                                              "joint11.001","joint4"],
      "actual_wrist_drop_metres":drops,
      "eight_real_blender_views":True,
      "owner_approved":False
    }
    (output/"rest-source-qc.json").write_text(json.dumps(qc,indent=2)+"\n",
                                              encoding="utf-8")
    print("H1 STATIC REST SOURCE QA:",json.dumps(qc,sort_keys=True))


if __name__=="__main__":
    main()
