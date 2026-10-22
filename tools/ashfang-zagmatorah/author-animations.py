"""Bake reusable motions onto the unchanged 112-bone deform rig. Temporary IK solvers are discarded."""
import argparse,json,math,sys,time,hashlib
from pathlib import Path
import bpy
from mathutils import Matrix,Vector,Quaternion
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--clips',default='all');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise RuntimeError('Immutable motion revision exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);scene=bpy.context.scene;scene.render.fps=24
solver=bpy.data.objects['Zahmatorah_Skeleton'];body=bpy.data.objects['Zagmatorah'];solver.data.pose_position='POSE'
for action in bpy.data.actions:action.use_fake_user=True
# Preserve the creator's authored open-wing/tucked-hindlimb pose as a flight basis.
flight_action=next(x for x in bpy.data.actions if x.name.endswith('|StaticPose'));solver.animation_data.action=flight_action;solver.animation_data.action_slot=flight_action.slots[0];scene.frame_set(1);bpy.context.view_layer.update()
flight={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in solver.pose.bones}
solver.animation_data_clear()
for b in solver.pose.bones:b.matrix_basis=Matrix.Identity(4);b.rotation_mode='QUATERNION'
solver.name='Temporary motion solver';rig=solver.copy();rig.data=solver.data.copy();rig.name='Zahmatorah_Skeleton';scene.collection.objects.link(rig);rig.animation_data_clear()
for modifier in body.modifiers:
 if modifier.type=='ARMATURE':modifier.object=rig
if body.parent==solver:body.parent=rig
rest={b.name:b.matrix_local.copy() for b in solver.data.bones};restq={k:v.to_quaternion() for k,v in rest.items()};helpers=[];targets={};ik=[]
for side in ('l','r'):
 for limb,bone,count in [('fore','Arm_',4),('hind','FeetConnection_',5)]:
  name=bone+side;pb=solver.pose.bones[name];target=bpy.data.objects.new('Temporary '+limb+' '+side,None);scene.collection.objects.link(target);target.location=pb.bone.tail_local.copy()
  if limb=='fore':target.location.z=.26
  targets[(limb,side)]=(target,target.location.copy());helpers.append(target)
  con=pb.constraints.new('IK');con.name='Temporary planted contact';con.target=target;con.chain_count=count;con.iterations=160;con.use_stretch=False;ik.append(con)
  for ancestor in [pb,pb.parent,pb.parent.parent]:
   if 'Connection' in ancestor.name:ancestor.ik_stiffness_x=.9;ancestor.ik_stiffness_y=.9;ancestor.ik_stiffness_z=.9
  tip=solver.pose.bones[('Finger_' if limb=='fore' else 'Feet_')+side];orient=bpy.data.objects.new('Temporary foot orientation '+limb+side,None);scene.collection.objects.link(orient);orient.rotation_mode='QUATERNION';orient.rotation_quaternion=restq[tip.name];helpers.append(orient);con=tip.constraints.new('COPY_ROTATION');con.target=orient;con.target_space='WORLD';con.owner_space='WORLD'
