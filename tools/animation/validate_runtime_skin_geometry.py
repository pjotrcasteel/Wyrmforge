"""Independent weighted-vertex replay of the ACTUAL exported runtime geometry.
Checks all mesh vertices against ground, sole support and retained world soles.
No JS solver, original source hull or renderer result is used as geometric truth.
"""
import argparse,json,math
from pathlib import Path
import numpy as np
from weighted_skin_reference import deform
p=argparse.ArgumentParser();p.add_argument('pack',type=Path);p.add_argument('study',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--report-ground-penetration',action='store_true',help='Diagnostic only: report all-mesh penetration while retaining strict sole/support checks');a=p.parse_args()
meta=json.loads((a.pack/'skin.json').read_text());surface=json.loads((a.pack/'poses.json').read_text());study=json.loads(a.study.read_text());buffer=(a.pack/meta['buffer']).read_bytes()
def attribute(name):
 s=meta['attributes'][name];return np.frombuffer(buffer,dtype={'f':'<f4','H':'<u2','I':'<u4'}[s['component']],count=s['count']*s['itemSize'],offset=s['offset']).reshape(s['count'],s['itemSize'])
positions=attribute('position').astype(float);homogeneous=np.column_stack((positions,np.ones(len(positions))))
indices=np.column_stack([attribute('skinIndex'+('' if i==0 else str(i+1))) for i in range(meta['influenceSets'])]);weights=np.column_stack([attribute('skinWeight'+('' if i==0 else str(i+1))) for i in range(meta['influenceSets'])]);groups=[];lookup={b['id']:i for i,b in enumerate(surface['bones'])}
for i,bone in enumerate(surface['bones']):
 w=(weights*(indices==i)).sum(axis=1);v=np.flatnonzero(w>0);inverse=np.linalg.inv(np.array(bone['rest']).reshape(4,4).T);groups.append((v,homogeneous[v]@inverse.T,w[v]))
inverse_rest=np.array([np.linalg.inv(np.array(b['rest']).reshape(4,4).T) for b in surface['bones']])
ground=surface['groundZMetres'];tolerance=surface['unitsPerPixel']/4;patches={}
for contact in surface['contacts']:
 bone=lookup[contact['end']];owned=np.flatnonzero((weights*(indices==bone)).sum(axis=1)>=1-1e-6)
 floor=positions[owned,2].min();patch=owned[positions[owned,2]<=floor+tolerance]
 if len(patch)<3:raise ValueError('Actual runtime geometry has no finite sole patch: '+contact['id'])
 patches[contact['id']]=patch

def hull(points):
 values=sorted(set(tuple(p) for p in points));cross=lambda o,a,b:(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 def half(items):
  out=[]
  for item in items:
   while len(out)>1 and cross(out[-2],out[-1],item)<=0:out.pop()
   out.append(item)
  return out
 return half(values)[:-1]+half(list(reversed(values)))[:-1]
def margin(points,center):
 polygon=hull(points)
 if len(polygon)<3:raise ValueError('Runtime sole patch is degenerate')
 inside=True;minimum=math.inf
 for aa,bb in zip(polygon,polygon[1:]+polygon[:1]):
  start=np.array(aa);edge=np.array(bb)-start;delta=center-start
  if edge[0]*delta[1]-edge[1]*delta[0]<0:inside=False
  t=np.clip(np.dot(delta,edge)/np.dot(edge,edge),0,1);minimum=min(minimum,float(np.linalg.norm(delta-edge*t)))
 return minimum if inside else -minimum
result={'sourceStudyOnly':True,'runtimeAccepted':False,'geometrySha256':meta['bufferSha256'],'vertices':meta['vertices'],'triangles':meta['triangles'],'poses':0,'maximumAnyVertexGroundPenetrationMetres':0,'maximumSoleGroundErrorMetres':0,'maximumRetainedWorldSoleDriftMetres':0,'minimumActualRuntimeSoleSupportMarginMetres':math.inf,'maximumMassDiscrepancyMetres':0,'groundToleranceMetres':tolerance,'solePatchVertexCounts':{k:len(v) for k,v in patches.items()}}
plants={};basis=study['profileSourceSupport']['groundBasis'];inverse_ground=np.linalg.inv(np.array(basis).reshape(2,2))
for pose in study['poses']:
 matrices=np.array(pose['matrices']).reshape(-1,4,4).transpose(0,2,1)
 vertices=deform(positions,indices,weights,matrices,inverse_rest,meta.get('skinningMode','linear'))
 penetration=max(0,ground-float(vertices[:,2].min()));result['maximumAnyVertexGroundPenetrationMetres']=max(result['maximumAnyVertexGroundPenetrationMetres'],penetration)
 if penetration>tolerance+1e-6 and not a.report_ground_penetration:raise ValueError(f'Runtime mesh penetrates ground: {pose["sequence"]}/{pose["timestamp"]}: {penetration}, vertex={int(vertices[:,2].argmin())}, bone={surface["bones"][int(indices[int(vertices[:,2].argmin()),weights[int(vertices[:,2].argmin())].argmax()])]["id"]}')
 support=[];yaw=pose['yaw'];rotation=np.array([[math.cos(yaw),-math.sin(yaw),0],[math.sin(yaw),math.cos(yaw),0],[0,0,1]]);root=np.r_[inverse_ground@pose['world'],0]
 for contact in surface['contacts']:
  key=(pose['sequence'],contact['id']);target=pose['sourceContacts'][contact['id']]
  if not target['planted']:plants.pop(key,None);continue
  points=vertices[patches[contact['id']]];error=max(abs(float(points[:,2].min())-ground),abs(float(points[:,2].max())-ground));result['maximumSoleGroundErrorMetres']=max(result['maximumSoleGroundErrorMetres'],error)
  if error>tolerance+1e-6:raise ValueError('Actual runtime sole lost ground contact')
  world=(points@rotation.T)*pose.get('scale',1)+root
  if key in plants:
   drift=float(np.linalg.norm(world-plants[key],axis=1).max());result['maximumRetainedWorldSoleDriftMetres']=max(result['maximumRetainedWorldSoleDriftMetres'],drift)
   if drift>tolerance:raise ValueError('Actual runtime weighted sole skates')
  else:plants[key]=world
  support.extend(points[:,:2])
 total=sum(surface['massWeights'].values());center=np.zeros(3)
 for name,mass in surface['massWeights'].items():
  i=lookup[name];head=matrices[i,:3,3];tail=head+matrices[i,:3,1]*surface['bones'][i]['length'];center+=(head+tail)*mass/(2*total)
 error=float(np.linalg.norm(center-np.array(pose['massCenter'])));result['maximumMassDiscrepancyMetres']=max(result['maximumMassDiscrepancyMetres'],error)
 if error>1e-5:raise ValueError('Runtime mass does not match the actual complete matrices')
 value=margin(support,center[:2]);result['minimumActualRuntimeSoleSupportMarginMetres']=min(result['minimumActualRuntimeSoleSupportMarginMetres'],value)
 if value<surface['minimumSupportMarginMetres']-1e-6:raise ValueError(f'Actual runtime sole geometry does not support mass: {pose["sequence"]}/{pose["timestamp"]}: {value}')
 result['poses']+=1
 a.out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
