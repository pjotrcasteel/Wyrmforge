#!/usr/bin/env python3
"""Daytime *proposal* from the exact GitHub NIGHT-VACANT observatory painting.

Never regenerate architecture, mechanical doors or crystals. The midnight vacant
state is the source of those pixels; day/night-active serve only as calibrated
light references. Writes review images on the art branch, not shipped runtime.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DAY = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town/day-active.webp"
NIGHT = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town/night-active.webp"
NIGHT_VACANT = ROOT / "user_handover_files/concepts/town/night/vacant-ArcaneNexus.webp"
OUT = ROOT / "docs/art/previews/observatory-day-vacant-proposal.webp"
DETAIL = ROOT / "docs/art/previews/observatory-day-vacant-detail.webp"
MASK_OUT = ROOT / "docs/art/previews/observatory-day-vacant-mask.webp"

def load(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)

def polygon(mask, coords):
    cv2.fillPoly(mask, [np.array(coords, np.int32)], 255)

def oval(mask, x, y, rx, ry):
    cv2.ellipse(mask, (x, y), (rx, ry), 0, 0, 360, 255, -1, cv2.LINE_AA)

def main():
    d = load(DAY)
    n = load(NIGHT)
    nv = load(NIGHT_VACANT)
    assert d.shape == n.shape == nv.shape == (941,1672,3)

    # Local background-referenced daylight conversion: only the source *night
    # vacant* pixels are recoloured. No active portal/crystal artwork is used in
    # the final places covered by the mask.
    lab_n = cv2.cvtColor(n, cv2.COLOR_RGB2LAB).astype(np.float32)
    lab_d = cv2.cvtColor(d, cv2.COLOR_RGB2LAB).astype(np.float32)
    lab_v = cv2.cvtColor(nv, cv2.COLOR_RGB2LAB).astype(np.float32)
    base = cv2.GaussianBlur(lab_d - lab_n, (0,0), 21)
    base[:,:,0] = np.clip(base[:,:,0], 14, 109)
    base[:,:,1] = np.clip(base[:,:,1], -24, 30)
    base[:,:,2] = np.clip(base[:,:,2], -24, 35)
    vacant_day = cv2.cvtColor(np.clip(lab_v + base, 0,255).astype(np.uint8), cv2.COLOR_LAB2RGB)

    # Exact geometry from the night vacant painting: observatory dome,
    # door to the elemental gate, powered-or-not pillar crystals and windows.
    mask = np.zeros(d.shape[:2], np.uint8)
    polygon(mask, [(231,75),(253,58),(286,52),(328,50),(364,62),
                   (386,89),(396,131),(387,167),(358,184),(236,181),
                   (214,150),(219,103)])
    polygon(mask, [(364,221),(391,197),(449,197),(476,219),(486,273),
                   (484,341),(460,364),(376,364),(360,345),(356,280)])
    for x,y,rx,ry in [(355,300,27,49),(486,300,26,46),(475,335,22,29),
                       (338,354,28,27),(394,355,19,20)]:
        oval(mask,x,y,rx,ry)
    # Shut rooms: permanent engraved windows can remain clear but no interior
    # illumination, especially around the tower's luminous amber glass.
    for x,y,rx,ry in [(272,219,16,30),(353,216,14,27),
                       (283,303,17,37),(351,309,18,36)]:
        oval(mask,x,y,rx,ry)

    # Protect source artwork; curved anti-aliased edge makes a smooth transition
    # without involving an independent generation of a new door or dome.
    alpha = cv2.GaussianBlur(mask.astype(np.float32)/255,(0,0),3.0)
    composite = np.clip(d*(1-alpha[:,:,None])+vacant_day*alpha[:,:,None],0,255).astype(np.uint8)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(composite).save(OUT, "WEBP", quality=96, method=6)
    Image.fromarray(composite[:480,:590]).save(DETAIL,"WEBP",quality=97,method=6)
    Image.fromarray(mask).save(MASK_OUT,"WEBP",lossless=True)
    print("Saved unshipped observatory candidate:",OUT,DETAIL,MASK_OUT)

if __name__ == "__main__":
    main()
