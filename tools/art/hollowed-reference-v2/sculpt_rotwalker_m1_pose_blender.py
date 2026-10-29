#!/usr/bin/env python3
"""M1 actual authored 3D Rotwalker body/pose deformation in Blender.

Uses the owner-selected independent Sotudios source, NOT previous H1 mannequin.
Keeps original source geometry in a Basis shape key. Modifies a second REAL
source mesh shape key. No motion actions/rigging/game assets or pixel conversion.
All results UNAPPROVED until real 3D body and pose visual review.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector
from PIL import Image, ImageDraw

FACINGS = ("front", "front-right", "right", "back-right",
           "back", "back-left", "left", "front-left")
ROOT = (Path.cwd() / "artifacts/hollowed-reference-v2").resolve()


def smooth(x, a, b):
    t = max(0., min(1., (x-a) / (b-a)))
    return t*t*(3.0-2.0*t)


def bone_rotate(point, pivot, axis, radians):
    q = Quaternion(Vector(axis), radians)
    return Vector(pivot) + q @ (Vector(point)-Vector(pivot))


def evaluate_model(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    mesh = eo.to_mesh()
    try:
        return [eo.matrix_world @ p.co for p in mesh.vertices]
    finally:
        eo.to_mesh_clear()


def bounds(points):
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    return lo, hi


def pose_connected_mesh(body):
    """Original vertex-order-preserving spatial articulation for first model pose.

    Approximate anatomical pivots follow the actual normalized Rotwalker
    authoring mesh: 2.8m tall, 2.33m arm-span, 0.53m torso depth.
    The source is unrigged, so this is a REVERSIBLE static shape study.
    It is not a claim of a production animation-ready rig.
    """
    rest = evaluate_model(body)
    before_low, before_high = bounds(rest)
    if not 2.74 < before_high.z - before_low.z < 2.9:
        raise ValueError(f"Unexpected owner-selected Rotwalker source: {before_high-before_low}")
    if not 2.20 < before_high.x - before_low.x < 2.55:
        raise ValueError("Rotwalker arm-span differs from reference, no blind retargeting")
    if not .40 < before_high.y - before_low.y < .70:
        raise ValueError("Rotwalker torso depth differs from approved model source")
    if len(body.data.vertices) != len(rest) or len(rest) < 31000:
        raise ValueError("Original sculpt vertex order/topology lost")

    old_shape_count = len(body.data.shape_keys.key_blocks) if body.data.shape_keys else 0
    if old_shape_count:
        raise ValueError("Expected pristine source mesh; avoid accumulating the old failed poses")
    body.shape_key_add(name="Rotwalker creator ORIGINAL BIND SOURCE", from_mix=False)
    pose_key = body.shape_key_add(name="M1 feral stance / EDITABLE SOURCE PROOF", from_mix=False)
    pose_key.value = 1.

    inverse = body.matrix_world.inverted()
    posed = []
    # Measure source anatomy from artist-authored world-space coordinates.
    center_x = .5 * (before_low.x + before_high.x)
    center_y = .5 * (before_low.y + before_high.y)
    floor = before_low.z

    # Rotwalker source coordinates are +X body right, -Y forward, +Z up.
    def target(point):
        x, y, z = point.x-center_x, point.y-center_y, point.z-floor

        # A subtle asymmetric hip lean and a true forward collapsed spine.
        waist_pivot = Vector((0, 0, 1.30))
        torso_weight = smooth(z, 1.22, 1.69)
        bent = bone_rotate(Vector((x,y,z)), waist_pivot, (1,0,0), .28)
        upper = Vector((x,y,z)).lerp(bent, torso_weight)
        upper.x += .030 * torso_weight * smooth(z,1.60,2.2)
        # Chin/face lowered relative to upper thorax, NOT detached skull.
        neck_weight = smooth(z, 2.24, 2.57)
        head_pivot = bone_rotate(Vector((0,0,2.29)), waist_pivot, (1,0,0), .28)
        lowered = bone_rotate(upper, head_pivot, (1,0,0), .10)
        upper = upper.lerp(lowered, neck_weight * .75)

        # Original arm source extends sideways in T-pose. Anatomically
        # rotate shoulder->wrist chains downward at unequal angles.
        # Gaussian taper around clavicle preserves non-detached deltoids.
        side = 1 if x>=0 else -1
        arm_begin = .32
        arm_weight = smooth(abs(x), arm_begin, .52)
        shoulder_rest = Vector((side*.385,0,2.195))
        shoulder = bone_rotate(shoulder_rest, waist_pivot, (1,0,0), .28)
        shoulder.x += .030*smooth(2.195,1.60,2.2)
        outer = upper - shoulder
        # Independent arm outreach: right arm lowered, left reaching.
        if side > 0:
            yaw = -.31
            drop = 1.19
        else:
            yaw = .34
            drop = -.89
        # A true 3D approach: twist arm forward then drop from real
        # shoulder pivot. Do not simply rotate a 2D silhouette.
        rotated = bone_rotate(shoulder + outer, shoulder, (0,0,1), yaw)
        rotated = bone_rotate(rotated, shoulder, (0,1,0), drop)
        upper = upper.lerp(rotated, arm_weight)

        # Leg asymmetry around true hip/knee levels. Keep deformation
        # small and connected so the original sculpt stays recognizable.
        leg_weight = 1.0-smooth(z, 1.05, 1.38)
        leg_side = 1 if x >= 0 else -1
        hip = Vector((leg_side*.20,0,1.22))
        if leg_side > 0:
            hip_bend = -.095
            knee_bend = .11
        else:
            hip_bend = .13
            knee_bend = -.15
        lowered_leg = bone_rotate(Vector((x,y,z)), hip, (1,0,0), hip_bend)
        knee_pivot = bone_rotate(Vector((leg_side*.23,0,.68)), hip, (1,0,0), hip_bend)
        knee_relative = bone_rotate(lowered_leg, knee_pivot, (1,0,0), knee_bend)
        knee_weight = 1.0-smooth(z,.63,.83)
        leg = lowered_leg.lerp(knee_relative, knee_weight)
        leg.x += leg_side*.032*smooth(1.28-z,.0,.8)
        composed = Vector((x,y,z)).lerp(leg,leg_weight)
        composed = composed.lerp(upper,1.0-leg_weight)
        return composed+Vector((center_x,center_y,floor))

    for v in rest:
        posed.append(target(v))
    # Preserve feet on one horizontal ground while keeping the sculpt's
    # original sole thickness and weight distribution.
    left_sole = min(v.z for v in posed if v.x-center_x < -.08 and v.z<floor+.35)
    right_sole = min(v.z for v in posed if v.x-center_x > .08 and v.z<floor+.35)
    corrections = {}
    for side, sole in ((-1,left_sole),(1,right_sole)):
        corrections[side] = floor-sole
        if abs(corrections[side]) > .15:
            raise ValueError(f"Unphysical sole correction {side}: {corrections[side]}")
    for i, point in enumerate(posed):
        side = 1 if point.x-center_x>=0 else -1
        weight = 1.0-smooth(point.z-floor,.35,.85)
        adjusted = point.copy()
        adjusted.z += corrections[side]*weight
        pose_key.data[i].co = inverse @ adjusted
        posed[i] = adjusted

    bpy.context.view_layer.update()
    new_lo,new_hi=bounds(evaluate_model(body))
    assert len(body.data.vertices) == len(rest)
    assert len(body.data.polygons)>1000
    if new_hi.z-new_lo.z < 2.3:
        raise ValueError("Pose collapsed skull into torso")
    if abs(new_lo.z-floor) > .035:
        raise ValueError("Feet did not retain ground contact")

    # Frontal source too horizontally wide for a strong ghoul read;
    # measure actual pose reduction instead of accepting a T-pose.
    original_span=before_high.x-before_low.x
    new_span=new_hi.x-new_lo.x
    if not .45 < new_span/original_span < .90:
        raise ValueError(f"Arms not convincingly dropped: {new_span/original_span:.3f}")
    head_rest=[p for p in rest if p.z > floor+2.59 and abs(p.x-center_x)<.28]
    head_posed=[p for p,old in zip(posed,rest)
                if old.z > floor+2.59 and abs(old.x-center_x)<.28]
    head_forward=(sum(v.y for v in head_rest)-sum(v.y for v in head_posed))/len(head_rest)
    if not .18 < head_forward < .6:
        raise ValueError(f"Head did not shift forward on actual geometry: {head_forward}")
    return {
        "source_vertices_preserved":len(rest),
        "original_polygon_count":len(body.data.polygons),
        "original_shape_keys_retained":True,
        "new_editable_pose_shape_key":pose_key.name,
        "old_arms_span_m":round(original_span,4),
        "new_arms_span_m":round(new_span,4),
        "armspan_ratio":round(new_span/original_span,4),
        "head_forward_m":round(head_forward,4),
        "sole_corrections_m":{str(k):round(v,4) for k,v in corrections.items()},
        "source_height_m":round(float(before_high.z-before_low.z),4),
        "posed_height_m":round(float(new_hi.z-new_lo.z),4),
        "pose_is_not_animation_rig":True,
    }


def look_at(obj, focus):
    obj.rotation_euler=(Vector(focus)-obj.location).to_track_quat("-Z","Y").to_euler()


def material(name, col, flat=False):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    if flat:
        nodes.clear()
        dst=nodes.new("ShaderNodeOutputMaterial")
        emission=nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value=(*col,1)
        mat.node_tree.links.new(emission.outputs[0],dst.inputs["Surface"])
    else:
        shader=nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value=(*col,1)
        shader.inputs["Roughness"].default_value=.93
        shader.inputs["Emission Strength"].default_value=0.
    return mat


def render_actual_3d(output, body):
    scene=bpy.context.scene
    for obj in list(scene.objects):
        if obj.type in ("LIGHT","CAMERA"):
            bpy.data.objects.remove(obj,do_unlink=True)

    low, high=bounds(evaluate_model(body))
    size=high-low
    focus=(low+high)/2
    cam_data=bpy.data.cameras.new("M1 ORTHO camera: real anatomy review")
    cam=bpy.data.objects.new("M1 ORTHO camera: real anatomy review",cam_data)
    scene.collection.objects.link(cam)
    scene.camera=cam
    cam_data.type="ORTHO"
    cam_data.ortho_scale=max(float(size.z)*1.20,
                             float(size.x)*1.35*520/480,
                             float(size.y)*1.35*520/480)
    for label,loc,power in (
        ("M1 Neutral anatomy key",(-3.5,-3.8,6),530),
        ("M1 Neutral anatomy fill",(4,1,4),310)):
        lamp_data=bpy.data.lights.new(label,"AREA")
        lamp=bpy.data.objects.new(label,lamp_data)
        scene.collection.objects.link(lamp)
        lamp.location=Vector(loc)
        lamp_data.energy=power
        lamp_data.size=4
        look_at(lamp,focus)

    if scene.world is None:
        scene.world=bpy.data.worlds.new("M1 neutral review world")
    scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes.get("Background")
    scene.render.engine="CYCLES"
    scene.cycles.samples=20
    scene.render.resolution_x=480
    scene.render.resolution_y=520
    scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    silhouette=material("M1 flat silhouette / source QC",(.026,.028,.029),True)
    clay=material("M1 neutral clay / no eye/char/glow",(.62,.58,.53))
    for variant in ("clay","silhouette"):
        bpy.context.view_layer.material_override=clay if variant=="clay" else silhouette
        bg.inputs["Color"].default_value=((.078,.081,.093,1) if variant=="clay"
                                            else (.60,.61,.62,1))
        bg.inputs["Strength"].default_value=1.0
        imgs=[]
        for index,facing in enumerate(FACINGS):
            angle=math.tau*index/len(FACINGS)
            cam.location=(float(focus.x+6*math.sin(angle)),
                          float(focus.y-6*math.cos(angle)),
                          float(focus.z+.40))
            look_at(cam,focus)
            filename=output/f"REAL-M1-{variant}-{facing}.png"
            scene.render.filepath=str(filename)
            bpy.ops.render.render(write_still=True)
            with Image.open(filename) as src:
                img=src.convert("RGB")
            fill=(245,245,245) if variant=="clay" else (10,10,10)
            ImageDraw.Draw(img).text((10,10),f"REAL 3D M1 | {facing.upper()}",fill=fill)
            imgs.append(img)
        sheet=Image.new("RGB",(1920,1040),(17,18,20))
        for i,img in enumerate(imgs):
            sheet.paste(img,(i%4*480,i//4*520))
        sheet.save(output/f"REAL-M1-{variant}-EIGHT-ANGLES.png")
        if variant=="clay":
            tri=Image.new("RGB",(1440,520))
            for i,frame in enumerate((0,2,4)):
                tri.paste(imgs[frame],(480*i,0))
            tri.save(output/"REAL-M1-FRONT-SIDE-BACK.png")
    bpy.context.view_layer.material_override=None
    return {"real_full_3d":True,"eight_directions":True,"pixel_export_performed":False,
            "camera_ortho_scale":round(float(cam_data.ortho_scale),5)}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True,type=Path)
    p.add_argument("--output",required=True,type=Path)
    args=p.parse_args()
    output=args.output.resolve()
    if output==ROOT or not output.is_relative_to(ROOT):
        raise ValueError("M1 art outputs must remain inside dedicated source artifacts")
    output.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    scene=bpy.context.scene
    if scene.get("hollowed_source_lineage")!="owner-reference-original-v2":
        raise ValueError("Only the owner-selected independent Rotwalker source is permitted")
    if scene.get("hollowed_source_author","").find("Sotudios")<0:
        raise ValueError("Selected artist provenance missing")
    if bpy.data.actions:
        raise ValueError("Do not modify the existing universal animation engine")
    bodies=[o for o in scene.objects if o.type=="MESH"]
    if len(bodies)!=1:
        raise ValueError(f"Expected exactly one authentic artist body mesh: {len(bodies)}")
    original_name=bodies[0].name
    metrics=pose_connected_mesh(bodies[0])
    views=render_actual_3d(output,bodies[0])
    scene["m1_real_3d_body_pose"]=True
    scene["candidate_only"]=True
    scene["owner_approved"]=False
    scene["pixel_export_performed"]=False
    bpy.context.preferences.filepaths.save_version=0
    target=output/"Rotwalker-Hollowed-M1-feral-POSE-REAL-3D-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    qa={
        "status":"M1 genuine edited 3D body and static pose, owner visual review required",
        "source":"Sotudios Rotwalker genuine CC BY 4.0 FBX, independent of H1",
        "original_object_name":original_name,
        "metrics":metrics,
        "views":views,
        "owner_approved":False,
        "production_animation_rig":False,
        "animation_actions_created":len(bpy.data.actions),
        "old_H1_source_reused":False,
        "gameplay_modified":False,
        "pixel_export_performed":False,
        "scene":target.name,
    }
    (output/"REAL-M1-body-pose-qc.json").write_text(json.dumps(qa,indent=2)+"\n",
                                                     encoding="utf-8")
    print("M1 REAL ANATOMY POSE",json.dumps(qa,sort_keys=True))


if __name__=="__main__":
    main()