# name, source intervals at 24fps, loop, root travel/cycle, semantic events (normalized time).
SPECS=[('idle',48,True,0,{}),('alert',48,True,0,{}),('look',72,True,0,{}),('walk',48,True,1.8,{'footfalls':[0,.25,.5,.75]}),('stalk',64,True,1.2,{'footfalls':[0,.25,.5,.75]}),('run',32,True,3.4,{'footfalls':[.04,.18,.54,.68]}),('turn_left',40,False,0,{'turn':.5}),('turn_right',40,False,0,{'turn':.5}),('pounce',48,False,5.5,{'launch':.3,'impact':.68}),('claw_left',40,False,0,{'hit':.47}),('claw_right',40,False,0,{'hit':.47}),('claw_combo',64,False,0,{'hit':[.31,.64]}),('bite',40,False,0,{'hit':.5}),('tail_left',48,False,0,{'hit':.55}),('tail_right',48,False,0,{'hit':.55}),('roar',64,False,0,{'voice':.32}),('breath_start',32,False,0,{'mouth_ready':1}),('breath_loop',48,True,0,{'vfx':'continuous mouth attachment'}),('breath_end',32,False,0,{'vfx_stop':0}),('breath_sweep',64,False,0,{'vfx_start':.23,'vfx_stop':.77}),('takeoff',48,False,0,{'liftoff':.36}),('fly',32,True,0,{'downstroke':.25}),('hover',40,True,0,{'downstroke':.25}),('glide',48,True,0,{}),('bank_left',40,False,0,{'bank':.5}),('bank_right',40,False,0,{'bank':.5}),('air_breath',64,False,0,{'vfx_start':.25,'vfx_stop':.75}),('land',48,False,0,{'touchdown':.68}),('hit_front',24,False,0,{'recoil':.2}),('hit_left',24,False,0,{'recoil':.2}),('hit_right',24,False,0,{'recoil':.2}),('stagger',48,False,0,{'stumble':.35}),('recover',48,False,0,{}),('death',72,False,0,{'collapse':.55,'hold':1}),('death_alt',80,False,0,{'collapse':.6,'hold':1})]
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def bell(t,start=.05,peak=.45,end=.95):return smooth((t-start)/(peak-start)) if t<peak else 1-smooth((t-peak)/(end-peak))
def rot(name,axis,angle):
 b=solver.pose.bones[name];q=restq[name];b.rotation_quaternion @=q.inverted()@Quaternion(Vector(axis),angle)@q
