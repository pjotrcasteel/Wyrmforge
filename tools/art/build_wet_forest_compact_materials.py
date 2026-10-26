#!/usr/bin/env python3
"""Editable source for three modular, unapproved Wet Forest pixel-art surfaces.

The rendered 256px PNGs are FIXED material assets independent of world seed.
Every motif has flat authored color: no sunlit highlights, water silhouettes,
physical heightmap, arbitrary gameplay path or scene-specific painted shadow.
Run --output <static asset directory> to produce the runtime image library.
"""
import argparse
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 256
PALETTES = {
    'grass-moss': ('#405343', '#35473a', '#49604b', '#5b6d52', '#504f3d', '#6d7154', 104),
    'trampled-earth': ('#675746', '#584c3f', '#75604a', '#806c53', '#5c533e', '#928064', 207),
    'wet-mud': ('#51534c', '#42453e', '#5a5c51', '#69675a', '#5d594a', '#777668', 309),
}
TUFTS = [
    [(0, 3), (1, 2), (1, 1), (2, 0), (2, 1), (3, 2), (4, 3), (5, 1), (5, 0), (6, 2), (6, 3)],
    [(0, 3), (0, 2), (1, 1), (2, 0), (2, 2), (3, 3), (4, 1), (4, 0), (5, 2), (6, 3)],
    [(0, 4), (1, 2), (2, 3), (2, 1), (3, 0), (3, 2), (4, 3), (5, 4)],
]
LEAVES = [
    [(0, 2), (1, 1), (2, 0), (3, 0), (4, 1), (3, 2), (2, 3), (1, 3)],
    [(0, 0), (1, 0), (2, 1), (3, 2), (3, 3), (2, 4), (1, 3), (0, 2)],
]
SCARS = [
    [(0, 0), (1, 0), (2, 1), (3, 1), (4, 1), (5, 2), (6, 2), (7, 3)],
    [(0, 2), (1, 2), (2, 1), (3, 0), (4, 0), (5, 1), (6, 1)],
]
STONES = [
    [(1, 0), (2, 0), (3, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2)],
    [(1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (3, 2)],
]


def stamp(pen, motif, x, y, color, scale=1):
    for dx in (-SIZE, 0, SIZE):
        for dy in (-SIZE, 0, SIZE):
            for a, b in motif:
                px, py = x + dx + a * scale, y + dy + b * scale
                if -scale < px < SIZE and -scale < py < SIZE:
                    pen.rectangle((px, py, px + scale - 1, py + scale - 1), fill=color)


def patch(pen, rng, x, y, rx, ry, color, jagged):
    phase = rng.random() * math.tau
    vertices = []
    for i in range(12):
        rad = math.tau * i / 12
        wobble = 1 + jagged * (.55 * math.sin(rad * 3 + phase) +
                                .35 * math.cos(rad * 5 - phase))
        vertices.append((round((x + rx * math.cos(rad) * wobble) / 2) * 2,
                         round((y + ry * math.sin(rad) * wobble) / 2) * 2))
    for dx in (-SIZE, 0, SIZE):
        for dy in (-SIZE, 0, SIZE):
            pen.polygon([(px + dx, py + dy) for px, py in vertices], fill=color)


def material(name):
    base, dark, moss, raised, earth, detail, seed = PALETTES[name]
    rng = random.Random(seed)
    im = Image.new('RGB', (SIZE, SIZE), base)
    pen = ImageDraw.Draw(im)
    if name == 'grass-moss':
        for _ in range(68):
            patch(pen, rng, rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.randint(5, 17), rng.randint(4, 12),
                  rng.choice([dark, moss, moss, earth]), .21)
        for _ in range(188):
            stamp(pen, rng.choice(TUFTS), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([raised, moss, detail, dark]), rng.choice([1, 1, 2]))
        for _ in range(73):
            stamp(pen, rng.choice(LEAVES), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([earth, dark, detail]))
        for _ in range(55):
            stamp(pen, rng.choice(STONES), rng.randrange(SIZE), rng.randrange(SIZE), earth)
    elif name == 'trampled-earth':
        for _ in range(78):
            patch(pen, rng, rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.randint(6, 19), rng.randint(4, 11),
                  rng.choice([dark, moss, moss, earth]), .28)
        for _ in range(115):
            stamp(pen, rng.choice(SCARS), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([dark, dark, raised]))
        for _ in range(73):
            stamp(pen, rng.choice(LEAVES), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([detail, earth]))
        for _ in range(55):
            stamp(pen, rng.choice(STONES), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([dark, raised]))
        for _ in range(45):
            stamp(pen, rng.choice(TUFTS), rng.randrange(SIZE), rng.randrange(SIZE), earth)
    else:
        for _ in range(89):
            patch(pen, rng, rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.randint(7, 20), rng.randint(4, 12),
                  rng.choice([dark, moss, moss, earth]), .18)
        for _ in range(73):
            stamp(pen, rng.choice(SCARS), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([dark, dark, earth]))
        for _ in range(73):
            stamp(pen, rng.choice(STONES), rng.randrange(SIZE), rng.randrange(SIZE),
                  rng.choice([detail, dark]))
        for _ in range(45):
            stamp(pen, rng.choice(LEAVES), rng.randrange(SIZE), rng.randrange(SIZE), raised)
    # Exact opposing-edge pixel parity for modular repeat. Does not certify
    # the *perceptual* join or imply water, normal-map or baked lighting.
    for y in range(SIZE):
        im.putpixel((SIZE - 1, y), im.getpixel((0, y)))
    for x in range(SIZE):
        im.putpixel((x, SIZE - 1), im.getpixel((x, 0)))
    return im


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    receipt = {'status': 'unapproved-light-neutral-pixel-art', 'tileSize': SIZE,
               'runtimeGeometry': False, 'ownerApproved': False, 'materials': {}}
    for name in PALETTES:
        file = output / f'{name}.png'
        material(name).save(file, optimize=True)
        receipt['materials'][name] = {'file': file.name,
                                      'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    (output / 'manifest.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.output), indent=2))
