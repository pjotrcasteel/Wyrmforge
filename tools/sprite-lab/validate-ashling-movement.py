"""Independent CPU checks of exported pixels and rotated source contacts."""
from pathlib import Path
import sys,json,math,hashlib
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]);manifest=json.loads((out/'manifest.json').read_text())
rig=(root/manifest['sourceRig']).parent;source=np.load(rig/'sampled-walk.npz')
profile=json.loads((rig/'export-profile.json').read_text());explicit=(rig/'blocking-review/report.json').exists()
markers=json.loads((rig/('gait-diagnostics.json' if explicit else 'actual-foot-markers.json')).read_text())
sheet=np.asarray(Image.open(out/'ashling-movement.png').convert('RGBA'))
assert sheet.shape==(768,1536,4)
assert hashlib.sha256((out/'ashling-movement.png').read_bytes()).hexdigest()==manifest['atlasSha256']
assert hashlib.sha256((rig/'sampled-walk.npz').read_bytes()).hexdigest()==manifest['sourcePoseSha256']
assert manifest['directions']==['N','NE','E','SE','S','SW','W','NW']
origin=np.array(profile['groundRoot']);stride=profile['travelModelUnitsPerCycle'];contacts={};pixels=0;native_colors=set()
first_frames=[]
for row,direction in enumerate(manifest['directions']):
    orientation=manifest['orientations'][row];angle=math.radians(orientation['rotationDegrees'])
    rotation=np.array([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    assert orientation['direction']==direction and orientation['row']==row and not orientation['flipX']
    assert abs(np.linalg.det(rotation)-1)<1e-6
    hashes=set();groups={}
    for index in range(16):
        frame=np.asarray(Image.open(out/'frames'/direction/f'move-{index:02d}.png').convert('RGBA'))
        assert frame.shape==(96,96,4)
        packed=sheet[row*96:(row+1)*96,index*96:(index+1)*96]
        assert np.array_equal(packed[:,:,3],frame[:,:,3])
        # Alpha composition clears unused RGB beneath transparent pixels.
        # Every visible source pixel and every alpha value must be exact.
        assert np.array_equal(packed[frame[:,:,3]>0],frame[frame[:,:,3]>0])
        assert set(np.unique(frame[:,:,3]))<={0,255}
        y,x=np.where(frame[:,:,3]>0);assert len(x)>100 and x.min()>=2 and y.min()>=2 and x.max()<94 and y.max()<94
        pixels+=len(x);native_colors.update(map(tuple,frame[frame[:,:,3]>0,:3].tolist()))
        hashes.add(hashlib.sha256(frame.tobytes()).hexdigest())
        if index==0:first_frames.append(frame)
        rect=manifest['frameRects'][row*16+index]
        assert rect['x']==index*96 and rect['y']==row*96 and rect['anchor']==manifest['anchor'] and not rect['flipX']
    assert len(hashes)==16
    for marker in markers:
        phase=(marker['frame']-1)/16;shifted=phase+(0 if marker['side']=='L' else .5)
        if marker['support'] if explicit else shifted%1<profile['stanceFraction']:
            moving=np.array(marker['toe'] if explicit else marker['contact'])+[0,-stride*phase,0]
            world=(moving-origin)@rotation.T+origin
            groups.setdefault((marker['side'],marker['interval'] if explicit else int(shifted)),[]).append(world[:2] if explicit else world)
    contacts[direction]=max(float(np.ptp(np.array(points),axis=0).max()) for points in groups.values())
    assert contacts[direction]<1e-4
assert len(native_colors)<=64,len(native_colors)
assert all(not np.array_equal(a,b[:,::-1]) for i,a in enumerate(first_frames) for b in first_frames[i+1:])
seam=float(np.abs(source['positions'][0]-source['positions'][-1]).max())
minimum=float(source['positions'][:,:,2].min());assert seam<1e-4 and minimum>=origin[2]-.001
report=dict(passed=True,decodedFrames=128,allVisiblePixelsAndAlphaMatchAtlas=True,opaquePixelSamples=pixels,opaqueColors=len(native_colors),binaryAlpha=True,noClipping=True,noMirroredDirectionRows=True,phaseAndAnchorShared=True,stanceContactDriftByDirection=contacts,loopPositionError=seam,minimumMeshZ=minimum,atlasSha256=manifest['atlasSha256'],sourcePoseSha256=manifest['sourcePoseSha256'],ownerAccepted=False,runtimeIntegrated=False)
(out/'independent-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report),flush=True)
