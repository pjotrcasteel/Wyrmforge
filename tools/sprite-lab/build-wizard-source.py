#!/usr/bin/env python3
"""WyrmForge: editable deterministic 3D prototype source for one wizard / six staff skins.
Standalone CPU software exporter so mesh, albedo and normals follow the SAME pose.
Not a replacement for the final reviewed Blender production rig or animations.
"""
from __future__ import annotations
import argparse, colorsys, json, math, zipfile
from functools import lru_cache
from dataclasses import dataclass
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
import trimesh

CELL=128; ANCHOR=(64,106); SCALE=38
DIRECTIONS=['N','NE','E','SE','S','SW','W','NW']
ROTATIONS={'S':0,'SW':45,'W':90,'NW':135,'N':180,'NE':225,'E':270,'SE':315}
SCHOOLS={
 'fire':(151,78,48),'frost':(107,149,163),'storm':(168,144,65),
 'arcane':(119,94,150),'necromancer':(100,119,82),'summoner':(139,118,79)}

# Only material albedo and form pigment: no baked point light or bloom.
COLORS={'edge':(30,27,29),'charcoal':(48,48,49),'robe':(76,73,72),'robe2':(92,87,83),
'robe_shade':(60,59,59),'robe_fade':(100,95,88),'trim':(89,77,71),
'linen':(119,113,101),'belt':(64,48,39),'boots':(44,38,35),'skin':(135,105,87),
'hair':(165,155,139),'hair_dark':(118,114,107),'metal':(98,99,98),
'wood':(84,61,44),'wood_light':(118,88,65),'shadow':(55,52,54)}

def vec(p): return np.asarray(p,dtype=float)
def mix(a,b,t):return vec(a)*(1-t)+vec(b)*t
def adjust(color,m=1):return tuple(int(max(0,min(255,c*m))) for c in color)
def angle_rotate(v,degrees):
 a=math.radians(degrees); x,y,z=v;return np.array([x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z])

@dataclass
class Tri:
    a:np.ndarray;b:np.ndarray;c:np.ndarray;color:tuple;material:str;part:str

class Mesh:
 def __init__(self):self.faces=[]
 def tri(self,a,b,c,color,material='cloth',part='body'):
  self.faces.append(Tri(vec(a),vec(b),vec(c),tuple(color),material,part))
 def quad(self,a,b,c,d,color,material='cloth',part='body'):
  self.tri(a,b,c,color,material,part);self.tri(a,c,d,color,material,part)
 def ring(self,points_a,points_b,palette,material='cloth',part='body',closed=True):
  size=len(points_a);limit=size if closed else size-1
  for i in range(limit):
   j=(i+1)%size;color=palette[i%len(palette)]
   self.quad(points_a[i],points_a[j],points_b[j],points_b[i],color,material,part)
 def taper(self,p0,p1,r0,r1,color,n=9,material='cloth',part='body',ellipse=(1,1),seed=0):
  p0=vec(p0);p1=vec(p1);axis=p1-p0;axis=axis/max(1e-9,np.linalg.norm(axis))
  ref=np.array([0,1,0]) if abs(axis[2])>.9 else np.array([0,0,1])
  side=np.cross(axis,ref);side/=np.linalg.norm(side);other=np.cross(axis,side)
  ring0=[];ring1=[]
  for i in range(n):
   theta=2*math.pi*i/n;surface=side*(math.cos(theta)*ellipse[0])+other*(math.sin(theta)*ellipse[1]);
   ring0.append(p0+r0*surface);ring1.append(p1+r1*surface)
  shades=[adjust(color,1+.045*math.sin(i*2.7+seed)) for i in range(n)]
  self.ring(ring0,ring1,shades,material,part)
  if r0>.005:
   for i in range(n):self.tri(p0,ring0[(i+1)%n],ring0[i],color,material,part)
  if r1>.005:
   for i in range(n):self.tri(p1,ring1[i],ring1[(i+1)%n],color,material,part)
 def cone(self,p0,p1,r0,color,n=11,material='cloth',part='body'):
  self.taper(p0,p1,r0,.01,color,n,material,part)
 def sphere(self,center,radii,color,n=10,stacks=6,material='skin',part='body',tint=0):
  center=vec(center);rx,ry,rz=radii
  for j in range(stacks):
   v0=-math.pi/2+math.pi*j/stacks;v1=-math.pi/2+math.pi*(j+1)/stacks
   a=[];b=[]
   for k in range(n):
    u=k*2*math.pi/n
    a.append(center+[rx*math.cos(v0)*math.cos(u),ry*math.cos(v0)*math.sin(u),rz*math.sin(v0)])
    b.append(center+[rx*math.cos(v1)*math.cos(u),ry*math.cos(v1)*math.sin(u),rz*math.sin(v1)])
   colors=[adjust(color,1+.035*math.sin(k*2.1+j+tint)) for k in range(n)]
   self.ring(a,b,colors,material,part)
 def tube(self,coords,r,color,material='wood',part='staff',n=7):
  for a,b in zip(coords,coords[1:]):self.taper(a,b,r,r*.94,color,n,material,part)



