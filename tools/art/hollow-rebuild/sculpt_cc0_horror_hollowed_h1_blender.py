#!/usr/bin/env python3
"""Original Hollowed H1 static anatomy + ash/necrotic source-material study.

Starting legal anatomy: City Building Game Art / Horror Game Maker, CC0
https://opengameart.org/content/3d-horror-game-monster

This edits a NEW editable Blender source copy of the legally imported
original, retains all original skin vertices, UVs and rig weight groups,
and uses a separate, reversible source shape key. NO animation actions,
no attack clips, no animation engine, Ashling, game assets, or deploy.
Everything stays within artifacts/hollow-rebuild until artistic approval.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector


SOURCE_PATH=Path(__file__).with_name("evaluate_free_character_blender.py")


def source_module():
    spec=importlib.util.spec_from_file_location("horror_source_blender_evaluator",SOURCE_PATH)
    if spec is None or spec.loader is None:
        raise ValueError("Missing isolated Blender source evaluator")
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


def bell(value, center, spread):
    return math.exp(-((value-center)/spread)**2)


def ease(a,b,value):
    t=min(1.0,max(0.0,(value-a)/(b-a)))
    return t*t*(3.0-2.0*t)


def damaged_rest_shape(x,y,z):
    """A single source pose, weight originating in twisted HUMAN thorax."""
    source=Vector((x,y,z))
    high=ease(1.47,2.55,z)
    thorax=bell(z,2.23,.42)
    pelvis=bell(z,1.39,.39)
    shoulder=bell(z,2.40,.34)
    head=ease(2.59,2.91,z)
    left=ease(.15,.64,-x)
    right=ease(.16,.65,x)
    # Continuous, asymmetrical thoracic rotation including scapular roots.
    angle=.145*thorax-.035*pelvis
    x,y=(x*math.cos(angle)-y*math.sin(angle),
         x*math.sin(angle)+y*math.cos(angle))
    x-=.045*thorax
    y-=.052*thorax+.105*high+.100*head
    x-=.065*head
    # Larger striking left scapula; wasted lower right shoulder.
    z+=.090*shoulder*left-.075*shoulder*right
    y-=.091*shoulder*left
    y+=.048*shoulder*right
    x-=.048*shoulder*left
    # Reposition T-pose hands into a natural loaded, downward claw reach.
    # The displacement begins at the shoulder and grows toward digits,
    # avoiding a detached static "arm moves without ribs" illusion.
    distal=ease(.42,1.42,abs(x))
    y-=.205*distal*(1.0+.25*left)
    z-=distal*(.34+.165*right)
    x-=.070*distal*left
    x+=.026*distal*right
    # Ruined thoracic cavity and a lopsided belly. Geometry depression is
    # anterior-only: never allow the rejected dark backpack-style rear wound.
    front=ease(-.02,.20,-y)
    cavity=bell(x,-.22,.28)*bell(z,2.07,.28)*front
    y+=.065*cavity
    flank=bell(z,1.86,.31)
    x*=1.0-.055*flank
    # Counterweight over one planted human foot, not quadruped bear legs.
    hip_shift=bell(z,1.35,.50)
    knee=bell(z,.74,.29)
    x+=.045*hip_shift-.033*knee
    y+=.041*hip_shift-.022*knee*left
    z=max(0.0,z) if z<.06 else z
    if not all(math.isfinite(c) for c in (x,y,z)):
        raise ValueError("Non-finite authored source coordinates")
    out=Vector((x,y,z))
    return out,float((out-source).length)


def procedural_material(name, dark, light, scale, bump_strength):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    bsdf=material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value=.94
    bsdf.inputs["Metallic"].default_value=0.0
    bsdf.inputs["Emission Color"].default_value=(0,0,0,1)
    bsdf.inputs["Emission Strength"].default_value=0.0
    tex=material.node_tree.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value=scale
    tex.inputs["Detail"].default_value=2.2
    tex.inputs["Roughness"].default_value=.68
    ramp=material.node_tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position=.25
    ramp.color_ramp.elements[0].color=(*dark,1)
    ramp.color_ramp.elements[1].position=.78
    ramp.color_ramp.elements[1].color=(*light,1)
    links=material.node_tree.links
    links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"],bsdf.inputs["Base Color"])
    bump=material.node_tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=bump_strength
    bump.inputs["Distance"].default_value=.028
    links.new(tex.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
    return material


def author_source(input_path,output_path):
    if not input_path.is_file():
        raise FileNotFoundError(input_path)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(input_path),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    helper=source_module()
    meshes=[o for o in bpy.data.objects if o.type=="MESH"]
    armatures=[o for o in bpy.data.objects if o.type=="ARMATURE"]
    if len(meshes)!=1 or not armatures or len(bpy.data.actions)!=0:
        raise ValueError("Expected one source skin, existing rig, no action clips")
    mesh=meshes[0]
    before=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups))
    if not mesh.data.uv_layers or before[0]<1000:
        raise ValueError("Artist source lacks editable UV/skinning detail")
    # Basis remains immutable/reversible; added original source art as shape key.
    if mesh.data.shape_keys is not None:
        raise ValueError("Unexpected existing shape keys; refuse destructive source override")
    mesh.shape_key_add(name="CC0 HorrorGameMaker original — retained")
    authored=mesh.shape_key_add(name="WyrmForge Hollowed H1 anatomy — source study")
    depsgraph=bpy.context.evaluated_depsgraph_get()
    evaluated=mesh.evaluated_get(depsgraph)
    eval_mesh=evaluated.to_mesh()
    changed=0
    max_dist=0.0
    try:
        if len(eval_mesh.vertices)!=len(mesh.data.vertices):
            raise ValueError("Existing armature modifier changed vertex layout")
        inverse=mesh.matrix_world.inverted().to_3x3()
        for i,vertex in enumerate(mesh.data.vertices):
            world=evaluated.matrix_world @ eval_mesh.vertices[i].co
            target,displacement=damaged_rest_shape(*world)
            authored.data[i].co=vertex.co+(inverse@(target-world))
            max_dist=max(displacement,max_dist)
            changed+=displacement>.003
    finally:
        evaluated.to_mesh_clear()
    if changed<600 or not .24<max_dist<.85:
        raise ValueError(f"Not a meaningful controlled sculpt: {changed} vertices, max {max_dist:.4f}m")
    authored.value=1.0
    bpy.context.view_layer.update()
    material=procedural_material(
        "Hollowed original desaturated ash-rot skin (NO EMISSION)",
        (.075,.066,.061),(.30,.284,.267),9.8,.22)
    wound=procedural_material(
        "Hollowed exposed charred flesh (NO EMISSION)",
        (.060,.035,.033),(.18,.089,.072),17.0,.29)
    mesh.data.materials.clear()
    mesh.data.materials.append(material)
    mesh.data.materials.append(wound)
    wound_faces=0
    for poly in mesh.data.polygons:
        # These are original local-space poly centers/normals. In FBX source
        # world is transformed by parent, so compare actual mesh world coords.
        centroid=mesh.matrix_world@poly.center
        normal=mesh.matrix_world.to_3x3()@poly.normal
        x,y,z=centroid
        front=normal.y<-.20
        # asymmetrical organic scalp, collar and ribcage scars;
        # never apply the wound to the back.
        chest=bell(x,-.22,.35)*bell(z,2.05,.31)
        cheek=bell(x,-.11,.19)*bell(z,2.80,.15)
        if front and (chest>.48 or cheek>.62):
            poly.material_index=1
            wound_faces+=1
        else:
            poly.material_index=0
    if wound_faces<4:
        raise ValueError("Source wound topology has no visible front-facing surfaces")
    mesh.name="WyrmForge Hollowed — feral human source H1 UNAPPROVED"
    mesh["source_creator"]="City Building Game Art / HorrorGameMaker.com"
    mesh["source_url"]="https://opengameart.org/content/3d-horror-game-monster"
    mesh["source_license"]="CC0-1.0 Universal"
    mesh["authored_changes"]="Hollowed thoracic twist, arm rest, asymmetric scapula, head, wound and ash-rot materials"
    mesh["animation_actions_modified"]=False
    mesh["source_art_approved"]=False
    mesh["source_shape_key"]="WyrmForge Hollowed H1 anatomy — source study"
    if before!=(len(mesh.data.vertices),len(mesh.data.polygons),len(mesh.vertex_groups)):
        raise ValueError("Source topology or bone-weight data was modified")
    if bpy.data.actions:
        raise ValueError("Source sculpt unexpectedly introduced an animation action")
    camera=bpy.context.scene.camera
    if camera is None:
        raise ValueError("Missing genuine Blender evidence camera")
    clay=bpy.data.materials.new("H1 neutral clay material — no glow")
    clay.use_nodes=True
    clay.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value=(.56,.54,.51,1)
    low,high=helper.evaluated_mesh_bounds(meshes)
    center=tuple((low+high)/2)
    dims=high-low
    camera.data.ortho_scale=max(1.16*float(dims.z),
                                1.20*float(dims.x)*400/320,
                                1.20*float(dims.y)*400/320)
    helper.render_study(output_path,camera,clay,"clay",center)
    helper.render_study(output_path,camera,clay,"material",center)
    camera.location=(center[0]+5,center[1]-5,center[2]+3)
    helper.look_at(camera,center)
    bpy.context.preferences.filepaths.save_version=0
    target=output_path/"hollowed-horror-cc0-original-anatomy-H1-UNAPPROVED.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    report={
        "status":"ANATOMICAL H1 SOURCE, UNAPPROVED, NOT IN WYR MFORGE LIVE GAME",
        "source":str(input_path.name),
        "license":"CC0-1.0 (source artist City Building Game Art)",
        "editable_shape_keys":len(mesh.data.shape_keys.key_blocks),
        "skin_vertices":before[0],
        "source_faces":before[1],
        "source_vertex_groups":before[2],
        "source_armatures":len(armatures),
        "sculpted_vertices":changed,
        "max_static_sculpt_displacement_m":round(max_dist,5),
        "front_wound_faces":wound_faces,
        "actions":len(bpy.data.actions),
        "new_animation_clips":0,
        "material_emission_enabled":False,
        "production_game_code_changed":False,
        "owner_approved":False,
        "real_blender_8way":True,
    }
    (output_path/"h1-authored-source-qc.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    output=args.output.resolve()
    root=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    if not output.is_relative_to(root):
        raise ValueError("Review source must stay in isolated artifacts, never runtime/animation directories")
    output.mkdir(parents=True,exist_ok=True)
    author_source(args.input.resolve(),output)


if __name__=="__main__":
    main()
