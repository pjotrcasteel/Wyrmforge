"""One-view articulated gait study with IK and explicit stance trajectories."""
from pathlib import Path
import json,math
import numpy as np,cv2,torch
from PIL import Image,ImageDraw
base=Path('art/source/enemies/ashfang/restart-2026-10-21');source=base/'articulated-layers-002';out=base/'layered-stalk-007';out.mkdir(exist_ok=False);(out/'frames').mkdir()
spec=json.loads((source/'source.json').read_text());device='cuda'
W,H=231,115;cw,ch=320,192;offset=(48,40)
body=Image.open(source/'hidden-overlap-001/torso-with-overlap.png').convert('RGBA')
names=['far_hindleg','far_foreleg','near_hindleg','near_foreleg'];phase_offsets=[.5,.75,0,.25]
def ik(rest,root,target):
 lengths=np.linalg.norm(np.diff(rest,axis=0),axis=1);p=rest.copy()+root-rest[0]
 for _ in range(30):
  p[-1]=target
  for i in range(len(p)-2,-1,-1):
   d=p[i]-p[i+1];p[i]=p[i+1]+d/max(np.linalg.norm(d),1e-8)*lengths[i]
  p[0]=root
  for i in range(len(p)-1):
   d=p[i+1]-p[i];p[i+1]=p[i]+d/max(np.linalg.norm(d),1e-8)*lengths[i]
 return p
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
 joints=spec['bones'][name];keys=['shoulder','elbow','paw'] if 'fore' in name else ['hip','knee','hock','paw'];chain=np.array([joints[k] for k in keys],float)
 distances=[];arc_positions=[];lengths=np.linalg.norm(np.diff(chain,axis=0),axis=1);starts=np.concatenate([[0],np.cumsum(lengths)])
 for a,b in zip(chain[:-1],chain[1:]):
  along=np.clip((vertices-a)@(b-a)/np.dot(b-a,b-a),0,1);nearest=a+along[:,None]*(b-a);index=len(distances);distances.append(np.linalg.norm(vertices-nearest,axis=1));arc_positions.append(starts[index]+along*lengths[index])
 nearest_bone=np.argmin(np.array(distances),axis=0);arc=np.array(arc_positions)[nearest_bone,np.arange(len(vertices))];centers=starts[:-1]+lengths*.5
 weights=np.zeros((len(vertices),len(lengths)))
 for index in range(len(lengths)):
  samples=np.zeros(len(lengths));samples[index]=1;weights[:,index]=np.interp(arc,centers,samples)
 for index in range(len(lengths)):
  weights[:,index]=cv2.GaussianBlur(weights[:,index].reshape(len(ys),len(xs)),(0,0),2).reshape(-1)
 pawlock=np.exp(-np.sum((vertices-chain[-1])**2,axis=1)/49)
 weights*=1-pawlock[:,None];weights[:,-1]+=pawlock;weights/=weights.sum(axis=1,keepdims=True)
 layers.append(dict(name=name,texture=torch.from_numpy(rgba).permute(2,0,1)[None].to(device),tri=np.array(kept),chain=chain,weights=weights))
bodyrgba=np.array(body).astype(np.float32)/255;bodytri=[]
for t in tri:
 p=vertices[list(t)].astype(int);lo=p.min(0);hi=p.max(0)
 if bodyrgba[lo[1]:min(H,hi[1]+1),lo[0]:min(W,hi[0]+1),3].any():bodytri.append(t)
bodylayer=dict(texture=torch.from_numpy(bodyrgba).permute(2,0,1)[None].to(device),tri=np.array(bodytri))
def body_displacement(points,phase):
 x,y=points.T;p=phase*2*math.pi
 def g(cx,cy,sx,sy):return np.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
 chest=g(110,66,35,35);pelvis=g(77,77,25,28);head=g(155,65,23,24);near=g(42,29,45,27);far=g(176,33,36,23);tail=g(29,86,35,17)
 dx=.4*math.sin(p)*chest-.3*math.sin(p)*pelvis+.6*math.sin(p-.7)*tail+.5*math.sin(p-.4)*near
 dy=-.65*math.sin(2*p)*chest+.45*math.sin(2*p)*pelvis+.25*math.sin(p-.3)*head+1.5*math.sin(p-.5)*near+.8*math.sin(p-.85)*far+.8*math.sin(p-.8)*tail
 # Lower the centre of mass and extend the gaze in the deliberate stalking pose.
 # The paws remain world-planted through IK instead of following this body shift.
 dx+=1.6*head+.45*chest
 dy+=2.1*chest+1.1*pelvis+2.2*head+.65*near+.45*far
 return np.column_stack([dx,dy])