def rootmove(v):solver.pose.bones['Spine03'].location+=restq['Spine03'].inverted()@Vector(v)
def setpose(name,t):
 for b in solver.pose.bones:b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
 wave=math.sin(math.tau*t);air=name in ('fly','hover','glide','bank_left','bank_right','air_breath');blend=1 if air else (smooth((t-.22)/.5) if name=='takeoff' else 1-smooth(t/.72) if name=='land' else 0)
 if blend:
  for b in solver.pose.bones:
   loc,q,scale=flight[b.name];b.rotation_quaternion=Quaternion().slerp(q,blend)
  rootmove((0,0,2.4*blend))
 for con in ik:con.influence=1-blend
 for limbside,(target,home) in targets.items():target.location=home
 # Breathing, alertness and a delayed tail wave never substitute for limb gait.
 rootmove((0,0,(.025 if not air else .09)*math.sin(math.tau*t)))
 for i in range(1,11):rot('Tail%02d'%i,(0,0,1),(.012+.002*i)*math.sin(math.tau*t-i*.4))
 for side,sgn in [('l',-1),('r',1)]:
  for digit,angle in [('01',.5),('02',.28),('03',.12)]:rot('Wing'+digit+'01_'+side,(1,0,0),sgn*angle*(1-blend))
 if name in ('walk','stalk','run'):
  stride={'walk':1.8,'stalk':1.2,'run':3.4}[name];duty=.7 if name!='run' else .55
  rootmove((0,0,(-.14 if name=='stalk' else .02)+(.045 if name!='run' else .1)*math.cos(math.tau*t*2)))
  offsets={('fore','l'):0,('hind','r'):.25,('fore','r'):.5,('hind','l'):.75}
  if name=='run':offsets={('fore','l'):0,('fore','r'):.12,('hind','l'):.5,('hind','r'):.62}
  for key,(target,home) in targets.items():
   phase=(t+offsets[key])%1
   if phase<duty:dx=stride*(phase-duty*.5);lift=0
   else:u=(phase-duty)/(1-duty);dx=stride*duty*(.5-smooth(u));lift=(.26 if name=='stalk' else .45 if name=='walk' else .72)*math.sin(math.pi*u)
   target.location=home+Vector((dx,0,lift))
  rot('Spine01',(0,0,1),.025*wave);rot('Neck03',(0,0,1),-.025*wave)
 elif name=='alert':rot('Neck03',(0,1,0),.10+.025*wave);rot('Head',(0,1,0),-.04)
 elif name=='look':rot('Neck02',(0,0,1),.22*wave);rot('Head',(0,0,1),.15*math.sin(math.tau*t-.35))
 elif name.startswith('turn_'):
  sign=1 if name.endswith('left') else -1;v=bell(t);rot('Spine01',(0,0,1),sign*.15*v);rot('Neck03',(0,0,1),sign*.22*v)
  for i in range(1,9):rot('Tail%02d'%i,(0,0,1),-sign*.06*bell(t,0,.5,1))
 elif name=='pounce':
  crouch=bell(t,0,.2,.42);flightphase=math.sin(math.pi*max(0,min(1,(t-.3)/.38))) if .3<t<.68 else 0;rootmove((0,0,-.4*crouch+1.45*flightphase-.22*bell(t,.65,.73,.92)))
  for con in ik:con.influence=0 if .3<t<.68 else 1
  for side in ('l','r'):rot('UpperLeg_'+side,(0,1,0),-.5*flightphase);rot('UpperArm_'+side,(0,1,0),.28*flightphase)
  rot('Spine01',(0,1,0),-.15*crouch+.15*flightphase)
 elif name.startswith('claw'):
  for side,start,peak,end in ([('l',.04,.32,.57),('r',.37,.65,.94)] if name=='claw_combo' else [('l' if name.endswith('left') else 'r',.05,.43,.92)]):
   value=bell(t,start,peak,end);target,home=targets[('fore',side)];target.location=home+Vector((-1.4*value,(-.7 if side=='l' else .7)*value,.95*math.sin(math.pi*value)*value+.3*value));rot('Neck03',(0,0,1),(.11 if side=='l' else -.11)*value);rot('Spine01',(0,0,1),(.09 if side=='l' else -.09)*value)
 elif name=='bite':v=bell(t,.04,.46,.94);rot('Neck03',(0,1,0),-.11*v);rot('Neck01',(0,1,0),-.15*v);rot('LowerHead',(0,1,0),-.60*bell(t,.05,.28,.56));rootmove((-.28*v,0,0))
 elif name.startswith('tail_'):
  sign=1 if name.endswith('left') else -1;v=bell(t,.02,.5,.98);rot('Spine03',(0,0,1),-sign*.10*v)
  for i in range(1,11):rot('Tail%02d'%i,(0,0,1),sign*(.10+.014*i)*bell(t,max(0,.02+i*.015),.46+i*.015,1))
 elif name=='roar':v=bell(t,.04,.4,.94);rot('Neck03',(0,1,0),.15*v);rot('Neck02',(0,1,0),.18*v);rot('Head',(0,1,0),-.12*v);rot('LowerHead',(0,1,0),-.65*v);rot('Tongue01',(0,1,0),-.12*v);rootmove((.15*v,0,.07*v))
 elif name.startswith('breath') or name=='air_breath':
  v=smooth(t) if name=='breath_start' else 1-smooth(t) if name=='breath_end' else bell(t,.03,.27,.97) if name in ('breath_sweep','air_breath') else 1
  rot('LowerHead',(0,1,0),-.48*v);rot('Neck03',(0,1,0),-.08*v);rot('Head',(0,1,0),.07*v)
  if name=='breath_sweep':rot('Neck03',(0,0,1),.34*math.sin(math.pi*(t-.5))*v);rot('Neck01',(0,0,1),.24*math.sin(math.pi*(t-.5))*v)
 if blend:
  flap=0 if name in ('glide','bank_left','bank_right') else math.sin(math.tau*t*(1 if air else 1.5))
  for side,sgn in [('l',-1),('r',1)]:
   rot('UpperArm_'+side,(1,0,0),sgn*.52*flap*blend);rot('ForeArm_'+side,(1,0,0),-sgn*.16*max(0,flap)*blend);rot('Arm_'+side,(1,0,0),-sgn*.14*math.sin(math.tau*t-.5)*blend)
  if name.startswith('bank_'):rot('Spine03',(1,0,0),(.3 if name.endswith('left') else -.3)*bell(t,0,.5,1))
 if name=='takeoff':rootmove((0,0,-.35*bell(t,0,.2,.4)))
 if name=='land':rootmove((0,0,-.26*bell(t,.57,.74,.98)))
 if name.startswith('hit_') or name in ('stagger','recover'):
  v=bell(t,0,.18,1) if name.startswith('hit_') else bell(t,0,.38,1) if name=='stagger' else 1-smooth(t)
  rot('Spine01',(0,1,0),-.12*v);rot('Neck03',(0,1,0),.2*v);rootmove((.18*v,0,-.16*v))
  if name in ('hit_left','hit_right'):rot('Neck02',(0,0,1),(.25 if name=='hit_left' else -.25)*v)
 if name.startswith('death'):
  v=smooth((t-.05)/.75);sign=1 if name=='death' else -1
  for con in ik:con.influence=1-v
  rootmove((0,0,-1.35*v));rot('Spine03',(1,0,0),sign*.54*v);rot('Spine01',(0,1,0),-.2*v);rot('Neck03',(0,1,0),-.28*v);rot('LowerHead',(0,1,0),-.22*v)
  for side in ('l','r'):rot('UpperLeg_'+side,(0,1,0),-.35*v)
  for i in range(1,11):rot('Tail%02d'%i,(0,0,1),-sign*.055*v)
 bpy.context.view_layer.update()
