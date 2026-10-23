"""Card-faithful idle deformation study. Persistent mesh, local CUDA raster sampling.

This bounded idle does not supply hidden surfaces, walk, flight or other views.
"""
from pathlib import Path
import json, hashlib, math, argparse
import numpy as np
import cv2
import torch
from PIL import Image, ImageDraw

parser=argparse.ArgumentParser()
parser.add_argument('--output',default='card-mesh-idle-001')
args=parser.parse_args()
base=Path('art/source/enemies/ashfang/restart-2026-10-21')
out=base/args.output
out.mkdir(exist_ok=False)
(out/'frames').mkdir()
refpath=base/'references-v5/pixel-idle-reference.png'
ref=Image.open(refpath).convert('RGBA')
W,H=320,192
offset=np.array([48.,40.],np.float32)
texture=Image.new('RGBA',(W,H));texture.paste(ref,tuple(offset.astype(int)))
texture.save(out/'rest-texture.png')
# A continuous triangular surface keeps all original plate/face pixels attached.
xs=np.arange(0,W+1,4,dtype=np.float32);ys=np.arange(0,H+1,4,dtype=np.float32)
v=np.array([(x,y) for y in ys for x in xs],np.float32)
tri=[]
for y in range(len(ys)-1):
    for x in range(len(xs)-1):
        a=y*len(xs)+x;b=a+1;c=a+len(xs);d=c+1
        tri.extend([(a,b,c),(b,d,c)])
tri=np.array(tri,np.int32)
rgba=np.asarray(texture).astype(np.float32)/255
# Only triangles near the sprite need rasterization.
keep=[]
for t in tri:
    p=v[t].astype(int);x0,y0=p.min(0);x1,y1=p.max(0)
    if rgba[y0:min(H,y1+1),x0:min(W,x1+1),3].any():keep.append(t)
tri=np.array(keep,np.int32)
local=v-offset
x,y=local.T
def gaussian(cx,cy,sx,sy):return np.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
support=np.clip((102-y)/19,0,1)
chest=gaussian(112,68,42,31)*support
head=gaussian(160,72,25,24)*support
tail=gaussian(29,84,31,15)*support
near=gaussian(43,30,46,27)
far=gaussian(176,35,35,24)
weights=dict(chest=chest,head=head,tail=tail,nearWing=near,farWing=far,support=support)
def pose(phase):
    p=v.copy();b=math.sin(phase)
    p[:,1]-=1.2*b*chest
    p[:,0]+=.45*b*chest
    p[:,1]+=.75*(math.sin(phase-.35)-math.sin(-.35))*head
    p[:,0]+=.6*(math.sin(phase-.65)-math.sin(-.65))*head
    # Membrane tip lags its root; distinct near/far response, no rigid plank swing.
    p[:,1]+=2.6*(math.sin(phase-.5)-math.sin(-.5))*near
    p[:,0]+=1.0*(math.sin(phase-.25)-math.sin(-.25))*near
    p[:,1]+=1.7*(math.sin(phase-.8)-math.sin(-.8))*far
    p[:,0]-=.65*(math.sin(phase-.4)-math.sin(-.4))*far
    p[:,1]+=1.1*(math.sin(phase-.9)-math.sin(-.9))*tail
    p[:,0]+=.7*(math.sin(phase-.7)-math.sin(-.7))*tail
    return p
assert torch.cuda.is_available(),'Use the authorized local GPU for texture sampling'
device=torch.device('cuda')
src=torch.from_numpy(rgba).permute(2,0,1)[None].to(device)
frames=[];poses=[];ratios=[]
N=64;fps=16
def area(points):
    a=points[:,1]-points[:,0];b=points[:,2]-points[:,0]
    return a[:,0]*b[:,1]-a[:,1]*b[:,0]
