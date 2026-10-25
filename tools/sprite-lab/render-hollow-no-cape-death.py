"""Render a genuine 3D skeletal death for cape-free Hollowed, never rotate a walk sprite.

Uses the preserved no-cape, zombie-reach standard skinned Blender character and
the existing authored 24-pose Hollow_Death_Collapse Blender action. No gameplay
authority, in-game lighting contract or approved run/attack clips are changed.
Output is a candidate pending a real Hunt / owner visual review.
Python 3.11 + bpy 4.5.x + Pillow; CPU-only and reproducible on GitHub Actions.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector, Quaternion
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend"
DEATH_ACTION_SOURCE = MODEL / "rigged-death-v5/hollow-death.blend"
OUT = ROOT / "artifacts/hollow-no-cape-death"
FRAMES = 24
FPS = 12
CELL = 128
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
SOURCE_ROTATION = math.degrees(math.atan2(-3.2, 2.2)) + 90
OUT.mkdir(parents=True, exist_ok=True)

if not SOURCE.is_file() or not DEATH_ACTION_SOURCE.is_file():
    raise FileNotFoundError("Need actual preserved no-cape mesh and authored death rig; never fake death frames")

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["Hollow editable animation rig"]
character = bpy.data.objects["Hollow skinned character"]
assert any(m.type == "ARMATURE" and m.object == rig for m in character.modifiers)
assert len(character.data.polygons) > 1000
assert scene.camera is not None

# Reuse the real 24-key skeletal collapse, authored for the SAME original bone
# names/rest pose. Load only the action; do not replace our cape-free skin.
with bpy.data.libraries.load(str(DEATH_ACTION_SOURCE), link=False) as (available, selected):
    names = [name for name in available.actions if name.startswith("Hollow_Death_Collapse")]
    assert len(names) == 1, f"Missing or ambiguous old skeletal death action: {names}"
    selected.actions = names
# Blender 4.5 library loading resolves selected.actions to Action datablocks, not names.
action = selected.actions[0]
assert action is not None
if rig.animation_data is None:
    rig.animation_data_create()
rig.animation_data.action = action

# Validate that the rig imported from both source files has every animation
# curve's referenced bone, and this is not a single rigid-object tilt.
bone_names = {b.name for b in rig.pose.bones}
curve_names = set()
for curve in action.fcurves:
    if 'pose.bones["' in curve.data_path:
        curve_names.add(curve.data_path.split('pose.bones["', 1)[1].split('"]', 1)[0])
assert {"pelvis", "spine", "chest", "head", "thigh.L", "shin.L", "thigh.R", "shin.R"}.issubset(curve_names)
assert curve_names.issubset(bone_names), sorted(curve_names - bone_names)

# Source v5's last pose was authored under a long cape. Without the cape, its
# splayed forearms read as a spider. Make a separate keyed no-cape death action:
# arms buckle in toward the skull and settle palms-down under the shoulders.
# Keep the real authored pelvis, spine, leg and head trajectories unchanged.
adjusted = action.copy()
adjusted.name = "Hollow_Death_No_Cape_Grounded_v2"
rig.animation_data.action = adjusted
for bone in rig.pose.bones:
    bone.rotation_mode = "QUATERNION"
rest_heads = {b.name:b.head_local.copy() for b in rig.data.bones}
rest_tails = {b.name:b.tail_local.copy() for b in rig.data.bones}
rest_matrices = {b.name:b.matrix_local.copy() for b in rig.data.bones}
bone_lengths = {b.name:b.length for b in rig.data.bones}

def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t*t*(3-2*t)

def ik_joint(start, end, length1, length2, pole):
    delta=end-start
    total=max(1e-5,min(delta.length,length1+length2-1e-4))
    aim=delta.normalized()
    along=(length1*length1-length2*length2+total*total)/(2*total)
    lateral=Vector(pole)-aim*Vector(pole).dot(aim)
    lateral.normalize()
    elbow=start+aim*along+lateral*math.sqrt(max(0,length1*length1-along*along))
    return elbow,start+aim*total

def pose_segment(name, start, end):
    direction = end-start
    if direction.length < 1e-6:
        return
    direction_rotation = (rest_tails[name]-rest_heads[name]).rotation_difference(direction)
    transform = (direction_rotation.to_matrix() @ rest_matrices[name].to_3x3()).to_4x4()
    transform.translation = start
    rig.pose.bones[name].matrix = transform
    bpy.context.view_layer.update()

for frame in range(1, FRAMES+1):
    scene.frame_set(frame)
    strength=smoothstep((frame-5)/8)
    if strength < 1e-5:
        continue
    for side,sign in (("L",1),("R",-1)):
        shoulder=rig.pose.bones["upper_arm."+side].head.copy()
        original_wrist=rig.pose.bones["forearm."+side].tail.copy()
        # Keep the hand near the fall line rather than bending the arms out
        # into a symmetric crab/starfish silhouette.
        settled=Vector((sign*.17,-.51,-.45))
        wrist=original_wrist.lerp(settled,strength)
        elbow,wrist=ik_joint(shoulder,wrist,bone_lengths["upper_arm."+side],
                            bone_lengths["forearm."+side],(sign*.12,.6,.12))
        pose_segment("upper_arm."+side,shoulder,elbow)
        pose_segment("forearm."+side,elbow,wrist)
        tip=wrist+Vector((sign*.015,-.06,-.015)).normalized()*bone_lengths["hand."+side]
        pose_segment("hand."+side,wrist,tip)
        for name in ("upper_arm."+side,"forearm."+side,"hand."+side):
            bone=rig.pose.bones[name]
            bone.keyframe_insert("location",frame=frame,group=name)
            bone.keyframe_insert("rotation_quaternion",frame=frame,group=name)
            bone.keyframe_insert("scale",frame=frame,group=name)
    bpy.context.view_layer.update()
scene.frame_set(1)
adjusted.use_fake_user=True

# A second truly keyed 3D source action: a sideways broken-knee/bracing fall.
# This does not transform any source 2D pixels or invent random frame shifts.
side_action=adjusted.copy()
side_action.name="Hollow_Death_No_Cape_Braced_Side_v1"
side_action.use_fake_user=True
rig.animation_data.action=side_action
for frame in range(1,FRAMES+1):
    scene.frame_set(frame)
    impact=smoothstep((frame-4)/10)
    if impact<1e-5:
        continue
    # Asymmetrical torso compression/roll is keyed independently of the first
    # collapse. Keep the legs and floor correction grounded.
    for bone_name,angle in (("pelvis",-5),("spine",-12),("chest",-10),("neck",8)):
        bone=rig.pose.bones[bone_name]
        q=Quaternion((0,1,0),math.radians(angle*impact))
        bone.rotation_quaternion=(q@bone.rotation_quaternion).normalized()
        bone.keyframe_insert("rotation_quaternion",frame=frame,group=bone_name)
    for side,sign in (("L",1),("R",-1)):
        shoulder=rig.pose.bones["upper_arm."+side].head.copy()
        prior_wrist=rig.pose.bones["forearm."+side].tail.copy()
        target=Vector((.35,-.59,-.45)) if side=="L" else Vector((-.11,-.43,-.44))
        wrist=prior_wrist.lerp(target,impact)
        elbow,wrist=ik_joint(shoulder,wrist,bone_lengths["upper_arm."+side],
                             bone_lengths["forearm."+side],(sign*.12,.55,.15))
        pose_segment("upper_arm."+side,shoulder,elbow)
        pose_segment("forearm."+side,elbow,wrist)
        tip=wrist+Vector((sign*.02,-.07,-.01)).normalized()*bone_lengths["hand."+side]
        pose_segment("hand."+side,wrist,tip)
        for name in ("upper_arm."+side,"forearm."+side,"hand."+side):
            bone=rig.pose.bones[name]
            bone.keyframe_insert("location",frame=frame,group=name)
            bone.keyframe_insert("rotation_quaternion",frame=frame,group=name)
            bone.keyframe_insert("scale",frame=frame,group=name)
scene.frame_set(1)
variants={
    "collapse-forward":(adjusted,"death.png"),
    "collapse-braced":(side_action,"death-braced.png"),
}

# The authored collapse carried an after-skin floor-contact corrective in the
# old mesh. Rebuild its same Z-floor cap on the no-cape skin, after Armature.
group = bpy.data.node_groups.new("Hollow death grounded no-cape geometry", "GeometryNodeTree")
group.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
group.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
nodes, links = group.nodes, group.links
input_node = nodes.new("NodeGroupInput")
output_node = nodes.new("NodeGroupOutput")
position = nodes.new("GeometryNodeInputPosition")
separate = nodes.new("ShaderNodeSeparateXYZ")
floor = nodes.new("ShaderNodeMath")
floor.operation = "MAXIMUM"
floor.inputs[1].default_value = -0.5
combine = nodes.new("ShaderNodeCombineXYZ")
set_position = nodes.new("GeometryNodeSetPosition")
links.new(input_node.outputs["Geometry"], set_position.inputs["Geometry"])
links.new(position.outputs["Position"], separate.inputs[0])
links.new(separate.outputs["X"], combine.inputs["X"])
links.new(separate.outputs["Y"], combine.inputs["Y"])
links.new(separate.outputs["Z"], floor.inputs[0])
links.new(floor.outputs[0], combine.inputs["Z"])
links.new(combine.outputs[0], set_position.inputs["Position"])
links.new(set_position.outputs["Geometry"], output_node.inputs["Geometry"])
modifier = character.modifiers.new("Ground contact for authored death", "NODES")
modifier.node_group = group

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.render.film_transparent = True
scene.render.resolution_x = CELL
scene.render.resolution_y = CELL
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.camera.data.ortho_scale = 1.55 * CELL / 96
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
baseline_yaw = rig.rotation_euler.z
all_frames={}
all_bounds={}
clip_manifest={}
for name,(action,filename) in variants.items():
    rig.animation_data.action=action
    atlas=Image.new("RGBA",(CELL*FRAMES,CELL*len(DIRECTIONS)))
    frames_by_direction={}
    bounds={}
    for row,direction in enumerate(DIRECTIONS):
        rig.rotation_euler.z=baseline_yaw+math.radians(SOURCE_ROTATION+180-row*45)
        frames_by_direction[direction]=[]
        for frame in range(FRAMES):
            scene.frame_set(frame+1)
            temporary=OUT/f"_temporary_{name}_{row:02}_{frame:02}.png"
            scene.render.filepath=str(temporary)
            bpy.ops.render.render(write_still=True)
            rendered=Image.open(temporary).convert("RGBA")
            temporary.unlink()
            if rendered.size!=(CELL,CELL):
                raise ValueError(f"Wrong death sprite size: {name} {direction} {frame}")
            box=rendered.getbbox()
            if not box or min(box[:2])<=0 or max(box[2:])>=CELL:
                raise ValueError(f"Death silhouette clipped or empty: {name} {direction} {frame}: {box}")
            frames_by_direction[direction].append(rendered)
            bounds[f"{direction}:{frame}"]=box
            atlas.alpha_composite(rendered,(frame*CELL,row*CELL))
        print(f"Rendered 3D death {name}: {direction} / {FRAMES} poses",flush=True)
    atlas_path=OUT/filename
    atlas.save(atlas_path,optimize=True)
    clip_manifest[name]={"image":filename,"sha256":hashlib.sha256(atlas_path.read_bytes()).hexdigest()}
    all_frames[name]=frames_by_direction
    all_bounds[name]=bounds
    samples=(0,3,6,9,12,16,20,23)
    board=Image.new("RGBA",(len(samples)*(CELL+12),len(DIRECTIONS)*(CELL+22)),(18,17,21,255))
    ink=ImageDraw.Draw(board)
    for row,direction in enumerate(DIRECTIONS):
        ink.text((2,row*(CELL+22)),direction,fill=(205,191,171))
        for col,index in enumerate(samples):
            board.alpha_composite(frames_by_direction[direction][index],
                                   (col*(CELL+12)+6,row*(CELL+22)+17))
    preview_suffix="" if name=="collapse-forward" else "-braced"
    board.resize((board.width*2,board.height*2),Image.Resampling.NEAREST).convert("RGB").save(
        OUT/f"death-contact-sheet{preview_suffix}.png")
    gif_frames=[]
    for sprite in frames_by_direction["S"]:
        canvas=Image.new("RGBA",(CELL+20,CELL+20),(18,17,21,255))
        canvas.alpha_composite(sprite,(10,10))
        gif_frames.append(canvas.resize((4*(CELL+20),4*(CELL+20)),Image.Resampling.NEAREST).convert("RGB"))
    gif_frames[0].save(OUT/f"death-south-review{preview_suffix}.gif",
                       save_all=True,append_images=gif_frames[1:],duration=round(1000/FPS),loop=0)

scene.frame_set(1)
rig.rotation_euler.z = baseline_yaw
rig.animation_data.action=adjusted
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "hollow-no-cape-death.blend"))
metadata={
    "schemaVersion":2,
    "actor":"hollowed",
    "clip":"death",
    "renderedFrom3D":True,
    "capeRemovedInActualMesh":True,
    "sourceRig":str(SOURCE.relative_to(ROOT)),
    "originalDeathAction":str(DEATH_ACTION_SOURCE.relative_to(ROOT)),
    "sourceStatus":"two independently keyed 3D death motion candidates requiring mobile review",
    "directions":list(DIRECTIONS),
    "frames":FRAMES,"fps":FPS,"cell":CELL,
    "worldSize":124,"anchor":[64,88],
    "variants":list(variants),
    "clips":clip_manifest,
    "boundingBoxes":all_bounds,
}
(OUT/"manifest.json").write_text(json.dumps(metadata,indent=2)+"\n")
print("Generated two authored 24-pose eight-way no-cape 3D skeletal death alternatives.",flush=True)
