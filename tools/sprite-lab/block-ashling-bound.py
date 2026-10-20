"""Research-led leg blocking on the preserved Ashling mesh; no runtime art change."""
import bpy,sys,json,math
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
asset=Path(sys.argv[sys.argv.index('--')+1])
out=asset/'model/local-appearance-002'/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(asset/'model/local-appearance-002/rigged-bound-v3/ashling-rigged.blend'))
bpy.context.preferences.filepaths.save_version=0
rig=bpy.data.objects['Ashling editable animation rig'];character=bpy.data.objects['Ashling skinned character']
rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis.identity()
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
# Source audit: positive-X foot is forward (Y about .08), negative-X foot is
# behind (Y about .30). Earlier ankle controls incorrectly reversed this depth.
joints={
 'L':[(.18,.17,-.09),(.25,.09,-.24),(.32,.085,-.435)],
 'R':[(-.025,.22,-.09),(-.14,.17,-.24),(-.25,.30,-.435)]}
for side,(hip,knee,ankle) in joints.items():
    for name,a,b in [('thigh',hip,knee),('shin',knee,ankle),('foot',ankle,np.array(ankle)+[0,-.16,-.055])]:
        bone=rig.data.edit_bones[name+'.'+side];bone.head=a;bone.tail=b
bpy.ops.object.mode_set(mode='OBJECT')
for p in rig.pose.bones:p.matrix_basis.identity();p.rotation_mode='QUATERNION'
bones={b.name:dict(head=np.array(b.head_local),tail=np.array(b.tail_local),matrix=b.matrix_local.copy()) for b in rig.data.bones}
v=np.array([p.co[:] for p in character.data.vertices]);names=[g.name for g in character.vertex_groups]
old_weights=np.zeros((len(v),len(names)))
for vert in character.data.vertices:
    for group in vert.groups:old_weights[vert.index,group.group]=group.weight
arm_indices=[i for i,n in enumerate(names) if n.startswith(('hand.','forearm.','upper_arm.'))]
cloth_indices=[i for i,n in enumerate(names) if n.startswith('cloth.')]
tail_indices=[i for i,n in enumerate(names) if n.startswith('tail.')]
leg_indices=np.where((v[:,2]<-.095)&(old_weights[:,tail_indices].sum(1)<.1)&(old_weights[:,arm_indices].sum(1)<.25)&~((old_weights[:,cloth_indices].sum(1)>.35)&(abs(v[:,0]-.07)<.09)))[0]
for group in character.vertex_groups:group.remove(leg_indices.tolist())
def distance(point,a,b):
    delta=b-a;t=np.clip(np.dot(point-a,delta)/np.dot(delta,delta),0,1)
    return np.linalg.norm(point-a-t*delta)
for index in leg_indices:
    point=v[index];side='L' if point[0]>.07 else 'R'
    permitted=['thigh.'+side,'shin.'+side,'foot.'+side]
    if point[2]>-.15:permitted.append('pelvis')
    if point[2]<-.42:permitted=['foot.'+side]
    scores=np.array([1/max(.012,distance(point,bones[n]['head'],bones[n]['tail']))**4 for n in permitted]);scores/=scores.sum()
    for n,w in zip(permitted,scores):character.vertex_groups[n].add([int(index)],float(w),'REPLACE')
feet={}
for side in ['L','R']:
    foot=v[(v[:,2]<-.42)&((v[:,0]>.07) if side=='L' else (v[:,0]<.07))]
    relative=foot-bones['foot.'+side]['head']
    rotation=Quaternion((1,0,0),math.radians(30)).to_matrix()
    toe=relative[np.argmin((relative@np.array(rotation).T)[:,2])]
    feet[side]=dict(relative=relative,toe=toe)
def segment(name,head,tip):
    head,tip=Vector(head),Vector(tip);rest=bones[name]
    r=Vector(rest['tail']-rest['head']).rotation_difference(tip-head).to_matrix()@rest['matrix'].to_3x3()
    matrix=r.to_4x4();matrix.translation=head;rig.pose.bones[name].matrix=matrix;bpy.context.view_layer.update()
def knee_ik(hip,ankle,side):
    thigh=bones['thigh.'+side];shin=bones['shin.'+side]
    l1=np.linalg.norm(thigh['tail']-thigh['head']);l2=np.linalg.norm(shin['tail']-shin['head'])
    delta=ankle-hip;length=delta.length
    assert abs(l1-l2)+.001<length<l1+l2-.001,(side,'unreachable',length,l1+l2)
    direction=delta.normalized();along=(l1*l1-l2*l2+length*length)/(2*length)
    pole=Vector((.35 if side=='L' else -.35,-1,0));pole-=direction*pole.dot(direction);pole.normalize()
    return hip+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
# Explicit key poses. Fields: frame, pelvis Z/Y, lean, arm pitch,
# L/R foot clearance, L/R airborne ankle Y, L/R toe pitch degrees.
# Early supports move backwards only by the authored in-place world travel.
keys=[
 (0,-.10,0,.20,-.35,0,0,.15,.15,0,0),
 (2,-.16,-.015,.28,-.65,0,0,.195,.195,0,0),
 (4,-.055,0,.17,.05,0,0,.24,.24,8,0),
 (5,.025,0,.12,.30,0,0,.2625,.2625,18,0),
 (6,.075,-.005,.10,.50,.12,0,.29,.285,20,12),
 (7,.125,-.01,.08,.40,.24,0,.25,.3075,0,24),
 (8,.16,-.035,.10,-.45,.33,.06,.20,.34,-25,20),
 (9,.18,-.055,.16,-.70,.36,.19,.14,.34,-30,0),
 (10,.11,-.05,.22,-.65,.24,.33,.07,.27,-15,-30),
 (11,.04,-.035,.25,-.35,.08,.23,0,.20,-8,-15),
 (12,-.015,-.02,.24,-.10,0,.13,.06,.14,0,-5),
 (13,-.14,-.01,.28,-.50,0,.04,.0825,.105,0,0),
 (14,-.135,0,.25,-.65,0,0,.105,.105,0,0),
 (16,-.10,0,.20,-.35,0,0,.15,.15,0,0)]
