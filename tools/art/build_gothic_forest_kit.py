#!/usr/bin/env python3
"""Builds the WyrmForge gothic forest sprite kit from the Pixel Crawler Free Pack (Anokolisa).

The pack's terms (see art/source/environment/forest/README.md) allow commercial use without credit. We reuse its tree silhouettes and
rock/shrub shapes and recolour every pixel into WyrmForge's cold, dark, weathered palette, in four Wyrm Influence states:
live -> dry -> dead -> charred. Output: one RGBA atlas plus a JSON manifest of rectangles and foot anchors.

    python tools/art/build_gothic_forest_kit.py <path-to-extracted-pack-root> [out-dir]
"""
import colorsys, json, os, sys
import cv2
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
        return 0.45 + (h - 0.40) * 0.35, min(0.42, s * 0.42), 0.09 + (v ** 1.25) * 0.58
    return 0.07 + (h - 0.07) * 0.3, s * 0.42, v * 0.74

def dry(h, s, v):
    if h < 0.14 or is_foliage(h, s):
        return 0.095 + min(0.04, abs(h - 0.09) * 0.2), min(0.40, s * 0.38), 0.08 + (v ** 1.2) * 0.55
    return 0.07, s * 0.40, v * 0.70

def dead(h, s, v):
    return 0.07 + (h - 0.07) * 0.2, s * 0.26, v * 0.62

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