@lru_cache(maxsize=128)
def cloth_secondary_pose(clip, frame):
 """Deterministic bounded mass-spring secondary motion (not Blender cloth).

 Hem and cape respond to tension, neighbour shear, damping, gravity and
 foot-plane constraints. Warm-up cycles prevent gait loop discontinuities.
 This is not a substitute for final cloth self/body collision.
 """
 n=20
 angles=np.arange(n)*2*math.pi/n
 hem_rest=np.stack([.435*np.cos(angles),.305*np.sin(angles),np.full(n,.155)],axis=1)
 cape_rest=np.array([[-.39+k*.13,.34,.26+.045*math.sin(k*3.8)] for k in range(7)])
 hem_pos=hem_rest.copy();cape_pos=cape_rest.copy()
 hem_vel=np.zeros_like(hem_pos);cape_vel=np.zeros_like(cape_pos)
 dt=1/48
 steps=16*5*3+(frame%16)*3 if clip=='walk' else 3*max(0,frame)
 for step in range(steps+1):
  phase=2*math.pi*((step/3)%16)/16
  travelling=clip=='walk'
  gait_acc=np.array([1.15*math.sin(phase+.3),-1.7*math.sin(phase+.8),0]) if travelling else np.zeros(3)
  hem_delta=hem_pos-hem_rest
  neighbors=np.roll(hem_delta,1,axis=0)+np.roll(hem_delta,-1,axis=0)-2*hem_delta
  force=-32.0*hem_delta-5.5*hem_vel+10.0*neighbors
  force+=gait_acc[None,:]*(.65+.35*np.sin(angles[:,None])**2)
  force[:,2]-=.22
  hem_vel+=force*dt
  hem_pos+=hem_vel*dt
  hem_pos[:,2]=np.maximum(hem_pos[:,2],.105)
  hem_vel[:,2]=np.where((hem_pos[:,2]<=.105)&(hem_vel[:,2]<0),0,hem_vel[:,2])
  hem_pos=hem_rest+np.clip(hem_pos-hem_rest,-.17,.17)
  cape_delta=cape_pos-cape_rest
  cape_neighbors=np.zeros_like(cape_delta)
  cape_neighbors[1:-1]=cape_delta[:-2]+cape_delta[2:]-2*cape_delta[1:-1]
  cape_force=-19.0*cape_delta-5.5*cape_vel+8*cape_neighbors
  if travelling:
   cape_force+=np.array([1.45*math.sin(phase+.38),-1.75*math.sin(phase-.25),0])[None,:]
  cape_force[:,2]-=.25
  cape_vel+=cape_force*dt
  cape_pos+=cape_vel*dt
  cape_pos[:,2]=np.maximum(cape_pos[:,2],.11)
  cape_pos=cape_rest+np.clip(cape_pos-cape_rest,-.20,.20)
 return tuple(map(tuple,hem_pos-hem_rest)),tuple(map(tuple,cape_pos-cape_rest))


def staff_charge(clip, frame):
 """Cast wind-up happens BEFORE release; emission stays outside base albedo."""
 if clip!='cast':return 0.0
 t=max(0,min(1,frame/19))
 smooth=lambda x:(max(0,min(1,x))**2)*(3-2*max(0,min(1,x)))
 if t<.23:return .70*smooth(t/.23)
 if t<.46:return .70+.30*smooth((t-.23)/.23)
 if t<.78:return 1.0
 return max(0,1-smooth((t-.78)/.22))

