#!/usr/bin/env python3
"""Review-only 16-key wizard staff-assisted walking study; licensed pixels remain immutable."""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "run-side-grey-6f-64x80.png"
PREVIOUS = HERE.parent / "staff-walk-side-v002" / "staff_walk.py"
CELL = (64, 80)
GROUND_Y = 74


def render(source_path: Path = SOURCE):
    """Return sixteen native pixels, root/contact metadata, sheet and world-space playback."""
    atlas = Image.open(source_path).convert("RGBA")
    if atlas.size != (384, 80):
        raise ValueError("Expected the approved six-frame 64x80 artist intake")
    spec = importlib.util.spec_from_file_location("staff_v002_reference", PREVIOUS)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Missing original larger-amplitude study: {PREVIOUS}")
    prior = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prior)
    ns = prior.__dict__
    ROOT=(0,0,0,0,1,4,6,9,12,16,20,23,25,26,26,26)
    STEPS=[
    (41,39,44,55,"advance"),(44,39,47,56,"advance"),
    (48,39,53,63,"advance"),(51,40,58,71,"advance"),
    (53,40,60,74,"plant"),(53,42,57,74,"support"),
    (52,44,55,74,"support"),(50,46,52,74,"passing"),
    (48,48,49,74,"passing"),(46,47,45,74,"passing"),
    (44,45,41,74,"behind"),(42,43,38,74,"behind"),
    (40,41,36,74,"behind"),(41,39,35,65,"release"),
    (42,39,42,55,"recovery"),(43,39,44,55,"advance")]
    ns["STEPS"]=STEPS
    ns["ROOT_TRAVEL_PX"]=ROOT
    LINE=(20,20,18,255)
    DARK=(52,52,60,255)
    SHADE=(75,74,82,255)
    LIT=(115,112,120,255)
    BOOT=(34,33,35,255)
    BOOT_L=(92,88,87,255)
    native=atlas.crop((64,0,128,80))
    def foot(i,far):
        base=25 if far else 42
        start,end=(2,8) if far else (8,12)
        if i<start: progress=0.0
        elif i>=end: progress=1.0
        else:
            raw=(i-start)/(end-start)
            progress=raw*raw*(3-2*raw)
        displacement=26*progress
        swing=0 if i<start or i>=end else round(6*math.sin(math.pi*(i-start)/(end-start)))
        return round(base+displacement-ROOT[i]),74-swing,swing
    def boot(draw,x,y,far):
        col=BOOT if far else DARK
        draw.rectangle((x-3,y-4,x+2,y-1),fill=LINE)
        draw.rectangle((x-2,y-3,x+2,y-1),fill=col)
        draw.rectangle((x-4,y-1,x+5,y),fill=LINE)
        draw.rectangle((x-2,y-1,x+4,y-1),fill=col)
        draw.line((x,y-3,x+3,y-3),fill=BOOT_L,width=1)
    def body(i):
        bob=(0,0,-1,-1,0,0,-1,-1,0,0,-1,0,0,-1,-1,0)[i]
        frame=Image.new("RGBA",(64,80))
        torso=native.crop((0,0,64,55))
        frame.alpha_composite(torso,(0,bob))
        paint=Image.new("RGBA",(64,80))
        d=ImageDraw.Draw(paint)
        fx,fy,fl=foot(i,True);nx,ny,nl=foot(i,False)
        # Far leg is visible underneath the split hem.
        d.line(((30,58),(fx,fy-3)),fill=LINE,width=7)
        d.line(((30,58),(fx,fy-3)),fill=DARK,width=5)
        # Long robe moves in response to stepping feet, revealing only the boot tips.
        sway=round(2*math.sin(math.tau*i/16))
        left=17+sway
        center=31+sway
        right=48+sway
        d.polygon(((25,53),(38,53),(center+2,61),
                   (center+2,70),(center-2,73),
                   (left+3,73),(left,67),(20+sway,60)),fill=LINE)
        d.polygon(((26,55),(37,55),(center,62),
                   (center,70),(center-2,72),
                   (left+4,71),(left+2,66),(22+sway,61)),fill=LIT)
        d.polygon(((24+sway,62),(center,67),(center-1,72),
                   (left+5,71),(left+3,64)),fill=SHADE)
        boot(d,fx,fy,True)
        # Near leg comes forward and crosses the back of the cloak.
        d.line(((37,58),(nx,ny-4)),fill=LINE,width=8)
        d.line(((37,58),(nx,ny-4)),fill=SHADE,width=6)
        # Front right robe panel, parted by the step and dragged behind it.
        hem=round(2*math.sin(math.tau*(i-3)/16))
        d.polygon(((34,54),(43,54),(46+hem,61),
                   (right+2+hem,71),(right-1+hem,74),
                   (37+hem,72),(33+hem,65)),fill=LINE)
        d.polygon(((35,55),(42,55),(44+hem,61),
                   (right+hem,70),(right-2+hem,73),
                   (38+hem,71),(34+hem,63)),fill=SHADE)
        d.polygon(((36,57),(40,57),(42+hem,63),
                   (42+hem,69),(38+hem,69)),fill=LIT)
        boot(d,nx,ny,False)
        # A few swinging creases, never flip or rotate original pixels.
        d.line(((center-4,61),(center-2,66)),fill=SHADE,width=1)
        frame=Image.alpha_composite(frame,paint)
        return frame,(fx,fy,fl),(nx,ny,nl)
    frames=[];events=[]
    for i in range(16):
        base,far,near=body(i)
        frame,event=ns["paint_staff_and_arm"](base,i)
        event["sourceRunFrame"]=1;event["farFoot"]=far;event["nearFoot"]=near
        assert event["elbow"][0]<event["hand"][0] and event["hand"][1]<event["elbow"][1]
        if 4<=i<=12:assert event["worldTipX"]==61 and event["tipGrounded"]
        frames.append(frame);events.append(event)
    zoom=[f.resize((256,320),Image.Resampling.NEAREST) for f in frames]
    contact=Image.new("RGBA",(4*260,4*355),(24,25,32,255))
    cd=ImageDraw.Draw(contact)
    for i,f in enumerate(zoom):
        x=(i%4)*260;y=(i//4)*355
        contact.alpha_composite(f,(x,y+28))
        cd.text((x+10,y+8),f"{i:02d}: {STEPS[i][4]} / {'far' if events[i]['farFoot'][2] else 'near' if events[i]['nearFoot'][2] else 'contact'}",fill=(225,225,224,255))
    sequence=[]
    for i,f in enumerate(zoom):
        xoff=ROOT[i]*4
        s=Image.new("RGBA",(436,352),(24,25,32,255))
        sd=ImageDraw.Draw(s)
        sd.line(((0,28+74*4),(435,28+74*4)),fill=(98,111,99,255),width=1)
        s.alpha_composite(f,(22+xoff,28))
        sd.text((12,7),f"16-key walk study v004   frame {i:02d} - {STEPS[i][4]}",fill=(238,233,228,255))
        sequence.append(s.convert("RGB"))

    return frames, events, contact, sequence


def write_study(out: Path, source: Path = SOURCE) -> dict:
    """Create a new isolated visual study; never overwrite a prior review."""
    if out.exists():
        raise FileExistsError(f"Refusing to overwrite an existing review: {out}")
    frames, events, contact, sequence = render(source)
    out.mkdir(parents=True)
    atlas = Image.new("RGBA", (16 * CELL[0], CELL[1]))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, (index * CELL[0], 0))
    atlas.save(out / "staff-assisted-walk-16f-64x80.png")
    contact.save(out / "staff-walk-16-key-contact.png")
    sequence[0].save(
        out / "staff-walk-world-space-once.gif", format="GIF",
        save_all=True, append_images=sequence[1:], duration=125, optimize=True
    )
    inplace = []
    for index, frame in enumerate(frames):
        board = Image.new("RGBA", (320, 350), (24, 25, 32, 255))
        board_draw = ImageDraw.Draw(board)
        board_draw.line(((0, 306), (319, 306)), fill=(92, 106, 96, 255))
        board.alpha_composite(frame.resize((256, 320), Image.Resampling.NEAREST), (32, 10))
        board_draw.text((10, 328), f"Staff walk v004 - key {index:02d}", fill=(235, 230, 222, 255))
        inplace.append(board.convert("RGB"))
    inplace[0].save(
        out / "staff-walk-inplace-loop.gif", format="GIF",
        save_all=True, append_images=inplace[1:], duration=125, loop=0, optimize=True
    )
    previous = Image.open(
        HERE.parent / "staff-walk-side-v003" / "staff-assisted-walk-16f-64x80.png"
    ).convert("RGBA")
    if previous.size != (16 * 64, 80):
        raise ValueError("Expected v003 16-key native side atlas for comparison")
    comparison = []
    for index, current in enumerate(frames):
        board = Image.new("RGBA", (600, 360), (24, 25, 32, 255))
        draw = ImageDraw.Draw(board)
        draw.text((16, 10), "v003 - first staff walk", fill=(234, 231, 228))
        draw.text((316, 10), "v004 - planted staff + full foot pass", fill=(234, 231, 228))
        draw.line(((0, 326), (599, 326)), fill=(92, 106, 96, 255))
        old = previous.crop(
            (index * 64, 0, (index + 1) * 64, 80)
        ).resize((256, 320), Image.Resampling.NEAREST)
        new = current.resize((256, 320), Image.Resampling.NEAREST)
        board.alpha_composite(old, (20, 30))
        board.alpha_composite(new, (320, 30))
        comparison.append(board.convert("RGB"))
    comparison[0].save(
        out / "staff-walk-v003-v004-comparison.gif", format="GIF",
        save_all=True, append_images=comparison[1:], duration=125, loop=0, optimize=True
    )
    selected = Image.new("RGB", (600, 3 * 360), (24, 25, 32))
    for row, key in enumerate((4, 9, 12)):
        selected.paste(comparison[key], (0, row * 360))
    selected.save(out / "staff-walk-selected-before-after.png")
    manifest = {
        "schema": "wyrmforge.wizard.staff-walk-study.v4",
        "status": "UNAPPROVED; longer planted staff support, foot passes tip and stronger foot visibility",
        "source": source.name,
        "cell": list(CELL),
        "rootTravelPx": [event["rootTravelPx"] for event in events],
        "frames": events,
        "groundY": GROUND_Y,
        "handedness": "right",
        "direction": "side-facing only",
        "sourceRunFrameCount": 6,
        "walkingFrameCount": len(frames),
        "approvedForGame": False,
        "schoolOverridesEnabled": False
    }
    (out / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    write_study(args.out, args.source)


if __name__ == "__main__":
    main()
