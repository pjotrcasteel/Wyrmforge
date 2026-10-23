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
rest={b.name:b.matrix_local.copy() for b in solver.data.bones};restq={k:v.to_quaternion() for k,v in rest.items()};helpers=[];targets={};ik=[];ground_cons=[];orientations=[];wing_cons=[];poles=[]
for side in ('l','r'):
 for limb,bone,count in [('fore','Arm_',4),('hind','FeetConnection_',5)]:
  name=bone+side;pb=solver.pose.bones[name];target=bpy.data.objects.new('Temporary '+limb+' '+side,None);scene.collection.objects.link(target);target.location=pb.bone.tail_local.copy()
  if limb=='fore':target.location.z=.26
  targets[(limb,side)]=(target,target.location.copy());helpers.append(target)
  con=pb.constraints.new('IK');con.name='Temporary planted contact';con.target=target;con.chain_count=count;con.iterations=400;con.use_stretch=False;ik.append(con)
  pole=bpy.data.objects.new('Temporary pole '+limb+side,None);scene.collection.objects.link(pole);parent_name=('Shoulder_' if limb=='fore' else 'Spine03')+side if limb=='fore' else 'Spine03';home=solver.data.bones[('UpperArm_' if limb=='fore' else 'UpperLeg_')+side].tail_local+Vector((0,(-2 if side=='l' else 2),1)) if limb=='fore' else solver.data.bones['UpperLeg_'+side].tail_local+Vector((-2,(-.5 if side=='l' else .5),.3));pole.location=home;con.pole_target=pole;helpers.append(pole);poles.append((pole,parent_name,rest[parent_name].inverted()@home))
  for ancestor in [pb,pb.parent,pb.parent.parent]:
   if 'Connection' in ancestor.name:ancestor.ik_stiffness_x=.9;ancestor.ik_stiffness_y=.9;ancestor.ik_stiffness_z=.9
  tip=solver.pose.bones[('Finger_' if limb=='fore' else 'Feet_')+side];orient=bpy.data.objects.new('Temporary foot orientation '+limb+side,None);scene.collection.objects.link(orient);orient.rotation_mode='QUATERNION';orient.rotation_quaternion=restq[tip.name];helpers.append(orient);con=tip.constraints.new('COPY_ROTATION');con.target=orient;con.target_space='WORLD';con.owner_space='WORLD';ground_cons.append(con);orientations.append((orient,orient.rotation_quaternion.copy()))
for side,sgn in [('l',-1),('r',1)]:
 for digit,angle in [('01',.7),('02',.4),('03',.12),('04',.12)]:
  pb=solver.pose.bones['Wing'+digit+'01_'+side];orient=bpy.data.objects.new('Temporary folded wing '+pb.name,None);scene.collection.objects.link(orient);orient.rotation_mode='QUATERNION';orient.rotation_quaternion=Quaternion((1,0,0),sgn*angle)@restq[pb.name];helpers.append(orient);orientations.append((orient,orient.rotation_quaternion.copy()));con=pb.constraints.new('COPY_ROTATION');con.target=orient;con.target_space='WORLD';con.owner_space='WORLD';ground_cons.append(con);wing_cons.append(con)
ground_cons+=ik
# Calibrate pole angles to the professional rig's original joint layout.
for con in ik:
 chain=[];pb=next(b for b in solver.pose.bones if con in list(b.constraints));current=pb
 for _ in range(con.chain_count):chain.append(current);current=current.parent
 best=(1e9,0)
 for i in range(64):
  angle=-math.pi+i*math.tau/64;con.pole_angle=angle;bpy.context.view_layer.update();error=sum((b.head-b.bone.head_local).length_squared for b in chain)
  if error<best[0]:best=(error,angle)
 con.pole_angle=best[1]
