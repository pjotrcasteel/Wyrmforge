#!/usr/bin/env python3
"""Pack recovered original eight-pose sheets. No model calls or card shrinking."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/runtime/enemies/source'
OUTPUT = ROOT / 'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies'
CHECK = '--check' in sys.argv

def pack(path, order=range(8)):
    image = Image.open(path).convert('RGBA')
    alpha = np.asarray(image)[:, :, 3]
    labels, count = ndimage.label(alpha >= 128)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    chosen = np.argsort(sizes)[-8:]
    if len(chosen) != 8 or min(sizes[chosen]) < 300:
        raise ValueError(f'{path}: expected eight separated silhouettes')
    boxes = ndimage.find_objects(labels)
    components = [(boxes[n-1], n) for n in chosen]
    components.sort(key=lambda c: c[0][0].start)
    components = sorted(components[:4], key=lambda c: c[0][1].start) + sorted(components[4:], key=lambda c: c[0][1].start)
    pieces = []
    for box, label in components:
        mask = ndimage.binary_dilation(labels == label, iterations=2)
        ys, xs = np.nonzero(mask & (alpha > 0))
        bounds = (xs.min(), ys.min(), xs.max()+1, ys.max()+1)
        isolated = np.array(image)
        isolated[~mask] = 0
        pieces.append(Image.fromarray(isolated).crop(bounds))
    # One shared scale preserves attack/body proportions. Every pose meets the same foot line.
    scale = min(176/max(p.height for p in pieces), 184/max(p.width for p in pieces))
    atlas = Image.new('RGBA', (768, 384))
    for destination, index in enumerate(order):
        piece = pieces[index]
        piece = piece.resize((round(piece.width*scale), round(piece.height*scale)), Image.Resampling.LANCZOS)
        atlas.alpha_composite(piece, ((destination%4)*192+96-piece.width//2, (destination//4)*192+180-piece.height))
    return atlas

def emit(name, image):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=OUTPUT, suffix='.png', delete=False) as stream:
        temporary = Path(stream.name)
        image.save(stream, format='PNG', optimize=True)
        stream.flush(); os.fsync(stream.fileno())
    data = temporary.read_bytes(); target = OUTPUT/name
    if CHECK:
        temporary.unlink()
        if not target.exists() or target.read_bytes() != data:
            raise SystemExit(f'stale: {target}')
    else:
        os.replace(temporary, target)
    return hashlib.sha256(data).hexdigest()[:12]

def main():
    hound = emit('mire-hound.png', pack(SOURCE/'mire-hound.png', [0,7,7,1,2,3,4,6]))
    walk = emit('mire-hound-walk.png', pack(SOURCE/'mire-hound-walk.png'))
    ashfang = emit('ashfang.png', pack(SOURCE/'ashfang.png'))
    hollow = hashlib.sha256((OUTPUT/'hollow.png').read_bytes()).hexdigest()[:12]
    manifest = {'version':1, 'cell':192, 'columns':4, 'anchor':[96,180],
      'poses':['idle','walkA','walkB','windup','attack','recover','hurt','death'],
      'provenance':'Original generated eight-pose sprites, recovered from the authorized Wyrmforge milestone. Canonical cards remain unchanged. Source sheets in art/runtime/enemies/source; Hollow compact atlas recovered from GitHub blob 07e66d5c7013c7023b08c42823dc0eb9c1e590c7.',
      'enemies':{'0':{'image':'hollow.png','hash':hollow,'worldSize':60},
                 '1':{'image':'mire-hound.png','hash':hound,'walkImage':'mire-hound-walk.png','walkHash':walk,'worldSize':63}},
      'wyrms':{'1':{'image':'ashfang.png','hash':ashfang,'worldSize':100}},
      'limitations':['Two mirrored lateral facings, not an eight-direction rig.','Only Hollow, Mire Hound and Ashfang painted assets were recoverable; remaining roster uses native art.']}
    data = json.dumps(manifest, indent=2)+'\n'
    target=OUTPUT/'manifest.json'
    if CHECK:
        if target.read_text() != data: raise SystemExit(f'stale: {target}')
    else: target.write_text(data)
    print('Verified' if CHECK else 'Packed', 'four 768x384 textures (4.5 MiB decoded)')

if __name__ == '__main__': main()
