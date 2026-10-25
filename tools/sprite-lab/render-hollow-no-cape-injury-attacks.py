"""Review exactly authored 16-key attack on no-cape Hollowed at 96px / 12fps.

All eight original authored camera directions, actual animated 96px GIFs,
4x nearest-neighbour and new injured-vs-standard comparisons. This is
NOT gameplay integration or proof damage can only come from one arm.
"""
import argparse
import json
from pathlib import Path

import bpy
import numpy as np
from PIL import Image,ImageDraw

p=argparse.ArgumentParser()
p.add_argument("--variant",choices=("standard","broken-arm-right","one-arm-left"),required=True)
args=p.parse_args()
variant=args.variant
ROOT=Path(__file__).resolve().parents[2]
MODEL=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
SOURCE=MODEL/("rigged-hollow-no-cape-attack-"+variant+"-preview")
MANIFEST=ROOT/"art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1/hollow-movement.manifest.json"
OUT=ROOT/"artifacts"/("hollow-no-cape-attack-"+variant)
OUT.mkdir(parents=True,exist_ok=True)
meta=json.loads(MANIFEST.read_text())
assert tuple(d["direction"] for d in meta["orientations"])==("N","NE","E","SE","S","SW","W","NW")
standard=ROOT/"artifacts/hollow-no-cape-attack-standard/candidate-attack-eight-directions.png"
old=Image.open(standard).convert("RGBA") if variant!="standard" else None
if old is not None:assert old.size==(1536,768)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/"hollow-rigged.blend"))
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=12
scene.render.resolution_x=scene.render.resolution_y=96
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
rig=bpy.data.objects["Hollow editable animation rig"]
base_rotation=rig.rotation_euler.z
atlas=Image.new("RGBA",(1536,768),(0,0,0,0))
for row,direction in enumerate(meta["orientations"]):
    facing=direction["direction"]
    rig.rotation_euler.z=base_rotation+np.deg2rad(direction["rotationDegrees"])
    native=[];zoom=[];compare_native=[];compare_zoom=[]
    for frame in range(16):
        scene.frame_set(frame+1)
        path=OUT/f"temp-{facing.lower()}-{frame:02}.png"
        scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        sprite=Image.open(path).convert("RGBA")
        assert sprite.size==(96,96)
        alpha=np.asarray(sprite)[:,:,3]
        assert np.count_nonzero(alpha)>100
        if alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any():
            raise ValueError(f"{variant} {facing} {frame}: silhouette clips 96px atlas")
        atlas.alpha_composite(sprite,(frame*96,row*96))
        card=Image.new("RGBA",(96,96),(21,22,28,255))
        card.alpha_composite(sprite)
        native.append(card.convert("RGB"))
        zoom.append(card.resize((384,384),Image.Resampling.NEAREST).convert("RGB"))
        if old is not None:
            before=old.crop((frame*96,row*96,(frame+1)*96,(row+1)*96))
            pair=Image.new("RGBA",(204,96),(21,22,28,255))
            pair.alpha_composite(before,(0,0))
            pair.alpha_composite(sprite,(108,0))
            compare_native.append(pair.convert("RGB"))
            large=pair.resize((816,384),Image.Resampling.NEAREST)
            ImageDraw.Draw(large).text((6,6),"STANDARD ATTACK / "+variant+" "+facing,fill=(230,221,201))
            compare_zoom.append(large.convert("RGB"))
        path.unlink()
    def gif(images,path):
        images[0].save(path,save_all=True,append_images=images[1:],
                       duration=round(1000/12),loop=0,optimize=False)
    gif(native,OUT/f"{facing.lower()}-attack.gif")
    gif(zoom,OUT/f"{facing.lower()}-attack-zoom-4x.gif")
    if old is not None:
        gif(compare_native,OUT/f"compare-{facing.lower()}-attack-native.gif")
        gif(compare_zoom,OUT/f"compare-{facing.lower()}-attack-4x.gif")
    print(variant,facing,"16 original attack-phase 96px frames",flush=True)
atlas.save(OUT/"candidate-attack-eight-directions.png")
(OUT/"candidate-manifest.json").write_text(json.dumps({
  "variant":variant,"fps":12,"frames":16,
  "loop":False,"onComplete":"walk",
  "contactFrames":[7,8],
  "directions":meta["orientations"],
  "cell":96,"artApproval":False,"damageChanged":False,
  "runtimeAtlasReplaced":False,
  "status":"Separate edited no-cape Blender attack preview; no old walk/attack lighting masks reused"
},indent=2)+"\n")
print("Created original rig/attack variant GIFs",variant,"owner review required")
