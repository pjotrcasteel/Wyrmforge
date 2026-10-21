"""One-view articulated gait study with IK and explicit stance trajectories."""
from pathlib import Path
import json,math
import numpy as np,cv2,torch
from PIL import Image,ImageDraw
base=Path('art/source/enemies/ashfang/restart-2026-10-21');source=base/'articulated-layers-001';out=base/'layered-stalk-001';out.mkdir(exist_ok=False);(out/'frames').mkdir()
spec=json.loads((source/'source.json').read_text());device='cuda'
W,H=231,115;cw,ch=320,192;offset=(48,40)
body=Image.open(source/'hidden-overlap-001/torso-with-overlap.png').convert('RGBA')
names=['far_hindleg','far_foreleg','near_hindleg','near_foreleg'];phase_offsets=[.5,.75,0,.25]
def ik(a,c,l1,l2,sign):
 diff=c-a;distance=np.linalg.norm(diff);used=min(distance,l1+l2-.001);unit=diff/max(distance,.001)
 along=(l1*l1-l2*l2+used*used)/(2*used);height=math.sqrt(max(0,l1*l1-along*along))
 return a+unit*along+sign*np.array([-unit[1],unit[0]])*height
def bone_transform(a,b,aa,bb):
 angle=math.atan2(*(bb-aa)[::-1])-math.atan2(*(b-a)[::-1]);c,s=math.cos(angle),math.sin(angle);r=np.array([[c,-s],[s,c]])
 return r,aa-r@a
xs=np.arange(0,W+3,3);ys=np.arange(0,H+3,3);vertices=np.array([(x,y) for y in ys for x in xs],np.float32)
tri=[]
for j in range(len(ys)-1):
 for i in range(len(xs)-1):
  a=j*len(xs)+i;b=a+1;c=a+len(xs);tri.extend([(a,b,c),(b,c+1,c)])
layers=[]
for name in names:
 im=Image.open(source/(name+'.png')).convert('RGBA');rgba=np.array(im).astype(np.float32)/255;kept=[]
 for t in tri:
  p=vertices[list(t)].astype(int);lo=p.min(0);hi=p.max(0)
  if rgba[lo[1]:min(H,hi[1]+1),lo[0]:min(W,hi[0]+1),3].any():kept.append(t)
 joints=spec['bones'][name];a=np.array(joints.get('shoulder',joints.get('hip')),float);b=np.array(joints.get('elbow',joints.get('knee')),float);c=np.array(joints['paw'],float)
 l1=np.linalg.norm(b-a);l2=np.linalg.norm(c-b);sign=np.sign(np.cross(c-a,b-a))
 # Smooth transition around the elbow/knee, with rigid paw tips below the joint.
 along=(vertices-b)@(c-b)/np.dot(c-b,c-b);lower=np.clip(.5+along*2,0,1)
 layers.append(dict(name=name,texture=torch.from_numpy(rgba).permute(2,0,1)[None].to(device),tri=np.array(kept),a=a,b=b,c=c,l1=l1,l2=l2,sign=sign,lower=lower))
def render(layer,posed):
 mx=np.full((H,W),-100,np.float32);my=mx.copy()
 for t in layer['tri']:
  dst=posed[t].astype(np.float32);original=vertices[t];lo=np.maximum(np.floor(dst.min(0)).astype(int),0);hi=np.minimum(np.ceil(dst.max(0)).astype(int),[W-1,H-1]);x0,y0=lo;x1,y1=hi
  if x1<x0 or y1<y0:continue
  yy,xx=np.mgrid[y0:y1+1,x0:x1+1].astype(np.float32);inv=cv2.getAffineTransform(dst,original);mask=np.zeros(xx.shape,np.uint8);cv2.fillConvexPoly(mask,np.round((dst-lo)*256).astype(np.int32),1,shift=8);hit=mask>0
  mx[y0:y1+1,x0:x1+1][hit]=(inv[0,0]*xx+inv[0,1]*yy+inv[0,2])[hit];my[y0:y1+1,x0:x1+1][hit]=(inv[1,0]*xx+inv[1,1]*yy+inv[1,2])[hit]
 grid=torch.from_numpy(np.stack([mx/(W-1)*2-1,my/(H-1)*2-1],-1))[None].to(device)
 with torch.inference_mode():sample=torch.nn.functional.grid_sample(layer['texture'],grid,mode='nearest',align_corners=True)
 return Image.fromarray((sample[0].permute(1,2,0).cpu().numpy()*255).round().astype('uint8'))
