#!/usr/bin/env python3
"""Readability pass over the approved Ashling sprite sheets (walk, attack, death).

The creature, its motion and its palette stay; what changes is how well it reads on dark ground at its on-screen size:
  * the dark body ramp is lifted (gamma on luminance, hue kept, one new colour per old colour, so it stays pixel art);
  * the silhouette gets a rim: warm ember light on the upper-left edges (the moon side), a dim brown edge elsewhere, so it no longer melts into
    the ground;
  * every glowing eye pixel gains a one-pixel ember halo (the eyes were one or two pixels);
  * thin appendages far from the body (claws, tail tip) glow like embers, built only from the sheet's own emission palette.
Sheets are drawn 1:1 (worldSize == cell) so no sprite pixel is dropped by a non-integer scale.

    python tools/art/enhance_ashling_readability.py
Reads art/source/enemies/ashling/exports/*-fiery-eyes-v1 (untouched originals), writes wwwroot/art/enemies/ashling-rigged/.
"""
import hashlib, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art', 'source', 'enemies', 'ashling', 'exports')
OUT = os.path.join(ROOT, 'src', 'Wyrmforge.Presentation.Web', 'wwwroot', 'art', 'enemies', 'ashling-rigged')
SHEETS = {'walk': ('movement-fiery-eyes-v1', 'ashling-movement.png', 96), 'attack': ('attack-fiery-eyes-v1', 'ashling-attack.png', 128),
          'death': ('death-fiery-eyes-v1', 'ashling-death.png', 128)}
EMBER = [(145, 30, 10), (214, 55, 9), (255, 100, 12), (255, 204, 58), (255, 251, 211)]
CROSS = ndi.generate_binary_structure(2, 1)
BOX = np.ones((3, 3), bool)

def lift(rgb):
    lum = rgb.mean(axis=-1)
    lifted = np.where(lum < 18, lum, 18 + 237 * (np.clip(lum - 18, 0, None) / 237) ** 0.66)
    gain = np.where(lum > 0, lifted / np.maximum(lum, 1e-3), 1)
    return np.clip(rgb * gain[..., None], 0, 255)

def enhance(frame, fade=1.0):
    a = frame[..., 3] > 0
    rgb = frame[..., :3].astype(float)
    key = np.zeros(a.shape, bool)
    for color in EMBER:
        key |= np.all(frame[..., :3] == color, axis=-1)
    key &= a
    out = lift(rgb)
    out[key] = rgb[key]

    # Thin appendages far from the body glow: opening removes anything under five pixels thick.
    body = ndi.binary_opening(a, BOX, iterations=2)
    thin = a & ~ndi.binary_dilation(body, BOX, iterations=1)
    labels, count = ndi.label(thin, structure=BOX)
    if body.any() and count:
        cy, cx = ndi.center_of_mass(body)
        ys, xs = np.nonzero(a)
        reach = np.hypot(ys - cy, xs - cx).max()
        yy, xx = np.indices(a.shape)
        far = np.hypot(yy - cy, xx - cx) >= 0.62 * reach
        sizes = ndi.sum(thin, labels, index=np.arange(1, count + 1))
        radius = np.hypot(yy - cy, xx - cx)
        for label, size in enumerate(sizes, 1):
            if size < 5: continue
            part = labels == label
            if not (part & far).any(): continue
            # Only the last few pixels of a claw (or the tail) burn: ember at the tip, fading back into the lifted body colour.
            ty, tx = np.unravel_index(np.argmax(np.where(part, radius, -1)), a.shape)
            reach_tip = np.hypot(yy - ty, xx - tx)
            for limit, color in ((9, EMBER[0]), (6, EMBER[1]), (3, EMBER[2]), (1.5, EMBER[3])):
                out[part & (reach_tip <= limit) & ~key] = color

    # A one-pixel ember halo around every glowing eye pixel (not around the claws).
    eyes = np.zeros(a.shape, bool)
    for color in EMBER:
        eyes |= np.all(frame[..., :3] == color, axis=-1)
    eyes &= a & (rgb.mean(axis=-1) > 0)
    halo = ndi.binary_dilation(eyes, CROSS) & a & ~eyes & (lift(rgb).mean(axis=-1) < 95)
    out[halo] = EMBER[0] if fade > 0.5 else out[halo]

    # Rim: ember on the lit (upper-left) edge, dim brown on the rest, only on the outermost pixel row.
    edge = a & ~ndi.binary_erosion(a, CROSS)
    outside = ~a
    up = np.zeros_like(a); up[1:, :] = outside[:-1, :]
    left = np.zeros_like(a); left[:, 1:] = outside[:, :-1]
    upleft = np.zeros_like(a); upleft[1:, 1:] = outside[:-1, :-1]
    lit = edge & (up | left | upleft)
    # Only the body's own silhouette is rimmed; thin legs, claws and the tail keep the lifted ramp so they do not turn into an orange fringe.
    near_body = ndi.binary_dilation(body, BOX, iterations=2)
    protect = key | halo | (out == np.array(EMBER[1])).all(axis=-1) | (out == np.array(EMBER[0])).all(axis=-1)
    out[lit & near_body & ~protect] = (132, 84, 58)
    out[edge & ~lit & near_body & ~protect] = (58, 38, 34)

    result = frame.copy()
    result[..., :3] = np.round(out).astype(np.uint8)
    return result