def min_area_ratio(rest,posed,triangles):
 a=rest[triangles];b=posed[triangles]
 def areas(p):
  u=p[:,1]-p[:,0];v=p[:,2]-p[:,0];return u[:,0]*v[:,1]-u[:,1]*v[:,0]
 return float(np.min(areas(b)/areas(a)))
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
N=64;fps=24;travel=12.;stance=.7;frames=[];records=[];worst_reach=0;worst_foot_error=0;minimum_area=1
for f in range(N):
 phase=f/N;body_shift=np.array([.35*math.sin(2*math.pi*phase),-.65*math.sin(4*math.pi*phase)])
 composed=Image.new('RGBA',(W,H));posed_layers=[];joints_record=[]
 for layer,start in zip(layers,phase_offsets):
  q=(phase+start)%1
  if q<stance:dx=travel*stance/2-travel*q;lift=0
  else:
   swing=(q-stance)/(1-stance);s=swing;d=-travel*(1-stance);dx=(2*s**3-3*s*s+1)*(-travel*stance/2)+(s**3-2*s*s+s)*d+(-2*s**3+3*s*s)*(travel*stance/2)+(s**3-s*s)*d;lift=-5*math.sin(math.pi*swing)**2
  chain=layer['chain'];a=chain[0]+body_displacement(chain[:1],phase)[0];c=chain[-1]+[dx,lift];p=ik(chain,a,c);worst_reach=max(worst_reach,float(np.linalg.norm(c-a)-np.linalg.norm(np.diff(chain,axis=0),axis=1).sum()));worst_foot_error=max(worst_foot_error,float(np.linalg.norm(p[-1]-c)))
  posed=np.zeros_like(vertices,dtype=float)
  for index in range(len(chain)-1):
   r,t=bone_transform(chain[index],chain[index+1],p[index],p[index+1]);posed+=(vertices@r.T+t)*layer['weights'][:,index,None]
  minimum_area=min(minimum_area,min_area_ratio(vertices,posed,layer['tri']))
  posed_layers.append(render(layer,posed));joints_record.append(dict(name=layer['name'],chain=p.tolist(),paw=p[-1].tolist(),target=c.tolist(),stance=q<stance,phase=q))
 # Original visible limb pixels must sit over their hidden attachment paint.
 # Drawing that paint over the far limbs replaced visible armour even at rest.
 bodyposed=vertices+body_displacement(vertices,phase);minimum_area=min(minimum_area,min_area_ratio(vertices,bodyposed,bodylayer['tri']));bodyshifted=render(bodylayer,bodyposed)
 composed.alpha_composite(bodyshifted)
 for im in posed_layers:composed.alpha_composite(im)
 frame=Image.new('RGBA',(cw,ch));frame.paste(composed,offset);frame.save(out/'frames'/f'stalk-{f:03}.png');frames.append(frame);records.append(joints_record)
 if f%12==0:print('Stalk frame',f,flush=True)
atlas=Image.new('RGBA',(cw*8,ch*8))
for i,im in enumerate(frames):atlas.paste(im,(i%8*cw,i//8*ch))
atlas.save(out/'stalk-atlas.png');preview=[]
for f,im in enumerate(frames):
 board=Image.new('RGB',(960,576),(34,33,37));draw=ImageDraw.Draw(board)
 for x in range(-40,1000,36):
  xx=x-int(f/N*travel*3);draw.line((xx,454,xx+18,454),fill=(95,78,63),width=2)
 large=im.resize((960,576),Image.Resampling.NEAREST);board.paste(large,(0,0),large);draw.text((16,16),'ASHFANG / ARTICULATED STALK STUDY / NOT ACCEPTED',fill=(232,207,178));preview.append(board)
preview[0].save(out/'stalk-preview.gif',save_all=True,append_images=preview[1:],duration=1000/fps,loop=0,optimize=False)
sheet=Image.new('RGB',(cw*3,ch*3),(34,33,37))
for i,f in enumerate(range(0,N,8)):sheet.paste(frames[f],(i%3*cw,i//3*ch),frames[f])
sheet.save(out/'contact-sheet.png')
(out/'joint-poses.json').write_text(json.dumps(records,separators=(',',':')))
stance_slip=[]
for f in range(N-1):
 for a,b in zip(records[f],records[f+1]):
  if a['stance'] and b['stance'] and b['phase']>a['phase']:
   stance_slip.append(float(np.linalg.norm(np.array(b['paw'])-a['paw']+[travel/N,0])))
(out/'review.json').write_text(json.dumps(dict(status='Owner-guide articulated stalk with body/wing/tail response; visual review pending',ownerAccepted=False,frames=N,fps=fps,travelPerCycleSourcePixels=travel,stanceFraction=stance,maxReachBeyondBoneLength=worst_reach,maxPawTargetError=worst_foot_error,minTriangleAreaRatio=minimum_area,maxStanceJointWorldDrift=max(stance_slip),gpu=torch.cuda.get_device_name(),limitations=['One view only','Layer cuts/hidden overlap require review','Foot contact metric uses joints; raster appearance still needs inspection']),indent=2)+'\n')
print('Stalk study saved. Review before acceptance.')