def create_pose(school='fire',clip='walk',frame=0):
 if school not in SCHOOLS:raise ValueError(school)
 color=SCHOOLS[school];m=Mesh()
 # Source animation motion is in model space, neither camera jitter nor drawn repeats.
 t=frame/16.0;phase=2*math.pi*t
 moving=clip=='walk';cast=clip=='cast';hurt=clip=='hurt';dying=clip=='death'
 swing=math.sin(phase) if moving else 0
 stride=.20*swing if moving else 0
 lift_l=max(0,-swing)*.10 if moving else 0
 lift_r=max(0,swing)*.10 if moving else 0
 body_bob=.024*(1-math.cos(phase*2)) if moving else .008*math.sin(phase*.5) if clip=='idle' else 0
 bracing=math.sin(min(1,frame/11)*math.pi)*.07 if cast else 0
 recoil=.20*math.sin(min(1,frame/9)*math.pi) if hurt else 0
 fall=max(0,min(1,(frame-4)/18)) if dying else 0
 lean=-.1*fall+recoil-bracing
 pitch=fall*1.35
 # Hierarchical forward fall around feet/pelvis for terminal death, keeps the actual foot root.
 def bend(point):
  x,y,z=point; yy=y + math.sin(pitch)*(z-.2)*.78+lean*(z-.3); zz=.18+(z-.18)*math.cos(pitch)
  return (x,yy,zz+body_bob*(1-fall))
 def xyz(x,y,z):return bend((x,y,z))
 # Legs, boots: opposite stance phases and walking contact. No implied player movement.
 for sign in (-1,1):
  x=sign*.205
  pos=(stride if sign>0 else -stride)
  height=lift_r if sign>0 else lift_l
  m.taper(xyz(x,.08,.83),xyz(x,pos*.55-.02,.21+height),.105,.075,COLORS['charcoal'],10,'cloth','leg')
  foot0=xyz(x,pos*.55-.07,.21+height);foot1=xyz(x,pos-.14,.095+height)
  m.sphere(foot0,(.113,.13,.125),COLORS['boots'],10,5,'leather','boot')
  m.sphere(foot1,(.117,.19,.075),COLORS['boots'],10,5,'leather','boot')
  # brass boot buckle: restrained pixel-scale
  m.taper(xyz(x,pos*.55-.19,.25+height),xyz(x,pos*.55-.19,.285+height),.022,.022,COLORS['metal'],5,'metal','boot')
 # Bounded secondary cloth motion with mass, damping and neighbour constraints.
 hem_offsets,cape_offsets=cloth_secondary_pose(clip,frame)
 # Twenty 3D strips; feet remain separately visible.
 n=20;low=[];mid=[];top=[];hem=[]
 for i in range(n):
  a=2*math.pi*i/n
  bottom_noise=.042*math.sin(i*5.12+1.4)
  displacement=hem_offsets[i]
  rr=.435+bottom_noise
  low.append(xyz(rr*math.cos(a)+displacement[0],(rr*.70)*math.sin(a)+.045+displacement[1],.12+displacement[2]))
  mid.append(xyz(.37*math.cos(a)+displacement[0]*.48,.26*math.sin(a)+.06+displacement[1]*.48,.53+displacement[2]*.12))
  top.append(xyz(.265*math.cos(a),.208*math.sin(a)+.035,1.12))
  hem.append(xyz(rr*math.cos(a)+displacement[0],(rr*.70)*math.sin(a)+.045+displacement[1],.17+displacement[2]))
 pal=[COLORS['robe'],COLORS['robe'],COLORS['robe2'],COLORS['robe_shade'],COLORS['robe'],COLORS['robe_fade']]
 # Split the coat's front hem into left/right panels: visible planted boots and knees.
 for i in range(n):
  if i in (14,15):continue
  j=(i+1)%n
  m.quad(low[i],low[j],mid[j],mid[i],adjust(pal[(i*3+int(i/3))%6],1+.04*math.sin(i*1.7)),'cloth','robe')
 m.ring(mid,top,[pal[(i*2+1)%6] for i in range(n)],'cloth','robe')
 for i in range(n):
  if i in (14,15): continue
  j=(i+1)%n
  m.quad(low[i],low[j],hem[j],hem[i],COLORS['edge'] if i%2 else COLORS['robe_shade'],'cloth','hem')
 # Asymmetric rear cloak (not full circular sprite outline), capelike cloth three panels.
 for panel in range(7):
  x0=-.39+panel*.13
  zbottom=.24+.045*math.sin(panel*3.8)
  tail=cape_offsets[panel]
  a=xyz(x0,-0.0,1.55);b=xyz(x0+.14,.12,1.47)
  c=xyz(x0+.13+tail[0],.37+tail[1],zbottom+tail[2]);d=xyz(x0+tail[0],.31+tail[1],zbottom-.01+tail[2])
  m.quad(a,b,c,d,adjust(COLORS['robe_shade'],.9+.055*(panel%4)), 'cloth','cape')
 # Upper torso, folded collar and stitched sleeves
 m.taper(xyz(0,.015,.93),xyz(0,0,1.61),.27,.285,COLORS['robe2'],14,'cloth','torso',ellipse=(1,.72))
 m.taper(xyz(0,-.08,1.49),xyz(0,-.09,1.54),.266,.25,COLORS['linen'],12,'cloth','collar',ellipse=(1,.75))
 m.taper(xyz(0,-.09,.98),xyz(0,-.09,1.01),.28,.28,COLORS['belt'],14,'leather','belt',ellipse=(1,.72))
 # A subtle school-specific scarf fold; no blanket recolor.
 m.quad(xyz(-.075,-.2,1.56),xyz(-.012,-.21,1.56),xyz(.04,-.195,1.22),xyz(-.03,-.2,1.21),adjust(color,.76),'cloth','school-accent')
 for side in (-1,1):
  sx=side*.31
  elbow=(sx+side*.09,-.08,1.19)
  wrist=(sx+side*.11,-.23,.99)
  if side>0: # the staff hand owns the grip, not an independent floating prop
   wrist=(.51,-.28,1.16+.07*math.sin(phase+.5) if moving else 1.16+.32*bracing*5 if cast else 1.16)
   elbow=(.39,-.09,1.35+.12*bracing*5 if cast else 1.35)
  else:
   wrist=(sx-side*.08,-.13,.99+.04*math.sin(phase) if moving else .99)
  m.sphere(xyz(sx,0,1.47),(.132,.137,.13),COLORS['robe2'],9,6,'cloth','shoulder')
  m.taper(xyz(sx,0,1.47),xyz(*elbow),.142,.10,COLORS['robe2'],9,'cloth','upper-arm')
  m.taper(xyz(*elbow),xyz(*wrist),.105,.075,COLORS['robe_shade'],9,'cloth','forearm')
  m.sphere(xyz(*wrist),(.072,.081,.071),COLORS['skin'],10,5,'skin','hands')
  m.taper(xyz(wrist[0],wrist[1],wrist[2]+.045),xyz(wrist[0],wrist[1],wrist[2]+.065),.082,.085,COLORS['trim'],8,'leather','cuff')
 # Pouch and looped strap anchored on same torso motion
 m.sphere(xyz(-.25,-.11,1.00),(.135,.08,.185),COLORS['belt'],10,6,'leather','pouch')
 m.taper(xyz(-.21,-.151,.99),xyz(-.21,-.16,1.06),.028,.028,COLORS['metal'],6,'metal','pouch-clasp')
 # Neck / head; beard strands are layered real tapered 3D pieces, not blank triangular white decal.
 m.taper(xyz(0,-.01,1.51),xyz(0,-.01,1.71),.105,.104,COLORS['skin'],10,'skin','neck')
 m.sphere(xyz(0,-.065,1.75),(.196,.161,.213),COLORS['skin'],12,8,'skin','face')
 m.sphere(xyz(0,.045,1.75),(.202,.14,.208),COLORS['hair_dark'],12,8,'hair','rear-hair')
 for sign in (-1,1):
  m.taper(xyz(.13*sign,-.146,1.77),xyz(.17*sign,-.195,1.51),.063,.015,COLORS['hair'],8,'hair','side-beard')
  # face-readable eyebrow socket and dark eye
  m.sphere(xyz(.075*sign,-.2,1.775),(.03,.015,.019),COLORS['shadow'],7,4,'skin','eye')
  m.taper(xyz(.09*sign,-.14,1.56),xyz(.075*sign,-.17,1.12+.022*math.sin(phase+sign) if moving else 1.12),.102,.026,adjust(COLORS['hair'],1+.04*sign),9,'hair','beard')
 m.taper(xyz(0,-.143,1.62),xyz(0,-.175,1.31),.125,.052,COLORS['hair_dark'],11,'hair','beard-middle')
 m.sphere(xyz(0,-.22,1.67),(.043,.055,.069),COLORS['skin'],8,5,'skin','nose')
 # Hat is weathered felt: asymmetric flared brim; pointed bent crown; leather band.
 brim0=[];brim1=[]
 for i in range(18):
  a=i*2*math.pi/18;rad=.45+.07*math.sin(a*3+.9)+.025*math.cos(a*5)
  brim0.append(xyz(rad*math.cos(a),rad*.68*math.sin(a),1.963+.018*math.sin(a*2)))
  brim1.append(xyz(rad*.7*math.cos(a),rad*.51*math.sin(a),2.003))
 m.ring(brim0,brim1,[COLORS['charcoal'],COLORS['robe_shade'],COLORS['robe']],'felt','hat-brim')
 m.taper(xyz(0,0,1.985),xyz(.07,.045,2.32),.278,.03,COLORS['charcoal'],15,'felt','hat-crown',ellipse=(1,.77))
 m.taper(xyz(0,-.0,2.075),xyz(.012,0,2.097),.255,.251,COLORS['belt'],14,'leather','hat-band',ellipse=(1,.77))
 # School thread flecks beneath left edge and cuffs, only ~2% of body surface.
 for j in range(4):
  z=.46+j*.16
  m.taper(xyz(-.262+.003*j,-.015,z),xyz(-.265+.004*j,-.016,z+.045),.011,.009,adjust(color,.75),7,'thread','accent-hem')
 # Staff: a continuous carved wooden shaft and true 3D school head attached at the right hand.
 hand=np.array([.51,-.28,1.16+.07*math.sin(phase+.5) if moving else 1.16+.32*bracing*5 if cast else 1.16]);
 staff_tip=np.array([.62,-.3,2.27])+[.065*math.sin(phase+.3) if moving else 0,0,.2*math.sin(min(1,frame/19)*math.pi) if cast else 0]
 staff_base=hand+(hand-staff_tip)*(.98/max(.01,staff_tip[2]-hand[2]))
 # Ensure base remains planted in idle, swing when walking.
 staff_base[2]=.11+max(0,math.sin(phase))*.06 if moving else .105
 stem=[xyz(*staff_base),xyz(*hand),xyz(*staff_tip)]
 # School-color pigment across the shaft, leaving grain dark and grounded.
 shaft=tuple(round(v) for v in mix(COLORS['wood'],color,.80))
 shaft_highlight=tuple(round(v) for v in mix(COLORS['wood_light'],color,.92))
 m.tube(stem,.046,adjust(shaft,.92), 'wood','staff',8)
 m.tube([xyz(*staff_base),xyz(*hand)],.015,shaft_highlight,'wood','staff-core',6)
 for k in (0.2,.36,.59,.78):
  p=hand*(1-k)+staff_tip*k
  m.taper(xyz(*(p+[0,0,-.023])),xyz(*(p+[0,0,.022])),.052,.055,shaft_highlight,7,'staff-rune','staff-ring')
 top=staff_tip
 if school=='fire':
  for dx,dy,dz in ((-.095,.00,.23),(.06,-.02,.25),(.0,.02,.13)):
   m.taper(xyz(*(top+[0,0,-.04])),xyz(*(top+[dx,dy,dz])),.04,.008,COLORS['metal'],7,'metal','fire-prongs')
  m.sphere(xyz(*(top+[0,0,.12])),(.060,.06,.08),color,9,5,'staff-emissive','fire-coal')
 elif school=='frost':
  m.sphere(xyz(*(top+[0,0,.12])),(.095,.07,.17),adjust(color,.92),6,6,'staff-emissive','frost-crown')
  for i in range(3):
   dx=(-1+i)*.11;m.cone(xyz(*(top+[dx*.48,0,.08])),xyz(*(top+[dx,0,.27-.03*i])),.035,adjust(color,.82),6,'staff-emissive','frost-spike')
 elif school=='storm':
  for dx in (-.14,.1):m.tube([xyz(*(top+[0,0,.01])),xyz(*(top+[dx,0,.15])),xyz(*(top+[dx*.73,-.01,.30]))],.028,adjust(color,.8),'staff-emissive','storm-fork',7)
 elif school=='arcane':
  for i in range(9):
   a=i*2*math.pi/9;b=(i+1)*2*math.pi/9
   m.tube([xyz(*(top+[.11*math.cos(a),.01,.15+.11*math.sin(a)])),xyz(*(top+[.11*math.cos(b),.01,.15+.11*math.sin(b)]))],.019,COLORS['metal'],'metal','arcane-cage',5)
  m.sphere(xyz(*(top+[0,0,.15])),(.06,.06,.06),color,10,6,'staff-emissive','arcane-stone')
 elif school=='necromancer':
  m.sphere(xyz(*(top+[0,0,.13])),(.107,.085,.104),color,10,6,'staff-emissive','necro-bone')
  for dx in (-.042,.042):m.sphere(xyz(*(top+[dx,-.08,.14])),(.025,.015,.027),COLORS['edge'],7,4,'bone','necro-eye')
  m.taper(xyz(*(top+[0,.0,.12])),xyz(*(top+[.02,.0,.29])),.019,.01,COLORS['metal'],7,'metal','necro-prong')
 elif school=='summoner':
  m.sphere(xyz(*(top+[0,0,.11])),(.09,.09,.08),color,8,5,'staff-emissive','totem')
  for dx in (-1,1):
   m.tube([xyz(*(top+[dx*.065,0,.15])),xyz(*(top+[dx*.12,0,.28])),xyz(*(top+[dx*.18,.01,.31]))],.022,COLORS['wood'],'wood','antler')
 m.school=school
 return m

