"""Render real 3D-skinning contact-authored Hollowed injury review evidence.

Every compass direction at true 96px, enlarged nearest-neighbour 4x,
V7 (rejected) versus authored contacts, and 32-frame moving field GIFs.
Review-only; no production atlas or lighting material substitutions.
"""
from __future__ import annotations
import json
from pathlib import Path
import bpy
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE = MODEL / "rigged-hollow-broken-leg-even-cadence"
BASELINE = ROOT / "docs/art/evidence/hollowed-broken-leg-ground-safe/candidate-walk-eight-directions.png"
MANIFEST = ROOT / "art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1/hollow-movement.manifest.json"
OUT = ROOT / "artifacts/hollow-broken-leg-even-cadence"
OUT.mkdir(parents=True, exist_ok=True)
assert SOURCE.is_dir() and BASELINE.is_file()
meta = json.loads(MANIFEST.read_text())
directions = meta["orientations"]
assert tuple(d["direction"] for d in directions) == ("N","NE","E","SE","S","SW","W","NW")
assert all(not d["flipX"] for d in directions)
before = Image.open(BASELINE).convert("RGBA")
assert before.size == (16*96, 8*96)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / "hollow-rigged.blend"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.render.resolution_x = scene.render.resolution_y = 96
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
rig = bpy.data.objects["Hollow editable animation rig"]
initial_rotation = rig.rotation_euler.z
fps = scene.render.fps
assert fps == 22, fps
atlas = Image.new("RGBA", before.size, (0,0,0,0))


def gif(images, path, duration=round(1000/fps)):
    images[0].save(path, save_all=True, append_images=images[1:],
                   duration=duration, loop=0, optimize=False)


def composite(sprite):
    card = Image.new("RGBA", (96,96), (21,22,28,255))
    card.alpha_composite(sprite)
    return card.convert("RGB")


for row, direction in enumerate(directions):
    face = direction["direction"]
    rig.rotation_euler.z = initial_rotation + np.deg2rad(direction["rotationDegrees"])
    native, zoom, compare, compare_zoom = [], [], [], []
    for frame in range(16):
        scene.frame_set(frame+1)
        temp = OUT / f"temp-{face.lower()}-{frame:02}.png"
        scene.render.filepath = str(temp)
        bpy.ops.render.render(write_still=True)
        sprite = Image.open(temp).convert("RGBA")
        temp.unlink()
        assert sprite.size == (96,96)
        alpha = np.asarray(sprite)[:,:,3]
        if (alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any()):
            raise ValueError(f"Frame clipped: {face} {frame}")
        assert (alpha>0).sum()>100
        atlas.alpha_composite(sprite, (frame*96,row*96))
        native_card = composite(sprite)
        native.append(native_card)
        zoom.append(native_card.resize((384,384),Image.Resampling.NEAREST))
        old = before.crop((frame*96,row*96,(frame+1)*96,(row+1)*96))
        pair = Image.new("RGBA",(204,96),(21,22,28,255))
        pair.alpha_composite(old,(0,0))
        pair.alpha_composite(sprite,(108,0))
        compare.append(pair.convert("RGB"))
        enlarged = pair.resize((816,384),Image.Resampling.NEAREST)
        ImageDraw.Draw(enlarged).text((6,4),"REJECTED V7  /  NEW CONTACT GAIT",fill=(239,228,203))
        compare_zoom.append(enlarged.convert("RGB"))
    gif(native, OUT/f"{face.lower()}-animation.gif")
    gif(zoom, OUT/f"{face.lower()}-zoom-4x.gif")
    gif(compare, OUT/f"compare-{face.lower()}-native-96px.gif")
    gif(compare_zoom, OUT/f"compare-{face.lower()}-zoom-4x.gif")
    print("Render true 3D",face,"16 poses native and 4x",flush=True)