print('POLES_CALIBRATED',flush=True)
# name, source intervals at 24fps, loop, root travel/cycle, semantic events (normalized time).
SPECS=[('idle',48,True,0,{}),('alert',48,True,0,{}),('look',72,True,0,{}),('alert_start',24,False,0,{}),('alert_end',24,False,0,{}),('walk_start',32,False,0,{}),('walk_stop',32,False,0,{}),('run_start',24,False,0,{}),('run_stop',24,False,0,{}),('walk',48,True,1.8,{'footfalls':[0,.25,.5,.75]}),('stalk',64,True,1.2,{'footfalls':[0,.25,.5,.75]}),('run',32,True,3.4,{'footfalls':[.04,.18,.54,.68]}),('turn_left',40,False,0,{'turn':.5}),('turn_right',40,False,0,{'turn':.5}),('pounce',48,False,5.5,{'launch':.3,'impact':.68}),('claw_left',40,False,0,{'hit':.47}),('claw_right',40,False,0,{'hit':.47}),('claw_combo',64,False,0,{'hit':[.31,.64]}),('bite',40,False,0,{'hit':.5}),('tail_left',48,False,0,{'hit':.55}),('tail_right',48,False,0,{'hit':.55}),('roar',64,False,0,{'voice':.32}),('breath_start',32,False,0,{'mouth_ready':1}),('breath_loop',48,True,0,{'vfx':'continuous mouth attachment'}),('breath_end',32,False,0,{'vfx_stop':0}),('breath_sweep',64,False,0,{'vfx_start':.23,'vfx_stop':.77}),('takeoff',48,False,0,{'liftoff':.36}),('fly',32,True,0,{'downstroke':.25}),('hover',40,True,0,{'downstroke':.25}),('glide',48,True,0,{}),('bank_left',40,False,0,{'bank':.5}),('bank_right',40,False,0,{'bank':.5}),('air_breath',64,False,0,{'vfx_start':.25,'vfx_stop':.75}),('land',48,False,0,{'touchdown':.68}),('hit_front',24,False,0,{'recoil':.2}),('hit_left',24,False,0,{'recoil':.2}),('hit_right',24,False,0,{'recoil':.2}),('stagger',48,False,0,{'stumble':.35}),('recover',48,False,0,{}),('death',72,False,0,{'collapse':.55,'hold':1}),('death_alt',80,False,0,{'collapse':.6,'hold':1})]
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def bell(t,start=.05,peak=.45,end=.95):return smooth((t-start)/(peak-start)) if t<peak else 1-smooth((t-peak)/(end-peak))
def rot(name,axis,angle):
 b=solver.pose.bones[name];q=restq[name];b.rotation_quaternion @=q.inverted()@Quaternion(Vector(axis),angle)@q
def rootmove(v):solver.pose.bones['Spine03'].location+=restq['Spine03'].inverted()@Vector(v)

# Performance pass: bigger silhouettes, compressed attack spacing, slower weight recovery.
# Preserve authored anatomy and contact solutions; do not multiply every joint blindly.
PERFORMANCE_INTERVALS={'run':28,'run_start':24,'run_stop':28,'roar':80,'takeoff':56,'death':96,'death_alt':104}
PERFORMANCE_TRAVEL={'walk':3.0,'stalk':2.0,'run':5.4,'pounce':8.0}
SPECS=[(n,PERFORMANCE_INTERVALS.get(n,i),loop,PERFORMANCE_TRAVEL.get(n,travel),
        {'hit':.48} if n in ('claw_left','claw_right') else {'hit':[.33,.67]} if n=='claw_combo' else
        {'hit':.45} if n=='bite' else {'voice':.30} if n=='roar' else
        {'liftoff':.38,'downstroke':.46} if n=='takeoff' else
        {'collapse':.56,'hold':.85} if n.startswith('death') else events)
       for n,i,loop,travel,events in SPECS]

def pathpose(t,keys):
 for (ta,va),(tb,vb) in zip(keys,keys[1:]):
  if t<=tb:return va+(vb-va)*smooth((t-ta)/(tb-ta))
 return keys[-1][1]
