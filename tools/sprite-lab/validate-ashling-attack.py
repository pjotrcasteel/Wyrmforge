"""Independent CPU decode of directional attack frames and saved source evidence."""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];out=Path(sys.argv[1]);m=json.loads((out/'manifest.json').read_text());r=json.loads((out/'render-report.json').read_text())
atlas=np.asarray(Image.open(out/'ashling-attack.png').convert('RGBA'));count=m['framesPerDirection'];assert atlas.shape==(1024,count*128,4)
assert hashlib.sha256((out/'ashling-attack.png').read_bytes()).hexdigest()==m['atlasSha256']
assert m['directions']==['N','NE','E','SE','S','SW','W','NW'];colors=set();first=[];opaque=0;unique={}
for row,d in enumerate(m['directions']):
    hashes=set()
    for f in range(count):
        frame=np.asarray(Image.open(out/'frames'/d/f'attack-{f:02d}.png').convert('RGBA'));packed=atlas[row*128:(row+1)*128,f*128:(f+1)*128];a=frame[:,:,3]>0
        assert np.array_equal(frame[:,:,3],packed[:,:,3]) and np.array_equal(frame[a],packed[a])
        assert set(np.unique(frame[:,:,3]))<={0,255};y,x=np.where(a);assert len(x)>100 and x.min()>=2 and y.min()>=2 and x.max()<126 and y.max()<126
        rect=m['frameRects'][row*count+f];assert rect['x']==f*128 and rect['y']==row*128 and rect['anchor']==m['anchor'] and not rect['flipX']
        colors.update(map(tuple,frame[a,:3]));opaque+=len(x);hashes.add(hashlib.sha256(frame.tobytes()).hexdigest())
        if f==0:first.append(frame)
    unique[d]=len(hashes);assert len(hashes)>=count-1
    measurements=[v for v in r['measurements'] if v['direction']==d];assert measurements[0]['visibleFirePixels']==0 and measurements[-1]['visibleFirePixels']==0
    assert max(v['visibleFirePixels'] for v in measurements)>5
assert len(colors)<=64
assert all(not np.array_equal(a,b[:,::-1]) for i,a in enumerate(first) for b in first[i+1:])
source=np.load((root/m['sourceRig']).parent/'attack-samples.npz');assert np.isfinite(source['positions']).all()
seam=float(abs(source['positions'][0]-source['positions'][-1]).max());minimum=float(source['positions'][:,:,2].min());assert seam<1e-4 and minimum>=-.501
fire=np.load(out/'fire-effect-source.npz');assert np.isfinite(fire['positions']).all();assert fire['intensities'][0]==0 and fire['intensities'][-1]==0
report=dict(passed=True,frames=count*8,opaquePixelSamples=opaque,paletteColors=len(colors),uniqueFramesByDirection=unique,visiblePixelsAndAlphaMatchAtlas=True,noClipping=True,noMirroredRows=True,fireAbsentAtRestAndRecovery=True,visibleFireInEveryDirection=True,recoveryPositionError=seam,minimumMeshZ=minimum,ownerAccepted=False,runtimeIntegrated=False)
(out/'independent-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
