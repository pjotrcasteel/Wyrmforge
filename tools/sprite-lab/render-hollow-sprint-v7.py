"""Render REAL Blender/Cycles feral sprint v7 candidate for owner review.

Not sprite stretching. The 4 view thumbnails are review camera azimuths,
not a validated eight-direction production atlas. Approved art stays immutable.
"""
from pathlib import Path
import json
import math
import bpy
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-sprint-v7-candidate"
OUTPUT = ROOT / "artifacts/hollow-sprint-v7-review"
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / "hollow-rigged.blend"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 10
scene.render.resolution_x = scene.render.resolution_y = 96
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
rig = bpy.data.objects["Hollow editable animation rig"]
original_rotation = rig.rotation_euler.copy()

def capture(frame, name, degrees=0):
    rig.rotation_euler.z = original_rotation.z + math.radians(degrees)
    scene.frame_set(frame+1)
    file = OUTPUT / name
    scene.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)
    image = Image.open(file).convert("RGBA")
    assert image.size == (96,96)
    return image

# Same 3/4 authored camera view for a complete 16-frame movement cycle.
frames = [capture(frame, f"sprint-{frame:02d}.png") for frame in range(16)]
movie = []
for i, frame in enumerate(frames):
    board = Image.new("RGBA", (144, 122), (22, 23, 28, 255))
    board.alpha_composite(frame, (24, 12))
    ImageDraw.Draw(board).text((4, 1), f"FERAL SPRINT v7 / {i:02d}", fill=(239, 215, 180))
    movie.append(board.convert("RGB").resize((576,488), Image.Resampling.NEAREST))
# No end hold for a rapid run: a held final pose would make it LOOK like shuffling.
movie[0].save(OUTPUT / "feral-sprint-v7.gif", save_all=True,
              append_images=movie[1:], duration=round(1000 / json.loads((SOURCE / "candidate-profile.json").read_text())["fps"]), loop=0)
contact = Image.new("RGBA", (384,384), (22, 23, 28, 255))
for i, frame in enumerate(frames):
    contact.alpha_composite(frame, ((i%4)*96, (i//4)*96))
contact.resize((768,768), Image.Resampling.NEAREST).save(OUTPUT / "sprint-v7-16-poses.png")
view_frames = [0,4,8,12]
rotations = [0,90,180,270]
review = Image.new("RGB", (4*192,4*216), (22, 23, 28))
draw = ImageDraw.Draw(review)
for row, azimuth in enumerate(rotations):
    for column, pose in enumerate(view_frames):
        sample = capture(pose, f"azimuth-{azimuth:03d}-frame-{pose:02d}.png", azimuth)
        enlarged = sample.resize((192,192),Image.Resampling.NEAREST)
        review.paste(enlarged,(192*column,216*row+22),enlarged)
        draw.text((192*column+5,216*row+4),f"yaw {azimuth} / pose {pose}",fill=(220, 191, 165))
review.save(OUTPUT/"sprint-v7-four-view-pose-review.png")
rig.rotation_euler = original_rotation
profile = json.loads((SOURCE / "candidate-profile.json").read_text())
(OUTPUT / "sprint-v7-review.json").write_text(json.dumps({
    "approved": False, "source": profile["originalSourceRig"],
    "authoring": str((SOURCE/"hollow-rigged.blend").relative_to(ROOT)),
    "movement": {"frames":16,"fps":profile["fps"],
                 "stanceFraction":profile["stanceFraction"],
                 "sweepModelUnits":profile["footSweepModelUnits"],
                 "liftModelUnits":profile["recoveryLiftModelUnits"]},
    "poses": 16, "multiview": "4 azimuth samples are diagnostic only, NOT 8 directional runtime atlas",
    "caution": "Needs foot slip test against C# speed and original source-derived normal export",
},indent=2)+"\n")

# Anatomy-first proof: sagittal-plane joint positions and joint angles displayed
# alongside the true rendered motion. A visible heel recovery and correct elbow
# hinge must be identifiable from THE BONES, not merely subjective sprites.
diagnostics = json.loads((SOURCE / "gait-diagnostics.json").read_text())
def included_angle(a, center, b):
    from mathutils import Vector
    u = Vector(a) - Vector(center)
    v = Vector(b) - Vector(center)
    return round(180 - math.degrees(u.angle(v)), 1)
def anatomy_board(record):
    image = Image.new("RGB", (720, 340), (20, 22, 28))
    painter = ImageDraw.Draw(image)
    def pt(p):
        return (round(360 + p[1] * 700), round(95 - p[2] * 450))
    painter.line([(0, pt([0,0,-.5])[1]), (720, pt([0,0,-.5])[1])], fill=(92, 97, 104), width=2)
    knees, elbows = [], []
    for side, color in (("L", "#f9c166"), ("R", "#85bcec")):
        leg = record["feet"][side]; arm = record["arms"][side]
        for a, b in ((leg["hip"], leg["knee"]), (leg["knee"], leg["ankle"]),
                     (arm["shoulder"], arm["elbow"]), (arm["elbow"], arm["wrist"])):
            painter.line([pt(a), pt(b)], fill=color, width=4)
        for joint in ("hip","knee","ankle"):
            x,y=pt(leg[joint]);painter.ellipse((x-4,y-4,x+4,y+4),fill=color)
        for joint in ("shoulder","elbow","wrist"):
            x,y=pt(arm[joint]);painter.ellipse((x-4,y-4,x+4,y+4),fill=color)
        knees.append(included_angle(leg["hip"],leg["knee"],leg["ankle"]))
        elbows.append(included_angle(arm["shoulder"],arm["elbow"],arm["wrist"]))
    painter.text((8,8),f"frame {record['frame']:02d}  knee flex L/R {knees}  elbow flex L/R {elbows}",fill=(232,226,214))
    painter.text((8,29),f"left leg stance={record['feet']['L']['stance']} / right stance={record['feet']['R']['stance']}",fill=(172,184,194))
    return image
anatomy = [anatomy_board(record) for record in diagnostics[:16]]
anatomy[0].save(OUTPUT / "anatomy-kinematics-v7.gif",save_all=True,
                append_images=anatomy[1:],duration=round(1000/profile["fps"]),loop=0)
montage=Image.new("RGB",(4*720,4*340),(20,22,28))
for i,frame in enumerate(anatomy):
    montage.paste(frame,((i%4)*720,(i//4)*340))
montage.resize((1440,680),Image.Resampling.LANCZOS).save(OUTPUT/"anatomy-kinematics-v7.png")
print("Rendered 16 original-rig sprint frames, four azimuths, and joint-annotated 16-frame anatomy evidence")