def project(mesh,direction):
 rotation=ROTATIONS[direction];result=[]
 for face in mesh.faces:
  verts=[angle_rotate(v,rotation) for v in (face.a,face.b,face.c)]
  # Camera looks down at ~26 degrees from the horizontal, just like 2.5D stage.
  pts=[(ANCHOR[0]+v[0]*SCALE,ANCHOR[1]-v[2]*SCALE*.87+v[1]*SCALE*.37) for v in verts]
  depth=float(np.mean([-.85*v[1]+.52*v[2] for v in verts]))
  normal=np.cross(verts[1]-verts[0],verts[2]-verts[0]);normal/=max(1e-9,np.linalg.norm(normal))
  # PR #332-style sprite tangent: view right, view up, toward viewer.
  right=np.array([1,0,0]);up=np.array([0,.39,.92]);toward=np.array([0,-.92,.39])
  normal_rgb=tuple(int(np.clip((np.dot(normal,b)*.5+.5)*255,0,255)) for b in (right,up,toward))
  z=np.mean([v[2] for v in verts]);height=(int(np.clip(z/2.5*255,0,255)),)*3
  rough=(216,216,216) if face.material in ('cloth','hair','felt') else (184,)*3 if face.material=='wood' else (146,)*3
  result.append((depth,pts,face.color,normal_rgb,height,rough,face.part,face.material))
 return sorted(result,key=lambda s:s[0])

