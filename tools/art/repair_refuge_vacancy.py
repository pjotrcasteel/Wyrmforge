#!/usr/bin/env python3
"""Rebuild the *runtime* Refuge vacant paintings from the registered panorama.

The former patches came from four independently synthesized panoramas: doors,
brickwork and people did not register with the shared base, and "vacant" flames,
smoke and magic remained visible. Never replace the eight approved source PNGs.

Instead, work on the exact day/night base pixels. Change only the in-world
powered fixtures, make a sparse alpha plate of those changed pixels, and keep
the building's geometry, scenery and entrances byte-for-byte registered.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town"
CROP = {
    "ArcaneNexus": (0, 0, 618, 582),
    "Blacksmith": (0, 353, 633, 941),
    "Codex": (982, 0, 1672, 548),
    "HallOfFame": (866, 333, 1672, 941),
}


def mask_ellipse(size, cx, cy, rx, ry, softness=4):
    mask = np.zeros((size[1], size[0]), np.uint8)
    cv2.ellipse(mask, (cx, cy), (rx, ry), 0, 0, 360, 255, -1, cv2.LINE_AA)
    if softness:
        mask = cv2.GaussianBlur(mask, (0, 0), softness)
    return mask.astype(np.float32) / 255


def mask_polygon(size, points, softness=3):
    mask = np.zeros((size[1], size[0]), np.uint8)
    cv2.fillPoly(mask, [np.array(points, np.int32)], 255)
    if softness:
        mask = cv2.GaussianBlur(mask, (0, 0), softness)
    return mask.astype(np.float32) / 255


def apply_masked(current, replacement, mask):
    weight = mask[..., None]
    return np.clip(current.astype(np.float32) * (1 - weight)
                   + replacement.astype(np.float32) * weight, 0, 255).astype(np.uint8)


def mute_luminescence(rgb, region, *, night, magic=False):
    """Remove emitted light in the artwork (not a CSS dark layer).

    All spatial data derives from the same source panorama. Preserve non-glowing
    stone, carved metal, blue banners and wood even inside fixture envelopes.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    if magic:
        # Saturated violet/blue emissive glass and cyan cores, not golden metal.
        colored = (hue >= 90) & (hue <= 164) & (sat > 53)
        glow = colored.astype(np.float32) * region
        hsv[..., 1] *= 1 - glow * .76
        hsv[..., 2] *= 1 - glow * (.68 if night else .57)
        # The white-hot center has low saturation but must also be powered down.
        white_core = (val > 195) & (sat <= 68)
        hsv[..., 2] *= 1 - white_core.astype(np.float32) * region * (.47 if night else .37)
    else:
        # Lit orange/yellow parts of windows, candles and forge light.
        warm = ((hue < 27) | (hue > 175)) & (sat > 65) & (val > (85 if night else 135))
        glow = warm.astype(np.float32) * region
        hsv[..., 1] *= 1 - glow * .45
        hsv[..., 2] *= 1 - glow * (.72 if night else .52)
    modified = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)
    # HSV roundtrips change unrelated pixels by 1-3 levels; never include those
    # in an alpha patch. Only the explicit painted fixture mask may change.
    return apply_masked(rgb, modified, region)


