#!/usr/bin/env python3
"""A NON-SHIPPING full-day Refuge proof: preserve every unedited scene pixel.

Crucial constraint: composite the *nighttime vacant Observatory mechanics* only
inside the observatory's pre-existing dome, wooden gate and power fixtures.
Never regenerate/repaint the town, move the World Gate, or affect the other
three buildings. All sources are immutable files already in GitHub.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town"
DAY = ART / "day-active.webp"
NIGHT = ART / "night-active.webp"
NIGHT_VACANT = ROOT / "user_handover_files/concepts/town/night/vacant-ArcaneNexus.webp"
OUT = ROOT / "docs/art/previews/observatory-day-vacant-proposal.webp"
DETAIL = ROOT / "docs/art/previews/observatory-day-vacant-detail.webp"
MASK_OUT = ROOT / "docs/art/previews/observatory-day-vacant-mask.webp"

def image(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)

def add_ellipse(mask,x,y,rx,ry):
    cv2.ellipse(mask,(x,y),(rx,ry),0,0,360,255,-1,cv2.LINE_AA)

def add_poly(mask,points):
    cv2.fillPoly(mask,[np.asarray(points,np.int32)],255,cv2.LINE_AA)

def main():
    day = image(DAY)
    night = image(NIGHT)
    vacant_night = image(NIGHT_VACANT)
    assert day.shape == night.shape == vacant_night.shape == (941,1672,3)

    # Lift dormant mechanics to broad daylight using only a perceptual
    # luminance shift. This is NOT the nighttime building transplanted wholesale.
    # Different ambient bounds for metal dome vs wooden gate.
    nighttime_lab = cv2.cvtColor(vacant_night,cv2.COLOR_RGB2LAB).astype(np.float32)
    night_active_lab = cv2.cvtColor(night,cv2.COLOR_RGB2LAB).astype(np.float32)
    day_active_lab = cv2.cvtColor(day,cv2.COLOR_RGB2LAB).astype(np.float32)

    # Match the daylight change measured in static neighbouring *stone and roof*
    # rather than energy-emitting pixels in the glowing active portal.
    patch_samples = [
        (slice(175,213),slice(292,337)),  # dome stone rim
        (slice(158,202),slice(155,204)),  # unpowered slate roof
        (slice(342,375),slice(288,341)),  # ordinary courtyard masonry
        (slice(352,381),slice(479,528)),  # unlit paving by stairs
    ]
    delta = np.concatenate([
        (day_active_lab[y,x,0]-night_active_lab[y,x,0]).ravel()
        for y,x in patch_samples
    ])
    ambient = float(np.clip(np.median(delta),32,82))
    # Wood and bronze should keep their hue/chroma from the original vacant art.
    lab = nighttime_lab.copy()
    lab[:,:,0] = np.clip(lab[:,:,0] + ambient,0,250)
    daylight_vacant = cv2.cvtColor(lab.astype(np.uint8),cv2.COLOR_LAB2RGB)

    # *** GEOMETRY-SPECIFIC MASKS ONLY ***
    # Inert dome: keep DAYTIME GOLD FRAME, edit ONLY dark inner glass / rings.
    # Protected exterior slate roofs and background remain original day pixels.
    mask=np.zeros(day.shape[:2],np.uint8)
    add_poly(mask,[(229,84),(239,69),(266,56),(320,53),(352,63),
                   (378,87),(380,131),(369,156),(236,157),(221,137)])
    # Dormant wooden double doors ONLY inside existing portal's stone arch.
    add_poly(mask,[(404,227),(426,215),(456,227),(479,253),(483,277),
                   (483,325),(466,347),(382,347),(375,331),
                   (377,269),(390,242)])
    # Inactive magic crystals: limited to the coloured cores, never stone ledges.
    for ellipse in [(352,292,18,31),(488,287,16,24),(489,333,17,22),
                    (352,353,15,15),(381,337,13,17),(500,345,14,13)]:
        add_ellipse(mask,*ellipse)

    # Soft <=2px antialias only. Haze happens when feathered night/day covers
    # the entire structure; no such blending of a complete building here.
    soft=cv2.GaussianBlur(mask.astype(np.float32)/255.0,(0,0),1.2)
    blended=np.clip(np.rint(day*(1-soft[:,:,None])+daylight_vacant*soft[:,:,None]),0,255).astype(np.uint8)
    result=day.copy()
    touched=soft>0.002
    result[touched]=blended[touched]
    assert np.array_equal(result[~touched],day[~touched])
    assert np.array_equal(result[:,700:],day[:,700:]),"The other buildings/World Gate changed!"
    assert np.any(result[:450,:550]!=day[:450,:550]),"Observatory has not changed"
    OUT.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray(result).save(OUT,"WEBP",quality=98,method=6)
    Image.fromarray(result[:475,:575]).save(DETAIL,"WEBP",quality=98,method=6)
    Image.fromarray(mask).save(MASK_OUT,"WEBP",lossless=True)
    print(f"Day-vacant preview completed, full other-town pixels unchanged. Ambient={ambient:.1f}")

if __name__=="__main__":
    main()