def components(img, box, dilate=1, min_area=6, min_width=1):
    """Trimmed sprites found inside box=(x, y, w, h) of a sheet, ordered by row then column."""
    x0, y0, w0, h0 = box
    region = np.array(img.crop((x0, y0, x0 + w0, y0 + h0)))
    mask = (region[..., 3] > 0).astype(np.uint8)
    grown = cv2.dilate(mask, np.ones((2 * dilate + 1, 2 * dilate + 1), np.uint8)) if dilate else mask
    count, labels, stats, _ = cv2.connectedComponentsWithStats(grown, connectivity=8)
    found = []
    for i in range(1, count):
        x, y, w, h, _ = stats[i]
        sub = region[y:y + h, x:x + w].copy()
        sub[labels[y:y + h, x:x + w] != i] = 0
        if (sub[..., 3] > 0).sum() < min_area or w < min_width: continue
        found.append(((y // 10, x), Image.fromarray(sub)))
    found.sort(key=lambda f: f[0])
    return [im.crop(im.getbbox()) for _, im in found]

def flower(h, s, v):
    # Violet blooms and pale petals stay the few quiet accents of the wet forest; stems and leaves follow the foliage ramp.
    if 0.70 <= h <= 0.92 or s > 0.55 and not is_foliage(h, s):
        return h, s * 0.62, 0.10 + v * 0.55
    return live(h, s, v)

def mushroom(h, s, v):
    return h, s * 0.55, 0.08 + v * 0.50

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

VEG = sheet('Vegetation.png')
# Bushes: four colours across, four sizes down; green stays living, yellow/ochre/rust are the dry states.
for column, (cx, tone) in enumerate([(0, live), (48, dry), (96, dry), (144, dry)]):
    for size, im in enumerate(components(VEG, (cx, 0, 48, 146), dilate=0, min_area=80)):
        sprites.append((f'bush.{column}.{size}', remap(im, tone)))
for i, im in enumerate(components(VEG, (192, 60, 50, 36), dilate=1, min_area=80) + components(VEG, (192, 97, 50, 50), dilate=1, min_area=80)):
    sprites.append((f'shrub.dead.{i}', remap(im, dead)))
    sprites.append((f'shrub.charred.{i}', ember_pass(remap(im, charred_base), 0.05)))
# Ground cover small enough to sit inside one 32 px terrain face.
for i, im in enumerate(components(VEG, (240, 0, 160, 32), dilate=1, min_area=6)):
    sprites.append((f'decal.twig.{i}', remap(im, dead)))
for i, im in enumerate(components(VEG, (60, 346, 72, 28), dilate=0, min_area=6, min_width=4)):
    sprites.append((f'decal.leaf.{i}', remap(im, dry)))
for i, im in enumerate(components(VEG, (60, 160, 132, 36), dilate=0, min_area=8, min_width=4)):
    sprites.append((f'decal.tuft.live.{i}', remap(im, live)))
    sprites.append((f'decal.tuft.dry.{i}', remap(im, dry)))
for i, im in enumerate(components(VEG, (192, 158, 50, 36), dilate=1, min_area=10)):
    sprites.append((f'decal.foxglove.{i}', remap(im, flower)))
for i, im in enumerate(components(VEG, (0, 334, 132, 18), dilate=1, min_area=6, min_width=3)):
    sprites.append((f'decal.mushroom.{i}', remap(im, mushroom)))
for i, im in enumerate(components(VEG, (0, 372, 222, 60), dilate=1, min_area=12, min_width=7)):
    sprites.append((f'decal.flower.{i}', remap(im, flower)))

# Boulders: the grey rocks of the pack, from tall outcrop down to pebbles, in three tones (grey, ash for the Burning band, char for Volcanic).
ROCKS = sheet('Rocks.png')
top_rocks = sorted(components(ROCKS, (96, 12, 100, 60), dilate=0, min_area=30), key=lambda im: -im.width * im.height)
small_rocks = [im for im in components(ROCKS, (96, 60, 100, 130), dilate=0, min_area=10) if max(im.size) <= 18 and min(im.size) >= 3]
rock_kinds = [('tall', top_rocks[0:1]), ('big', top_rocks[1:2]), ('lump', top_rocks[2:4]),
              ('flat', [im for im in small_rocks if im.width >= 1.7 * im.height][:3]), ('pebble', [im for im in small_rocks if im.width < 1.7 * im.height][:5])]
def rock_grey(h, s, v): return 0.08, s * 0.25, 0.07 + v * 0.50
def rock_ash(h, s, v): return 0.05, s * 0.2, 0.06 + v * 0.40
for kind, images in rock_kinds:
    for i, im in enumerate(images):
        sprites.append((f'rock.{kind}.{i}.grey', remap(im, rock_grey)))
        sprites.append((f'rock.{kind}.{i}.ash', remap(im, rock_ash)))
        sprites.append((f'rock.{kind}.{i}.char', ember_pass(remap(im, charred_base), 0.04)))

# Torch flame: the pack's big animated flame (Bonfire/Fire_01, four 32 x 48 frames), cropped to one shared box so the frames stay aligned, in the
# pack's own fire colours (fire is a light source, not scenery to recolour).
FIRE = Image.open(os.path.join(PACK, 'Environment', 'Structures', 'Stations', 'Bonfire', 'Fire_01-Sheet.png')).convert('RGBA')
fire_frames = [FIRE.crop((i * 32, 0, i * 32 + 32, 48)) for i in range(4)]
fire_box = (min(f.getbbox()[0] for f in fire_frames), min(f.getbbox()[1] for f in fire_frames),
            max(f.getbbox()[2] for f in fire_frames), max(f.getbbox()[3] for f in fire_frames))
# The frames carry a few stray embers well below the flame body; the body ends 26 rows under the top, so the sprite stops there and its anchor is the flame's base.
fire_box = (fire_box[0], fire_box[1], fire_box[2], fire_box[1] + 26)
for i, frame in enumerate(fire_frames):
    sprites.append((f'torch.flame.{i}', frame.crop(fire_box)))

# A decal must fit inside one terrain face.
sprites = [s for s in sprites if not s[0].startswith('decal.') or max(s[1].size) <= 30]

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
    if name.startswith('torch.'): anchor_x = im.width // 2  # animation frames share one anchor
    manifest[name] = {'x': px, 'y': py, 'w': im.width, 'h': im.height, 'ax': anchor_x, 'ay': im.height - 1}

os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, 'forest-kit.png'), optimize=True)
with open(os.path.join(OUT, 'forest-kit.json'), 'w', encoding='utf-8') as f:
    json.dump({'atlas': 'forest-kit.png', 'width': atlas.width, 'height': atlas.height, 'sprites': manifest}, f, indent=1, sort_keys=True)
print(f'{len(manifest)} sprites, atlas {atlas.size}')
