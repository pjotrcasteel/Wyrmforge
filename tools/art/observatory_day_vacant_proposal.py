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

    # Daylight recolouring is not global. Learn the wood correction directly
    # from the same small, unchanged wooden entry in both registered panoramas.
    # Likewise, the dome is unpowered metal/glass, never purple light.
    def daylit(reference_night,reference_day,source):
        n=reference_night.reshape(-1,3).astype(np.float32)
        d=reference_day.reshape(-1,3).astype(np.float32)
        valid=(n[:,0]>20)&(d[:,0]>20)
        shift=np.median(d[valid]-n[valid],axis=0)
        return np.clip(source.astype(np.float32)+np.clip(shift,[-35,-30,-30],[85,35,35]),0,255).astype(np.uint8)
    wood=daylit(
        nighttime_lab[285:345,150:193],
        day_active_lab[285:345,150:193],
        nighttime_lab)
    glass=daylit(
        nighttime_lab[110:142,180:212],
        day_active_lab[110:142,180:212],
        nighttime_lab)
    donor_wood=cv2.cvtColor(wood,cv2.COLOR_LAB2RGB)
    donor_glass=cv2.cvtColor(glass,cv2.COLOR_LAB2RGB)

    # Intrinsic details only: existing DAY scene owns the outer walls, paving,
    # banners, roofs, golden metal frame and stone arch. The source night-vacant
    # owns the inert glass + real closed WOODEN gate.
    dome=np.zeros(day.shape[:2],np.uint8)
    add_poly(dome,[(234,88),(253,74),(274,64),(325,62),(347,74),
                   (365,91),(365,133),(346,149),(244,148),(228,128)])
    door=np.zeros(day.shape[:2],np.uint8)
    add_poly(door,[(409,250),(422,240),(439,244),(452,256),
                   (459,280),(458,317),(441,332),(408,333),
                   (395,320),(395,281)])
    crystals=np.zeros(day.shape[:2],np.uint8)
    for ell in [(350,295,9,16),(486,283,9,16),(487,331,11,13),
                (354,345,12,11),(380,336,8,10)]:
        add_ellipse(crystals,*ell)
    mask=cv2.max(cv2.max(dome,door),crystals)
    alpha_d=cv2.GaussianBlur(dome.astype(np.float32)/255.0,(0,0),1.35)
    alpha_w=cv2.GaussianBlur(door.astype(np.float32)/255.0,(0,0),1.45)
    alpha_c=cv2.GaussianBlur(crystals.astype(np.float32)/255.0,(0,0),1.1)
    # For crystal surfaces, use inert-night pixels with daytime reference
    # brightness. Power-state is geometry, not a brightness overlay.
    result=day.astype(np.float32)
    for alpha,donor in [(alpha_d,donor_glass),(alpha_w,donor_wood),(alpha_c,donor_glass)]:
        selection=alpha>0.003
        result[selection]=(result[selection]*(1-alpha[selection,None])+
                           donor[selection]*(alpha[selection,None]))
    result=np.clip(np.rint(result),0,255).astype(np.uint8)
    touched=(alpha_d+alpha_w+alpha_c)>0.003
    assert np.array_equal(result[~touched],day[~touched])
    assert np.array_equal(result[:,700:],day[:,700:]),"Another town district changed!"
    assert np.any(result[:450,:550]!=day[:450,:550])
    OUT.parent.mkdir(parents=True,exist_ok=True)
    Image.fromarray(result).save(OUT,"WEBP",quality=98,method=6)
    Image.fromarray(result[:475,:575]).save(DETAIL,"WEBP",quality=98,method=6)
    Image.fromarray(mask).save(MASK_OUT,"WEBP",lossless=True)
    print("Day-vacant review rendered, other-town pixels unchanged.")

if __name__=="__main__":
    main()