def paint(base, building, night):
    width, height = base.shape[1], base.shape[0]
    canvas = base.copy()
    size = (width, height)

    def light(cx, cy, rx, ry, *, magic=False):
        nonlocal canvas
        mask = mask_ellipse(size, cx, cy, rx, ry, 3)
        canvas = mute_luminescence(canvas, mask, night=night, magic=magic)

    def erase(points, radius=5, softness=2):
        nonlocal canvas
        # Content-aware repair of a particular fixture, then softly matte to
        # original. The surrounding wall/sky is sampled from the SAME scene.
        region = mask_polygon(size, points, 0)
        solid = (region * 255).astype(np.uint8)
        repaired = cv2.cvtColor(cv2.inpaint(cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR),
                                           solid, radius, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)
        canvas = apply_masked(canvas, repaired, mask_polygon(size, points, softness))

    def replace_from_neighbour(points, *, offset_x, darkness=1.0, softness=3):
        nonlocal canvas
        # Copy actual neighbouring texture at full pixel detail rather than
        # content-aware blurring into an undifferentiated brown/grey patch.
        donor = np.roll(base, -offset_x, axis=1)
        if darkness != 1.0:
            donor = np.clip(donor.astype(np.float32) * darkness, 0, 255).astype(np.uint8)
        canvas = apply_masked(canvas, donor, mask_polygon(size, points, softness))

    if building == "ArcaneNexus":
        # Fixed illustrated steam must vanish while the Nexus is unoccupied.
        # No empty-place smoke, no powered observatory or violet/blue portal.
        replace_from_neighbour([(103, 51), (150, 51), (168, 110), (111, 115)], offset_x=-67, softness=5)
        light(303, 125, 86, 72, magic=True)
        light(432, 301, 44, 67, magic=True)
        for entry in [(359, 295, 17, 27), (490, 286, 17, 27),
                      (235, 364, 20, 18), (275, 233, 21, 40),
                      (351, 235, 22, 38)]:
            light(*entry, magic=True)
        for entry in [(92, 232, 15, 23), (195, 348, 24, 28),
                      (43, 270, 20, 28)]:
            light(*entry)
    elif building == "Blacksmith":
        # Actual forged embers, not merely the bright halo around them.
        # Repair the chimney plume from the roof behind the vacant workshop.
        replace_from_neighbour([(109, 425), (163, 423), (175, 481), (112, 486)], offset_x=-70, softness=5)
        # The fire is *inside* the forge cavity; retain brick arches and the anvil.
        # Transfer adjacent intact dark workshop masonry; a generic inpaint
        # blurred the hearth into a brown amorphous hole.
        replace_from_neighbour([(155, 657), (180, 650), (211, 653),
                                (229, 689), (217, 707), (155, 710)],
                               offset_x=-84, darkness=.52 if night else .66, softness=3)
        for entry in [(186, 686, 38, 40), (298, 659, 20, 28),
                      (394, 647, 18, 29), (453, 661, 18, 25),
                      (54, 670, 23, 43), (324, 628, 24, 28)]:
            light(*entry)
    elif building == "Codex":
        # Original wooden doors and masonry stay in registration: no extra
        # generated doorway is pasted on top of the panorama.
        for entry in [(1301, 353, 26, 39), (1430, 352, 24, 45),
                      (1208, 294, 19, 28), (1261, 204, 26, 35),
                      (1543, 280, 18, 25), (1607, 304, 18, 24)]:
            light(*entry)
    elif building == "HallOfFame":
        # A vacant Hall has shut, unilluminated doors. No open illuminated
        # portal or separately regenerated warped stone arch is blended in.
        for entry in [(1291, 662, 35, 60), (1253, 557, 22, 36),
                      (1335, 557, 21, 37), (1479, 559, 24, 44),
                      (1588, 700, 22, 43), (1130, 646, 19, 32)]:
            light(*entry)
        # The hallucinated black silhouette drawn across the wooden Hall door
        # is repaired from the neighbouring door texture only for the VACANT
        # variant. No human silhouettes should be baked into an empty Hall.
        # Mirror the undamaged left-hand wooden door planks across the hinge,
        # not a smeared inpainting circle or a separately generated doorway.
        left = canvas[626:708, 1290:1310].copy()
        mirrored = cv2.resize(np.flip(left, axis=1), (25, 82),
                              interpolation=cv2.INTER_LINEAR)
        repaired = canvas.copy()
        repaired[626:708, 1310:1335] = mirrored
        canvas = apply_masked(canvas, repaired,
                              mask_polygon(size, [(1310, 628), (1327, 633),
                                                  (1330, 697), (1310, 705)], 2))
    else:
        raise ValueError(building)

    # Sparse feathered layer derived from pixel differences on ONE registered
    # base. No panorama stitching, external source backgrounds, night rectangles,
    # black CSS overlays or shifting entrances.
    changed = np.max(np.abs(canvas.astype(np.int16) - base.astype(np.int16)), axis=2)
    alpha = np.clip((changed.astype(np.float32) - 2) * 38, 0, 255).astype(np.uint8)
    # Avoid one-pixel holes while retaining unchanged backdrop as transparent.
    alpha = cv2.GaussianBlur(alpha, (3, 3), .7)
    alpha[changed < 3] = 0
    x0, y0, x1, y1 = CROP[building]
    patch = np.dstack([canvas[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
    return Image.fromarray(patch, "RGBA")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    previews = ROOT / "docs/art/previews"
    previews.mkdir(parents=True, exist_ok=True)
    for mode in ("day", "night"):
        with Image.open(ART / f"{mode}-active.webp") as opened:
            src = np.array(opened.convert("RGB"))
        visual = Image.fromarray(src, "RGB").convert("RGBA")
        assert src.shape == (941, 1672, 3)
        for building, (x0, y0, x1, y1) in CROP.items():
            path = ART / (f"day-vacant-{building}.webp" if mode == "day"
                          else f"night-vacant-{building}.png")
            if not args.verify:
                patch = paint(src, building, mode == "night")
                if mode == "day":
                    patch.save(path, format="WEBP", lossless=True, method=6)
                else:
                    patch.save(path, format="PNG", optimize=True)
            with Image.open(path) as output:
                assert output.size == (x1 - x0, y1 - y0), path
                assert output.mode == "RGBA", path
                alpha = np.array(output.getchannel("A"))
                assert alpha.max() == 255 and np.count_nonzero(alpha) > 500, path
                assert np.count_nonzero(alpha) < .37 * alpha.size, f"Too much of {building} edited"
            print(f"{mode} {building}: registered sparse vacancy plate OK")
            with Image.open(path) as raw_layer:
                visual.alpha_composite(raw_layer.convert("RGBA"), dest=(x0, y0))
        if not args.verify:
            visual.convert("RGB").save(previews / f"refuge-{mode}-all-vacant.webp",
                                       format="WEBP", quality=94, method=6)



if __name__ == "__main__":
    main()