N=48;fps=16;travel=8.;stance=.7;frames=[];records=[];worst_reach=0
for f in range(N):
 phase=f/N;body_shift=np.array([.35*math.sin(2*math.pi*phase),-.65*math.sin(4*math.pi*phase)])
 composed=Image.new('RGBA',(W,H));posed_layers=[];joints_record=[]
 for layer,start in zip(layers,phase_offsets):
  q=(phase+start)%1
  if q<stance:dx=travel*stance/2-travel*q;lift=0
  else:
   swing=(q-stance)/(1-stance);s=swing*swing*(3-2*swing);dx=-travel*stance/2+travel*stance*s;lift=-4*math.sin(math.pi*swing)**2
  a=layer['a']+body_shift;c=layer['c']+[dx,lift];b=ik(a,c,layer['l1'],layer['l2'],layer['sign']);worst_reach=max(worst_reach,float(np.linalg.norm(c-a)-layer['l1']-layer['l2']))
  r1,t1=bone_transform(layer['a'],layer['b'],a,b);r2,t2=bone_transform(layer['b'],layer['c'],b,c);low=layer['lower'][:,None]
  posed=(vertices@r1.T+t1)*(1-low)+(vertices@r2.T+t2)*low
  posed_layers.append(render(layer,posed));joints_record.append(dict(name=layer['name'],root=a.tolist(),joint=b.tolist(),paw=c.tolist(),stance=q<stance,phase=q))
 # Far legs behind torso, near legs in front. Hidden attachment paint bridges cuts.
 for im in posed_layers[:2]:composed.alpha_composite(im)
 bodyshifted=body.transform((W,H),Image.Transform.AFFINE,(1,0,-body_shift[0],0,1,-body_shift[1]),resample=Image.Resampling.NEAREST)
 composed.alpha_composite(bodyshifted)
 for im in posed_layers[2:]:composed.alpha_composite(im)
 frame=Image.new('RGBA',(cw,ch));frame.paste(composed,offset);frame.save(out/'frames'/f'stalk-{f:03}.png');frames.append(frame);records.append(joints_record)
 if f%12==0:print('Stalk frame',f,flush=True)
atlas=Image.new('RGBA',(cw*8,ch*6))
for i,im in enumerate(frames):atlas.paste(im,(i%8*cw,i//8*ch))
atlas.save(out/'stalk-atlas.png');preview=[]
for f,im in enumerate(frames):
 board=Image.new('RGB',(960,576),(34,33,37));draw=ImageDraw.Draw(board)
 for x in range(-40,1000,36):
  xx=x-int(f/N*travel*3);draw.line((xx,454,xx+18,454),fill=(95,78,63),width=2)
 large=im.resize((960,576),Image.Resampling.NEAREST);board.paste(large,(0,0),large);draw.text((16,16),'ASHFANG / ARTICULATED STALK STUDY / NOT ACCEPTED',fill=(232,207,178));preview.append(board)
preview[0].save(out/'stalk-preview.gif',save_all=True,append_images=preview[1:],duration=1000/fps,loop=0,optimize=False)
sheet=Image.new('RGB',(cw*3,ch*3),(34,33,37))
for i,f in enumerate(range(0,N,6)):sheet.paste(frames[f],(i%3*cw,i//3*ch),frames[f])
sheet.save(out/'contact-sheet.png')
(out/'joint-poses.json').write_text(json.dumps(records,separators=(',',':')))
(out/'review.json').write_text(json.dumps(dict(status='First articulated stalk study; visual and contact review pending',ownerAccepted=False,frames=N,fps=fps,travelPerCycleSourcePixels=travel,stanceFraction=stance,maxReachBeyondBoneLength=worst_reach,gpu=torch.cuda.get_device_name(),limitations=['One view only','Small stride; source layer cuts/hidden overlap require review','Body and wing secondary articulation not yet added to this gait']),indent=2)+'\n')
print('Stalk study saved. Review before acceptance.')
