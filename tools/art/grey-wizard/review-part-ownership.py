"""Expose the real source pixels assigned to each editable body part.

Diagnostic only: never infers an acceptable mask or changes the exported sprite.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[3]
source = root / args.source
project = json.loads((source / 'project.json').read_text())
review = source / 'review'
review.mkdir(exist_ok=True)
original = Image.open(source / 'source-master.png').convert('RGBA')
layers = [(entry['name'], Image.open(source / entry['file']).convert('RGBA')) for entry in project['layers']]
palette = [
    '#bc7650', '#a64e61', '#517a94', '#c4a848', '#769254', '#a47db1',
    '#da8e45', '#5e97ab', '#cf738e', '#acba71', '#8b79c4', '#d8c2a1',
    '#82999c', '#d6a78a', '#8d9e5a', '#d49960',
]
names = [name for name, _ in layers]
ids = Image.new('RGB', original.size, '#30333b')
owner = [-1] * (original.width * original.height)
for index, (_, layer) in enumerate(layers):
    alpha = layer.getchannel('A')
    for y in range(original.height):
        for x in range(original.width):
            if alpha.getpixel((x, y)):
                owner[y * original.width + x] = index
colors = [tuple(bytes.fromhex(color[1:])) for color in palette]
ids.putdata([colors[index % len(colors)] if index >= 0 else (48, 51, 59) for index in owner])

scale = 5
zoom = lambda im: im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
ownership = Image.new('RGB', (original.width * scale * 2 + 28, original.height * scale + 72), '#24262b')
ownership.paste(zoom(original), (0, 56), zoom(original).getchannel('A'))
ownership.paste(zoom(ids), (original.width * scale + 28, 56))
draw = ImageDraw.Draw(ownership)
draw.text((12, 14), f"{project['direction']} SOURCE: ORIGINAL", fill='#efefe8')
draw.text((original.width * scale + 40, 14), 'VISIBLE PIXEL OWNERSHIP (NOT ACCEPTED)', fill='#efefe8')
ownership.save(review / 'part-ownership.png')

frames = []
for index, (name, part) in enumerate(layers):
    canvas = Image.new('RGB', (original.width * scale * 2 + 28, original.height * scale + 72), '#b7b5ae')
    native = zoom(original)
    selected = zoom(part)
    canvas.paste(native, (0, 56), native.getchannel('A'))
    canvas.paste(selected, (original.width * scale + 28, 56), selected.getchannel('A'))
    labels = ImageDraw.Draw(canvas)
    labels.text((10, 12), 'ORIGINAL NATIVE SPRITE', fill='#222222')
    labels.text((original.width * scale + 36, 12), f'PART {index + 1}/{len(layers)}: {name}', fill='#222222')
    frames.append(canvas)
frames[0].save(review / 'part-isolation.gif', save_all=True, append_images=frames[1:],
               duration=850, loop=0, disposal=2, optimize=False)
counts = {name: sum(1 for pixel in layer.getchannel('A').getdata() if pixel) for name, layer in layers}
report = dict(scope='diagnostic of existing ownership; no segmentation or animation approved',
              source=str(source.relative_to(root)), names=names, layerPixels=counts,
              totalVisibleSourcePixels=sum(bool(a) for a in original.getchannel('A').getdata()),
              output=['part-ownership.png', 'part-isolation.gif'])
(review / 'part-ownership-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
