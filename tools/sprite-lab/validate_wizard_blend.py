#!/usr/bin/env python3
"""Inspect the real editable wizard .blend in Blender 4.5; NOT artistic approval."""
import argparse, json, math, sys
from pathlib import Path
import bpy

SCHOOLS=("fire","frost","storm","arcane","necromancer","summoner")
DIRECTIONS=("N","NE","E","SE","S","SW","W","NW")
CLIPS={"walk":(1,17),"idle":(21,33),"cast":(41,60),"hurt":(71,80),"death":(91,114)}

def verify(ok,message):
    if not ok: raise RuntimeError("WyrmForge wizard: "+message)

def run(output,render,walk_sequence):
    scene=bpy.context.scene
    arm=bpy.data.objects.get("WizardRig")
    verify(arm is not None and arm.type=="ARMATURE","missing editable character armature")
    verify(len(arm.data.bones)==22,"unexpected skeleton")
    pivot=bpy.data.objects.get("WizardActorDirectionPivot")
    verify(pivot is not None,"missing direction pivot")
    verify(scene.camera is not None and scene.camera.data.type=="ORTHO","missing camera")
    for key in ("root","pelvis","head","foot.L","foot.R","hand.L","hand.R","beard.root","beard.tip"):
        verify(key in arm.data.bones,"missing bone "+key)
    clips=json.loads(scene.get("WyrmForgeWizardClipRanges","{}"))
    verify(clips=={k:list(v) for k,v in CLIPS.items()},"incomplete five-clip animation")
    directions=json.loads(scene.get("SourceFrameDirections","[]"))
    verify(tuple(directions)==DIRECTIONS,"eight directions inconsistent with atlas")
    schools=json.loads(scene.get("SourceSchoolVariants","[]"))
    verify(tuple(schools)==SCHOOLS,"six schools missing")
    staffs=[]
    for school in schools:
        coll=[x for x in bpy.data.collections if x.name.startswith(school+" staff /")]
        verify(len(coll)==1 and len(coll[0].all_objects)>0,"empty or missing staff "+school)
        staffs.append(coll[0])
    verify(sum(not x.hide_render for x in staffs)==1,"multiple school staffs rendered")
    grip=bpy.data.objects.get("StaffGripControl")
    verify(grip is not None and grip.animation_data and grip.animation_data.action,
           "missing keyframed independent staff grip")
    for coll in staffs:
        for mesh in coll.objects:
            verify(mesh.parent==grip,"staff mesh not attached to shared grip "+mesh.name)
    scene.frame_set(49)
    axis=grip.matrix_world.to_quaternion() @ __import__('mathutils').Vector((0,0,1))
    tilt=math.acos(max(-1,min(1,axis.z)))
    verify(tilt < .4,"cast staff is falling sideways / nearly horizontal")
    right=bpy.data.objects.get("IK hand.R")
    verify(right is not None and math.dist(tuple(grip.matrix_world.translation),tuple(right.matrix_world.translation)) < .11,
           "cast grip no longer follows player hand")
    cloth=[]
    for obj in bpy.data.objects:
        if any(mod.type=="CLOTH" for mod in obj.modifiers):
            cloth.append(obj.name)
            verify("ClothPins" in obj.vertex_groups,"cloth has no pinned vertex group")
            verify(len(obj.data.vertices)>10,"empty cloth mesh")
    verify(len(cloth)>=2,"expected robe and cape cloth surfaces")
    for name in ("IK foot.L","IK foot.R","IK hand.L","IK hand.R"):
        target=bpy.data.objects.get(name)
        verify(target is not None and target.animation_data and target.animation_data.action,
               "missing keyframed IK "+name)
    verify(arm.animation_data and arm.animation_data.action,"missing skeleton action")
    root_rotation=pivot.rotation_euler.copy()
    gait={}
    for direction,angle in (("S",0),("N",math.pi)):
        pivot.rotation_euler.z=angle
        frames=[]
        for f in range(1,18):
            scene.frame_set(f)
            feet=[]
            for side in ("L","R"):
                xyz=tuple(float(v) for v in bpy.data.objects["IK foot."+side].matrix_world.translation)
                verify(all(math.isfinite(v) for v in xyz),"invalid IK position")
                feet.append(xyz)
            frames.append(feet)
        verify(math.dist(frames[0][0],frames[-1][0])<.001,"walk loop discontinuity")
        travel=sum(math.dist(frames[i][0],frames[i+1][0]) for i in range(16))
        verify(travel>.05,"static foot animation")
        gait[direction]={"frames":len(frames),"leftFootTravel":round(travel,4)}
    pivot.rotation_euler=root_rotation
    scene.frame_set(1)
    wool=bpy.data.materials.get("robe")
    verify(wool is not None and wool.use_nodes,"missing editable neutral wool")
    bsdf=wool.node_tree.nodes.get("Principled BSDF")
    verify(bsdf is not None and bsdf.inputs["Base Color"].is_linked,
           "wool dye variation missing; returning to flat preview materials")
    locks=[obj for obj in bpy.data.objects if obj.name.startswith("Weighted original beard lock")]
    verify(len(locks)>=11,"beard returned to sparse prototype strands")
    output.mkdir(parents=True,exist_ok=True)
    images=[]
    if render or walk_sequence:
        scene.render.engine="CYCLES"
        scene.cycles.samples=8
        scene.render.resolution_x=256
        scene.render.resolution_y=256
        scene.render.resolution_percentage=100
        scene.render.film_transparent=True
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        for direction,f,label in ((("S",5,"walk-a"),("S",13,"walk-b"),("S",49,"cast"),("N",5,"walk-north")) if render else ()):
            pivot.rotation_euler.z=0 if direction=="S" else math.pi
            scene.frame_set(f)
            path=output/("wizard-"+direction+"-"+label+".png")
            scene.render.filepath=str(path)
            bpy.ops.render.render(write_still=True)
            verify(path.is_file() and path.stat().st_size>1000,"missing render "+str(path))
            images.append(path.name)
    if walk_sequence:
        scene.cycles.samples=5
        scene.render.resolution_x=256
        scene.render.resolution_y=256
        folder=output/"walk-16"
        folder.mkdir(exist_ok=True)
        pivot.rotation_euler.z=0
        # Sequentially evaluate gait and cloth rather than cherry-pick frames.
        # These lit inspection stills must NEVER become source albedo atlases.
        for frame in range(1,17):
            scene.frame_set(frame)
            scene.render.filepath=str(folder/("frame-"+str(frame-1).zfill(2)+".png"))
            bpy.ops.render.render(write_still=True)
            path=Path(scene.render.filepath)
            verify(path.is_file() and path.stat().st_size>1200,"missing 16-phase walk render")
            images.append(str(path.relative_to(output)))
    report={"blender":bpy.app.version_string,"source":bpy.data.filepath,
        "bones":len(arm.data.bones),"staffVariants":len(schools),"directions":len(directions),
        "clips":clips,"clothMeshes":cloth,"gait":gait,"reviewImages":images,
        "status":"validated source; art/mobile/lighting NOT approved",
        "artApproved":False,"clothBakedAndReviewed":False,"runtimeIntegrated":False}
    (output/"wizard-blender-validation.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True)
    parser.add_argument("--render",action="store_true")
    parser.add_argument("--walk-sequence",action="store_true")
    opts=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(Path(opts.output),opts.render,opts.walk_sequence)
