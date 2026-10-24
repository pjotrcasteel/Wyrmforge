"""Render original CMU-sourced motion on the actual Hollowed mesh.

Inspect 16 source frames, four azimuths and a joint-overlay GIF. These are
unapproved previews, not 8-direction production sheets.
"""
import json
from pathlib import Path
import math
import bpy
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-mocap-no-cape-short-claws-candidate"
OUT=ROOT/"artifacts/hollow-no-cape-short-claws-review"
OUT.mkdir(parents=True,exist_ok=True)
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
base_yaw=rig.rotation_euler.z
def capture(frame,name,turn=0):
    rig.rotation_euler.z=base_yaw+math.radians(turn)
    scene.frame_set(frame+1)
    path=OUT/name
    scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    return Image.open(path).convert("RGBA")

images=[capture(i,f"run-{i:02}.png") for i in range(16)]
clip=[]
for index,img in enumerate(images):
    board=Image.new("RGBA",(144,120),(21,22,28,255))
    board.alpha_composite(img,(24,12))
    ImageDraw.Draw(board).text((4,2),f"CMU RUN RETARGET / {index:02}",fill=(215,206,181))
    clip.append(board.convert("RGB").resize((576,480),Image.Resampling.NEAREST))
clip[0].save(OUT/"mocap-biomechanics.gif",save_all=True,append_images=clip[1:],
             duration=round(1000/25),loop=0)
contact=Image.new("RGBA",(384,384),(21,22,28,255))
for i,img in enumerate(images):
    contact.alpha_composite(img,((i%4)*96,(i//4)*96))
contact.resize((768,768),Image.Resampling.NEAREST).save(OUT/"mocap-run-16-poses.png")
old_board=Image.open(ROOT/"docs/art/evidence/hollowed-no-cape-islands-2026-10-24/mocap-run-16-poses.png").convert("RGB")
new_board=Image.open(OUT/"mocap-run-16-poses.png").convert("RGB")
comparison=Image.new("RGB",(1536,768),(21,22,28))
comparison.paste(old_board,(0,0))
comparison.paste(new_board,(768,0))
comparison.save(OUT/"full-claws-vs-short-claws-16-poses.png")

azimuths=[0,90,180,270]
board=Image.new("RGB",(768,864),(21,22,28))
draw=ImageDraw.Draw(board)
for row,angle in enumerate(azimuths):
    for col,frame in enumerate((0,4,8,12)):
        img=capture(frame,f"turn-{angle:03}-frame-{frame:02}.png",angle)
        scaled=img.resize((192,192),Image.Resampling.NEAREST)
        board.paste(scaled,(col*192,row*216+24),scaled)
        draw.text((col*192+7,row*216+5),f"yaw {angle} / f {frame:02}",fill=(215,206,181))
board.save(OUT/"mocap-run-four-view.png")

# Diagnostic skeletons are a separate proof channel from rendered skin.
samples=json.loads((SOURCE/"gait-diagnostics.json").read_text())[:16]
snapshots=[]
for data in samples:
    diagram=Image.new("RGB",(900,400),(21,22,28))
    d=ImageDraw.Draw(diagram)
    d.text((20,10),f"MOCAP RUN {data['frame']:02} | torso {data['forwardLeanDegrees']:.1f}deg",fill=(228,220,198))
    def screen(p,offset):
        return (offset+round(p[1]*680),115-round(p[2]*500))
    for side,color,offset in (("L","#f7b969",240),("R","#86bedc",680)):
        a=data["arms"][side]; f=data["feet"][side]
        for chain in ((a["shoulder"],a["elbow"],a["wrist"],a["hand"]),
                      (f["hip"],f["knee"],f["ankle"])):
            pts=[screen(x,offset) for x in chain]
            d.line(pts,fill=color,width=4)
            for x,y in pts: d.ellipse((x-4,y-4,x+4,y+4),fill=color)
        d.text((offset-180,365),f"{side}: knee {f['kneeFlexDegrees']:.1f} / elbow {a['elbowFlexDegrees']:.1f}",fill=color)
    snapshots.append(diagram)
snapshots[0].save(OUT/"mocap-joints.gif",save_all=True,append_images=snapshots[1:],
                  duration=round(1000/25),loop=0)
montage=Image.new("RGB",(1800,1600),(21,22,28))
for i,img in enumerate(snapshots):
    montage.paste(img,((i%2)*900,(i//2)*200))
montage.resize((900,800),Image.Resampling.LANCZOS).save(OUT/"mocap-joints-contact.png")
(OUT/"review.json").write_text(json.dumps({
    "approved":False,"rig":str((SOURCE/"hollow-rigged.blend").relative_to(ROOT)),
    "poses":16,"mocap":"CMU 09_01", "angles":[0,90,180,270],
    "status":"UNAPPROVED COMPLETE NO-CAPE ISLAND REVIEW; original CMU and production assets preserved"
},indent=2)+"\n")
print("Original-CMU-run 16-frame motion GIF, contact sheet and 4-azimuth skinned evidence complete")