def setpose(name,t):
 for b in solver.pose.bones:b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
 for orient,home_rotation in orientations:orient.rotation_quaternion=home_rotation
 life=1-smooth((t-.65)/.2) if name.startswith('death') else 1
 wave=math.sin(math.tau*t);air=name in ('fly','hover','glide','bank_left','bank_right','air_breath');blend=1 if air else (smooth((t-.12)/.37) if name=='takeoff' else 1-smooth(t/.6) if name=='land' else 0)
 altitude=0
 if blend:
  for b in solver.pose.bones:
   loc,q,scale=flight[b.name];b.rotation_quaternion=Quaternion().slerp(q,blend)
 altitude=5.0 if air else 5.0*(1-(1-max(0,min(1,(t-.38)/.15)))**2) if name=='takeoff' else 5.0*(1-smooth((t-.35)/.5))+1.4*math.sin(math.pi*blend) if name=='land' else 0
 if altitude:rootmove((0,0,altitude))
 for con in ground_cons:con.influence=1-max(blend,smooth(altitude/.8))
 for limbside,(target,home) in targets.items():target.location=home
 # Breathing, alertness and a delayed tail wave never substitute for limb gait.
 rootmove((0,0,life*(.05 if not air else .18)*math.sin(math.tau*t)))
 for i in range(1,11):rot('Tail%02d'%i,(0,0,1),life*(.022+.003*i)*math.sin(math.tau*t-i*.4))
 for side,sgn in [('l',-1),('r',1)]:
  for digit,angle in [('01',.5),('02',.28),('03',.12)]:rot('Wing'+digit+'01_'+side,(1,0,0),sgn*angle*(1-blend))
 if name in ('walk','stalk','run'):
  stride=PERFORMANCE_TRAVEL[name];duty=.7 if name!='run' else .32
  rootmove((0,0,(-.25 if name=='stalk' else .02)+(.10 if name!='run' else .30)*math.cos(math.tau*t*2)))
  offsets={('fore','l'):0,('hind','r'):.25,('fore','r'):.5,('hind','l'):.75}
  if name=='run':offsets={('fore','l'):0,('fore','r'):.06,('hind','l'):.5,('hind','r'):.56}
  for key,(target,home) in targets.items():
   phase=(t+offsets[key])%1
   if phase<duty:dx=stride*(phase-duty*.5);lift=0
   else:u=(phase-duty)/(1-duty);dx=stride*duty*(.5-smooth(u));lift=(.5 if name=='stalk' else .85 if name=='walk' else 1.4)*math.sin(math.pi*u)
   target.location=home+Vector((dx,0,lift))
  rot('Spine01',(0,0,1),.065*wave);rot('Neck03',(0,0,1),-.055*wave)
  if name=='run':rot('Spine01',(0,1,0),.10*math.sin(math.tau*t*2));rot('Neck03',(0,1,0),-.13-.10*math.sin(math.tau*t*2))
 elif name in ('walk_start','walk_stop','run_start','run_stop'):
  running=name.startswith('run');stride=5.4 if running else 3.;duty=.32 if running else .7;stopping=name.endswith('stop');gain=1-smooth(t) if stopping else smooth(t);rootmove((0,0,(.32 if running else .12)*gain))
  if running:rot('Neck03',(0,1,0),-.13*gain)
  offsets={('fore','l'):0,('hind','r'):.25,('fore','r'):.5,('hind','l'):.75} if not running else {('fore','l'):0,('fore','r'):.06,('hind','l'):.5,('hind','r'):.56}
  order={('fore','l'):0,('hind','r'):.22,('fore','r'):.44,('hind','l'):.66}
  for key,(target,home) in targets.items():
   phase=offsets[key]
   if phase<duty:dx=stride*(phase-duty*.5);lift=0
   else:u=(phase-duty)/(1-duty);dx=stride*duty*(.5-smooth(u));lift=(1.4 if running else .85)*math.sin(math.pi*u)
   u=max(0,min(1,(t-order[key])/.28));weight=1-smooth(u) if stopping else smooth(u);target.location=home+Vector((dx,0,lift))*weight+Vector((0,0,.25*math.sin(math.pi*u)))
 elif name in ('alert_start','alert_end'):
  v=smooth(t) if name=='alert_start' else 1-smooth(t);rot('Neck03',(0,1,0),.20*v);rot('Head',(0,1,0),-.08*v)
 elif name=='alert':rot('Neck03',(0,1,0),.20+.05*wave);rot('Head',(0,1,0),-.08)
 elif name=='look':rot('Neck02',(0,0,1),.40*wave);rot('Head',(0,0,1),.24*math.sin(math.tau*t)*math.sin(math.pi*t)**2)
 elif name.startswith('turn_'):
  sign=1 if name.endswith('left') else -1;v=bell(t);heading=sign*math.pi/4*smooth(t);rot('Spine03',(0,0,1),heading)
  for key,(target,home) in targets.items():
   offset={('fore','l'):0,('hind','r'):.22,('fore','r'):.44,('hind','l'):.66}[key];u=max(0,min(1,(t-offset)/.3));q=Quaternion((0,0,1),sign*math.pi/4*smooth(u));pivot=Vector((2.19,0,home.z));target.location=pivot+q@(home-pivot);target.location.z+=.3*math.sin(math.pi*u)
  for orient,home_rotation in orientations:orient.rotation_quaternion=Quaternion((0,0,1),heading)@home_rotation
  rot('Spine01',(0,0,1),sign*.15*v);rot('Neck03',(0,0,1),sign*.22*v)
  for i in range(1,9):rot('Tail%02d'%i,(0,0,1),-sign*.06*bell(t,0,.5,1))
 elif name=='pounce':
  crouch=bell(t,0,.2,.42);flightphase=math.sin(math.pi*max(0,min(1,(t-.3)/.38))) if .3<t<.68 else 0;rootmove((0,0,-.46*crouch+2.3*flightphase-.35*bell(t,.65,.73,.92)))
  airweight=smooth((t-.26)/.08)*(1-smooth((t-.64)/.08))
  for con in ground_cons:con.influence=1-airweight
  for side in ('l','r'):rot('UpperLeg_'+side,(0,1,0),-.5*flightphase);rot('UpperArm_'+side,(0,1,0),.28*flightphase)
  rot('Spine01',(0,1,0),-.15*crouch+.15*flightphase)
 elif name.startswith('claw'):
  for side,start,peak,end in ([('l',.04,.32,.57),('r',.37,.65,.94)] if name=='claw_combo' else [('l' if name.endswith('left') else 'r',.05,.43,.92)]):
   if name=='claw_combo':start,wind,strike,end=(.02,.25,.35,.56) if side=='l' else (.41,.59,.69,.98)
   else:start,wind,strike,end=.02,.35,.49,.98
   sign=-1 if side=='l' else 1;target,home=targets[('fore',side)]
   high=Vector((.45,sign*.70,2.40));across=Vector((-1.55,-sign*2.45,.30))
   if t<wind:u=smooth((t-start)/(wind-start));delta=high*u;twist=-.23*u
   elif t<strike:u=max(0,min(1,(t-wind)/(strike-wind)))**2.7;delta=high.lerp(across,u);twist=-.23+.65*u
   else:u=smooth((t-strike)/(end-strike));delta=across*(1-u);twist=.42*(1-u)
   target.location=home+delta;rot('Spine01',(0,0,1),sign*twist);rot('Neck03',(0,0,1),sign*twist*.65)
   value=bell(t,start,wind,end);orient,homeq=orientations[0 if side=='l' else 2];orient.rotation_quaternion=Quaternion((0,0,1),sign*.9*value)@Quaternion((0,1,0),-.5*value)@homeq
   rootmove((-.35*bell(t,wind,strike,end),0,-.12*value))
 elif name=='bite':
  wind=bell(t,.01,.30,.45);lunge=pathpose(t,[(0,0),(.30,0),(.45,1),(.58,.92),(1,0)])
  rootmove((.5*wind-1.35*lunge,0,-.18*lunge));rot('Spine01',(0,1,0),.13*wind-.12*lunge)
  rot('Neck03',(0,1,0),.32*wind-.22*lunge);rot('Neck02',(0,1,0),.22*wind-.12*lunge);rot('Head',(0,1,0),-.22*wind+.18*lunge)
  jaw=pathpose(t,[(0,0),(.29,1),(.39,1),(.46,.05),(.58,.12),(1,0)]);rot('LowerHead',(0,1,0),-.98*jaw)
 elif name.startswith('tail_'):
  sign=1 if name.endswith('left') else -1;v=bell(t,.02,.5,.98);rot('Spine03',(0,0,1),-sign*.20*v)
  for i in range(1,11):rot('Tail%02d'%i,(0,0,1),sign*(.18+.023*i)*bell(t,max(0,.02+i*.015),.46+i*.015,1))
 elif name=='roar':
  inhale=bell(t,0,.22,.35);power=pathpose(t,[(0,0),(.20,.15),(.31,1),(.67,.94),(1,0)]);pulse=math.sin(math.tau*(t-.30)*9)*bell(t,.28,.46,.8)
  rootmove((.38*inhale-.22*power,0,-.25*inhale+.30*power));rot('Spine01',(0,1,0),.23*power);rot('Spine02',(0,1,0),.12*power)
  rot('Neck03',(0,1,0),.43*power);rot('Neck02',(0,1,0),.25*power);rot('Head',(0,1,0),-.36*power+.035*pulse);rot('Neck01',(0,0,1),.055*pulse)
  rot('LowerHead',(0,1,0),-1.05*power-.035*pulse);rot('Tongue01',(0,1,0),-.22*power)
  for side,sign in [('l',-1),('r',1)]:target,home=targets[('fore',side)];target.location=home+Vector((.15,sign*.25,1.1*power))
 elif name.startswith('breath') or name=='air_breath':
  v=smooth(t) if name=='breath_start' else 1-smooth(t) if name=='breath_end' else bell(t,.03,.27,.97) if name in ('breath_sweep','air_breath') else 1
  rot('LowerHead',(0,1,0),-.80*v);rot('Neck03',(0,1,0),-.14*v);rot('Head',(0,1,0),.12*v);rot('Spine01',(0,1,0),-.06*v)
  if name=='breath_sweep':rot('Neck03',(0,0,1),.62*math.sin(math.pi*(t-.5))*v);rot('Neck01',(0,0,1),.38*math.sin(math.pi*(t-.5))*v)
 if blend:
  flap=0 if name in ('glide','bank_left','bank_right') else math.sin(math.tau*t)
  if name=='takeoff':flap=pathpose(t,[(0,0),(.31,1),(.39,1),(.48,-1),(.61,.7),(.72,-.65),(.84,.45),(1,0)])
  for side,sgn in [('l',-1),('r',1)]:
   rot('UpperArm_'+side,(1,0,0),sgn*.92*flap*blend);rot('ForeArm_'+side,(1,0,0),-sgn*.30*max(0,flap)*blend);rot('Arm_'+side,(1,0,0),-sgn*.24*math.sin(math.tau*t-.5)*blend)
  if name.startswith('bank_'):rot('Spine03',(1,0,0),(.3 if name.endswith('left') else -.3)*bell(t,0,.5,1))
 if name=='takeoff':
  load=bell(t,0,.29,.44);rear=bell(t,.05,.31,.67);rootmove((.35*load,0,-.62*load));rot('Spine03',(0,1,0),.34*rear);rot('Tail01',(0,1,0),-.32*rear)
  for con in ground_cons:con.influence=1-smooth((t-.385)/.075)
  for con in wing_cons:con.influence=1-smooth((t-.34)/.12)
  for side in ('l','r'):target,home=targets[('fore',side)];target.location=home+Vector((.25*rear,0,1.2*rear))
 if name=='land':rootmove((0,0,-.48*bell(t,.57,.74,.98)))
 if name.startswith('hit_') or name in ('stagger','recover'):
  v=bell(t,0,.18,1) if name.startswith('hit_') else bell(t,0,.38,1) if name=='stagger' else 1-smooth(t)
  rot('Spine01',(0,1,0),-.23*v);rot('Neck03',(0,1,0),.36*v);rootmove((.38*v,0,-.28*v))
  if name in ('hit_left','hit_right'):rot('Neck02',(0,0,1),(.25 if name=='hit_left' else -.25)*v)
 if name.startswith('death'):
  sign=1 if name=='death' else -1;shock=bell(t,0,.11,.27);rear=bell(t,.10,.29,.53);v=smooth((t-.38)/.22);settle=bell(t,.57,.64,.82)
  for con in ground_cons:con.influence=1-v
  rootmove((.35*shock-.45*v,0,.55*rear-1.45*v+.14*settle));rot('Spine03',(1,0,0),sign*(.08*shock+.80*v-.07*settle));rot('Spine03',(0,1,0),.22*rear)
  rot('Spine01',(0,1,0),.17*rear-.12*v);rot('Neck03',(0,1,0),.42*rear-.35*v);rot('Neck02',(0,0,1),sign*(.18*shock+.22*rear));rot('LowerHead',(0,1,0),-.8*rear-.22*v)
  for side,sgn in [('l',-1),('r',1)]:
   rot('UpperLeg_'+side,(0,1,0),1.05*v);rot('ForeLeg_'+side,(0,1,0),-1.95*v);rot('FeetConnection_'+side,(0,1,0),.9*v);rot('UpperArm_'+side,(1,0,0),sgn*(.85*rear+.65*v));rot('ForeArm_'+side,(0,1,0),-.35*rear+.6*v);rot('Arm_'+side,(0,1,0),.6*v)
  for i in range(1,11):rot('Tail%02d'%i,(0,0,1),-sign*.055*v)
  for con in wing_cons:con.influence=1-.65*rear
  rot('Tail01',(0,1,0),-.40*v);rot('Tail04',(0,1,0),.40*v)
 if not name.startswith('death'):
  dz=(restq['Spine03']@solver.pose.bones['Spine03'].location).z;rot('Tail01',(0,1,0),(-.10-max(0,-dz)*.35)*(1-blend));rot('Tail02',(0,1,0),.04*(1-blend))
 # Predatory attention: authored, uneven impulses with a clear target focus.
 # Zero at handoffs; no per-frame noise, gameplay randomness or whole-body jitter.
 if name in ('idle','alert','look','stalk','walk'):
  snap=.16*bell(t,.12,.16,.26)-.22*bell(t,.53,.57,.70)+.09*bell(t,.81,.84,.93)
  gain=.55 if name in ('walk','stalk') else 1
  rot('Neck01',(0,0,1),snap*gain);rot('Head',(0,0,1),snap*.7*gain)
  if name in ('alert','stalk'):rot('LowerHead',(0,1,0),-.18*bell(t,.18,.23,.43))
 if name=='bite':
  wrench=pathpose(t,[(0,0),(.47,0),(.54,.30),(.60,-.24),(.68,.17),(.77,0),(1,0)])
  rot('Neck02',(0,0,1),wrench);rot('Head',(1,0,0),-.5*wrench);rot('Spine01',(0,0,1),wrench*.35)
 if name.startswith('claw'):
  hunt=bell(t,.06,.20,.36);rot('Head',(0,0,1),(.18 if name.endswith('left') else -.18)*hunt);rot('LowerHead',(0,1,0),-.28*bell(t,.12,.32,.68))
 if name=='pounce':
  rot('Neck03',(0,1,0),-.18*bell(t,.05,.23,.35));rot('LowerHead',(0,1,0),-.45*bell(t,.28,.47,.75))
 if name=='run':rot('LowerHead',(0,1,0),-.22*math.sin(math.pi*t)**2)
 bpy.context.view_layer.update()
 for pole,parent_name,local in poles:pole.location=solver.pose.bones[parent_name].matrix@local
 bpy.context.view_layer.update()
