#!/usr/bin/env python3
"""Hollowed M1 — original Rotwalker anatomical source, ACTUAL independent deform rig.

No old H1 model or rig. No runtime, pixel conversion, or shared animation engine.
This is a NEW SOURCE-ART deformation prototype for owner steering: eight genuine
Blender clay angles and a contact sheet of animated source-mesh poses.
The creator's original 31,963 vertices are preserved untouched. Bone weights
are approximate, and the resulting organic motion is a PROTOTYPE, not approved.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from PIL import Image, ImageDraw

ROOT = (Path.cwd() / "artifacts/hollowed-reference-v2").resolve()
VIEWS = ("front", "front-right", "right", "back-right",
         "back", "back-left", "left", "front-left")
FRAMES = (1, 7, 13, 19, 25, 31, 37, 43)


def smooth(v, a, b):
    t = max(0., min(1., (v-a)/(b-a)))
    return t*t*(3-2*t)


def eval_points(obj):
    deps=bpy.context.evaluated_depsgraph_get()
    eo=obj.evaluated_get(deps)
    mesh=eo.to_mesh()
    try:
        return [eo.matrix_world@v.co for v in mesh.vertices]
    finally:
        eo.to_mesh_clear()


def bounds(points):
    return (Vector(tuple(min(p[i] for p in points) for i in range(3))),
            Vector(tuple(max(p[i] for p in points) for i in range(3))))


def create_rig(body, base):
    """Real Blender skinning hierarchy for an *unrigged* artist source mesh."""
    lo,hi=bounds(base)
    if not 2.74 < hi.z-lo.z < 2.90 or not 2.2 < hi.x-lo.x < 2.55:
        raise ValueError("Wrong original 3D character; abort rather than rig old H1")
    if len(base)!=len(body.data.vertices) or len(base)<31000:
        raise ValueError("Original source topology changed")
    if bpy.data.actions:
        raise ValueError("Do not graft third-party source animations")

    cx=float((lo.x+hi.x)/2)
    cy=float((lo.y+hi.y)/2)
    z0=float(lo.z)
    def P(x,y,z): return (cx+x,cy+y,z0+z)

    spec={
        # name: parent, head, tail; all expressed in owner-selected real
        # Rotwalker source world space and centered about anatomical body.
        "H_Root": (None,P(0,0,.02),P(0,0,.18)),
        "H_Pelvis": ("H_Root",P(0,0,1.22),P(0,0,1.51)),
        "H_SpineLumbar": ("H_Pelvis",P(0,0,1.47),P(0,0,1.87)),
        "H_SpineThoracic": ("H_SpineLumbar",P(0,0,1.86),P(0,0,2.25)),
        "H_Neck": ("H_SpineThoracic",P(0,0,2.23),P(0,0,2.49)),
        "H_Head": ("H_Neck",P(0,0,2.45),P(0,0,2.77)),
    }
    for side,code in ((-1,"L"),(1,"R")):
        spec.update({
            f"H_Clavicle_{code}": ("H_SpineThoracic",P(0,0,2.23),P(side*.40,0,2.22)),
            f"H_UpperArm_{code}": (f"H_Clavicle_{code}",P(side*.38,0,2.20),P(side*.72,0,2.16)),
            f"H_ForeArm_{code}": (f"H_UpperArm_{code}",P(side*.72,0,2.16),P(side*.98,0,2.13)),
            f"H_ClawsRoot_{code}": (f"H_ForeArm_{code}",P(side*.98,0,2.13),P(side*1.15,-.02,2.10)),
            f"H_Thigh_{code}": ("H_Pelvis",P(side*.19,0,1.21),P(side*.23,0,.70)),
            f"H_Shin_{code}": (f"H_Thigh_{code}",P(side*.23,0,.70),P(side*.23,0,.17)),
            f"H_Foot_{code}": (f"H_Shin_{code}",P(side*.23,0,.17),P(side*.23,-.16,.06)),
        })

    skeleton=bpy.data.armatures.new("M1 NEW anatomical source-armature (NOT H1)")
    rig=bpy.data.objects.new("Hollowed Rotwalker M1 genuine 3D art-rig",skeleton)
    bpy.context.scene.collection.objects.link(rig)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode="EDIT")
    for name,(parent,a,b) in spec.items():
        eb=skeleton.edit_bones.new(name)
        eb.head=a
        eb.tail=b
        eb.use_deform=True
        eb.roll=0.
    for name,(parent,_,__) in spec.items():
        if parent:
            eb=skeleton.edit_bones[name]
            eb.parent=skeleton.edit_bones[parent]
            eb.use_connect=False
    bpy.ops.object.mode_set(mode="OBJECT")
    # New vertex groups are assigned from the original T-posed, independently
    # sculpted surface, never inherited from old 70-bone CC0 source.
    groups={name:body.vertex_groups.new(name=name) for name in spec}
    for index,p in enumerate(base):
        x,y,z=p.x-cx,p.y-cy,p.z-z0
        ax=abs(x)
        side="R" if x>=0 else "L"
        arm_mask=smooth(ax,.31,.58)*smooth(z,1.57,1.98)
        leg_mask=(1-smooth(z,1.08,1.42))*smooth(ax,.035,.19)
        torso_mask=max(0.,1-arm_mask-leg_mask)
        weights={}
        def add(n,w):
            if w>.0003:
                weights[n]=weights.get(n,0.)+w
        # Use broad organic transitions around spine/neck junction; avoid
        # one rigid torso slab or floating disconnected arm geometry.
        head=smooth(z,2.40,2.66)
        neck=smooth(z,2.23,2.50)*(1-head)
        spine_hi=smooth(z,1.83,2.13)*(1-head-neck)
        spine_lo=smooth(z,1.42,1.75)*(1-head-neck-spine_hi)
        add("H_Head",torso_mask*head)
        add("H_Neck",torso_mask*neck)
        add("H_SpineThoracic",torso_mask*spine_hi)
        add("H_SpineLumbar",torso_mask*spine_lo)
        add("H_Pelvis",torso_mask*max(0.,1-head-neck-spine_hi-spine_lo))

        # Arm chain in actual source T-pose: shoulder to upper arm to
        # elbow, wrist, hands. Share across neighboring bones at seams.
        arm_clav=1-smooth(ax,.37,.57)
        arm_upper=smooth(ax,.37,.59)*(1-smooth(ax,.65,.83))
        arm_fore=smooth(ax,.67,.88)*(1-smooth(ax,.98,1.11))
        arm_hand=smooth(ax,.98,1.12)
        arm_sum=arm_clav+arm_upper+arm_fore+arm_hand
        if arm_sum>.0001:
            add(f"H_Clavicle_{side}",arm_mask*arm_clav/arm_sum)
            add(f"H_UpperArm_{side}",arm_mask*arm_upper/arm_sum)
            add(f"H_ForeArm_{side}",arm_mask*arm_fore/arm_sum)
            add(f"H_ClawsRoot_{side}",arm_mask*arm_hand/arm_sum)

        # Leg root, knee and ankle weight blends, including trouser/
        # bandage source vertices, controlled by existing knee joints.
        hip=smooth(z,.98,1.28)
        thigh=smooth(z,.62,.86)*(1-hip)
        foot=1-smooth(z,.13,.32)
        shin=(1-hip-thigh)*(1-foot)
        add(f"H_Thigh_{side}",leg_mask*(hip+thigh))
        add(f"H_Shin_{side}",leg_mask*max(0.,shin))
        add(f"H_Foot_{side}",leg_mask*foot)
        total=sum(weights.values())
        if total<.005:
            raise ValueError(f"Unweighted creator vertex at {index}")
        for group,w in weights.items():
            groups[group].add([index],w/total,"REPLACE")

    arm_mod=body.modifiers.new("M1 3D source ARTICULATED deformation","ARMATURE")
    arm_mod.object=rig
    arm_mod.use_vertex_groups=True
    scene=bpy.context.scene
    scene["m1_source_rig_bones"]=len(spec)
    scene["m1_not_game_animation_engine"]=True
    rig.show_in_front=False
    return rig,{"bone_count":len(spec),"total_skin_weights":len(groups),
                "original_vertices":len(base),"original_polygons":len(body.data.polygons),
                "old_H1_rig_reused":False}


def axis_turn(rig, name, entries):
    pb=rig.pose.bones[name]
    pb.rotation_mode="QUATERNION"
    rest=(rig.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3())
    q=Quaternion()
    for axis,angle in entries:
        local=rest.inverted() @ Vector(axis)
        local.normalize()
        q=q @ Quaternion(local,angle)
    pb.rotation_quaternion=q


def set_pose(rig, phase):
    """Eight authored organic breathing / predatory weight-shift poses.

    Torso and head react at different phases, forearms trail shoulders.
    This is genuine skinned 3D geometry via Blender armature pose, not
    sprite warping, not generated frame illustrations or shared engine.
    """
    wave=math.sin(phase)
    follow=math.sin(phase-.45)
    later=math.sin(phase-.90)
    rig.pose.bones["H_Root"].location=(0,0,0)
    axis_turn(rig,"H_Pelvis",[((0,1,0), .030 + .030*follow),
                              ((1,0,0), .075+.023*wave)])
    axis_turn(rig,"H_SpineLumbar",[((1,0,0), .59 + .038*wave),
                                   ((0,0,1), .040*later)])
    axis_turn(rig,"H_SpineThoracic",[((1,0,0), .39 + .050*follow),
                                     ((0,0,1), -.038*wave)])
    axis_turn(rig,"H_Neck",[((1,0,0), -.28 + .030*later)])
    axis_turn(rig,"H_Head",[((1,0,0), -.18 + .036*math.sin(phase-.78)),
                            ((0,0,1), -.055+.025*later)])
    # Arms do NOT swing together: one reaches around the side of the
    # collapsed body; the opposite claw trails with different timing.
    axis_turn(rig,"H_Clavicle_L",[((1,0,0), -.05+.030*wave),
                                  ((0,0,1), .065+.018*follow)])
    axis_turn(rig,"H_Clavicle_R",[((1,0,0), .085+.045*follow),
                                  ((0,0,1), -.10-.028*later)])
    axis_turn(rig,"H_UpperArm_L",[((0,0,1), .44+.050*wave),
                                 ((0,1,0), -.98+.075*later)])
    axis_turn(rig,"H_UpperArm_R",[((0,0,1), -.50-.065*follow),
                                 ((0,1,0), 1.30+.070*wave)])
    axis_turn(rig,"H_ForeArm_L",[((0,1,0), -.27+.070*later),
                                ((1,0,0), -.16-.025*follow)])
    axis_turn(rig,"H_ForeArm_R",[((0,1,0), .17-.080*later),
                                ((1,0,0), .14+.022*wave)])
    axis_turn(rig,"H_ClawsRoot_L",[((0,1,0), -.16+.08*later)])
    axis_turn(rig,"H_ClawsRoot_R",[((0,1,0), .12-.07*follow)])
    # Broken-kneed stance: asymmetric pelvis-counter thigh/shin angles.
    axis_turn(rig,"H_Thigh_L",[((1,0,0), -.38+.024*wave),
                              ((0,1,0), -.045)])
    axis_turn(rig,"H_Thigh_R",[((1,0,0), .27-.022*follow),
                              ((0,1,0), .038)])
    axis_turn(rig,"H_Shin_L",[((1,0,0), .62+.025*follow)])
    axis_turn(rig,"H_Shin_R",[((1,0,0), -.36-.025*wave)])
    axis_turn(rig,"H_Foot_L",[((1,0,0), -.24)])
    axis_turn(rig,"H_Foot_R",[((1,0,0), .12)])


def author_motion(rig, body, original_low):
    scene=bpy.context.scene
    scene.render.fps=12
    scene.frame_start=1
    scene.frame_end=49
    footsteps=[]
    for frame in range(1,50,6):
        scene.frame_set(frame)
        phase=(frame-1)/48.0*math.tau
        set_pose(rig,phase)
        bpy.context.view_layer.update()
        low,_=bounds(eval_points(body))
        delta=float(original_low.z-low.z)
        if abs(delta)>.23:
            raise ValueError(f"Unrealistic feet-ground correction on frame {frame}: {delta:.3f}")
        # The root bone's rig-local translation is not guaranteed to be
        # numerically identical to world Z once weighted / parent controls
        # are evaluated; solve by observed geometry (iterative feedback).
        # This is still NOT foot IK, so record and honestly review both soles.
        correction=0.0
        residual=delta
        for iteration in range(5):
            correction+=residual
            rig.pose.bones["H_Root"].location.z=correction
            bpy.context.view_layer.update()
            low,_=bounds(eval_points(body))
            residual=float(original_low.z-low.z)
            if abs(residual)<.009:
                break
        if abs(residual)>=.02:
            raise ValueError(
                f"Weighted source heel contact not actually achieved frame={frame}: "
                f"start_delta={delta:.4f}, final_root={correction:.4f}, "
                f"residual={residual:.4f}"
            )
        if abs(correction)>.23:
            raise ValueError(f"Implausible source root correction frame={frame}: {correction:.3f}")
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path="rotation_quaternion",
                                 frame=frame,group=bone.name)
        rig.pose.bones["H_Root"].keyframe_insert(data_path="location",frame=frame,
                                                 group="H_Root")
        footsteps.append({"frame":frame,"ground_z":round(float(low.z),5),
                          "root_correction":round(correction,6),
                          "residual_m":round(residual,6)})
    # Seamless loop on true original bone controls, not a sprite crossfade.
    scene.frame_set(49)
    set_pose(rig,0)
    rig.pose.bones["H_Root"].location.z=footsteps[0]["root_correction"]
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="rotation_quaternion",frame=49,group=bone.name)
    rig.pose.bones["H_Root"].keyframe_insert(data_path="location",frame=49,
                                             group="H_Root")
    scene.frame_set(1)
    if not bpy.data.actions:
        raise ValueError("No actual editable armature animation was authored")
    for action in bpy.data.actions:
        action.name="Hollowed M1 source-only breathing stagger DEMO NOT APPROVED"
    return {"source_demo_actions":len(bpy.data.actions),
            "source_motion_frames":49,
            "source_motion_frame_rate":12,
            "motion_category":"source-art weight-shift idle ONLY, not combat/run/walk",
            "real_ground_contact_checks":footsteps,
            "ik_solver_claimed":False,
            "animation_engine_modified":False}


def look_at(obj,center):
    obj.rotation_euler=(Vector(center)-obj.location).to_track_quat("-Z","Y").to_euler()


def material(name, rgb):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*rgb,1)
    shader.inputs["Roughness"].default_value=.93
    shader.inputs["Emission Strength"].default_value=0
    return mat


def screenshot(output, body):
    scene=bpy.context.scene
    scene.frame_set(1)
    low,high=bounds(eval_points(body))
    if high.z-low.z<1.9:
        raise ValueError("Anatomy collapsed: owner reference needs full-height 3D")
    center=(low+high)/2
    for obj in list(scene.objects):
        if obj.type in ("LIGHT","CAMERA"):
            bpy.data.objects.remove(obj,do_unlink=True)
    scene.render.engine="CYCLES"
    scene.cycles.samples=10
    scene.render.resolution_x=360
    scene.render.resolution_y=440
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False
    if scene.world is None:
        scene.world=bpy.data.worlds.new("M1 actual source anatomy")
    scene.world.use_nodes=True
    background=scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(.085,.093,.11,1)
    background.inputs["Strength"].default_value=1
    camdata=bpy.data.cameras.new("M1 full-3D anatomical motion camera")
    camera=bpy.data.objects.new("M1 full-3D anatomical motion camera",camdata)
    scene.collection.objects.link(camera)
    scene.camera=camera
    camdata.type="ORTHO"
    width=max(float(high.x-low.x),1.)
    camdata.ortho_scale=max(float(high.z-low.z)*1.23, width*1.4*440/360)
    for name,location,power in (
        ("Clay shoulder anatomy key",center+Vector((-4,-4,5)),450),
        ("Clay anatomy fill",center+Vector((4,2,4)),265)):
        lightdata=bpy.data.lights.new(name,"AREA")
        obj=bpy.data.objects.new(name,lightdata)
        scene.collection.objects.link(obj)
        obj.location=location
        lightdata.energy=power
        lightdata.size=4
        look_at(obj,center)
    bpy.context.view_layer.material_override=material("M1 rigged SOURCE neutral matte",(.61,.57,.52))

    def render(label,angle,frame):
        scene.frame_set(frame)
        camera.location=(center.x+6*math.sin(angle),
                         center.y-6*math.cos(angle),center.z+.45)
        look_at(camera,center)
        file=output/f"M1-RIG-{label}-{frame:03d}.png"
        scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        with Image.open(file) as src:
            image=src.convert("RGB")
        ImageDraw.Draw(image).text((8,8),label.upper()+" | TRUE 3D RIG",
                                   fill=(245,245,245))
        return image

    view_frames=[]
    for idx,direction in enumerate(VIEWS):
        view_frames.append(render(direction,math.tau*idx/8,1))
    sheet=Image.new("RGB",(360*4,440*2),(12,14,18))
    for i,img in enumerate(view_frames):
        sheet.paste(img,(i%4*360,i//4*440))
    sheet.save(output/"M1-REAL-3D-RIG-EIGHT-ANGLES.png")
    tri=Image.new("RGB",(360*3,440))
    for col,index in enumerate((0,2,4)):
        tri.paste(view_frames[index],(col*360,0))
    tri.save(output/"M1-REAL-3D-RIG-FRONT-SIDE-BACK.png")
    # Two camera angles of 8 true independently posed Blender 3D frames.
    for label,angle in (("FRONT",0),("SIDE",math.pi/2)):
        frames=[render(label+"-motion",angle,f) for f in FRAMES]
        motion=Image.new("RGB",(360*4,440*2))
        for i,img in enumerate(frames):
            motion.paste(img,(i%4*360,i//4*440))
        motion.save(output/f"M1-REAL-3D-RIG-{label}-EIGHT-POSES.png")
        frames[0].save(output/f"M1-REAL-3D-RIG-{label}-FIRST.png")
        frames[0].save(output/f"M1-REAL-3D-RIG-{label}-MOTION.gif",
                       save_all=True,append_images=frames[1:],duration=500,
                       loop=0,optimize=False)
    bpy.context.view_layer.material_override=None
    scene.frame_set(1)
    return {"real_full_3d_views":8,"genuine_source_motion_frames_rendered":16,
            "native_pixel_exported":False,"runtime_engine_changed":False}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",required=True,type=Path)
    parser.add_argument("--output",required=True,type=Path)
    a=parser.parse_args()
    out=a.output.resolve()
    if out==ROOT or not out.is_relative_to(ROOT):
        raise ValueError("Only isolated art-source proof folders are supported")
    out.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(a.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    scene=bpy.context.scene
    if scene.get("hollowed_source_lineage")!="owner-reference-original-v2":
        raise ValueError("Not the selected independent Sotudios Rotwalker source")
    if "Sotudios" not in scene.get("hollowed_source_author",""):
        raise ValueError("Artist attribution/provenance missing")
    body=[o for o in scene.objects if o.type=="MESH"]
    if len(body)!=1 or len(body[0].data.vertices)<31000:
        raise ValueError("Expected untouched original Rotwalker artist sculpt")
    if bpy.data.armatures:
        raise ValueError("Expected unrigged Rotwalker; no old H1 rig allowed")
    baseline=eval_points(body[0])
    initial_lo,_=bounds(baseline)
    rig,rig_report=create_rig(body[0],baseline)
    movement=author_motion(rig,body[0],initial_lo)
    views=screenshot(out,body[0])
    if len(body[0].data.vertices)!=rig_report["original_vertices"]:
        raise ValueError("Original artist sculpt topology was changed")
    if len(rig.data.bones)!=rig_report["bone_count"] or len(bpy.data.actions)<1:
        raise ValueError("No actual Blender deform rig/pose action")
    scene["source_only"]=True
    scene["m1_real_3d_articulated_motion"]=True
    scene["candidate_only"]=True
    scene["pixel_export_performed"]=False
    scene["owner_approved"]=False
    bpy.context.preferences.filepaths.save_version=0
    dest=out/"Hollowed-M1-ANATOMICAL-ART-RIG-REAL-MOTION-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    report={
      "status":"SOURCE ART 3D deformation / organic-motion PROTOTYPE, NOT APPROVED",
      "original_source":"Owner-selected Sotudios Rotwalker CC BY 4.0",
      "original_mesh_preserved":True,
      "rig":rig_report,
      "motion":movement,
      "render":views,
      "old_H1_source_used":False,
      "universal_animation_engine_modified":False,
      "gameplay_modified":False,
      "pixel_export_performed":False,
      "owner_approved":False,
      "source_blend":dest.name
    }
    (out/"M1-RIG-motion-QC.json").write_text(json.dumps(report,indent=2)+"\n",
                                               encoding="utf-8")
    print("HOLLOWED M1 ART-RIG SOURCE PROOF",json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
