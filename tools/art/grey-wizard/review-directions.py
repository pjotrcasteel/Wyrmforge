"""Export a facing flipbook, not invented locomotion, from native source PNGs."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'art/source/characters/grey-wizard'
OUT = BASE / 'gothic-directions-v005'
ORDER = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']
frames = [Image.open(OUT / (name + '.png')).convert('RGBA') for name in ORDER]
assert all(im.size == (160, 160) for im in frames)
palette = json.loads((BASE / 'gothic-south-v003/project.json').read_text())['palette']
allowed = {tuple(bytes.fromhex(c[1:])) for c in palette}
for im in frames:
    assert all(a in (0, 255) for *_, a in im.get_flattened_data())
    assert all((r,g,b) in allowed for r,g,b,a in im.get_flattened_data() if a)
    x0,y0,x1,y1 = im.getbbox()
    assert x0 > 0 and y0 > 0 and x1 < 160 and y1 < 160
unchanged = ['S', 'SW', 'W', 'N', 'E', 'SE']
for name in unchanged:
    assert (OUT / (name+'.png')).read_bytes() == (BASE/'gothic-directions-v004'/(name+'.png')).read_bytes()
# GIF palette carries transparent index0, preserving the native96-colour source.
rgb = [0,0,0] + [n for color in palette for n in bytes.fromhex(color[1:])]
rgb += [0] * (768-len(rgb))
indices = {tuple(bytes.fromhex(c[1:])):i+1 for i,c in enumerate(palette)}
gif_frames = []
for source in frames:
    im = Image.new('P', source.size); im.putpalette(rgb)
    im.putdata([indices[(r,g,b)] if a else 0 for r,g,b,a in source.get_flattened_data()])
    gif_frames.append(im)
gif_path = OUT/'facing-review.gif'
gif_frames[0].save(gif_path,save_all=True,append_images=gif_frames[1:],duration=500,loop=0,transparency=0,disposal=2,optimize=False)
with Image.open(gif_path) as im:
    assert im.n_frames == 8
    for i,source in enumerate(frames):
        im.seek(i)
        # Transparent RGB is intentionally unspecified; opaque source pixels exact.
        actual = im.convert('RGBA')
        assert actual.getchannel('A').tobytes() == source.getchannel('A').tobytes()
        assert all(a[:3] == b[:3] for a,b in zip(actual.get_flattened_data(),source.get_flattened_data()) if b[3])
report = dict(status='native directional source review, not animation acceptance',
              scope='eight 500ms held facings, no walk/interpolation; not an arena or phone capture',
              directions=ORDER,cell=[160,160],paletteSize=96,binaryAlpha=True,
              unchangedFromV004=unchanged,framesVerified=8,
              sha256=hashlib.sha256(gif_path.read_bytes()).hexdigest())
(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