selected=SPECS if a.clips=='all' else [s for s in SPECS if s[0] in a.clips.split(',')];report={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fps':24,'performanceRevision':2,'cameraCenter':[3.8,0,5.4],'clips':{},'rigDeformBones':112,'runtimeIntegrated':False,'motionAcceptedByOwner':False};start=time.time()
for name,intervals,loop,travel,events in selected:
 action=bpy.data.actions.new('Ashfang|'+name);action.use_fake_user=True;action['loop']=loop;action['durationSeconds']=intervals/24;action['travelPerCycle']=travel;action['eventsJson']=json.dumps(events)
 for event,times in events.items():
  for number,phase in enumerate(times if isinstance(times,list) else [times]):
   if isinstance(phase,(int,float)):marker=action.pose_markers.new(event+('_'+str(number+1) if isinstance(times,list) else ''));marker.frame=round(phase*intervals)+1
 rig.animation_data_create();rig.animation_data.action=action;contact_errors=[];positions=[]
 for frame in range(intervals+1):
  t=frame/intervals;setpose(name,t);matrices={b.name:b.matrix.copy() for b in solver.pose.bones}
  for pb in rig.pose.bones:
   kwargs={'matrix':matrices[pb.name],'matrix_local':pb.bone.matrix_local,'invert':True}
   if pb.parent:kwargs.update(parent_matrix=matrices[pb.parent.name],parent_matrix_local=pb.parent.bone.matrix_local)
   pb.matrix_basis=pb.bone.convert_local_to_pose(**kwargs);pb.rotation_mode='QUATERNION'
  if name.startswith('death'):
   bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();lowest=min(v.co.z for v in me.vertices);ev.to_mesh_clear()
   if lowest<-.015:rig.pose.bones['Spine03'].location+=restq['Spine03'].inverted()@Vector((0,0,-.015-lowest))
  for pb in rig.pose.bones:
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
 report['clips'][name]={'action':action.name,'sourceFrames':intervals+1,'intervals':intervals,'duration':intervals/24,'loop':loop,'travelPerCycle':travel,'events':events,'headingChangeDegrees':-45 if name=='turn_left' else 45 if name=='turn_right' else 0,'rootMotion':[travel*(f/intervals if name!='pounce' else smooth((f/intervals-.3)/.38)) for f in range(intervals+1)],'stanceDuty':.32 if name=='run' else .7,'phaseOffsets':{'foreLeft':0,'foreRight':.06,'hindLeft':.5,'hindRight':.56} if name=='run' else {'foreLeft':0,'foreRight':.5,'hindLeft':.75,'hindRight':.25},'maxIKTargetError':max(contact_errors,default=0),'landmarks':positions}
 print('BAKED',name,intervals+1,'IK',max(contact_errors,default=0),flush=True)
# Temporary IK targets and solver do not ship. Every pose is editable on the original deform hierarchy.
for ob in helpers+[solver]:bpy.data.objects.remove(ob,do_unlink=True)
rig.data.pose_position='POSE';rig['AshfangReviewPose']=True;rig.animation_data.action=bpy.data.actions['Ashfang|'+selected[0][0]];scene.frame_start=1;scene.frame_end=selected[0][1] if selected[0][2] else selected[0][1]+1;scene.frame_set(1)
# Share preserved texture files, avoiding a second packed copy in every motion milestone.
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-animations.blend'),compress=True,relative_remap=False);report['seconds']=time.time()-start;report['sha256']=hashlib.sha256((out/'ashfang-animations.blend').read_bytes()).hexdigest();(out/'motions.json').write_text(json.dumps(report,indent=2));print('ANIMATION_SOURCE_SAVED',report['seconds'],flush=True)