atlas.save(OUT/"candidate-walk-eight-directions.png")
contact_sheet = Image.new("RGBA",(atlas.width,atlas.height*2),(0,0,0,0))
contact_sheet.alpha_composite(before,(0,0))
contact_sheet.alpha_composite(atlas,(0,atlas.height))
contact_sheet.save(OUT/"ground-safe-vs-even-cadence-all-directions.png")
first_atlas = ROOT/"docs/art/evidence/hollowed-broken-leg-contact-authored/candidate-walk-eight-directions.png"
if first_atlas.is_file():
    first = Image.open(first_atlas).convert("RGBA")
    first_sheet = Image.new("RGBA", (atlas.width, atlas.height*2), (0,0,0,0))
    first_sheet.alpha_composite(first, (0,0))
    first_sheet.alpha_composite(atlas, (0,atlas.height))
    first_sheet.save(OUT/"first-contact-vs-dragged-recovery.png")

# Moving-field comparison at native pixel scale is ONLY an animation review,
# not a true Hunt capture or claim about actual C# authoritative movement.
# Match average travel of both actors so gait, not artificially faster speed,
# is what the reviewer compares.
for facing in ("E","SE","S"):
    row = [d["direction"] for d in directions].index(facing)
    samples = json.loads((SOURCE/"gait-diagnostics.json").read_text())[:16]
    paces = [max(.15, .20 + 1.0*f["contact"]["rightSupport"]*(1-.70*f["contact"]["leftFailedLoad"]))
             for f in samples]*2
    motion = []
    for i in range(32):
        frame = i % 16
        src = before.crop((frame*96,row*96,(frame+1)*96,(row+1)*96))
        new = atlas.crop((frame*96,row*96,(frame+1)*96,(row+1)*96))
        canvas = Image.new("RGBA",(400,240),(21,22,28,255))
        draw = ImageDraw.Draw(canvas)
        draw.text((5,5),"PRIOR FAST STEP",fill=(224,220,207))
        draw.text((5,125),"NEW: EVEN INJURED STEP",fill=(224,220,207))
        draw.line(((0,110),(399,110)),fill=(67,65,63),width=1)
        draw.line(((0,230),(399,230)),fill=(67,65,63),width=1)
        # Move at a short injured stride's plausible travel, not the
        # original 280-pixel / 32-frame sprint-field exaggeration.
        # The slight stagger belongs ONLY to this review preview.
        old_travel = 75 + 68*i/31
        new_travel = 75 + 68*sum(paces[:i+1])/sum(paces)
        canvas.alpha_composite(src,(int(old_travel)-48,12))
        canvas.alpha_composite(new,(int(new_travel)-48,132))
        motion.append(canvas.convert("RGB"))
    gif(motion, OUT/f"moving-field-{facing.lower()}-native.gif")

records = json.loads((SOURCE/"gait-diagnostics.json").read_text())
(OUT/"candidate-manifest.json").write_text(json.dumps({
    "variant":"broken-leg-left-even-cadence",
    "status":"UNAPPROVED shortened and evenly paced dragged step; prior one-frame snap removed",
    "fps": fps, "frames":16, "cell":96,
    "directions":directions, "anchor":meta["anchor"],
    "injuredGroundContacts":sum(f["contact"]["leftAnkleGround"] for f in records[:16]),
    "healthyGroundContacts":sum(f["contact"]["rightAnkleGround"] for f in records[:16]),
    "retainedFromHealthyRun":"upper-body motion and original skinned mesh only; NOT leg trajectories",
    "maximumAnkleTravelPerFrame":json.loads((SOURCE/"retarget-provenance.json").read_text())["injuryAuthoring"]["maxAnkleTravelPerFrame"],
    "runtimeAtlasReplaced":False,"lightingMaterialsApproval":False,
    "artApproval":False,"realMobileHuntCaptured":False,
},indent=2)+"\n")
print("Created eight 96px true 3D EVEN-CADENCE clips and prior fast-step comparisons, NOT approved",flush=True)