restarea=area(v[tri])
for frame in range(N):
    p=pose(2*math.pi*frame/N);poses.append(p.tolist())
    ratios.append((area(p[tri])/restarea).min().item())
    mx=np.full((H,W),-100,np.float32);my=mx.copy()
    for t in tri:
        dst=p[t];original=v[t]
        lo=np.maximum(np.floor(dst.min(0)).astype(int),0)
        hi=np.minimum(np.ceil(dst.max(0)).astype(int),[W-1,H-1])
        x0,y0=lo;x1,y1=hi
        if x1<x0 or y1<y0:continue
        yy,xx=np.mgrid[y0:y1+1,x0:x1+1].astype(np.float32)
        inv=cv2.getAffineTransform(dst.astype(np.float32),original.astype(np.float32))
        mask=np.zeros(xx.shape,np.uint8)
        cv2.fillConvexPoly(mask,np.round((dst-lo)*256).astype(np.int32),1,shift=8)
        hit=mask>0
        mx[y0:y1+1,x0:x1+1][hit]=(inv[0,0]*xx+inv[0,1]*yy+inv[0,2])[hit]
        my[y0:y1+1,x0:x1+1][hit]=(inv[1,0]*xx+inv[1,1]*yy+inv[1,2])[hit]
    grid=np.stack([mx/(W-1)*2-1,my/(H-1)*2-1],-1)
    with torch.inference_mode():
        rendered=torch.nn.functional.grid_sample(src,torch.from_numpy(grid)[None].to(device),mode='nearest',align_corners=True)
    pixels=(rendered[0].permute(1,2,0).cpu().numpy()*255).round().astype(np.uint8)
    im=Image.fromarray(pixels);im.save(out/'frames'/f'idle-{frame:03}.png');frames.append(im)
    if frame%16==0:print(f'Rendered idle {frame}/{N} on {torch.cuda.get_device_name()}',flush=True)
atlas=Image.new('RGBA',(W*8,H*8))
for i,im in enumerate(frames):atlas.paste(im,(i%8*W,i//8*H))
atlas.save(out/'idle-atlas.png')
views=[]
for im in frames:
    board=Image.new('RGB',(960,480),(34,33,37))
    large=im.resize((960,576),Image.Resampling.NEAREST)
    board.paste(large,(0,-65),large)
    draw=ImageDraw.Draw(board);draw.text((16,14),'ASHFANG / ORIGINAL CARD PIXELS / DEFORMING IDLE STUDY',fill=(232,207,178))
    small=im.resize((144,86),Image.Resampling.NEAREST)
    board.paste(small,(790,380),small)
    views.append(board)
views[0].save(out/'idle-preview.gif',save_all=True,append_images=views[1:],duration=1000/fps,loop=0,optimize=False)
sheet=Image.new('RGB',(960,576),(34,33,37))
for i,index in enumerate(range(0,N,8)):
    im=frames[index].resize((320,192),Image.Resampling.NEAREST)
    sheet.paste(im,(i%3*320,i//3*192),im)
sheet.save(out/'idle-contact-sheet.png')
mesh=dict(vertices=v.tolist(),triangles=tri.tolist(),weights={k:w.tolist() for k,w in weights.items()},texture='rest-texture.png',coordinateSystem='image pixels; y down',sourceReference=str(refpath),referenceSha256=hashlib.sha256(refpath.read_bytes()).hexdigest())
(out/'mesh-source.json').write_text(json.dumps(mesh,separators=(',',':')))
(out/'idle-poses.json').write_text(json.dumps(dict(fps=fps,frames=poses),separators=(',',':')))
closure=float(np.max(np.abs(pose(0)-pose(2*math.pi))))
foot_vertices=np.where((local[:,1]>=104)&(local[:,0]>=50)&(local[:,0]<=165))[0]
foot_motion=max(float(np.max(np.linalg.norm(np.array(p)[foot_vertices]-v[foot_vertices],axis=1))) for p in poses)
receipt=dict(status='one-view bounded idle study; visual review required',ownerAccepted=False,riggedForFullLifecycle=False,frames=N,fps=fps,durationSeconds=N/fps,cell=[W,H],atlas=[8,8],gpu=torch.cuda.get_device_name(),minTriangleAreaRatio=min(ratios),flippedTriangles=bool(min(ratios)<=0),loopClosureError=closure,lowerPawVertexMaxDisplacement=foot_motion,source='original card pixels, no generated repaint',limitations=['No walk, attack, flight, alternate directions or hidden-surface art','Small continuous mesh deformations only; not an accepted full creature rig'])
(out/'review.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
