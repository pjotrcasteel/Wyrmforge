"""Validate all attack pixels and build a scale-consistent lifecycle preview."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/hollow/rigged-poc/exports'
out=base/'attack-eight-directions-v2';walk=base/'movement-eight-directions-v1';death=base/'death-eight-directions-v4'
manifest=json.loads((out/'hollow-attack.manifest.json').read_text());atlas=Image.open(out/'hollow-attack.png').convert('RGBA')
palette=set(tuple(p) for p in np.array(Image.open(out/'shared-palette.png').convert('RGB')).reshape(-1,3))
def visible(image):
    p=np.array(image).copy();p[p[:,:,3]==0,:3]=0;return p
report=dict(frames=0,firstFrameDifferences={},lastFrameDifferences={},noClipping=True,binaryAlpha=True,sharedPalette=True)
for row,direction in enumerate(manifest['directions']):
    frames=[]
    for index in range(16):
        frame=Image.open(out/'frames'/direction/f'attack-{index:02d}.png').convert('RGBA');p=np.array(frame)
        assert np.array_equal(visible(frame),visible(atlas.crop((index*128,row*128,(index+1)*128,(row+1)*128))))
        bounds=frame.getbbox();assert bounds and min(bounds[:2])>0 and max(bounds[2:])<128
        assert set(np.unique(p[:,:,3]))<={0,255} and all(tuple(c) in palette for c in p[:,:,:3][p[:,:,3]>0])
        frames.append(frame);report['frames']+=1
    reference=visible(Image.open(walk/'frames'/direction/'walk-00.png').convert('RGBA'))
    for key,index in [('firstFrameDifferences',0),('lastFrameDifferences',15)]:
        differences=int(np.any(visible(frames[index].crop((16,16,112,112)))!=reference,axis=-1).sum())
        report[key][direction]=differences;assert differences<=4
    assert np.array_equal(visible(frames[0]),visible(frames[-1]))
    if direction=='SE':
        sequence=[]
        for animation,folder,count in [('walk',walk,16),('attack',out,16),('walk',walk,16),('death',death,24)]:
            for index in range(count):
                frame=Image.open(folder/'frames'/direction/f'{animation}-{index:02d}.png').convert('RGBA')
                canvas=Image.new('RGBA',(128,128),(22,20,27,255));canvas.alpha_composite(frame,(16,16) if animation=='walk' else (0,0))
                sequence.append(canvas.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
        sequence[0].save(out/'hollow-lifecycle-review.gif',save_all=True,append_images=sequence[1:],duration=[83]*71+[1400],loop=0)
        attack_sequence=[]
        for frame in frames:
            canvas=Image.new('RGBA',(128,128),(22,20,27,255));canvas.alpha_composite(frame)
            attack_sequence.append(canvas.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
        attack_sequence[0].save(out/'attack-review.gif',save_all=True,append_images=attack_sequence[1:],duration=[83]*15+[500],loop=0)
assert manifest['playback']==dict(fps=12,loop=False,holdLastFrame=False,onComplete='walk')
assert manifest['anchor']==[64,88] and manifest['drawCellWorldSize']/128==93/96
assert manifest['visualContactFrames']==[7,8] and manifest['visualTimingOnly']
report['passed']=True
(out/'asset-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
