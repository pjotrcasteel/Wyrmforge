#!/usr/bin/env python3
"""Builds the WyrmForge gothic forest sprite kit from the Pixel Crawler Free Pack (Anokolisa).

The pack's terms (see art/source/environment/forest/README.md) allow commercial use without credit. We reuse its tree silhouettes and
rock/shrub shapes and recolour every pixel into WyrmForge's cold, dark, weathered palette, in four Wyrm Influence states:
live -> dry -> dead -> charred. Output: one RGBA atlas plus a JSON manifest of rectangles and foot anchors.

    python tools/art/build_gothic_forest_kit.py <path-to-extracted-pack-root> [out-dir]
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image

PACK = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'Wyrmforge.Presentation.Web', 'wwwroot', 'art', 'environment', 'forest')
STATIC = os.path.join(PACK, 'Environment', 'Props', 'Static')

def sheet(path):
    return Image.open(os.path.join(STATIC, path)).convert('RGBA')

def crop(img, x, y, w, h):
    c = img.crop((x, y, x + w, y + h))
    box = c.getbbox()
    return c.crop(box) if box else None

# --- recolouring: one transform per unique colour keeps the pixel ramps intact ---------------------------------------------------
def remap(img, fn):
    a = np.array(img)
    flat = a.reshape(-1, 4)
    cache = {}
    for i in range(flat.shape[0]):
        if flat[i, 3] == 0: continue
        key = (flat[i, 0], flat[i, 1], flat[i, 2])
        if key not in cache:
            h, s, v = colorsys.rgb_to_hsv(*(k / 255 for k in key))
            h, s, v = fn(h, s, v)
            cache[key] = tuple(int(round(c * 255)) for c in colorsys.hsv_to_rgb(h % 1, min(1, max(0, s)), min(1, max(0, v))))
        flat[i, :3] = cache[key]
    return Image.fromarray(flat.reshape(a.shape))

def is_foliage(h, s):
    return 0.14 <= h <= 0.62 and s > 0.22

def live(h, s, v):
    if is_foliage(h, s):
        return 0.45 + (h - 0.40) * 0.35, min(0.42, s * 0.42), 0.06 + (v ** 1.4) * 0.46
    return 0.07 + (h - 0.07) * 0.3, s * 0.42, v * 0.62

def dry(h, s, v):
    if h < 0.14 or is_foliage(h, s):
        return 0.095 + min(0.04, abs(h - 0.09) * 0.2), min(0.40, s * 0.38), 0.06 + (v ** 1.3) * 0.44
    return 0.07, s * 0.40, v * 0.60

def dead(h, s, v):
    return 0.07 + (h - 0.07) * 0.2, s * 0.26, v * 0.52

def charred_base(h, s, v):
    return 0.06, s * 0.12, v * 0.30

def ember_pass(img, share=0.035):
    a = np.array(img)
    lum = a[..., :3].astype(float).sum(axis=2)
    opaque = a[..., 3] > 0
    if not opaque.any(): return img
    cut = np.percentile(lum[opaque], 100 - share * 100 * 1.8)
    ys, xs = np.nonzero(opaque & (lum >= cut))
    for y, x in zip(ys, xs):
        if (x * 7 + y * 13 + x * y) % 3 == 0:
            a[y, x, :3] = (200, 78, 26) if (x + y) % 2 else (150, 44, 18)
    return Image.fromarray(a)

# --- source catalogue -------------------------------------------------------------------------------------------------------------
M01_5, M01_4 = sheet(r'Trees\Model_01\Size_05.png'), sheet(r'Trees\Model_01\Size_04.png')
M02_5, M02_4 = sheet(r'Trees\Model_02\Size_05.png'), sheet(r'Trees\Model_02\Size_04.png')
M03_5, M03_4 = sheet(r'Trees\Model_03\Size_05.png'), sheet(r'Trees\Model_03\Size_04.png')

MODELS = {
    # name: (sheet, live cells, dry cells (None = recolour live), bare cell, stump cell)
    'conifer_l': (M02_5, [(0, 0, 96, 160), (96, 0, 96, 160), (0, 160, 96, 160), (96, 160, 96, 160)], None, (192, 0, 96, 160), (228, 271, 21, 18)),
    'conifer_s': (M02_4, [(0, 0, 64, 112), (64, 0, 64, 112), (0, 112, 64, 112), (64, 112, 64, 112)], None, (128, 0, 64, 112), (151, 192, 19, 32)),
    'oak_l': (M01_5, [(0, 0, 112, 160), (112, 0, 112, 160)], [(0, 160, 112, 160), (112, 160, 112, 160)], (224, 0, 112, 160), (22, 325, 63, 43)),
    'oak_s': (M01_4, [(0, 0, 80, 128), (80, 0, 83, 128)], [(0, 128, 80, 128), (80, 128, 83, 128)], (163, 0, 80, 128), (326, 7, 32, 27)),
    'pine_l': (M03_5, [(0, 0, 128, 256), (128, 0, 128, 256)], [(0, 256, 128, 256), (128, 256, 128, 256)], (256, 0, 128, 256), (303, 457, 29, 24)),
    'pine_s': (M03_4, [(0, 0, 96, 208), (96, 0, 97, 208)], [(0, 208, 96, 208), (96, 208, 97, 208)], (200, 0, 100, 208), (229, 362, 19, 23)),
}

sprites = []  # (name, image)
for model, (img, live_cells, dry_cells, bare_cell, stump_cell) in MODELS.items():
    for i, cell in enumerate(live_cells):
        c = crop(img, *cell)
        sprites.append((f'tree.{model}.live.{i}', remap(c, live)))
    for i, cell in enumerate(dry_cells or live_cells):
        c = crop(img, *cell)
        sprites.append((f'tree.{model}.dry.{i}', remap(c, dry)))
    bare = crop(img, *bare_cell)
    sprites.append((f'tree.{model}.dead.0', remap(bare, dead)))
    sprites.append((f'tree.{model}.charred.0', ember_pass(remap(bare, charred_base))))
    stump = crop(img, *stump_cell)
    sprites.append((f'stump.{model}.live', remap(stump, dead)))
    sprites.append((f'stump.{model}.charred', ember_pass(remap(stump, charred_base), 0.08)))

# --- atlas ------------------------------------------------------------------------------------------------------------------------
sprites.sort(key=lambda s: -s[1].height)
ATLAS_W, PAD = 1024, 2
x = y = shelf = 0
placed = []
for name, im in sprites:
    if x + im.width + PAD > ATLAS_W:
        x, y, shelf = 0, y + shelf + PAD, 0
    placed.append((name, im, x, y))
    x += im.width + PAD
    shelf = max(shelf, im.height)
atlas = Image.new('RGBA', (ATLAS_W, y + shelf + PAD), (0, 0, 0, 0))
manifest = {}
for name, im, px, py in placed:
    atlas.alpha_composite(im, (px, py))
    a = np.array(im)
    bottom = np.nonzero(a[-3:, :, 3] > 0)[1]
    anchor_x = int(round(bottom.mean())) if bottom.size else im.width // 2
    manifest[name] = {'x': px, 'y': py, 'w': im.width, 'h': im.height, 'ax': anchor_x, 'ay': im.height - 1}

os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'forest-kit.png'), optimize=True)
with open(os.path.join(OUT, 'forest-kit.json'), 'w', encoding='utf-8') as f:
    json.dump({'atlas': 'forest-kit.png', 'width': atlas.width, 'height': atlas.height, 'sprites': manifest}, f, indent=1, sort_keys=True)
print(f'{len(manifest)} sprites, atlas {atlas.size}')
