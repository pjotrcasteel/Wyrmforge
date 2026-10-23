"""Side-view source motion plus actual bone overlay for the body-mechanics gate."""
from pathlib import Path
import json, sys
import numpy as np
from PIL import Image, ImageDraw

rig = Path(sys.argv[1])
review = rig / (sys.argv[2] if len(sys.argv)>2 else 'motion-review-v1')
out = rig / 'body-review-v1'
out.mkdir(exist_ok=False)
source = np.load(rig / 'takeoff-flight-land-samples.npz')
names = list(source['boneNames'])
audit = [q for q in json.loads((rig/'paw-contact-audit.json').read_text()) if q['clip']=='takeoff-flight-land']
eye = np.array([3, 0, .7]);forward = -eye/np.linalg.norm(eye)
right = np.cross(forward,[0,0,1]);right /= np.linalg.norm(right)
up = np.cross(right,forward)
def project(point, offset=0):
    return (offset+round((np.dot(right,point)/1.2+1)*96),
            round((1-(np.dot(up,point)/1.2-.1))*96))

frames=[]
for frame, points in enumerate(source['bonePoints']):
    image = Image.open(review/'takeoff-flight-land'/f'view-1-frame-{frame:02d}.png')
    board=Image.new('RGB',(384,228),(24,22,27));board.paste(image,(0,0),image);board.paste(image,(192,0),image)
    draw=ImageDraw.Draw(board)
    for name, ends in zip(names,points):
        if name in ['pelvis','spine','chest','neck.0','neck.1','head']:
            color=(245,194,100)
        elif name.startswith(('fore.','hind.')):
            color=(119,171,139)
        elif name.startswith('tail.'):
            color=(127,149,187)
        else:
            continue
        a,b=(project(point,192) for point in ends)
        draw.line((a,b),fill=color,width=1)
        draw.rectangle((a[0]-1,a[1]-1,a[0]+1,a[1]+1),fill=color)
    draw.text((5,195),'SOURCE SIDE',fill=(220,190,145));draw.text((197,195),'ACTUAL BONE POSE',fill=(220,190,145))
    draw.text((5,211),f'{frame+1}/{len(audit)} | {audit[frame]["phaseLabel"]}',fill=(190,174,150))
    frames.append(board.resize((768,456),Image.Resampling.NEAREST))
durations=[(round((i+1)*100/24)-round(i*100/24))*10 for i in range(len(frames))]
frames[0].save(out/'body-mechanics.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0)
sheet=Image.new('RGB',(768*3,456*2),(24,22,27))
for index,frame in enumerate([8,14,18,22,68,71]):sheet.paste(frames[frame],((index%3)*768,(index//3)*456))
sheet.save(out/'body-keyposes.png')
print('Saved actual-pose source review:',out,flush=True)
