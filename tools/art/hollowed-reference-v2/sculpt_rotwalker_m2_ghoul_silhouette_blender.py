#!/usr/bin/env python3
"""Hollowed M2: real rig-attached 3D ghoul hair MASS + hooked claws silhouette.

Inputs: owner-selected genuine Sotudios Rotwalker with M1 independent 20-bone
deform rig and real source-art motion. This is a first original EDITABLE 3D
silhouette study ONLY, no runtime, AI images or pixel sprites. No claim of
owner approval. In particular real ghoul flesh and mouth remain later work.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw


ROOT = (Path.cwd() / "artifacts/hollowed-reference-v2").resolve()
VIEWS = ("front","front-right","right","back-right",
         "back","back-left","left","front-left")


def original_source_vertices(body):
    # Restore unposed ORIGINAL mesh coordinates for sculpting hair follicles
    # and fingertip roots, despite the active weighted armature modifier.
    arm=[m for m in body.modifiers if m.type=="ARMATURE"]
    if len(arm)!=1:
        raise ValueError("Expected ONE rig of owner-selected Rotwalker")
    modifier=arm[0]
    previous=modifier.show_viewport
    modifier.show_viewport=False
    bpy.context.view_layer.update()
    try:
        return [body.matrix_world@v.co for v in body.data.vertices]
    finally:
        modifier.show_viewport=previous
        bpy.context.view_layer.update()


def bounds(vertices):
    low=Vector(tuple(min(p[i] for p in vertices) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in vertices) for i in range(3)))
    return low,high


def mat(name,col):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    sh=m.node_tree.nodes.get("Principled BSDF")
    sh.inputs["Base Color"].default_value=(*col,1)
    sh.inputs["Roughness"].default_value=.93
    sh.inputs["Metallic"].default_value=0
    sh.inputs["Emission Strength"].default_value=0
    return m


def add_skin_mesh(name,points,faces,skin_bone,material,rig,motion_parent):
    mesh=bpy.data.meshes.new(name+" REAL source")
    mesh.from_pydata([tuple(p) for p in points],[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    group=obj.vertex_groups.new(name=skin_bone)
    group.add(list(range(len(points))),1.,"REPLACE")
    mod=obj.modifiers.new("Original source art-rig deformation","ARMATURE")
    mod.object=rig
    saved=obj.matrix_world.copy()
    obj.parent=motion_parent
    obj.matrix_world=saved
    obj["owner_approved"]=False
    obj["source_only"]=True
    obj["not_a_runtime_engine"]=True
    return obj


def append_section(vertices,faces,profile,source,profile_width,depth=.65):
    """A closed, tapering organic *volume*, not a thin floating hair card."""
    if len(profile)<3:
        raise ValueError("Source strand needs enough actual anatomy samples")
    origin=len(vertices)
    chain=[Vector(v) for v in profile]
    for i,p in enumerate(chain):
        along=(chain[min(i+1,len(chain)-1)]-
               chain[max(0,i-1)]).normalized()
        tangent=along.cross(Vector((0,1,0)))
        if tangent.length<.08:
            tangent=along.cross(Vector((1,0,0)))
        tangent.normalize()
        other=along.cross(tangent).normalized()
        span=max(.04,(1-i/(len(chain)-1))**.75)*profile_width
        for j in range(4):
            theta=j*math.pi*.5
            vertices.append(tuple(p + span*(math.cos(theta)*tangent +
                                            depth*math.sin(theta)*other)))
        if i:
            for j in range(4):
                faces.append((origin+(i-1)*4+j,
                              origin+(i-1)*4+(j+1)%4,
                              origin+i*4+(j+1)%4,
                              origin+i*4+j))
    faces.append(tuple(reversed([origin+k for k in range(4)])))
    faces.append(tuple(origin+(len(chain)-1)*4+k for k in range(4)))


def hair_masses(original,rig,global_root):
    """Genuinely rooted scalp locks: randomized interleaved crown + sides.

    Unlike previously rejected H1 hair rings, roots are individually
    snapped to actual sculpted skull vertices and asymmetric lengths.
    Underlying scalp/nape must ultimately be sculpted for final quality.
    """
    random_gen=random.Random(29102026)
    lo,hi=bounds(original)
    cx=(lo.x+hi.x)/2
    cy=(lo.y+hi.y)/2
    floor=lo.z
    skull=[p for p in original
           if p.z>floor+2.47 and abs(p.x-cx)<.28 and abs(p.y-cy)<.29]
    if len(skull)<120:
        raise ValueError(f"Cannot locate true sculpted scalp, {len(skull)}")
    skull_low,skull_high=bounds(skull)
    origin=(skull_low+skull_high)/2
    radius_x=max(.10,min(.18,(skull_high.x-skull_low.x)*.46))
    radius_y=max(.09,min(.18,(skull_high.y-skull_low.y)*.46))
    points,faces=[],[]
    for index in range(86):
        # Angular distribution with deliberately irregular overlapping
        # parting, clumps and locks; no regular cylindrical wig border.
        angle=math.tau*(index+.35*random_gen.uniform(-1,1))/86
        dx,dy=math.cos(angle),math.sin(angle)
        front=dy<-.25
        ring=1 if index%3 else 0
        x=origin.x+radius_x*dx*(.62 if ring else .92)
        y=origin.y+radius_y*dy*(.62 if ring else .92)
        z=skull_high.z-(.075 if ring else .130)-random_gen.uniform(0,.045)
        aim=Vector((x,y,z))
        # Root actually ON the artist's scalp (geometric source search).
        root=min(skull,key=lambda v:(v-aim).length_squared)
        # Use crown roots for fringe, temples and side/back locks.
        length=(.29+random_gen.random()*.32 if front
                else .49+random_gen.random()*.39)
        if front and abs(dx)<.35:  # preserve mouth cavity visibility
            length*=.65
        if index%11==0:
            length*=1.14
        waves=random_gen.uniform(.035,.092)
        drift=random_gen.uniform(-.03,.03)
        path=[]
        for j in range(9):
            t=j/8
            wave=math.sin(7.5*t+angle*2.9)*waves*t
            twist=math.sin(5.5*t+angle)*.033*t
            path.append((
                root.x+dx*.09*t + wave*dx + drift*t,
                root.y+dy*.105*t+twist,
                root.z-length*t+ .012*math.sin(5*t+angle)*t,
            ))
        thickness=random_gen.uniform(.013,.040)
        append_section(points,faces,path,original,thickness,depth=.63)
    if not 2500<len(points)<4500:
        raise ValueError("Artist scalp mass exceeds source quality budget")
    m=mat("M2 ash-black greasy tangled scalp locks",(.087,.070,.057))
    obj=add_skin_mesh("M2 true 3D matted GHoul hair / unapproved",
                      points,faces,"H_Head",m,rig,global_root)
    return obj,{"real_scalp_sample_count":len(skull),
                "original_3d_locks":86,"strand_vertices":len(points),
                "rooted_to_artist_actual_skull":True}


def claws_from_actual_fingers(original,rig,global_root):
    lo,hi=bounds(original)
    cx=(lo.x+hi.x)/2
    floor=lo.z
    all_models=[]
    stats={}
    for side,code in ((-1,"L"),(1,"R")):
        # Select the existing sculpt's anatomical outstretched fingers,
        # not floating arbitrary hand positions.
        candidates=[p for p in original
                    if side*(p.x-cx)>.86 and floor+1.91<p.z<floor+2.32]
        if len(candidates)<60:
            raise ValueError(f"No original true hand anatomy, {code}")
        max_x=max(side*(p.x-cx) for p in candidates)
        fingertip=[p for p in candidates if side*(p.x-cx)>max_x-.055]
        if len(fingertip)<12:
            raise ValueError(f"Cannot inspect genuine fingertip surface, {code}")
        ys=sorted(p.y for p in fingertip)
        zs=sorted(p.z for p in fingertip)
        points,faces=[],[]
        roots=[]
        # 4 separate hooks each rooted in the original hand's far-end
        # geometry, loosely distributed across curled finger axis.
        for i in range(4):
            q=(i+.5)/4
            target=Vector((cx+side*(max_x-.025),
                           ys[min(len(ys)-1,int(q*(len(ys)-1)))],
                           zs[min(len(zs)-1,int((1-q)*(len(zs)-1)))]))
            root=min(fingertip,key=lambda p:(p-target).length_squared)
            roots.append(root)
            length=.16 + i*.027
            arc=[]
            for k in range(7):
                t=k/6
                arc.append((
                    root.x+side*length*t,
                    root.y+(i-1.5)*.019*t + .055*t*t*side,
                    root.z-.045*t-.088*t*t
                ))
            append_section(points,faces,arc,original,
                           .018+.003*(i%2),depth=.8)
        min_dist=min((roots[i]-roots[j]).length
                     for i in range(len(roots)) for j in range(i+1,len(roots)))
        if min_dist<.005:
            raise ValueError(f"Source finger claws collapse to identical roots {code}")
        model=add_skin_mesh(f"M2 connected claw silhouettes / {code}",
                            points,faces,f"H_ClawsRoot_{code}",
                            mat(f"M2 bone-char talons {code}",(.24,.215,.18)),
                            rig,global_root)
        all_models.append(model)
        stats[code]={"actual_source_finger_samples":len(candidates),
                    "tapered_claw_extensions":4,"vertices":len(points),
                    "minimum_root_separation_m":round(min_dist,5)}
    return all_models,stats


def look_at(cam,pt):
    cam.rotation_euler=(Vector(pt)-cam.location).to_track_quat("-Z","Y").to_euler()


def render_actual_sculpt(output,body,hair,claws):
    scene=bpy.context.scene
    scene.frame_set(1)
    objects=[body,hair,*claws]
    deps=bpy.context.evaluated_depsgraph_get()
    coords=[]
    for obj in objects:
        eval_obj=obj.evaluated_get(deps)
        mesh=eval_obj.to_mesh()
        try:
            coords += [eval_obj.matrix_world@v.co for v in mesh.vertices]
        finally:
            eval_obj.to_mesh_clear()
    low,high=bounds(coords)
    if high.z-low.z < 2.2 or high.z-low.z>3.1:
        raise ValueError("Sculpted hair must not break actual 3D character bounds")
    center=(low+high)/2
    for obj in list(scene.objects):
        if obj.type in ("CAMERA","LIGHT"):
            bpy.data.objects.remove(obj,do_unlink=True)
    scene.render.engine="CYCLES"
    scene.cycles.samples=15
    scene.render.resolution_x=360
    scene.render.resolution_y=440
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    if scene.world is None:
        scene.world=bpy.data.worlds.new("M2 3D character neutral")
    scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value=(.083,.089,.095,1)
    bg.inputs["Strength"].default_value=1
    camdata=bpy.data.cameras.new("M2 real 3D hair/claws silhouette camera")
    cam=bpy.data.objects.new("M2 real 3D hair/claws silhouette camera",camdata)
    scene.collection.objects.link(cam)
    scene.camera=cam
    camdata.type="ORTHO"
    d=high-low
    camdata.ortho_scale=max(float(d.z)*1.23,float(d.x)*1.3*440/360)
    for tag,position,power in (
       ("M2 proper full 3D key",center+Vector((-3,-4,5)),510),
       ("M2 neutral fill",center+Vector((4,3,4)),320)):
        data=bpy.data.lights.new(tag,"AREA")
        lamp=bpy.data.objects.new(tag,data)
        scene.collection.objects.link(lamp)
        lamp.location=position
        data.energy=power
        data.size=4
        look_at(lamp,center)
    mat_clay=mat("M2 real anatomy not final clay",(.58,.55,.52))
    # No view-layer override for first material pass, so char/dark hair,
    # original skull and physical bone-colored claw silhouette remain visible.
    results={}
    for variant in ("material","clay"):
        if variant=="clay":
            bpy.context.view_layer.material_override=mat_clay
        else:
            bpy.context.view_layer.material_override=None
        imgs=[]
        for i,name in enumerate(VIEWS):
            angle=math.tau*i/8
            cam.location=(center.x+6*math.sin(angle),
                          center.y-6*math.cos(angle),center.z+.45)
            look_at(cam,center)
            path=output/f"REAL-3D-M2-{variant}-{name}.png"
            scene.render.filepath=str(path)
            bpy.ops.render.render(write_still=True)
            with Image.open(path) as im:
                image=im.convert("RGB")
            ImageDraw.Draw(image).text((8,8),f"M2 REAL 3D {name}",fill=(240,240,240))
            imgs.append(image)
        grid=Image.new("RGB",(1440,880),(21,23,27))
        for i,img in enumerate(imgs):
            grid.paste(img,(i%4*360,i//4*440))
        grid.save(output/f"REAL-3D-M2-{variant}-8VIEWS.png")
        front_side_back=Image.new("RGB",(1080,440))
        for col,i in enumerate((0,2,4)):
            front_side_back.paste(imgs[i],(col*360,0))
        front_side_back.save(output/f"REAL-3D-M2-{variant}-FRONT-SIDE-BACK.png")
        results[variant]=True
    bpy.context.view_layer.material_override=None
    return results


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    output=args.output.resolve()
    if output==ROOT or not output.is_relative_to(ROOT):
        raise ValueError("M2 source review must stay outside WyrmForge runtime")
    output.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    scene=bpy.context.scene
    rig=bpy.data.objects.get("Hollowed Rotwalker M1 genuine 3D art-rig")
    global_root=bpy.data.objects.get("Hollowed M1 SOURCE WORLD contact master")
    original=[o for o in scene.objects if o.type=="MESH"]
    if rig is None or global_root is None or len(original)!=1:
        raise ValueError("Missing verified genuine owner-selected M1 source rig")
    if len(rig.data.bones)!=20 or not scene.get("m1_real_3d_articulated_motion"):
        raise ValueError("Cannot attach source art to an unverified pose")
    if scene.get("hollowed_source_lineage")!="owner-reference-original-v2":
        raise ValueError("Rejected previous H1 lineage not permitted")
    if "Sotudios" not in scene.get("hollowed_source_author",""):
        raise ValueError("Legal creator attribution missing")
    scene.frame_set(1)
    geom=original_source_vertices(original[0])
    hair,hair_qc=hair_masses(geom,rig,global_root)
    hands,claw_qc=claws_from_actual_fingers(geom,rig,global_root)
    render=render_actual_sculpt(output,original[0],hair,hands)
    scene["m2_source_only"]=True
    scene["m2_hair_and_claws_owner_approved"]=False
    scene["pixel_export_performed"]=False
    bpy.context.preferences.filepaths.save_version=0
    final=output/"Hollowed-M2-HAIR-CLAWS-ACTUAL-3D-SOURCE-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(final))
    report={
      "status":"FIRST ACTUAL 3D ghoul silhouette addition. NOT APPROVED.",
      "hair":hair_qc,"claws":claw_qc,"rendered":render,
      "rig_bones":len(rig.data.bones),
      "body_source_vertices_preserved":len(original[0].data.vertices),
      "original_mesh_untouched":True,
      "source_art_rig_isolated":True,
      "old_H1_model_used":False,
      "universal_animation_engine_modified":False,
      "universal_lighting_engine_modified":False,
      "gameplay_modified":False,
      "pixel_conversion_performed":False,
      "owner_approved":False,
      "blend_file":final.name
    }
    (output/"M2-3D-source-QC.json").write_text(json.dumps(report,indent=2)+"\n",
                                               encoding="utf-8")
    print("HOLLOWED M2 SOURCE-ONLY 3D GEOMETRY",json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