def render(mesh,direction,passes=('albedo','normal','roughness','height','caster','emission'),clip='walk',frame=0):
 faces=project(mesh,direction)
 out={k:Image.new('RGBA',(CELL,CELL),(0,0,0,0)) for k in passes}
 drawers={k:ImageDraw.Draw(v) for k,v in out.items()}
 for depth,pts,color,norm,height,rough,part,material in faces:
  p=[tuple(round(x) for x in xy) for xy in pts]
  if 'albedo' in drawers:drawers['albedo'].polygon(p,fill=tuple(color)+(255,))
  if 'normal' in drawers:drawers['normal'].polygon(p,fill=tuple(norm)+(255,))
  if 'height' in drawers:drawers['height'].polygon(p,fill=height+(255,))
  if 'roughness' in drawers:drawers['roughness'].polygon(p,fill=rough+(255,))
  if 'caster' in drawers:drawers['caster'].polygon(p,fill=(255,255,255,255))
  if 'emission' in drawers:
   ramp=staff_charge(clip,frame)
   strength=ramp*(1.0 if material=='staff-emissive' else .42 if material=='staff-rune' else 0.0)
   radiance=tuple(round(min(255,v*strength)) for v in SCHOOLS[mesh.school])
   drawers['emission'].polygon(p,fill=radiance+(255,))
 # Unify alpha EXACTLY; normals are geometry-derived and not guessed from color.
 alpha=out['albedo'].getchannel('A')
 for key in out:
  if key!='albedo':out[key].putalpha(alpha)
 return out