def sample(frame):
    for a,b in zip(keys,keys[1:]):
        if a[0]<=frame<=b[0]:
            t=(frame-a[0])/(b[0]-a[0]);return np.array(a[1:])*(1-t)+np.array(b[1:])*t
    raise ValueError(frame)
stride=.36;diagnostics=[]
for frame in range(17):
    phase=frame/16;z,y,lean,arm,lc,rc,ly,ry,lp,rp=sample(frame)
    offset=Vector((.008*math.sin(2*math.pi*phase),y,z))
    rotation=Quaternion((0,0,1),.045*math.sin(2*math.pi*phase))@Quaternion((1,0,0),lean)
    origin=Vector(bones['pelvis']['head']);point=lambda p:origin+rotation@(Vector(p)-origin)+offset
    segment('root',bones['root']['head'],bones['root']['tail'])
    for name in ['pelvis','spine','chest']:segment(name,point(bones[name]['head']),point(bones[name]['tail']))
    neck=point(bones['neck']['head']);gaze=Quaternion((1,0,0),math.radians(-15))
    head_point=lambda p:neck+gaze@(point(p)-neck)
    for name in ['neck','head']:segment(name,head_point(bones[name]['head']),head_point(bones[name]['tail']))
    for side,sign,clearance,air_y,pitch in [('L',1,lc,ly,lp),('R',-1,rc,ry,rp)]:
        support=(frame<=5 or frame>=12) if side=='L' else (frame<=7 or frame>=14)
        early=(frame<=5 if side=='L' else frame<=7)
        foot_rotation=Quaternion((1,0,0),math.radians(pitch));r=np.array(foot_rotation.to_matrix())
        # Actual sole vertices set floor height; toe rotation cannot sink the mesh.
        ankle_z=-.5+clearance-float((feet[side]['relative']@r.T)[:,2].min())
        x=.27 if side=='L' else -.13
        if not support:
            tuck=min(1,clearance/.32);x=(1-tuck)*x+tuck*(.14 if side=='L' else -.04)
        ankle_y=(.15+stride*(phase if early else phase-1)) if support else air_y
        if support and pitch:
            toe=feet[side]['toe'];ankle_y+=float(toe[1]-(r@toe)[1])
        ankle=Vector((x,ankle_y,ankle_z));hip=point(bones['thigh.'+side]['head']);knee=knee_ik(hip,ankle,side)
        segment('thigh.'+side,hip,knee);segment('shin.'+side,knee,ankle)
        segment('foot.'+side,ankle,ankle+foot_rotation@Vector(bones['foot.'+side]['tail']-bones['foot.'+side]['head']))
        interior=math.degrees((hip-knee).angle(ankle-knee))
        diagnostics.append(dict(frame=frame+1,side=side,support=support,interval='early' if early else 'late',clearance=float(clearance),kneeAngle=interior,hip=list(hip),knee=list(knee),ankle=list(ankle),toe=list(ankle+foot_rotation@Vector(feet[side]['toe']))))
        shoulder=point(bones['upper_arm.'+side]['head']);segment('clavicle.'+side,point(bones['clavicle.'+side]['head']),shoulder)
        ar=Quaternion((0,0,1),sign*.08*math.sin(2*math.pi*phase))@Quaternion((1,0,0),arm+(0 if side=='L' else .12))@rotation
        elbow=shoulder+ar@Vector(bones['upper_arm.'+side]['tail']-bones['upper_arm.'+side]['head'])
        wrist=elbow+ar@Vector(bones['forearm.'+side]['tail']-bones['forearm.'+side]['head'])
        hand=wrist+ar@Vector(bones['hand.'+side]['tail']-bones['hand.'+side]['head'])
        segment('upper_arm.'+side,shoulder,elbow);segment('forearm.'+side,elbow,wrist);segment('hand.'+side,wrist,hand)
        cloth=bones['cloth.'+side];h=point(cloth['head']);swing=.2+max(0,-z)*4+.06*math.sin(2*math.pi*phase-.5)
        segment('cloth.'+side,h,h+Quaternion((1,0,0),swing)@Vector(cloth['tail']-cloth['head']))
    previous=None
    for i in range(8):
        name=f'tail.{i}';h=point(bones[name]['head']) if previous is None else previous
        direction=rotation@Vector(bones[name]['tail']-bones[name]['head'])
        previous=h+Quaternion((0,0,1),.15*math.sin(2*math.pi*phase-i*.4))@direction
        segment(name,h,previous)
    for pose in rig.pose.bones:
        for property in ['location','rotation_quaternion','scale']:pose.keyframe_insert(property,frame=frame+1,group=pose.name)
for curve in rig.animation_data.action.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=16;scene.render.fps=20;scene.frame_set(1)
(out/'gait-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
(out/'export-profile.json').write_text(json.dumps(dict(frames=16,fps=20,travelModelUnitsPerCycle=stride,groundRoot=[.07,.22,-.5],gait='explicit load-drive-tuck-catch blocking',ownerAccepted=False,runtimeIntegrated=False,reboundLegVertices=len(leg_indices),keyPoses=[list(k) for k in keys]),indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashling-rigged.blend'))
print('Saved explicit leg blocking; rebound',len(leg_indices),'vertices',flush=True)