selected=SPECS if a.clips=='all' else [s for s in SPECS if s[0] in a.clips.split(',')];report={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fps':24,'clips':{},'rigDeformBones':112,'runtimeIntegrated':False,'motionAcceptedByOwner':False};start=time.time()
for name,intervals,loop,travel,events in selected:
 action=bpy.data.actions.new('Ashfang|'+name);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;contact_errors=[];positions=[]
 for frame in range(intervals+1):
  t=frame/intervals;setpose(name,t);matrices={b.name:b.matrix.copy() for b in solver.pose.bones}
  for pb in rig.pose.bones:
   kwargs={'matrix':matrices[pb.name],'matrix_local':pb.bone.matrix_local,'invert':True}
   if pb.parent:kwargs.update(parent_matrix=matrices[pb.parent.name],parent_matrix_local=pb.parent.bone.matrix_local)
   pb.matrix_basis=pb.bone.convert_local_to_pose(**kwargs);pb.rotation_mode='QUATERNION'
   for field in ('location','rotation_quaternion','scale'):pb.keyframe_insert(field,frame=frame+1,group=pb.name)
  for key,(target,home) in targets.items():
   pb=solver.pose.bones[('Arm_' if key[0]=='fore' else 'FeetConnection_')+key[1]]
   if pb.constraints[0].influence>.99:contact_errors.append((pb.tail-target.location).length)
  positions.append({name:list(matrices[name].translation) for name in ['Spine03','Head','LowerHead','Feet_l','Feet_r','Arm_l','Arm_r','Tail10']})
 # Linear baked interpolation avoids overshoot and keeps exported frames reproducible.
 for slot in action.slots:
  for layer in action.layers:
   for strip in layer.strips:
    bag=strip.channelbag(slot)
    if bag:
     for curve in bag.fcurves:
      for key in curve.keyframe_points:key.interpolation='LINEAR'
 report['clips'][name]={'action':action.name,'sourceFrames':intervals+1,'intervals':intervals,'duration':intervals/24,'loop':loop,'travelPerCycle':travel,'events':events,'maxIKTargetError':max(contact_errors,default=0),'landmarks':positions}
 print('BAKED',name,intervals+1,'IK',max(contact_errors,default=0),flush=True)
# Temporary IK targets and solver do not ship. Every pose is editable on the original deform hierarchy.
for ob in helpers+[solver]:bpy.data.objects.remove(ob,do_unlink=True)
rig.data.pose_position='POSE';rig['AshfangReviewPose']=True;rig.animation_data.action=bpy.data.actions['Ashfang|'+selected[0][0]];scene.frame_start=1;scene.frame_end=selected[0][1]+1;scene.frame_set(1)
# Share preserved texture files, avoiding a second packed copy in every motion milestone.
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-animations.blend'),compress=True,relative_remap=False);report['seconds']=time.time()-start;report['sha256']=hashlib.sha256((out/'ashfang-animations.blend').read_bytes()).hexdigest();(out/'motions.json').write_text(json.dumps(report,indent=2));print('ANIMATION_SOURCE_SAVED',report['seconds'],flush=True)