def make_contact(schools,directions,frames=(0,4,8,12),clip='walk'):
 rows=[]
 for school in schools:
  strip=Image.new('RGBA',(len(directions)*len(frames)*128,155),(20,19,21,255))
  paint=ImageDraw.Draw(strip)
  for i,direction in enumerate(directions):
   for j,frame in enumerate(frames):
    sprite=render(create_pose(school,clip,frame),direction,('albedo',))['albedo']
    x=(i*len(frames)+j)*128
    strip.alpha_composite(sprite,(x,23))
   paint.text((i*len(frames)*128+5,4),f'{school.upper()} / {direction}',fill=(182,161,137))
  rows.append(strip)
 sheet=Image.new('RGBA',(rows[0].width,len(rows)*155),(20,19,21,255))
 for i,row in enumerate(rows):sheet.alpha_composite(row,(0,i*155))
 return sheet

def source_glb(mesh,path):
 scene=trimesh.Scene();parts={}
 for t in mesh.faces:parts.setdefault(t.part,[]).append(t)
 for name,triangles in parts.items():
  verts=[];faces=[];colors=[]
  for tri in triangles:
   idx=len(verts);verts.extend((tri.a,tri.b,tri.c));faces.append((idx,idx+1,idx+2));colors.extend([(*tri.color,255)]*3)
  tm=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=False)
  tm.visual.vertex_colors=np.array(colors,dtype=np.uint8)
  scene.add_geometry(tm,node_name=name,geom_name=name)
 path.write_bytes(scene.export(file_type='glb'))

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',default='/mnt/data/wyrmforge_wizard/export');p.add_argument('--full',action='store_true');args=p.parse_args()
 dest=Path(args.out);dest.mkdir(exist_ok=True,parents=True)
 # Preserve editable source mesh and all six 3D staff variations.
 for school in SCHOOLS:
  source_glb(create_pose(school,'idle',0),dest/f'wizard-{school}-neutral.glb')
 sheet=make_contact(list(SCHOOLS),['S'],(0,4,8,12));sheet.save(dest/'six-schools-south-walk.png')
 eight=make_contact(['fire'],DIRECTIONS,(0,8));eight.save(dest/'fire-eight-directions.png')
 if args.full:
  profile={'schemaVersion':1,'directions':DIRECTIONS,'cell':CELL,'anchor':ANCHOR,'worldSize':72,'clips':{'walk':{'frames':16,'fps':16}},
   'schools':list(SCHOOLS),'status':'draft geometry/motion candidate; NOT reviewed or production compatible until native-game validation'}
  (dest/'export-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
  # All six are one geometry/motion source, re-authored school staff heads/accents per variant.
  for school in SCHOOLS:
   atlas={key:Image.new('RGBA',(CELL*16,CELL*8),(0,0,0,0)) for key in ('albedo','normal','roughness','height','caster','emission')}
   for row,direction in enumerate(DIRECTIONS):
    for f in range(16):
     frames=render(create_pose(school,'walk',f),direction,clip='walk',frame=f)
     for key,image in frames.items():atlas[key].paste(image,(f*CELL,row*CELL))
   for key,image in atlas.items():image.save(dest/f'{school}-walk-{key}.png',optimize=True)
  print('Full six-school 8-direction walk sheets exported.')
 print('Sources and previews:',dest)

if __name__=='__main__':main()