def main():
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    for clip, (folder, name, cell) in SHEETS.items():
        sheet = np.array(Image.open(os.path.join(SRC, folder, name)).convert('RGBA'))
        frames = sheet.shape[1] // cell
        result = sheet.copy()
        for row in range(sheet.shape[0] // cell):
            for f in range(frames):
                y0, x0 = row * cell, f * cell
                fade = 1.0
                if clip == 'death': fade = float(np.interp(f, [0, 3, 8, 13, frames - 1], [1, 1, .45, 0, 0]))
                result[y0:y0 + cell, x0:x0 + cell] = enhance(sheet[y0:y0 + cell, x0:x0 + cell], fade)
        # The enhanced sheet is a new source export next to the approved one, which stays untouched; the runtime sheet is a byte copy of it.
        export_name = folder.replace('fiery-eyes-v1', 'readable-v1')
        export_dir = os.path.join(SRC, export_name)
        os.makedirs(export_dir, exist_ok=True)
        Image.fromarray(result).save(os.path.join(export_dir, name), optimize=True)
        prior = json.load(open(os.path.join(SRC, folder, 'manifest.json'), encoding='utf-8'))
        prior.update(appearanceRevision='readability pass v1 over fiery-eyes-v1 (tools/art/enhance_ashling_readability.py)', priorExport=f'art/source/enemies/ashling/exports/{folder}',
                     ownerAccepted=False, runtimeIntegrated=True)
        prior.pop('atlasSha256', None)
        json.dump(prior, open(os.path.join(export_dir, 'manifest.json'), 'w', encoding='utf-8', newline='\n'), indent=2)
        path = os.path.join(OUT, f'{clip}.png')
        with open(os.path.join(export_dir, name), 'rb') as source, open(path, 'wb') as target: target.write(source.read())
        digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()[:12]
        entry = manifest['clips'][clip]
        entry['hash'] = digest
        entry['worldSize'] = cell
        entry['sourceExport'] = f'art\\source\\enemies\\ashling\\exports\\{export_name}'
        entry['readabilityPass'] = 'v1: lifted body ramp, ember rim, eye halo, glowing claws; drawn 1:1'
        colours = len(np.unique(result[result[..., 3] > 0][:, :3], axis=0))
        print(clip, sheet.shape, 'colours', colours, digest)
    json.dump(manifest, open(manifest_path, 'w', encoding='utf-8', newline='\n'), indent=2)
    open(manifest_path, 'a', encoding='utf-8').write('\n')

if __name__ == '__main__':
    main()
