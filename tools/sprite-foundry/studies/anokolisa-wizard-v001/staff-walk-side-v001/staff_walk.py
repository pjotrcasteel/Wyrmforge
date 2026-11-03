#!/usr/bin/env python3
"""Unapproved side-view staff-contact study on the licensed Wizard pixel base.

This source is an inspection aid: the six artist-authored RUN frames are not
a walk, so neither this 12-key timing interpolation nor the new arm can yet
be treated as a finished staff-assisted gait or eight-direction animation.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
CELL = (64, 80)
ANCHOR = (32, 74)
COLORS = {
    "outline": (20, 20, 18, 255),
    "sleeveDark": (52, 52, 60, 255),
    "sleeve": (75, 74, 82, 255),
    "sleeveLight": (115, 112, 120, 255),
    "skin": (240, 154, 83, 255),
    "skinDark": (128, 74, 30, 255),
    "woodDark": (71, 40, 13, 255),
    "wood": (129, 79, 41, 255),
    "woodLight": (181, 108, 48, 255),
}
# (hand x/y, staff-tip x/y, contact phase)
STEPS = [
    (47, 42, 50, 65, "advance"),
    (49, 42, 55, 69, "advance"),
    (50, 42, 58, 74, "plant"),
    (50, 43, 57, 74, "plant"),
    (49, 44, 55, 74, "support"),
    (48, 45, 53, 74, "support"),
    (47, 46, 50, 74, "passing"),
    (46, 46, 48, 74, "passing"),
    (45, 45, 45, 74, "behind"),
    (45, 44, 43, 70, "release"),
    (46, 43, 46, 65, "advance"),
    (47, 42, 48, 64, "advance"),
]
# Sprite-relative motion needed to keep the planted tip at one world X.
ROOT_TRAVEL_PX = (0, 0, 0, 1, 3, 5, 8, 10, 13, 14, 14, 14)


def straight_top(hand: tuple[int,int], tip: tuple[int,int], y: int=11) -> tuple[int,int]:
    hx,hy=hand
    tx,ty=tip
    if ty<=hy:
        raise ValueError("staff tip must be lower than hand")
    return (round(hx+(tx-hx)*(y-hy)/(ty-hy)),y)


def crop_run(atlas: Image.Image) -> list[Image.Image]:
    if atlas.mode!="RGBA" or atlas.size!=(384,80):
        raise ValueError("Expected the artist's 6-frame 64x80 native source")
    return [atlas.crop((i*64,0,(i+1)*64,80)) for i in range(6)]


def paint_staff_and_arm(base: Image.Image, step: int) -> tuple[Image.Image, dict]:
    if base.mode!="RGBA" or base.size!=CELL:
        raise ValueError("expected one native RGBA Wizard pose")
    hx,hy,tx,ty,phase=STEPS[step]
    tip=(tx,ty)
    hand=(hx,hy)
    top=straight_top(hand,tip)
    frame=base.copy()
    wood=Image.new("RGBA",CELL,(0,0,0,0))
    d=ImageDraw.Draw(wood)
    # One geometric line for the entire shaft. No segmented bent staff.
    d.line((top,tip),fill=COLORS["outline"],width=5)
    d.line((top,tip),fill=COLORS["woodDark"],width=3)
    d.line((top,tip),fill=COLORS["wood"],width=2)
    # Sparse left-edge grain; do not invent glowing world light.
    for yy in (17,27,36,53,63):
        if top[1]<yy<tip[1]-3:
            xx=round(top[0]+(tip[0]-top[0])*(yy-top[1])/(tip[1]-top[1]))
            d.point((xx-1,yy),fill=COLORS["woodLight"])
    d.ellipse((top[0]-2,top[1]-2,top[0]+2,top[1]+2),
              fill=COLORS["outline"])
    d.rectangle((top[0]-1,top[1]-1,top[0]+1,top[1]+1),
                fill=COLORS["wood"])
    frame=Image.alpha_composite(frame,wood)

    # The right upper arm drops from shoulder to elbow. Forearm projects
    # forward/up to a higher gripping hand. Never place elbow ahead of grip.
    elbow=(33,49 + (1 if step in (4,5,6,7) else 0))
    shoulder=(29,42)
    arm=Image.new("RGBA",CELL,(0,0,0,0))
    a=ImageDraw.Draw(arm)
    a.line((shoulder,elbow),fill=COLORS["outline"],width=8)
    a.line((elbow,hand),fill=COLORS["outline"],width=8)
    a.line((shoulder,elbow),fill=COLORS["sleeveDark"],width=6)
    a.line((elbow,hand),fill=COLORS["sleeve"],width=5)
    a.line(((elbow[0],elbow[1]-1),(hx-4,hy)),fill=COLORS["sleeveLight"],width=2)
    a.ellipse((elbow[0]-2,elbow[1]-2,elbow[0]+2,elbow[1]+2),
              fill=COLORS["sleeve"])
    # Contrasting cuff, knuckles and a shaft pixel between wrapped fingers.
    a.line(((hx-6,hy),(hx-3,hy)),fill=COLORS["sleeveDark"],width=4)
    a.rectangle((hx-3,hy-3,hx+2,hy+2),fill=COLORS["outline"])
    a.rectangle((hx-2,hy-2,hx+1,hy+1),fill=COLORS["skin"])
    a.point((hx+1,hy+1),fill=COLORS["skinDark"])
    a.line(((hx,hy-1),(hx,hy+2)),fill=COLORS["wood"],width=1)
    frame=Image.alpha_composite(frame,arm)
    return frame, {
        "frame":step, "sourceRunFrame":min(5,(step*6)//12),
        "hand":list(hand),"elbow":list(elbow),
        "shoulder":list(shoulder),"tip":list(tip),"top":list(top),
        "phase":phase,"tipGrounded":ty==74,
        "rootTravelPx":ROOT_TRAVEL_PX[step],
        "worldTipX":tx+ROOT_TRAVEL_PX[step]
    }


def render(atlas: Image.Image) -> tuple[list[Image.Image],list[dict]]:
    bases=crop_run(atlas)
    frames=[]
    events=[]
    for step in range(12):
        source_index=min(5,(step*6)//12)
        frame,metadata=paint_staff_and_arm(bases[source_index],step)
        assert metadata["elbow"][0]<metadata["hand"][0]
        assert metadata["hand"][1]<metadata["elbow"][1]
        assert metadata["tip"][1] in (64,65,69,70,74)
        frames.append(frame)
        events.append(metadata)
    return frames,events


def contact_sheet(frames: list[Image.Image],events: list[dict]) -> Image.Image:
    columns=4
    cell_w=256
    cell_h=370
    out=Image.new("RGB",(columns*cell_w,3*cell_h),(24,25,32))
    draw=ImageDraw.Draw(out)
    for i,(frame,event) in enumerate(zip(frames,events,strict=True)):
        x=(i%columns)*cell_w
        y=(i//columns)*cell_h
        draw.rectangle((x+3,y+4,x+252,y+359),fill=(33,34,43))
        sprite=frame.resize((256,320),Image.Resampling.NEAREST)
        out.paste(sprite,(x,y+30),sprite)
        draw.text((x+12,y+10),f"{i:02d} {event['phase'].upper()}",
                  fill=(234,234,229))
        if event["tipGrounded"]:
            draw.line((x+8,y+30+74*4,x+248,y+30+74*4),
                      fill=(90,112,97),width=1)
    return out



def world_space_frame(frame: Image.Image, event: dict) -> Image.Image:
    """One-cycle physics proof: root advances, contact tip stays world-fixed."""
    out = Image.new("RGBA", (480, 340), (24, 25, 32, 255))
    draw = ImageDraw.Draw(out)
    draw.line(((0, 296), (479, 296)), fill=(70, 79, 76, 255), width=1)
    x = 32 + event["rootTravelPx"] * 4
    zoom = frame.resize((256, 320), Image.Resampling.NEAREST)
    out.alpha_composite(zoom, (x, 0))
    if event["tipGrounded"]:
        tip_world = x + event["tip"][0] * 4
        draw.ellipse((tip_world - 2, 294, tip_world + 2, 298),
                     fill=(137, 197, 142, 255))
    draw.text((308, 12), f"{event['frame']:02d} {event['phase']}",
              fill=(240, 237, 230, 255))
    return out.convert("RGB")


def atlas_from_frames(frames: list[Image.Image]) -> Image.Image:
    result = Image.new("RGBA", (len(frames) * CELL[0], CELL[1]))
    for index, frame in enumerate(frames):
        result.alpha_composite(frame, (index * CELL[0], 0))
    return result


def write_study(source: Path, output: Path) -> dict:
    """Create isolated review artifacts. Never modify the artist's source."""
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite an art review: {output}")
    source_atlas = Image.open(source).convert("RGBA")
    frames, events = render(source_atlas)
    output.mkdir(parents=True)
    atlas_from_frames(frames).save(output / "staff-side-12f-64x80.png")
    contact_sheet(frames, events).save(output / "staff-contact-12-keys.png")
    animated = [
        frame.resize((256, 320), Image.Resampling.NEAREST)
        for frame in frames
    ]
    animated[0].save(
        output / "staff-side-12-keys.gif", format="GIF", save_all=True,
        append_images=animated[1:], duration=105, loop=0, optimize=True
    )
    world = [
        world_space_frame(frame, event)
        for frame, event in zip(frames, events, strict=True)
    ]
    world[0].save(
        output / "staff-ground-contact-once.gif", format="GIF",
        save_all=True, append_images=world[1:],
        duration=105, optimize=True
    )
    manifest = {
        "schema": "wyrmforge.wizard.staff-contact-study.v1",
        "status": "UNAPPROVED; run-frame timing study, NOT a finished walk",
        "source": source.name,
        "cell": list(CELL),
        "feetAnchor": list(ANCHOR),
        "direction": "one side-facing candidate only",
        "sourceRunFrameCount": 6,
        "contactStudyFrameCount": len(frames),
        "groundY": 74,
        "handedness": "right-hand staff",
        "canonicalPlantWorldTipX": 58,
        "events": events,
        "approvedForGame": False,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source", type=Path, default=HERE.parent / "run-side-grey-6f-64x80.png"
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    write_study(args.source, args.out)


if __name__ == "__main__":
    main()
