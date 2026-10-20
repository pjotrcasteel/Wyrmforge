"""Inspect sampled source contacts/seam and build native-size pixel review artifacts."""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

out=Path(sys.argv[1])
revision=sys.argv[2] if len(sys.argv)>2 else 'walk-pixels-v1'
dest=out/revision
source=np.load(out/'sampled-walk.npz')
markers=json.loads((out/'actual-foot-markers.json').read_text())
travel=.19/.62
groups={}
for marker in markers:
    phase=(marker['frame']-1)/16
    shifted=phase+(0 if marker['side']=='L' else .5)
    local=shifted%1
    if local<.62:
        key=(marker['side'],int(shifted))
        world=np.array(marker['contact'])+np.array([0,-travel*phase,0])
        groups.setdefault(key,[]).append(world)
sliding=max(float(np.ptp(np.array(points),axis=0).max()) for points in groups.values())
seam=float(np.abs(source['positions'][0]-source['positions'][-1]).max())
frames=[Image.open(dest/f'walk-{i:02d}.png').convert('RGBA') for i in range(16)]
bounds=[frame.getbbox() for frame in frames]
report=dict(loopPositionErrorModelUnits=seam,stanceContactDriftModelUnits=sliding,
            allFinite=bool(np.isfinite(source['positions']).all()),
            transparentAlphaIsBinary=all(set(np.unique(np.asarray(frame)[:,:,3]))<={0,255} for frame in frames),
            frameBounds=bounds,clipped=any(b[0]<2 or b[1]<2 or b[2]>94 or b[3]>94 for b in bounds),
            technicalPass=seam<1e-4 and sliding<1e-4,
            visualAcceptance='requires separate inspection; no owner acceptance inferred')
(dest/'technical-report.json').write_text(json.dumps(report,indent=2)+'\n')
canvas=Image.new('RGBA',(96*4,116),(22,20,27,255))
draw=ImageDraw.Draw(canvas)
for column,index in enumerate([0,4,8,12]):
    canvas.alpha_composite(frames[index],(column*96,0))
    draw.text((column*96+5,98),f'Pose {index+1:02d}',fill=(205,184,150))
canvas.resize((96*4*3,116*3),Image.Resampling.NEAREST).save(dest/'contact-poses-3x.png')
# Grid proof uses exactly the documented source travel, with foot anchors visible.
gridframes=[]
for i,frame in enumerate(frames):
    preview=Image.new('RGBA',(390,300),(23,22,27,255))
    drawing=ImageDraw.Draw(preview)
    scroll=travel*i/16
    def project(x,y):
        clip=source['mvp']@np.array([x,y+scroll,-.5,1])
        return (147+48*(clip[0]/clip[3]+1),100+48*(1-clip[1]/clip[3]))
    for step in np.arange(-5,5.01,.25):
        drawing.line([project(step,-5),project(step,5)],fill=(33,31,37))
        drawing.line([project(-5,step),project(5,step)],fill=(39,36,42))
    preview.alpha_composite(frame,(147,100))
    drawing.text((12,12),'HOLLOW / native pixel walk',fill=(206,189,161))
    drawing.text((12,28),'One skinned 3D source / 12 FPS',fill=(142,138,144))
    gridframes.append(preview.convert('RGB'))
gridframes[0].save(dest/'native-grid-review.gif',save_all=True,append_images=gridframes[1:],duration=83,loop=0)
print(json.dumps(report,indent=2))
