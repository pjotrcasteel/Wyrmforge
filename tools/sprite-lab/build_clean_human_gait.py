#!/usr/bin/env python3
"""Independent anatomically bounded humanoid walking rig (NOT old BVH retarget).

This produces a reproducible, editable motion-control SOURCE for the Gothic
wizard. It never imports the rejected CMU fitted rig or clay character.
Animation art is NOT approved without real full-cycle visual inspection.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Quaternion

TARGET="GEO-body_male_realistic"
FRAMES=16
GROUND_Z=.06
HIP_Z=.96
LEG_LENGTH=.88
STRIDE=.38
STANCE_FRACTION=.62


def check(value,message):
    if not value:
        raise RuntimeError("Gothic walk rig: "+message)


def load_human(bundle):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    with bpy.data.libraries.load(str(bundle.resolve()),link=False) as (source,dest):
        check(TARGET in source.objects,"original CC0 realistic male mesh missing")
        dest.objects=[TARGET]
    body=dest.objects[0]
    check(body is not None and body.type=="MESH","invalid original CC0 body")
    bpy.context.scene.collection.objects.link(body)
    body.name="CC0 male human anatomy | Gothic wizard base"
    check(len(body.data.vertices)>=10000 and len(body.data.uv_layers)>0,
          "human topology or UV missing")
    body.parent=None
    body.matrix_world.identity()
    for mod in list(body.modifiers):
        body.modifiers.remove(mod)
    coords=[v.co.copy() for v in body.data.vertices]
    lo=Vector(tuple(min(v[k] for v in coords) for k in range(3)))
    hi=Vector(tuple(max(v[k] for v in coords) for k in range(3)))
    height=hi.z-lo.z
    check(height>.5,"source male anatomy has invalid height")
    scale=2.0/height
    mid_x=(lo.x+hi.x)*.5
    mid_y=(lo.y+hi.y)*.5
    for vertex in body.data.vertices:
        p=vertex.co
        p.x=(p.x-mid_x)*scale
        p.y=(p.y-mid_y)*scale
        p.z=(p.z-lo.z)*scale
    body.data.update()
    return body


def create_anatomical_armature():
    data=bpy.data.armatures.new("Humanoid deform bones - independent of BVH")
    obj=bpy.data.objects.new("Original Gothic wizard anatomical rig",data)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bone_specs={
        "Hips":((0,0,.96),(0,0,1.12),None),
        "LowerBack":((0,0,1.12),(0,0,1.38),"Hips"),
        "Spine":((0,0,1.38),(0,0,1.60),"LowerBack"),
        "Neck":((0,0,1.60),(0,0,1.74),"Spine"),
        "Head":((0,0,1.74),(0,0,1.95),"Neck"),
    }
    for side,sign in (("Left",-1.),("Right",1.)):
        x=sign*.145
        bone_specs[side+"UpLeg"]=((x,0,.96),(x,-.015,.52),"Hips")
        bone_specs[side+"Leg"]=((x,-.015,.52),(x,-.03,.08),side+"UpLeg")
        bone_specs[side+"Foot"]=((x,-.03,.08),(x,-.18,.065),side+"Leg")
        sx=sign*.235
        bone_specs[side+"Shoulder"]=((sign*.11,0,1.60),(sx,0,1.60),"Spine")
        bone_specs[side+"Arm"]=((sx,0,1.60),(sign*.32,0,1.32),side+"Shoulder")
        bone_specs[side+"ForeArm"]=((sign*.32,0,1.32),(sign*.33,-.01,1.10),side+"Arm")
        bone_specs[side+"Hand"]=((sign*.33,-.01,1.10),(sign*.33,-.05,1.02),side+"ForeArm")
    for name,(head,tail,parent) in bone_specs.items():
        bone=data.edit_bones.new(name)
        bone.head=head
        bone.tail=tail
        bone.use_connect=False
        if name.endswith("Foot"):
            bone.use_inherit_rotation=False
    for name,(_,_,parent) in bone_specs.items():
        if parent:
            data.edit_bones[name].parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    obj["sourceBVHUsedAsRig"]=False
    obj["humanProportionedRest"]=True
    return obj


def bind_anatomical_skin(body,arm):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO",keep_transform=True)
    check(body.parent==arm,"anatomical skin binding failed")
    check(any(m.type=="ARMATURE" and m.object==arm for m in body.modifiers),
          "missing skin deformation modifier")
    coverage={}
    for side in ("Left","Right"):
        for segment in ("UpLeg","Leg","Foot","Arm","ForeArm"):
            name=side+segment
            group=body.vertex_groups.get(name)
            check(group is not None,"unweighted skeletal segment "+name)
            coverage[name]=sum(
                1 for v in body.data.vertices
                if any(g.group==group.index and g.weight>=.15 for g in v.groups))
            check(coverage[name]>=6,"no strongly attached vertices for "+name)
    return coverage


def smoothstep(u):
    return u*u*(3.-2.*u)


def foot_trajectory(phase):
    """In-place gait: stance foot fixed on ground; swung foot clears it.

    Locomotion translates the actor in the GAME, not by drifting the atlas.
    Stance travels backward in actor-local coordinates at constant speed,
    relative to the moving pelvis, as it would on a treadmill.
    """
    t=phase%1.
    if t<STANCE_FRACTION:
        u=t/STANCE_FRACTION
        return STRIDE*(.5-u),GROUND_Z,True
    u=(t-STANCE_FRACTION)/(1.-STANCE_FRACTION)
    return -STRIDE*.5+STRIDE*smoothstep(u),GROUND_Z+.13*math.sin(math.pi*u),False


def animate(arm):
    bpy.context.view_layer.objects.active=arm
    controls={}
    for side,sign in (("Left",-1.),("Right",1.)):
        target=bpy.data.objects.new(side+" planted-foot IK control",None)
        pole=bpy.data.objects.new(side+" anatomical knee direction",None)
        bpy.context.scene.collection.objects.link(target)
        bpy.context.scene.collection.objects.link(pole)
        target.empty_display_size=.07
        pole.empty_display_size=.09
        controls[side]=(target,pole)
        shin=arm.pose.bones[side+"Leg"]
        ik=shin.constraints.new("IK")
        ik.name="Bounded two-bone human leg reach"
        ik.target=target
        ik.pole_target=pole
        ik.chain_count=2
        ik.pole_angle=0.
        ik.use_stretch=False
    samples=[]
    for i in range(FRAMES+1):
        t=i/FRAMES
        frame=i+1
        # A 0.8% body-height vertical bob, not a squat/kick cycle.
        hip=arm.pose.bones["Hips"]
        hip.location=Vector((.012*math.sin(2*math.pi*t),0.,-.055+.008*math.cos(4*math.pi*t)))
        hip.keyframe_insert(data_path="location",frame=frame)
        for side,sign in (("Left",-1.),("Right",1.)):
            phase=(t+(0 if side=="Left" else .5))%1.
            y,z,stance=foot_trajectory(phase)
            foot,pole=controls[side]
            x=sign*.145
            foot.location=(x,y,z)
            # Fixed forward knee-plane; no rotating/extreme knee pole.
            pole.location=(x,-.65,.53)
            foot.keyframe_insert(data_path="location",frame=frame)
            pole.keyframe_insert(data_path="location",frame=frame)
            arm_bone=arm.pose.bones[side+"Arm"]
            forearm=arm.pose.bones[side+"ForeArm"]
            # Shoulders oppose stepping leg; a staff hand can override later.
            arm_bone.rotation_mode="QUATERNION"
            forearm.rotation_mode="QUATERNION"
            swing=math.radians(18)*math.sin(2*math.pi*t+(0 if side=="Left" else math.pi))
            arm_bone.rotation_quaternion=Quaternion((1,0,0),swing)
            forearm.rotation_quaternion=Quaternion((1,0,0),math.radians(5)+swing*.18)
            arm_bone.keyframe_insert(data_path="rotation_quaternion",frame=frame)
            forearm.keyframe_insert(data_path="rotation_quaternion",frame=frame)
            if i<FRAMES:
                samples.append({"frame":frame,"side":side,"phase":round(phase,4),
                    "footControl":[round(x,4),round(y,4),round(z,4)],
                    "stance":stance})
        spine=arm.pose.bones["Spine"]
        spine.rotation_mode="QUATERNION"
        spine.rotation_quaternion=Quaternion((0,0,1),math.radians(1.5)*math.sin(2*math.pi*t))
        spine.keyframe_insert(data_path="rotation_quaternion",frame=frame)
    bpy.context.scene.frame_start=1
    bpy.context.scene.frame_end=FRAMES+1
    bpy.context.scene.frame_set(1)
    return samples


def prepare_scene(body,arm,output):
    scene=bpy.context.scene
    scene.render.engine="BLENDER_WORKBENCH"
    scene.render.resolution_x=320
    scene.render.resolution_y=320
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    scene.display.shading.light="STUDIO"
    scene.display.shading.color_type="MATERIAL"
    material=bpy.data.materials.new("NEUTRAL motion inspection only")
    material.diffuse_color=(.42,.40,.39,1)
    body.data.materials.clear()
    body.data.materials.append(material)
    cd=bpy.data.cameras.new("3-4 game-scale gait camera")
    cam=bpy.data.objects.new("3-4 game-scale gait camera",cd)
    scene.collection.objects.link(cam)
    cam.location=(2.9,-4.4,4.15)
    look=Vector((0,0,1.02))
    cam.rotation_euler=(look-cam.location).to_track_quat("-Z","Y").to_euler()
    cd.type="ORTHO"
    cd.ortho_scale=2.65
    scene.camera=cam
    scene["reviewOnly"]=True
    scene["artApproved"]=False
    scene["originalGothicLookAdded"]=False
    return cam


def inspect_and_render(body,arm,out,samples):
    scene=bpy.context.scene
    metrics=[]
    for i in range(FRAMES):
        scene.frame_set(i+1)
        # Evaluated matrices are authoritative; inspecting only bone.head
        # previously recorded a constant 0.96 even with keyed pelvis motion.
        evaluated_arm=arm.evaluated_get(bpy.context.evaluated_depsgraph_get())
        hip=arm.matrix_world@evaluated_arm.pose.bones["Hips"].matrix.translation
        head=arm.matrix_world@evaluated_arm.pose.bones["Head"].matrix.translation
        knees={}
        foot={}
        for side in ("Left","Right"):
            knees[side]=arm.matrix_world@arm.pose.bones[side+"Leg"].head
            foot[side]=arm.matrix_world@arm.pose.bones[side+"Foot"].head
        lateral=foot["Right"].x-foot["Left"].x
        check(lateral>.10,f"actual feet crossed on frame {i+1}: {lateral:.3f}")
        check(head.z>hip.z+.40,f"body squatting on frame {i+1}")
        check(abs(hip.z-.96)<.13,f"hip collapsed vertically on frame {i+1}")
        for side in ("Left","Right"):
            knee=knees[side]
            hip_joint=arm.matrix_world@arm.pose.bones[side+"UpLeg"].head
            ankle=foot[side]
            v1=hip_joint-knee;v2=ankle-knee
            cos=max(-1.,min(1.,v1.normalized().dot(v2.normalized())))
            bend=180-math.degrees(math.acos(cos))
            check(bend<80.,f"excessive knee collapse {side} frame {i+1}: {bend:.1f}")
        dest=out/f"frame-{i:02d}.png"
        scene.render.filepath=str(dest)
        bpy.ops.render.render(write_still=True)
        check(dest.exists() and dest.stat().st_size>2000,"missing original Blender motion frame")
        metrics.append({"frame":i+1,"pelvisZ":round(hip.z,4),
                        "headZ":round(head.z,4),
                        "footLateralSeparation":round(lateral,4),
                        "worldFeet":{k:[round(float(v),4) for v in p] for k,p in foot.items()}})
    hip_range=max(x["pelvisZ"] for x in metrics)-min(x["pelvisZ"] for x in metrics)
    check(.006<hip_range<.06,
          "evaluated pelvis fails small vertical weight transfer: "+str(hip_range))
    left_steps=[p["worldFeet"]["Left"][1] for p in metrics]
    right_steps=[p["worldFeet"]["Right"][1] for p in metrics]
    check(max(left_steps)-min(left_steps)>.22 and
          max(right_steps)-min(right_steps)>.22,
          "evaluated feet barely stride despite authored IK targets")
    scene.frame_set(1)
    filename=out/"clean-human-walk-source.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(filename))
    return {"sourceBlend":filename.name,"meshVertices":len(body.data.vertices),
            "source":"Original CC0 Realistic Male / independent anatomical gait",
            "originalRecordedBVHModified":False,
            "rejectedLegacyRigUsed":False,
            "frames":FRAMES,"feetNeverCross":True,
            "hipVerticalRange":round(hip_range,5),
            "leftFootForwardTravel":round(max(left_steps)-min(left_steps),4),
            "rightFootForwardTravel":round(max(right_steps)-min(right_steps),4),
            "samples":samples,"poses":metrics,
            "approvedGothicArtwork":False,
            "productionSpriteAtlas":False,
            "actorRuntimeSwitched":False,
            "visuallyApproved":False}


def main():
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser=argparse.ArgumentParser()
    parser.add_argument("--bundle",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    opts=parser.parse_args(args)
    output=opts.output.resolve()
    output.mkdir(parents=True,exist_ok=True)
    body=load_human(opts.bundle)
    arm=create_anatomical_armature()
    coverage=bind_anatomical_skin(body,arm)
    samples=animate(arm)
    prepare_scene(body,arm,output)
    report=inspect_and_render(body,arm,output,samples)
    report["skinCoverage"]=coverage
    (output/"clean-gait-metrics.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k not in ("samples","poses")},indent=2))


if __name__=="__main__":
    main()
