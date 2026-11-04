#!/usr/bin/env python3
"""H1 anatomical reconstruction in a NEW isolated Blender source .blend.

Source: CC0 City Building Game Art Horror Monster + preserved 70-bone rig.
Actual new 3D geometry: recessed connected torso skin, fitted curved ribs,
bone finger talons. No actions, animation frames, game-engine edits, sprite
exports, or source overwrite. Technical pass != artistic approval.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def helper():
    path = Path(__file__).with_name("evaluate_free_character_blender.py")
    spec = importlib.util.spec_from_file_location("hollowed_source_render", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def bell(v, c, s):
    return math.exp(-((v-c)/s)**2)


def front_hit(mesh, x, z):
    """Actual evaluated, posed front skin, first hit in WORLD camera frame."""
    bpy.context.view_layer.update()
    dag = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(mesh, dag)
    world_to_local = mesh.matrix_world.inverted()
    direction = world_to_local.to_3x3() @ Vector((0, 1, 0))
    length = 18 * direction.length
    direction.normalize()
    loc, normal, face, distance = tree.ray_cast(
        world_to_local @ Vector((x, -9, z)), direction, length)
    if loc is None or face is None:
        return None
    return (mesh.matrix_world @ loc, mesh.matrix_world.to_3x3() @ normal, face)


def source_cavity(mesh):
    """Additional reversible shape key on the ORIGINAL connected source skin."""
    if not mesh.data.shape_keys or len(mesh.data.shape_keys.key_blocks) != 2:
        raise ValueError("Expected existing original and authored source shape keys")
    previous = mesh.data.shape_keys.key_blocks[-1]
    if previous.value < 0.99:
        raise ValueError("Expected H1 original source shape at full strength")
    dag = bpy.context.evaluated_depsgraph_get()
    evalobj = mesh.evaluated_get(dag)
    evaluated = evalobj.to_mesh()
    try:
        if len(evaluated.vertices) != len(mesh.data.vertices):
            raise ValueError("Source skin topology changed unexpectedly")
        visible = []
        normal_transform = mesh.matrix_world.to_3x3()
        for vertex in evaluated.vertices:
            world = mesh.matrix_world @ vertex.co
            normal = (normal_transform @ vertex.normal).normalized()
            visible.append((world.copy(), normal.copy()))
    finally:
        evalobj.to_mesh_clear()

    extra = mesh.shape_key_add(name="H1 authentic thoracic tissue depression — UNAPPROVED",
                               from_mix=False)
    extra.relative_key = previous
    inverse = mesh.matrix_world.inverted().to_3x3()
    sculpted = 0
    depth_max = 0.
    for i, (world, normal) in enumerate(visible):
        x,y,z = world
        # This is the actual front of the chest, not a back-side Y proxy.
        if normal.y > -.24:
            extra.data[i].co = previous.data[i].co
            continue
        ellipse = math.sqrt(((x+.19)/.345)**2 + ((z-2.21)/.305)**2)
        center = max(0., 1. - (ellipse/.82)**2)
        jagged = .015 * (math.sin(33*x + 13*z) + math.sin(17*x - 24*z))
        rim = .046 * bell(ellipse, .85, .14)
        depression = .145*center + jagged*center - rim
        # Positive Y pushes front skin INTO chest. Negative lip raises edges.
        if abs(depression) > .005:
            extra.data[i].co = previous.data[i].co + inverse @ Vector((0,depression,0))
            sculpted += 1
            depth_max = max(depth_max, depression)
        else:
            extra.data[i].co = previous.data[i].co
    extra.value = 1.
    bpy.context.view_layer.update()
    if sculpted < 14 or depth_max < .07:
        raise ValueError(f"No substantial sculpted torso cavity: {sculpted}, {depth_max:.4f}")
    return sculpted, round(depth_max,5)


def new_mat(name, base, roughness=0.9):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*base,1)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*base,1)
    bsdf.inputs["Roughness"].default_value=roughness
    bsdf.inputs["Emission Color"].default_value=(0,0,0,1)
    bsdf.inputs["Emission Strength"].default_value=0
    return mat


def armature_mesh(name, points, faces, skin, rig, bone_name, material):
    """Rigidly skin an original submesh to a real existing bone, not the engine.

    Model input points are world coordinates of the intended *posed* shape.
    Invert the existing rig's rest-to-pose matrix to obtain correct bind
    vertices and avoid double-transforming attached 3D tissue at rest.
    """
    if bone_name not in rig.pose.bones:
        raise ValueError("Missing expected anatomical rig bone "+bone_name)
    world_to_mesh=skin.matrix_world.inverted()
    bone=rig.pose.bones[bone_name]
    pose_to_rest=bone.bone.matrix_local @ bone.matrix.inverted()
    verts=[]
    for p in points:
        binding = world_to_mesh @ rig.matrix_world @ pose_to_rest @ rig.matrix_world.inverted() @ Vector(p)
        verts.append(tuple(binding))
    block=bpy.data.meshes.new(name+" source mesh")
    block.from_pydata(verts,[],faces)
    block.update()
    obj=bpy.data.objects.new(name,block)
    bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world=skin.matrix_world.copy()
    block.materials.append(material)
    group=obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(verts))),1.,'REPLACE')
    modifier=obj.modifiers.new(name="Existing 70-bone source rig ONLY",type="ARMATURE")
    modifier.object=rig
    obj["source_art_only"]=True
    obj["owner_approved"]=False
    obj["new_actions"]=0
    return obj


def tapered_tube(points, radius, sides=8):
    verts, faces=[],[]
    vec=[Vector(p) for p in points]
    count=len(vec)
    for i,pt in enumerate(vec):
        tangent=(vec[min(i+1,count-1)]-vec[max(0,i-1)]).normalized()
        normal=tangent.cross(Vector((0,0,1)))
        if normal.length<.01:
            normal=tangent.cross(Vector((0,1,0)))
        normal.normalize()
        other=tangent.cross(normal).normalized()
        # sin(pi) can be tiny negative due float rounding at the tip.
        # Clamp before fractional power; complex taper invalidates geometry.
        taper=max(.12, max(0.0, math.sin(math.pi*i/(count-1)))**.45)
        for k in range(sides):
            ang=2*math.pi*k/sides
            v=pt + radius*taper*(math.cos(ang)*normal+math.sin(ang)*other)
            verts.append(v)
    for i in range(count-1):
        for k in range(sides):
            a=i*sides+k
            b=i*sides+(k+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),
                  tuple((count-1)*sides+k for k in range(sides))])
    return verts,faces


def ribs(mesh,rig,bone):
    bone_material=new_mat("H1 dead bone: muted, NO glow",(.245,.225,.205),.97)
    made=0
    # Fixed anatomical landmarks only; actual endpoints require measured
    # *skin* intersections, so missing intersections reject individual arcs.
    for side, rows in ((-1,(2.045,2.135,2.225,2.315)),
                       (1,(2.075,2.165,2.255))):
        for row,zmid in enumerate(rows):
            # Find the ACTUAL visible chest span in this pose; the earlier
            # broad fixed arc (-.34 to .34) crossed empty air on every row.
            # Keep only a contiguous measured segment, with *both* ends
            # grounded in real skin. No synthetic unsupported tips.
            hits=[]
            for i in range(22):
                u=i/21.
                # Distinct anatomical arcs, not seven identical horizontal
                # bars. Each still needs real original-skin ray contacts.
                reach=.305-.022*(row%3)+(.010 if side<0 else -.016)
                x=side*(.025+reach*u)
                z=(zmid + (.013+.009*(row%3))*u
                   + .011*math.sin(math.pi*u)*(1 if side<0 else -.45))
                hit=front_hit(mesh,x,z)
                if hit is None:
                    hits.append(None)
                else:
                    pos,normal,face=hit
                    hits.append((x,float(pos.y),z))
            runs=[]
            current=[]
            for hit in hits:
                if hit is None:
                    if current:
                        runs.append(current)
                        current=[]
                else:
                    current.append(hit)
            if current:
                runs.append(current)
            runs.sort(key=lambda run:len(run),reverse=True)
            if not runs or len(runs[0])<7:
                continue
            measured=runs[0]
            if abs(measured[-1][0]-measured[0][0])<.095:
                continue
            contour=[]
            for i,point in enumerate(measured):
                u=i/(len(measured)-1)
                # Real relief from the recessed skin, actual body endpoints
                # are slightly embedded so ribs cannot float.
                arch=math.sin(math.pi*u)
                distortion=1+.17*math.cos(2*math.pi*u+row*1.4+(0 if side<0 else .8))
                relief=.034*arch*distortion - (.026 if i in (0,len(measured)-1) else 0.)
                if row==1 and side<0:
                    relief-=.009*math.exp(-((u-.67)/.065)**2)
                contour.append((point[0],point[1]-relief,point[2]))
            radius=.013+.002*(row%2)+(.001 if side>0 else 0.)
            v,f=tapered_tube(contour,radius,sides=7)
            armature_mesh("H1 anatomically anchored rib "+str(side)+"/"+str(row+1),
                          v,f,mesh,rig,bone,bone_material)
            made+=1
    if made < 4:
        raise ValueError(f"Only {made} ribs intersected actual chest skin: refuse floating geometry")
    return made


def claw_tips(mesh, rig):
    """Sculpt HOOKED NAIL TIPS FROM THE EXISTING CONNECTED SKIN.

    Earlier independent bone-weighted talon meshes were seen FLOATING in the
    authentic eight-way Blender renders. That H1 pass is REJECTED. Instead,
    original finger source vertices remain physically connected and retain
    their original finger-bone weights, topology and source UVs.
    """
    finger_names=(
        "joint25","joint25.001","joint25.002",
        "joint25.003","joint25.004","joint25.005",
        "joint24","joint24.001","joint24.002",
        "joint24.003","joint24.004","joint24.005",
        "Thumb_2","joint31"
    )
    names={g.name:g.index for g in mesh.vertex_groups}
    tips={name:names[name] for name in finger_names if name in names}
    if len(tips)<9:
        raise ValueError("Expected actual source finger-tip groups for connected claw sculpt")
    previous=mesh.data.shape_keys.key_blocks[-1]
    if previous.value<.99:
        raise ValueError("Last source anatomy shape key must be active")
    bpy.context.view_layer.update()
    dag=bpy.context.evaluated_depsgraph_get()
    evaluated=mesh.evaluated_get(dag)
    temporary=evaluated.to_mesh()
    try:
        if len(temporary.vertices)!=len(mesh.data.vertices):
            raise ValueError("Finger-source topology unexpectedly changed")
        actual=[mesh.matrix_world @ vertex.co for vertex in temporary.vertices]
    finally:
        evaluated.to_mesh_clear()

    claw=mesh.shape_key_add(name="H1 connected hook-claw finger tips — no float geometry",
                            from_mix=False)
    claw.relative_key=previous
    inv=mesh.matrix_world.inverted().to_3x3()
    touched=0
    affected_names=set()
    for i,vertex in enumerate(mesh.data.vertices):
        matches=[(g.group,g.weight) for g in vertex.groups if g.group in tips.values()]
        if not matches:
            claw.data[i].co=previous.data[i].co
            continue
        strongest=max(weight for index,weight in matches)
        for index,weight in matches:
            if weight>.05:
                affected_names.update(name for name,idx in tips.items() if idx==index)
        if strongest<.08:
            claw.data[i].co=previous.data[i].co
            continue
        world=actual[i]
        # The existing claws curl toward the floor and slightly inward.
        # Fingertips get more extension than penultimate finger joints.
        terminal=any(index in {names[n] for n in finger_names[:6] if n in names}
                     for index,weight in matches if weight>.1)
        bend=.064 if terminal else .027
        displacement=Vector((-.010 if world.x>0 else .010,
                             -.045*strongest,
                             -bend*strongest))
        claw.data[i].co=previous.data[i].co + inv @ displacement
        touched+=1
    claw.value=1.
    bpy.context.view_layer.update()
    if touched<12 or len(affected_names)<9:
        raise ValueError(f"Not enough connected finger vertices to sculpt: {touched}, {affected_names}")
    return {"connected_claw_vertices":touched,
            "finger_bone_groups_used":len(affected_names),
            "detached_talon_meshes":0}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    output=args.output.resolve()
    permitted=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not output.is_relative_to(permitted):
        raise ValueError("Anatomical art review output must stay isolated")
    output.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    mesh_list=[o for o in bpy.data.objects if o.type=="MESH"]
    if len(mesh_list)!=1:
        raise ValueError("Expected a single original human source skin")
    mesh=mesh_list[0]
    rig=bpy.data.objects.get("Armature.002")
    if rig is None or len(rig.data.bones)!=70:
        raise ValueError("Actual source 70-bone rig missing")
    if len(bpy.data.actions)!=0:
        raise ValueError("Imported actions not allowed in source art study")
    before=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups))
    n,depth=source_cavity(mesh)
    nribs=ribs(mesh,rig,"joint3")
    connected_claws=claw_tips(mesh,rig)
    if before!=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups)):
        raise ValueError("Original connected skin or weights were changed")
    if len(bpy.data.actions)!=0:
        raise ValueError("The anatomical sculpt created forbidden actions")
    render=helper()
    camera=bpy.context.scene.camera
    if camera is None:
        raise ValueError("Source render requires genuine Blender camera")
    clay=new_mat("H1 neutral light-neutral clay to reveal REAL geometry",(.55,.53,.50))
    visible=[o for o in bpy.data.objects if o.type=="MESH"]
    low,high=render.evaluated_mesh_bounds(visible)
    center=tuple((low+high)/2)
    dims=high-low
    camera.data.ortho_scale=max(1.20*float(dims.z),1.22*float(dims.x)*400/320,
                                1.22*float(dims.y)*400/320)
    render.render_study(output,camera,clay,"clay",center)
    render.render_study(output,camera,clay,"material",center)
    camera.location=(center[0]+5,center[1]-5,center[2]+3)
    render.look_at(camera,center)
    bpy.context.preferences.filepaths.save_version=0
    dest=output/"hollowed-h1-real-anatomy-ribs-claws-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    report={
        "status":"H1 original 3D anatomical source only — VISUALLY UNAPPROVED",
        "original_source":"City Building Game Art CC0 Horror Monster",
        "original_skin_vertices":before[0],
        "original_vertex_groups":before[2],
        "real_skin_cavity_deformed_vertices":n,
        "deep_cavity_m":depth,
        "source_bone_ribs":nribs,
        "finger_bone_talons":0,
        **connected_claws,
        "extra_3d_mesh_objects":len(visible)-1,
        "original_source_bones":len(rig.data.bones),
        "actions":len(bpy.data.actions),
        "original_topology_preserved":True,
        "material_emission_enabled":False,
        "animation_engine_modified":False,
        "runtime_modified":False,
        "owner_approved":False,
        "blender_source":dest.name,
    }
    (output/"h1-anatomical-source-qc.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("ANATOMICAL SOURCE QA:",json.dumps(report,sort_keys=True))


if __name__=="__main__":
    main()
