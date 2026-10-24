"""Eight-direction, native-pixel Blender review of CMU-retargeted Hollowed.

Candidate-only images. Do not replace approved walk.png or #332 normal maps.
Uses EXACT approved source orientation angles and atlas layout.
"""
import json
from pathlib import Path

import bpy
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-mocap-biomechanics-candidate"
MANIFEST=ROOT/"art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1/hollow-movement.manifest.json"
OUT=ROOT/"artifacts/hollow-mocap-biomechanics-eight-directions"
OUT.mkdir(parents=True,exist_ok=True)
meta=json.loads(MANIFEST.read_text())
assert tuple(x["direction"] for x in meta["orientations"])==("N","NE","E","SE","S","SW","W","NW")
assert all(not x["flipX"] for x in meta["orientations"])
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/"hollow-rigged.blend"))
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=14
scene.render.resolution_x=scene.render.resolution_y=96
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
rig=bpy.data.objects["Hollow editable animation rig"]
base_rotation=rig.rotation_euler.z
frames=16;cell=96
atlas=Image.new("RGBA",(frames*cell,8*cell),(0,0,0,0))
profile={"source":"CMU-09_01-run.bvh", "frames":frames,"directions":meta["orientations"],
         "anchor":meta["anchor"],"cell":cell,
         "artApproval":False,"lightingTexturesApproval":False,
         "status":"NEW candidate only; original Hollowed walk.png unchanged"}
for row,direction in enumerate(meta["orientations"]):
    rig.rotation_euler.z=base_rotation+np.deg2rad(direction["rotationDegrees"])
    boards=[]
    for frame in range(frames):
        scene.frame_set(frame+1)
        file=OUT/f"{direction['direction'].lower()}-{frame:02}.png"
        scene.render.filepath=str(file)
        bpy.ops.render.render(write_still=True)
        sprite=Image.open(file).convert("RGBA")
        assert sprite.size==(cell,cell)
        a=np.asarray(sprite)[:,:,3]
        if np.any(a[0,:]) or np.any(a[-1,:]) or np.any(a[:,0]) or np.any(a[:,-1]):
            raise ValueError(f"Too big/out of bounds: {direction['direction']} frame {frame}")
        atlas.alpha_composite(sprite,(frame*cell,row*cell))
        card=Image.new("RGBA",(112,112),(21,22,28,255))
        card.alpha_composite(sprite,(8,12))
        ImageDraw.Draw(card).text((4,2),f"{direction['direction']} {frame:02}",fill=(214,204,181))
        boards.append(card.convert("RGB").resize((448,448),Image.Resampling.NEAREST))
    boards[0].save(OUT/f"{direction['direction'].lower()}-animation.gif",
                   append_images=boards[1:],save_all=True,duration=round(1000/22),loop=0)
    print(direction["direction"],"16 actual authored running poses",flush=True)
atlas.save(OUT/"candidate-walk-eight-directions.png")
# Comparison at EXACT native atlas cell size, alternating unchanged source
# and biomechanics revision rows. This is evidence, NOT acceptance.
baseline=ROOT/"docs/art/evidence/hollowed-mocap-run-v1-2026-10-24/candidate-walk-eight-directions.png"
old=Image.open(baseline).convert("RGBA")
assert old.size==atlas.size
comparison=Image.new("RGBA",(frames*cell,16*cell),(0,0,0,0))
for row in range(8):
    comparison.paste(old.crop((0,row*cell,frames*cell,(row+1)*cell)),(0,row*2*cell))
    comparison.paste(atlas.crop((0,row*cell,frames*cell,(row+1)*cell)),(0,(row*2+1)*cell))
comparison.save(OUT/"baseline-vs-biomechanics-eight-directions.png")

(OUT/"candidate-manifest.json").write_text(json.dumps(profile,indent=2)+"\n")
print("Saved independently editable 128-frame biomechanics review plus baseline comparison; NOT approved")
