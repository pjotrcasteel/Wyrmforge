"""Create visual review contacts from real exported atlas cells, without interpolation."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path('art/source/bosses/ashfang')
export = root / 'exports/motion-foundation-001'
out = root / 'reviews/motion-library-008'
manifest = json.loads((export / 'manifest.json').read_text(encoding='utf-8'))
names = list(manifest['clips'])
for page in range((len(names) + 9) // 10):
    subset = names[page * 10:(page + 1) * 10]
    canvas = Image.new('RGB', (1280, len(subset) * 210), '#192127')
    draw = ImageDraw.Draw(canvas)
    for row, name in enumerate(subset):
        clip = manifest['clips'][name]
        facing = clip['facings']['SE']
        atlas = Image.open(export / facing['masterImage']).convert('RGBA')
        for col, phase in enumerate((0, .25, .5, .75, 1)):
            index = min(clip['frames'] - 1, round(phase * (clip['frames'] - 1)))
            x, y, w, h = facing['frames'][index]['masterRect']
            frame = atlas.crop((x, y, x+w, y+h)).resize((240, 240), Image.Resampling.LANCZOS)
            canvas.paste(frame, (col * 256, row * 210 - 20), frame)
            draw.text((col * 256 + 8, row * 210 + 185), f'{name} | frame {index+1}', fill='#e9dcc7')
    canvas.save(out / f'all-actions-{page+1}.jpg', quality=91)
print('Contact review pages:', (len(names) + 9) // 10)
