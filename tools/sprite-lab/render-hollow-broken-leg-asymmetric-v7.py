"""Render actual Blender-skinned Hollowed trauma variants (8x16 at 96px).

Outputs editable source-derived sprite review atlases, eight real 25fps
direction GIFs, and native/4x standard-vs-damage GIFs for visual sign-off.
The approved runtime walk, attack and death atlases remain untouched.
"""
import argparse
import json
from pathlib import Path

import bpy
import numpy as np
from PIL import Image,ImageDraw

p=argparse.ArgumentParser()
p.add_argument("--variant",default="broken-leg-left-asymmetric-v7",
               choices=("broken-leg-left-asymmetric-v7",))
args=p.parse_args()
variant=args.variant
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"/"rigged-hollow-broken-leg-asymmetric-v7"
MANIFEST=ROOT/"art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1/hollow-movement.manifest.json"
BASELINE=ROOT/"docs/art/evidence/hollowed-broken-leg-trailing-v6/candidate-walk-eight-directions.png"
OUT=ROOT/"artifacts"/("hollow-trauma-"+variant)
OUT.mkdir(parents=True,exist_ok=True)
meta=json.loads(MANIFEST.read_text())
assert tuple(x["direction"] for x in meta["orientations"])==("N","NE","E","SE","S","SW","W","NW")
assert all(not x["flipX"] for x in meta["orientations"])
old=Image.open(BASELINE).convert("RGBA")
assert old.size==(16*96,8*96)
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
frames=16
cell=96
atlas=Image.new("RGBA",(16*cell,8*cell),(0,0,0,0))
profile={
 "source":"CMU-09_01-run.bvh",
 "variant":variant,
 "frames":16,"fps":25,
 "directions":meta["orientations"],"anchor":meta["anchor"],"cell":96,
 "artApproval":False,
 "lightingTexturesApproval":False,
 "runtimeAtlasReplaced":False,
 "status":"UNAPPROVED full-body asymmetric injured-contact timing and healthy push-off, V6 preserved."
}
for row,direction in enumerate(meta["orientations"]):
    facing=direction["direction"]
    rig.rotation_euler.z=base_rotation+np.deg2rad(direction["rotationDegrees"])
    native=[];zoom=[];compare_native=[];compare_zoom=[]
    for frame in range(frames):
        scene.frame_set(frame+1)
        path=OUT/f"temp-{facing.lower()}-{frame:02}.png"
        scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        sprite=Image.open(path).convert("RGBA")
        assert sprite.size==(cell,cell)
        alpha=np.asarray(sprite)[:,:,3]
        if (alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any()):
            raise ValueError(f"Sprite clips bounds: {variant} {facing} frame {frame}")
        assert (alpha>0).sum()>100
        atlas.alpha_composite(sprite,(frame*cell,row*cell))
        original=old.crop((frame*cell,row*cell,(frame+1)*cell,(row+1)*cell))
        card=Image.new("RGBA",(cell,cell),(21,22,28,255))
        card.alpha_composite(sprite)
        native.append(card.convert("RGB"))
        big=card.resize((cell*4,cell*4),Image.Resampling.NEAREST)
        zoom.append(big)
        pair=Image.new("RGBA",(cell*2+12,cell),(21,22,28,255))
        pair.alpha_composite(original,(0,0))
        pair.alpha_composite(sprite,(cell+12,0))
        compare_native.append(pair.convert("RGB"))
        enlarged=pair.resize((pair.width*4,pair.height*4),Image.Resampling.NEAREST)
        ImageDraw.Draw(enlarged).text((6,4),"BROKEN LEG V6 / UNEVEN GAIT V7  "+facing,fill=(239,228,203))
        compare_zoom.append(enlarged.convert("RGB"))
        path.unlink()
    def gif(frames_to_save,path):
        frames_to_save[0].save(path,save_all=True,append_images=frames_to_save[1:],
                              duration=40,loop=0,optimize=False)
    gif(native,OUT/f"{facing.lower()}-animation.gif")
    gif(zoom,OUT/f"{facing.lower()}-zoom-4x.gif")
    gif(compare_native,OUT/f"compare-{facing.lower()}-native-96px.gif")
    gif(compare_zoom,OUT/f"compare-{facing.lower()}-zoom-4x.gif")
    print(variant, facing, "16 source-skinned poses + 96px / 4x moving GIFs",flush=True)
atlas.save(OUT/"candidate-walk-eight-directions.png")
(OUT/"candidate-manifest.json").write_text(json.dumps(profile,indent=2)+"\n")
board=Image.new("RGBA",(atlas.width,atlas.height*2),(0,0,0,0))
board.alpha_composite(old,(0,0))
board.alpha_composite(atlas,(0,atlas.height))
board.save(OUT/"broken-leg-v6-vs-asymmetric-v7-128-frames.png")
# Moving/native-scale visual evidence, separate from the actual Hunt renderer.
# Each actor advances across a small 400×240 test field at the SAME mean
# distance. V7 redistributes speed across painful-contact and healthy-push
# phases. This is a motion-review visualization, NOT game integration.
gait=json.loads((SOURCE/"gait-diagnostics.json").read_text())[:16]
pace=[.34+1.35*f["temporalAsymmetry"]["rightHealthyPropulsion"] for f in gait]
scale=280/sum(pace*2)
for facing in ("E","SE"):
    direction_row=[d["direction"] for d in meta["orientations"]].index(facing)
    moving=[]
    v7_x=55.
    for i in range(32):
        idx=i%16
        old_sprite=old.crop((idx*96,direction_row*96,(idx+1)*96,(direction_row+1)*96))
        new_sprite=atlas.crop((idx*96,direction_row*96,(idx+1)*96,(direction_row+1)*96))
        field=Image.new("RGBA",(400,240),(21,22,28,255))
        draw=ImageDraw.Draw(field)
        draw.text((4,4),"V6 symmetric cycle  |  old",fill=(211,211,212))
        draw.text((4,124),"V7 painful hitch / healthy drive  |  new",fill=(211,211,212))
        draw.line([(0,110),(400,110)],fill=(64,62,59),width=1)
        draw.line([(0,230),(400,230)],fill=(64,62,59),width=1)
        old_x=55+280*(i/31)
        v7_x=min(335.,v7_x+pace[idx]*scale)
        field.alpha_composite(old_sprite,(int(old_x-48),12))
        field.alpha_composite(new_sprite,(int(v7_x-48),132))
        moving.append(field.convert("RGB"))
    moving[0].save(OUT/f"moving-field-{facing.lower()}-native.gif",save_all=True,
                   append_images=moving[1:],duration=40,loop=0,optimize=False)
    print("moving native-size review",facing,flush=True)

print("Rendered",variant,"128 full body frames plus 32 GIFs. ART APPROVAL STILL REQUIRED.",flush=True)
