"""Author and render genuine injury-specific Hollowed deaths from the editable no-cape rig.

The standard v2 Blender source already contains two rigorously skinned 3D death
actions. Each injured variant receives its OWN keyed skeletal action with its
specific impaired limb preserved through recoil, collapse, impact and settle.
No 2D flips, hue shifts, frame rotations or gameplay/simulation modifications.
Output: three compact 96px, 8-way × 24-frame atlases, native QA previews, editable .blend.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/"rigged-hollow-death-no-cape-standard/hollow-death.blend"
OUT=ROOT/"artifacts/hollow-injury-deaths"
FRAMES=24
FPS=12
CELL=96
DIRECTIONS=("N","NE","E","SE","S","SW","W","NW")
VARIANTS=("broken-arm-right","one-arm-left","broken-leg-left")
ROTATION=math.degrees(math.atan2(-3.2,2.2))+90
parser=argparse.ArgumentParser()
parser.add_argument("--variant",choices=(*VARIANTS,"all"),default="all")
parser.add_argument("--directions",choices=("all","S"),default="all")
args=parser.parse_args()
targets=VARIANTS if args.variant=="all" else (args.variant,)
view_rows=DIRECTIONS if args.directions=="all" else ("S",)
if not SOURCE.is_file():
    raise FileNotFoundError(f"Editable no-cape death rig missing: {SOURCE}")

OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
rig=bpy.data.objects["Hollow editable animation rig"]
character=bpy.data.objects["Hollow skinned character"]
assert any(m.type=="ARMATURE" and m.object==rig for m in character.modifiers)
assert len(character.data.polygons)>1000
assert any(m.type=="NODES" for m in character.modifiers), "Required 3D floor-collision corrective missing"
assert scene.camera is not None
assert "Hollow_Death_No_Cape_Grounded_v2" in bpy.data.actions
assert "Hollow_Death_No_Cape_Braced_Side_v1" in bpy.data.actions
original_actions={
    "forward":bpy.data.actions["Hollow_Death_No_Cape_Grounded_v2"],
    "braced":bpy.data.actions["Hollow_Death_No_Cape_Braced_Side_v1"],
}
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
heads={b.name:b.head_local.copy() for b in rig.data.bones}
tails={b.name:b.tail_local.copy() for b in rig.data.bones}
lengths={b.name:b.length for b in rig.data.bones}
bones={b.name for b in rig.pose.bones}
assert {"upper_arm.L","forearm.L","hand.L","upper_arm.R","forearm.R","hand.R",
        "thigh.L","shin.L","foot.L"}.issubset(bones)

def smooth(t):
    t=max(0.0,min(1.0,t))
    return t*t*(3-2*t)

def orient(name,start,end):
    delta=end-start
    if delta.length<=.000001:
        raise ValueError(f"Degenerate bone {name}")
    transform=((tails[name]-heads[name]).rotation_difference(delta).to_matrix()@rest[name].to_3x3()).to_4x4()
    transform.translation=start
    rig.pose.bones[name].matrix=transform
    bpy.context.view_layer.update()

def bend(start,target,upper,lower,pole):
    delta=target-start
    distance=max(abs(upper-lower)+.0001,min(delta.length,upper+lower-.001))
    direction=delta.normalized()
    parallel=(upper*upper-lower*lower+distance*distance)/(2*distance)
    bend_plane=Vector(pole)-direction*Vector(pole).dot(direction)
    if bend_plane.length<1e-5:
        bend_plane=Vector((0,1,0))-direction*direction.y
    bend_plane.normalize()
    knee=start+direction*parallel+bend_plane*math.sqrt(max(0,upper*upper-parallel*parallel))
    return knee,start+direction*distance

def arm_pose(side,goal,amount):
    shoulder=rig.pose.bones["upper_arm."+side].head.copy()
    wrist=rig.pose.bones["forearm."+side].tail.copy().lerp(Vector(goal),amount)
    sign=1 if side=="L" else -1
    elbow,wrist=bend(shoulder,wrist,lengths["upper_arm."+side],lengths["forearm."+side],
                      (sign*.2,.6,.08))
    orient("upper_arm."+side,shoulder,elbow)
    orient("forearm."+side,elbow,wrist)
    tip=wrist+Vector((sign*.02,-.07,-.025)).normalized()*lengths["hand."+side]
    orient("hand."+side,wrist,tip)
    return ("upper_arm."+side,"forearm."+side,"hand."+side)

def broken_left_leg(amount):
    thigh=rig.pose.bones["thigh.L"]
    shin=rig.pose.bones["shin.L"]
    foot=rig.pose.bones["foot.L"]
    hip=thigh.head.copy()
    original_knee=thigh.tail.copy()
    original_ankle=shin.tail.copy()
    original_toe=foot.tail.copy()
    # Draw the damaged knee inward with shortened reach as the body collapses.
    # The opposite/right leg retains every original 3D frame unchanged.
    altered_ankle=original_ankle.lerp(
        Vector((original_ankle.x*.65,original_ankle.y-.10,max(-.47,original_ankle.z-.025))),
        amount*.7)
    knee,ankle=bend(hip,altered_ankle,lengths["thigh.L"],lengths["shin.L"],
                    (original_knee-hip))
    orient("thigh.L",hip,knee)
    orient("shin.L",knee,ankle)
    original_axis=original_toe-original_ankle
    tip=ankle+original_axis.normalized()*lengths["foot.L"]
    orient("foot.L",ankle,tip)
    return ("thigh.L","shin.L","foot.L")

def render_variant(name):
    source=original_actions["braced" if name=="broken-leg-left" else "forward"]
    action=source.copy()
    action.name="Hollow_Death_Injury_"+name.replace("-","_")+"_v1"
    action.use_fake_user=True
    rig.animation_data.action=action
    for bone in rig.pose.bones:
        bone.rotation_mode="QUATERNION"
    for f in range(1,FRAMES+1):
        scene.frame_set(f)
        influence=smooth((f-3)/10)
        if influence<1e-5:
            continue
        if name=="broken-arm-right":
            # Right arm protects the injured shoulder/ribs instead of reaching
            # for a fall arrest. The sound left arm does the real bracing.
            keys=arm_pose("R",(-.13,-.23,-.35),influence*.92)
        elif name=="one-arm-left":
            # Left arm is unusable: it trails and then hangs, while the healthy
            # right hand remains the only credible arm supporting the impact.
            keys=arm_pose("L",(.27,-.18,-.40),influence*.98)
        else:
            keys=broken_left_leg(influence)
        for key in keys:
            bone=rig.pose.bones[key]
            bone.keyframe_insert("location",frame=f,group=key)
            bone.keyframe_insert("rotation_quaternion",frame=f,group=key)
            bone.keyframe_insert("scale",frame=f,group=key)
    scene.frame_set(1)
    return action

actions={name:render_variant(name) for name in targets}
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=8
scene.render.film_transparent=True
scene.render.resolution_x=CELL
scene.render.resolution_y=CELL
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.color_depth="8"
scene.frame_start=1
scene.frame_end=FRAMES
scene.render.fps=FPS
# Keep the physically approved orthographic projection of the source 128px rig.
assert scene.camera.data.type=="ORTHO"
yaw=rig.rotation_euler.z
metadata={"schemaVersion":1,"actor":"hollowed","clip":"death","renderedFrom3D":True,
          "capeRemovedInActualMesh":True,"frames":FRAMES,"fps":FPS,"cell":CELL,
          "anchor":[48,66],"worldSize":124,"directions":list(DIRECTIONS),
          "variants":list(VARIANTS),"clips":{},"sourceRig":str(SOURCE.relative_to(ROOT)),
          "sourceStatus":"injury-specific, edited 3D death; requires native/mobile owner art acceptance"}
for name,action in actions.items():
    rig.animation_data.action=action
    atlas=Image.new("RGBA",(CELL*FRAMES,CELL*len(view_rows)),(0,0,0,0))
    frames_by_direction={}
    observed={}
    for row,direction in enumerate(view_rows):
        full_row=DIRECTIONS.index(direction)
        rig.rotation_euler.z=yaw+math.radians(ROTATION+180-full_row*45)
        frames_by_direction[direction]=[]
        for f in range(FRAMES):
            scene.frame_set(f+1)
            tmp=OUT/f"_temp_{name}_{direction}_{f:02}.png"
            scene.render.filepath=str(tmp)
            bpy.ops.render.render(write_still=True)
            image=Image.open(tmp).convert("RGBA")
            tmp.unlink()
            if image.size!=(CELL,CELL):
                raise ValueError(f"Wrong 3D cell: {name}/{direction}/{f}")
            box=image.getbbox()
            if not box or min(box[:2])<=0 or max(box[2:])>=CELL:
                raise ValueError(f"Injured death sprite clipped: {name}/{direction}/{f}: {box}")
            observed[f"{direction}:{f}"]=box
            frames_by_direction[direction].append(image)
            atlas.alpha_composite(image,(f*CELL,row*CELL))
        print(f"Rendered authored 3D injury death {name}/{direction}: {FRAMES} frames",flush=True)
    path=OUT/f"death-{name}.png"
    atlas.save(path,optimize=True)
    metadata["clips"][name]={"image":path.name,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
    sheet_samples=(0,3,6,9,12,16,20,23)
    card=Image.new("RGBA",(len(sheet_samples)*(CELL+12),len(view_rows)*(CELL+20)),(18,17,21,255))
    pen=ImageDraw.Draw(card)
    for row,direction in enumerate(view_rows):
        pen.text((2,row*(CELL+20)),name+" / "+direction,fill=(205,191,171))
        for col,f in enumerate(sheet_samples):
            card.alpha_composite(frames_by_direction[direction][f],
                (col*(CELL+12)+6,row*(CELL+20)+16))
    card.resize((card.width*2,card.height*2),Image.Resampling.NEAREST).convert("RGB").save(
        OUT/f"death-{name}-contact-sheet.png")
    sequence=[]
    for frame in frames_by_direction["S"] if "S" in frames_by_direction else frames_by_direction[view_rows[0]]:
        layer=Image.new("RGBA",(CELL+20,CELL+20),(18,17,21,255))
        layer.alpha_composite(frame,(10,10))
        sequence.append(layer.resize(((CELL+20)*4,(CELL+20)*4),Image.Resampling.NEAREST).convert("RGB"))
    sequence[0].save(OUT/f"death-{name}-review.gif",save_all=True,
                     append_images=sequence[1:],duration=round(1000/FPS),loop=0)
    metadata.setdefault("boundingBoxes",{})[name]=observed

rig.rotation_euler.z=yaw
scene.frame_set(1)
rig.animation_data.action=actions[targets[0]]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"hollow-injury-deaths.blend"))
if args.variant=="all" and args.directions=="all":
    (OUT/"manifest.json").write_text(json.dumps(metadata,indent=2)+"\n")
print("Actual 3D skeletal injury death generation done; owner visual approval pending",flush=True)
