"""Repeatable high-contrast, enlarged-grip and detached-pixel source review."""
import argparse
import json
from pathlib import Path
from PIL import Image,ImageDraw

parser=argparse.ArgumentParser()
parser.add_argument('--source',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[3];source=root/args.source
out=source/'review';out.mkdir(exist_ok=True)
project=json.loads((source/'project.json').read_text())
clip=project.get('clipName','walk')
frames=[Image.open(source/f'frames/{clip}-{i:02}.png').convert('RGBA') for i in range(16)]
cell=project['exportCell'];reports=[]
for i,im in enumerate(frames):
    alpha=im.getchannel('A');pixels=alpha.load();seen=set();parts=[]
    for y in range(cell):
        for x in range(cell):
            if not pixels[x,y] or (x,y) in seen:continue
            queue=[(x,y)];seen.add((x,y))
            for px,py in queue:
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        nx,ny=px+dx,py+dy
                        if 0<=nx<cell and 0<=ny<cell and pixels[nx,ny] and (nx,ny) not in seen:
                            seen.add((nx,ny));queue.append((nx,ny))
            parts.append(dict(pixels=len(queue),bounds=[min(x for x,y in queue),min(y for x,y in queue),max(x for x,y in queue),max(y for x,y in queue)]))
    parts.sort(key=lambda p:p['pixels'],reverse=True)
    bounds=im.getbbox();binary=set(alpha.get_flattened_data())<={0,255}
    reports.append(dict(frame=i,binaryAlpha=binary,bounds=bounds,components=parts,
                        flagged=len(parts)!=1 or not binary or min(bounds[:2])<=1 or max(bounds[2:])>=cell-1))
for name,bg,fg in [('light','#b8b2a5','#151515'),('dark','#24262b','#ededdf')]:
    board=Image.new('RGB',(cell*8,cell*8),bg);draw=ImageDraw.Draw(board)
    for i,im in enumerate(frames):
        big=im.resize((cell*2,cell*2),Image.Resampling.NEAREST);xy=((i%4)*cell*2,(i//4)*cell*2)
        board.paste(big,xy,big);draw.text((xy[0]+5,xy[1]+5),str(i),fill=fg)
    board.save(out/(name+'-contact.png'))
# Fixed crop around source grip, includes sleeve and surrounding empty space.
hand=Image.open(source/'source-layers/staff-hand.png').getbbox();ox,oy=project['offset']
cx=(hand[0]+hand[2])//2+ox;cy=(hand[1]+hand[3])//2+oy
crop=(max(0,cx-24),max(0,cy-20),min(cell,cx+32),min(cell,cy+42))
w,h=(crop[2]-crop[0])*4,(crop[3]-crop[1])*4
board=Image.new('RGB',(w*4,h*4),'#b8b2a5');draw=ImageDraw.Draw(board)
for i,im in enumerate(frames):
    detail=im.crop(crop).resize((w,h),Image.Resampling.NEAREST);xy=((i%4)*w,(i//4)*h)
    board.paste(detail,xy,detail);draw.text((xy[0]+5,xy[1]+5),str(i),fill='black')
board.save(out/'grip-sleeve-detail.png')
feet=[]
for name in ('boot-left','boot-right'):
    box=Image.open(source/'source-layers'/(name+'.png')).getbbox();feet.append(box)
foot_crop=(max(0,min(b[0] for b in feet)+ox-10),max(0,min(b[1] for b in feet)+oy-10),
           min(cell,max(b[2] for b in feet)+ox+10),min(cell,max(b[3] for b in feet)+oy+12))
fw,fh=(foot_crop[2]-foot_crop[0])*4,(foot_crop[3]-foot_crop[1])*4
board=Image.new('RGB',(fw*4,fh*4),'#85888c');draw=ImageDraw.Draw(board)
for i,im in enumerate(frames):
    detail=im.crop(foot_crop).resize((fw,fh),Image.Resampling.NEAREST);xy=((i%4)*fw,(i//4)*fh)
    board.paste(detail,xy,detail);draw.text((xy[0]+5,xy[1]+5),str(i),fill='white')
board.save(out/'feet-detail.png')
if 'clothReviewCrop' in project:
    box=project['clothReviewCrop'];cw,ch=(box[2]-box[0])*4,(box[3]-box[1])*4
    board=Image.new('RGB',(cw*4,ch*4),'#b8b2a5');draw=ImageDraw.Draw(board)
    for i,im in enumerate(frames):
        detail=im.crop(box).resize((cw,ch),Image.Resampling.NEAREST);xy=((i%4)*cw,(i//4)*ch)
        board.paste(detail,xy,detail);draw.text((xy[0]+5,xy[1]+5),str(i),fill='black')
    board.save(out/'cape-detail.png')
report=dict(scope='source raster diagnostics, NOT artistic approval or actual Hunt/device acceptance',
            detachedPixelRule='8-connected alpha; extra components require inspection, never silently called accepted',
            direction=project['direction'],reviewCrop=crop,feetReviewCrop=foot_crop,frames=reports,
            flaggedFrames=[r['frame'] for r in reports if r['flagged']])
(out/'artifact-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(direction=project['direction'],flaggedFrames=report['flaggedFrames'],components=[len(r['components']) for r in reports])))
