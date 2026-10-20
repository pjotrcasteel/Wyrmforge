"""Ground-reference review of the existing exported pixels; no sprite alteration."""
from pathlib import Path
import sys,json,math
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];out=Path(sys.argv[1]);m=json.loads((out/'manifest.json').read_text());rig=(root/m['sourceRig']).parent
s=np.load(rig/'attack-samples.npz');data=json.loads((rig/'launch-diagnostics.json').read_text());mvp=s['mvp'].copy();mvp[:2]*=96/128;origin=np.array([.07,.22,-.5]);boards=[]
for f in range(m['framesPerDirection']):
    board=Image.new('RGB',(256,144),(22,20,27));draw=ImageDraw.Draw(board)
    for col,d in enumerate(['W','SW']):
        angle=math.radians(next(v['rotationDegrees'] for v in m['orientations'] if v['direction']==d));r=np.array([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
        def project(p):
            c=mvp@np.r_[(np.array(p)-origin)@r.T+origin,1];return (round((c[0]/c[3]+1)*64)+col*128,round((1-c[1]/c[3])*64))
        for axis in range(2):
            for tick in range(-5,6):
                a=origin.copy();b=origin.copy();a[axis]-=.65;b[axis]+=.65;a[1-axis]+=tick*.12;b[1-axis]+=tick*.12
                pa,pb=project(a),project(b)
                # Draw each ground grid into its own cell so panels stay separate.
                layer=Image.new('RGB',(128,128),(22,20,27)) if axis==0 and tick==-5 else layer
                ImageDraw.Draw(layer).line([(pa[0]-col*128,pa[1]),(pb[0]-col*128,pb[1])],fill=(32,29,35))
        board.paste(layer,(col*128,0))
        advance=next(v['forwardOffset'] for v in data if v['frame']==f);x,y=project(origin+[0,advance,0]);draw.ellipse((x-9,y-3,x+9,y+3),fill=(13,12,17))
        frame=Image.open(out/'frames'/d/f'attack-{f:02d}.png');board.paste(frame,(col*128,0),frame)
        draw.text((col*128+5,131),d+' / LAUNCH',fill=(225,185,135))
    boards.append(board.resize((768,432),Image.Resampling.NEAREST))
seq=[boards[0]]*5+boards+[boards[-1]]*10
seq[0].save(out/'weighted-launch-review.gif',save_all=True,append_images=seq[1:],duration=42,loop=0)
print('Saved ground-reference launch review from existing native pixels')
