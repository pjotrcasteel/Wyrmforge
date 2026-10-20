"""Independent native-pixel death validation, including exact settled corpse hold."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];out=Path(sys.argv[1]);m=json.loads((out/'manifest.json').read_text());r=json.loads((out/'render-report.json').read_text())
assert m['animation']=='death' and not m['loop'];count=m['framesPerDirection'];hold=m['corpseHoldStartFrame'];assert count==28
atlas=np.asarray(Image.open(out/'ashling-death.png').convert('RGBA'));assert atlas.shape==(1024,128*count,4);assert hashlib.sha256((out/'ashling-death.png').read_bytes()).hexdigest()==m['atlasSha256']
assert m['directions']==['N','NE','E','SE','S','SW','W','NW'];colors=set();opaque=0;corpses=[];uniques={}
for row,d in enumerate(m['directions']):
    frames=[]
    for f in range(count):
        image=Image.open(out/'frames'/d/f'death-{f:02d}.png').convert('RGBA');frame=np.asarray(image);a=frame[:,:,3]>0;packed=atlas[row*128:(row+1)*128,f*128:(f+1)*128]
        assert frame.shape==(128,128,4) and np.array_equal(frame[:,:,3],packed[:,:,3]) and np.array_equal(frame[a],packed[a]);assert set(np.unique(frame[:,:,3]))<={0,255}
        y,x=np.where(a);assert len(x)>100 and x.min()>=2 and y.min()>=2 and x.max()<126 and y.max()<126
        rect=m['frameRects'][row*count+f];assert rect['x']==f*128 and rect['y']==row*128 and rect['anchor']==m['anchor'] and not rect['flipX']
        opaque+=len(x);colors.update(map(tuple,frame[a,:3]));frames.append(frame)
    assert all(np.array_equal(frame,frames[-1]) for frame in frames[hold:]);assert not np.array_equal(frames[0],frames[-1]);corpses.append(frames[-1]);uniques[d]=len({f.tobytes() for f in frames});assert uniques[d]>=20
    assert all(v['visibleFirePixels']==0 for v in r['measurements'] if v['direction']==d and v['frame']>=9)
assert len(colors)<=64;assert all(not np.array_equal(a,b[:,::-1]) for i,a in enumerate(corpses) for b in corpses[i+1:])
rig=(root/m['sourceRig']).parent;s=np.load(rig/'death-samples.npz');positions=s['positions'];assert np.isfinite(positions).all() and positions[:,:,2].min()>=-.501
hold_error=float(abs(positions[hold:]-positions[-1]).max());assert hold_error<1e-6
height=float(np.ptp(positions[-1,:,2]));standing=float(np.ptp(positions[0,:,2]));assert height<standing*.65
effect=np.load(out/'fire-effect-source.npz');assert np.isfinite(effect['positions']).all() and np.all(effect['intensities'][9:]==0)
report=dict(passed=True,frames=224,opaquePixelSamples=opaque,paletteColors=len(colors),uniqueFramesByDirection=uniques,visibleAtlasPixelsAndAlphaMatch=True,binaryAlpha=True,noClipping=True,noMirroredCorpseRows=True,minimumMeshZ=float(positions[:,:,2].min()),corpseHeight=height,standingHeight=standing,corpseHoldPositionError=hold_error,corpseHoldPixelsIdentical=True,fireExtinguishedByFrame=9,ownerAccepted=False,runtimeIntegrated=False)
(out/'independent-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
