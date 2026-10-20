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
    add_poly(mask,[(246,91),(260,80),(288,72),(326,72),(352,83),
                   (365,105),(363,137),(350,151),(258,151),(239,139)])
    # Dormant wooden double doors ONLY inside existing portal's stone arch.
    add_poly(mask,[(407,237),(424,232),(442,237),(457,252),(462,275),
                   (461,316),(447,331),(406,331),(390,312),(391,269)])
    # Inactive magic crystals: limited to the coloured cores, never stone ledges.
    for ellipse in [(351,301,10,17),(487,283,9,15),(486,334,8,12),
                    (354,348,11,11)]:
        add_ellipse(mask,*ellipse)

    # Soft <=2px antialias only. Haze happens when feathered night/day covers
    # the entire structure; no such blending of a complete building here.
    soft=cv2.GaussianBlur(mask.astype(np.float32)/255.0,(0,0),1.2)
    result=np.clip(day*(1-soft[:,:,None])+daylight_vacant*soft[:,:,None],0,255).astype(np.uint8)
    unchanged=(mask==0)
    assert np.array_equal(result[unchanged & (soft<0.0001)],day[unchanged & (soft<0.0001)])
    assert np.array_equal(result[:,700:],day[:,700:]),"The other buildings/World Gate changed!"
    assert np.any(result[:450,:550]!=day[:450,:550]),"Observatory has not changed"
    OUT.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray(result).save(OUT,"WEBP",quality=98,method=6)
    Image.fromarray(result[:475,:575]).save(DETAIL,"WEBP",quality=98,method=6)
    Image.fromarray(mask).save(MASK_OUT,"WEBP",lossless=True)
    print(f"Day-vacant preview completed, full other-town pixels unchanged. Ambient={ambient:.1f}")

if __name__=="__main__":
    main()
