"""Validate delivered PNGs and the walk-to-death scale/pivot transition."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/hollow/rigged-poc'
out=base/'exports/death-eight-directions-v4'
walk=base/'exports/movement-eight-directions-v1'
manifest=json.loads((out/'hollow-death.manifest.json').read_text())
atlas=Image.open(out/'hollow-death.png').convert('RGBA')
palette=set(tuple(p) for p in np.array(Image.open(out/'shared-palette.png').convert('RGB')).reshape(-1,3))
report=dict(frames=0,directions=[],binaryAlpha=True,noClipping=True,allVisiblePixelsInSharedPalette=True,
    exactCorpseHold=True,walkToDeathFirstFrameDifferences={})
def visible_pixels(image):
    pixels=np.array(image).copy()
    pixels[pixels[:,:,3]==0,:3]=0
    return pixels
for row,direction in enumerate(manifest['directions']):
    frames=[]
    for index in range(24):
        image=Image.open(out/'frames'/direction/f'death-{index:02d}.png').convert('RGBA')
        pixels=np.array(image)
        assert np.array_equal(visible_pixels(atlas.crop((index*128,row*128,(index+1)*128,(row+1)*128))),visible_pixels(image))
        bounds=image.getbbox()
        assert bounds and min(bounds[:2])>0 and max(bounds[2:])<128
        assert set(np.unique(pixels[:,:,3]))<={0,255}
        assert all(tuple(p) in palette for p in pixels[:,:,:3][pixels[:,:,3]>0])
        frames.append(image);report['frames']+=1
    assert all(np.array_equal(np.array(frames[20]),np.array(f)) for f in frames[21:])
    reference=visible_pixels(Image.open(walk/'frames'/direction/'walk-00.png').convert('RGBA'))
    first=visible_pixels(frames[0].crop((16,16,112,112)))
    differences=int(np.any(first!=reference,axis=-1).sum())
    report['walkToDeathFirstFrameDifferences'][direction]=differences
    assert differences<=4,(direction,differences)
    report['directions'].append(direction)
    # Readability derivative: accepted walking loop flows into death at the
    # matching pose, then holds the corpse. All sprite pixels are unchanged.
    if direction=='SE':
        sequence=[]
        for i in range(16):
            canvas=Image.new('RGBA',(128,128),(22,20,27,255))
            canvas.alpha_composite(Image.open(walk/'frames'/direction/f'walk-{i:02d}.png'),(16,16))
            sequence.append(canvas.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
        for frame in frames:
            canvas=Image.new('RGBA',(128,128),(22,20,27,255));canvas.alpha_composite(frame)
            sequence.append(canvas.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
        sequence[0].save(out/'walk-to-death-review.gif',save_all=True,append_images=sequence[1:],duration=[83]*39+[1400],loop=0)
assert manifest['anchor']==[64,88] and manifest['drawCellWorldSize']/128==93/96
assert manifest['playback']==dict(fps=12,loop=False,holdLastFrame=True)
report['passed']=True
(out/'asset-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
