"""Independent decode: eye-only pixel edits preserve alpha, geometry footprint and timing."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];out=Path(sys.argv[1]);m=json.loads((out/'manifest.json').read_text());prior=root/m['priorExport'];old=json.loads((prior/'manifest.json').read_text());animation=m['animation'];stem='move' if animation=='movement' else animation;count=m['framesPerDirection'];cell=96 if animation=='movement' else 128
atlas=np.asarray(Image.open(out/f'ashling-{animation}.png').convert('RGBA'));assert hashlib.sha256((out/f'ashling-{animation}.png').read_bytes()).hexdigest()==m['atlasSha256'];assert m['frameRects']==old['frameRects'] and m['orientations']==old['orientations'] and m['anchor']==old['anchor']
colors=set();changes={};last=[]
for row,d in enumerate(m['directions']):
    changed=[]
    for f in range(count):
        a=np.asarray(Image.open(prior/'frames'/d/f'{stem}-{f:02d}.png').convert('RGBA'));b=np.asarray(Image.open(out/'frames'/d/f'{stem}-{f:02d}.png').convert('RGBA'));packed=atlas[row*cell:(row+1)*cell,f*cell:(f+1)*cell]
        visible=b[:,:,3]>0;assert np.array_equal(a[:,:,3],b[:,:,3]);assert np.array_equal(b[:,:,3],packed[:,:,3]) and np.array_equal(b[visible],packed[visible]);delta=np.any(a[:,:,:3]!=b[:,:,:3],axis=2);assert not np.any(delta&~visible)
        number=int(delta.sum());assert number<=16,(d,f,number);changed.append(number);colors.update(map(tuple,b[visible,:3]))
        if animation=='death' and f>=13:assert np.array_equal(a,b)
        if f==count-1:last.append(b)
    changes[d]=dict(minimum=min(changed),maximum=max(changed),total=sum(changed))
assert len(colors)<=64;assert changes['N']['total']==0
assert sum(changes[d]['total'] for d in ['SE','S','SW'])>0
if animation=='death':
    for row,d in enumerate(m['directions']):
        for f in range(23,count):assert np.array_equal(last[row],np.asarray(Image.open(out/'frames'/d/f'death-{f:02d}.png').convert('RGBA')))
report=dict(passed=True,animation=animation,frames=count*8,paletteColors=len(colors),alphaAndFootprintUnchanged=True,frameRectsAnchorsAndDirectionTransformsUnchanged=True,atlasVisiblePixelsMatchFrames=True,maxChangedPixelsPerFrame=max(v['maximum'] for v in changes.values()),rearViewUnchanged=True,deathFullyUnchangedAfterEyesExtinguish=animation=='death',changesByDirection=changes,ownerAccepted=False,runtimeIntegrated=False)
(out/'independent-eye-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
