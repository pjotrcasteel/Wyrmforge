"""Persistent quadruped/wing rig on the original offline reconstructed surface.
Blocking actions are anatomy tests, not accepted final motion or runtime content.
"""
import bpy,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).parent))
from ashfang_wings import rebuild_wings,wing_layout
from ashfang_anatomy import rebuild_anatomy,TAIL_POINTS
from ashfang_material import stone_separation
from ashfang_performance import walk_controls,breath_control
import ashfang_motion
from ashfang_digits import digit_points,digit_identity,carried_limb
from ashfang_motion import flight_state,cruise_state,connected_flight_state,CONNECTED_FLIGHT_FRAMES,CONNECTED_FLIGHT_EVENTS,FLIGHT_EVENTS,high_launch_state,fire_pass_state,arena_flyover_state,hunt_fitted_arena_state,ARENA_FLYOVER_FRAMES
folder=Path(sys.argv[sys.argv.index('--')+1]);out=folder/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
stance_only='--stance-only' in sys.argv
fold_sweep='--fold-sweep' in sys.argv
wing_gate='--wing-gate' in sys.argv or fold_sweep
motion_gate='--motion-gate' in sys.argv
performance_pass='--performance-pass' in sys.argv
ashfang_motion.PERFORMANCE_ENABLED=performance_pass
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
s=np.load(folder/'textured-v1/textured-mesh.npz');original=s['vertices'];v=np.stack([original[:,1],-original[:,0],original[:,2]],1);faces=s['faces'];uv=s['uv']
# Original source sculpt: lift and broaden the low reconstructed skull/neck so
# the face reads in front of folded wings at Tier-I size. UV detail is preserved.
head_mix=np.clip((-v[:,1]-.21)/.12,0,1);head_mix=head_mix*head_mix*(3-2*head_mix)
head_mix*=np.clip((v[:,2]+.09)/.055,0,1)
v[:,0]*=1+.35*head_mix;v[:,1]-=.32*head_mix*np.maximum(0,-v[:,1]-.22);v[:,2]+=.052*head_mix+.15*head_mix*np.maximum(0,v[:,2]-.015)
# Extend the existing balancing tail surface and its skeleton together.
# Extend the whole trailing surface, including its outer plates, into a taper.
tail_t=np.clip((v[:,1]-.29)/.205,0,1)
v[:,0]*=1-.58*tail_t
v[:,1]+=1.40*np.maximum(0,v[:,1]-.29)
v[:,2]+=.035*tail_t**2
# Narrow the terminal muzzle rather than broadening it into a rounded block.
muzzle=np.clip((-v[:,1]-.38)/.18,0,1)
v[:,0]*=1-.30*muzzle
v[:,2]+=.018*muzzle
# Reconstructed low inter-leg webbing belongs to an arched underside, not a
# giant paw. Sculpt it upward in the source; keep actual paw rows unchanged.
belly_front=np.clip((v[:,1]+.14)/.085,0,1);belly_front=belly_front**2*(3-2*belly_front)
belly_back=np.clip((v[:,1]-.075)/.065,0,1);belly_back=1-belly_back**2*(3-2*belly_back)
low=np.clip((-.10-v[:,2])/.06,0,1)
fore_paw=((abs(v[:,0])-.17)/.085)**2+((v[:,1]+.285)/.135)**2
hind_paw=((abs(v[:,0])-.17)/.085)**2+((v[:,1]-.19)/.14)**2
fore_paw=np.where(v[:,1]<-.055,fore_paw,2.0)
hind_paw=np.where((v[:,1]>.04)&(v[:,1]<.34),hind_paw,2.0)
clear_of_paws=np.clip((np.minimum(fore_paw,hind_paw)-1.2)/.4,0,1)
belly_surface=-.10+.02*np.maximum(0,1-abs(v[:,0])/.25)**2
v[:,2]+=np.maximum(0,belly_surface-v[:,2])*belly_front*belly_back*low*clear_of_paws
# Replace the failed local reconstruction rather than repeatedly squeezing it.
v,faces,uv,source_labels,anatomy_changes=rebuild_anatomy(v,faces,uv)
# Give the reconstructed upper chest more volume without moving soles,
# limb joints, tail topology or the separately authored wing membrane.
chest_mass=np.exp(-((v[:,1]+.13)/.15)**2)*np.clip((v[:,2]+.075)/.07,0,1)*(source_labels==0)
v[:,0]*=1+.15*chest_mass;v[:,2]+=.018*chest_mass
v,faces,uv,body_count,removed_wing_vertices,wing_camber,source_labels,membrane_bind,spar_bind=rebuild_wings(v,faces,uv,source_labels)
# Continuous card projection replaces discontinuous nearest-triangle UVs on
# the authored surfaces. The latter scattered unrelated atlas texels into noise.
for index in range(body_count):
    x,y,z=v[index];label=source_labels[index]
    if label==1:
        px=np.interp(y,[.23,1.005],[150,277]);py=np.interp(y,[.23,1.005],[144,168])+np.clip(-z*28,-8,8)
    elif label in (2,9):
        px=np.interp(y,[-.565,-.315],[12,51]);py=np.interp(z,[.02,.17],[112,74])
    elif label==6:
        px=np.interp(y,[-.39,-.17],[39,86]);py=np.interp(z,[-.02,.19],[143,91])
    elif label in (3,4):
        px=np.interp(y,[.045,.23],[125,166]);py=np.interp(z,[-.197,.04],[178,139])
    elif label in (7,8):
        px=np.interp(y,[-.405,-.18],[41,88]);py=np.interp(z,[-.197,.07],[178,133])
    else:
        px=np.interp(y,[-.23,.285],[83,161]);py=np.interp(z,[-.11,.18],[155,115])
    uv[index]=[np.clip(px,2,283)/286*.5,1-np.clip(py,2,189)/192]
(out/'anatomy-rebuild.json').write_text(json.dumps(anatomy_changes,indent=2)+'\n')
mesh=bpy.data.meshes.new('Ashfang original reconstructed surface');mesh.from_pydata(v.tolist(),[],faces.tolist());mesh.update();obj=bpy.data.objects.new('Ashfang skinned character',mesh);bpy.context.collection.objects.link(obj);layer=mesh.uv_layers.new(name='AppearanceUV')
for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
obj.shape_key_add(name='Basis')
folded_membrane=obj.shape_key_add(name='Folded membrane compliance');fold_correction_ready=False
membrane=obj.shape_key_add(name='Membrane pressure and recovery');membrane.slider_min=-1;membrane.slider_max=1
for index,amount in enumerate(wing_camber):membrane.data[index].co.z+=float(amount)

material=bpy.data.materials.new('Ashfang original card-derived appearance');material.use_nodes=True;texture=material.node_tree.nodes.new('ShaderNodeTexImage')
base=bpy.data.images.load(str(folder/'textured-v1/hollow-albedo.png'));raw=np.empty(len(base.pixels),np.float32);base.pixels.foreach_get(raw);raw=raw.reshape(1024,1024,4)
side_card=bpy.data.images.load(str(folder.parent.parent/'references/side-card-crop.png'))
side_pixels=np.empty(len(side_card.pixels),np.float32);side_card.pixels.foreach_get(side_pixels);side_pixels=side_pixels.reshape(side_card.size[1],side_card.size[0],4)
raw=side_pixels[(np.arange(1024)*side_card.size[1]//1024)[:,None],(np.arange(1024)*side_card.size[0]//1024)[None,:]].copy()
# Remove a baked white flame hotspot from the throat region; retain warm
# molten colour instead of painting over the entire dragon or brightening wings.
throat=(v[:body_count,1]<-.14)&(v[:body_count,1]>-.40)&(abs(v[:body_count,0])<.13)&(v[:body_count,2]>-.09)
texels=uv[:body_count][throat]*[2,1]
mask=np.zeros((1024,1024),bool)
for u,w in texels:
    x=int(np.clip(u*1023,0,1023));y=int(np.clip(w*1023,0,1023));mask[max(0,y-3):min(1024,y+4),max(0,x-3):min(1024,x+4)]=True
hot=mask&(raw[:,:,0]>.55)&(raw[:,:,1]>.42)&(raw[:,:,2]>.20)
raw[hot,1]*=.50;raw[hot,2]*=.20
# Small value lift on source dark stone makes plate shapes survive quantization.
raw[:,:,:3]=np.clip(raw[:,:,:3]*1.12,0,1)
# Keep incandescent seams as narrow boundaries in the card-derived material;
# broad painted fire regions become warm charcoal rather than an orange body.
warm=(raw[:,:,0]>.30)&(raw[:,:,0]>raw[:,:,1]*1.6)
near_dark=np.zeros(warm.shape,bool)
for axis in (0,1):
    for delta in (-2,-1,1,2):near_dark|=np.roll(raw[:,:,0],delta,axis)<.14
charcoal=warm&~near_dark
raw[charcoal,:3]*=np.array([.30,.38,.48])
eye_score=np.where((raw[:,:,1]>.15)&(raw[:,:,0]>raw[:,:,1]*1.5),raw[:,:,0]-.3*raw[:,:,1],-1)
eye_y,eye_x=np.unravel_index(eye_score.argmax(),eye_score.shape)
for loop in mesh.loops:
    if source_labels[loop.vertex_index]==10:uv[loop.vertex_index]=((eye_x+.5)/2048,(eye_y+.5)/1024)
raw[1020:1024,1020:1024,:]=[.62,.55,.43,1]
raw[1016:1020,1020:1024,:]=[.018,.016,.018,1]
for loop in mesh.loops:
    if source_labels[loop.vertex_index]==11:uv[loop.vertex_index]=(1022/2048,1022/1024)
    if source_labels[loop.vertex_index]==12:uv[loop.vertex_index]=(1022/2048,1018/1024)
# Original authored charcoal tile for the solid scutes. This reserved area is
# outside the card-projected body UVs; original reference art remains intact.
tile_y,tile_x=np.mgrid[0:128,0:128];tone=.145+.045*(1-tile_y/127)+.012*np.sin(tile_x*.11)*np.sin(tile_y*.08)
raw[896:1024,0:128,:3]=tone[:,:,None]*np.array([.94,.96,1.0]);raw[896:1024,0:128,3]=1
head_tone=.205+.07*(1-tile_y/127)+.008*np.sin(tile_x*.09)*np.sin(tile_y*.1)
raw[896:1024,128:256,:3]=head_tone[:,:,None]*np.array([.94,.96,1.0]);raw[896:1024,128:256,3]=1
for index in range(body_count):
    if source_labels[index] in (2,9,20,21,22,23):
        x,y,z=v[index];u=(x*4+.5)%1;w=(y*4+.5)%1
        uv[index]=[((136 if source_labels[index] in (2,9,22) else 8)+u*110)/2048,(904+w*110)/1024]
for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
raw=stone_separation(raw)
card=bpy.data.images.load(str(folder.parent.parent/'references/front-card-crop.png'));cp=np.empty(len(card.pixels),np.float32);card.pixels.foreach_get(cp);cp=cp.reshape(card.size[1],card.size[0],4);rows=(np.arange(1024)*card.size[1]//1024);cols=(np.arange(1024)*card.size[0]//1024);atlas=np.concatenate([raw,cp[rows[:,None],cols[None,:]]],axis=1)
image=bpy.data.images.new('Ashfang original surface and authored card wings',width=2048,height=1024);image.pixels.foreach_set(atlas.ravel());image.filepath_raw=str(out/'ashfang-albedo.png');image.file_format='PNG';image.save();image.pack();texture.image=image;texture.interpolation='Closest';shader=material.node_tree.nodes.get('Principled BSDF');material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color']);mesh.materials.append(material)
bones={}
def bone(n,a,b,parent=None,deform=True):bones[n]=dict(head=np.array(a,float),tail=np.array(b,float),parent=parent,deform=deform)
bone('root',(0,0,-.197),(0,0,-.12),deform=False);bone('pelvis',(0,.16,-.025),(0,.07,.005),'root');bone('spine',(0,.07,.005),(0,-.05,.025),'pelvis');bone('chest',(0,-.05,.025),(0,-.16,.03),'spine');bone('neck.0',(0,-.16,.03),(0,-.25,.07),'chest');bone('neck.1',(0,-.25,.07),(0,-.35,.10),'neck.0');bone('head',(0,-.35,.10),(0,-.52,.065),'neck.1');bone('jaw',(0,-.36,.085),(0,-.565,.075),'head');bone('mouth',(0,-.575,.080),(0,-.63,.080),'head',False)
for side,sign in [('L',1),('R',-1)]:
    for limb,points,parent in [('fore',[(sign*.115,-.18,-.005),(sign*.15,-.22,-.075),(sign*.17,-.29,-.165),(sign*.17,-.37,-.185)],'chest'),('hind',[(sign*.105,.17,-.025),(sign*.18,.095,-.075),(sign*.18,.23,-.16),(sign*.18,.075,-.185)],'pelvis')]:
        for i in range(3):bone(f'{limb}.{i}.{side}',points[i],points[i+1],parent if i==0 else f'{limb}.{i-1}.{side}')
        for digit in range(3):
            points_digit=digit_points(limb,side,digit)
            for joint in range(2):bone(f'toe.{limb}.{digit}.{joint}.{side}',points_digit[joint],points_digit[joint+1],f'{limb}.2.{side}' if joint==0 else f'toe.{limb}.{digit}.0.{side}')
    wr,we,ww,middles,tips=wing_layout(sign);points=[wr,we,ww]
    bone('wing.upper.'+side,points[0],points[1],'chest');bone('wing.fore.'+side,points[1],points[2],'wing.upper.'+side)
    for finger in range(4):
        middle=middles[finger];tip=tips[finger]
        bone(f'wing.finger.{finger}.0.{side}',points[2],middle,'wing.fore.'+side);bone(f'wing.finger.{finger}.1.{side}',middle,tip,f'wing.finger.{finger}.0.{side}')
    for anchor_name,anchor in [('root',wr),('elbow',we),('wrist',ww)]+[(f'mid.{f}',mid) for f,mid in enumerate(middles)]+[(f'tip.{f}',tip) for f,tip in enumerate(tips)]:
        bone(f'membrane.{anchor_name}.{side}',anchor,anchor+np.array([0,0,.02]),'root')
tail=TAIL_POINTS.tolist()
for i in range(len(tail)-1):bone(f'tail.{i}',tail[i],tail[i+1],'pelvis' if i==0 else f'tail.{i-1}')
arm=bpy.data.armatures.new('Ashfang articulated anatomy');rig=bpy.data.objects.new('Ashfang editable animation rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,b in bones.items():
    edit=arm.edit_bones.new(n);edit.head=b['head'];edit.tail=b['tail'];edit.use_deform=b['deform']
    if b['parent']:edit.parent=arm.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT');modifier=obj.modifiers.new('Anatomical surface deformation','ARMATURE');modifier.object=rig;modifier.use_deform_preserve_volume=False;obj.parent=rig
# Object-level root path is editable and keyed in Blender. Evaluated samples
# export world coordinates, so flyover yaw/bank is real 3D source motion.
path_root=bpy.data.objects.new('Ashfang arena flight path',None);bpy.context.collection.objects.link(path_root);rig.parent=path_root
names=[n for n,b in bones.items() if b['deform']]
for n in names:obj.vertex_groups.new(name=n)
def distance(p,a,b):
    d=b-a;t=np.clip(np.dot(p-a,d)/np.dot(d,d),0,1);return np.linalg.norm(p-a-t*d)
ownership={}
membrane_by_index={bind['index']:bind for bind in membrane_bind}
for index,p in enumerate(v):
    x,y,z=p;side='L' if x>=0 else 'R'
    if index>=body_count:
        # Each spar belongs to its own segment. Nearest-all-wing weighting let
        # neighbouring fingers pull tubes apart and distort the folded outline.
        if index in spar_bind:
            obj.vertex_groups[spar_bind[index]].add([index],1,'REPLACE');continue
        bind=membrane_by_index[index];side=bind['side']
        anchors=[(f'membrane.{name}.{side}',weight) for name,weight in bind['anchors']]
        for name,weight in anchors:
            if weight>0:obj.vertex_groups[name].add([index],weight,'REPLACE')
        continue
    elif 30<=source_labels[index]<=41:
        limb,side,digit=digit_identity(int(source_labels[index]));permitted=[f'toe.{limb}.{digit}.{joint}.{side}' for joint in range(2)];region='digit'
    elif source_labels[index] in (1,23) or (source_labels[index]==0 and ((y>.27 and abs(x)<.13) or y>=.34)):permitted=[n for n in names if n.startswith('tail.')];region='tail'
    elif source_labels[index] in (2,10,11,12,22):
        permitted=['head'];region='head'
    elif source_labels[index] in (3,4):
        side='L' if source_labels[index]==3 else 'R';permitted=[f'hind.{i}.{side}' for i in range(3)];region='hind'
    elif source_labels[index] in (5,20):permitted=['pelvis','spine','chest'];region='body'
    elif source_labels[index] in (6,21):permitted=['chest','neck.0','neck.1'];region='neck'
    elif source_labels[index] in (7,8):
        side='L' if source_labels[index]==7 else 'R';permitted=[f'fore.{i}.{side}' for i in range(3)];region='fore'
    elif source_labels[index]==9:permitted=['jaw'];region='jaw'
    elif y<-.30 and abs(x)<.15 and z>-.08:
        permitted=['head','jaw'] if z<.065 else ['head','neck.1'];region='head'
    elif z<-.055 and abs(x)>.035 and y<-.055:
        permitted=['fore.2.'+side] if z<-.135 else [f'fore.{i}.{side}' for i in range(3)];region='fore'
    elif z<-.055 and abs(x)>.035 and .04<y<.34:
        if z<-.135:permitted=['hind.2.'+side]
        else:permitted=[f'hind.{i}.{side}' for i in range(3)]
        region='hind'
    elif y<-.21:permitted=['neck.0','neck.1','head','chest'];region='neck'
    else:permitted=['pelvis','spine','chest'];region='body'
    scores=np.array([1/max(.008,distance(p,bones[n]['head'],bones[n]['tail']))**4 for n in permitted]);scores/=scores.sum();ownership[region]=ownership.get(region,0)+1
    for n,w in zip(permitted,scores):
        if w>.001:obj.vertex_groups[n].add([index],float(w),'REPLACE')
tail_indices=[p.index for p in mesh.vertices if any(obj.vertex_groups[g.group].name.startswith('tail.') for g in p.groups)]
rest={n:rig.data.bones[n].matrix_local.copy() for n in bones};lengths={n:rig.data.bones[n].length for n in bones}
soles={};foot_indices={}
for limb in ['fore','hind']:
    for side in ['L','R']:
        n=f'{limb}.2.{side}';g=obj.vertex_groups[n].index
        foot_indices[n]=[p.index for p in mesh.vertices if any(w.group==g and w.weight>.95 for w in p.groups)]
        sole_indices=foot_indices[n]+[index for index,label in enumerate(source_labels) if 30<=label<=41 and digit_identity(int(label))[:2]==(limb,side)]
        soles[n]=np.array([mesh.vertices[index].co[:]-bones[n]['head'] for index in sole_indices])
def segment(n,h,t,rotation=None):
    h,t=Vector(h),Vector(t);r=(rotation.to_matrix() if rotation else Vector(bones[n]['tail']-bones[n]['head']).rotation_difference(t-h).to_matrix())@rest[n].to_3x3();matrix=r.to_4x4();matrix.translation=h;rig.pose.bones[n].matrix=matrix;bpy.context.view_layer.update()
def ik(a,b,l1,l2,pole):
    d=b-a;distance=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();b=a+d*distance;along=(l1*l1-l2*l2+distance*distance)/(2*distance);p=Vector(pole);p=(p-d*p.dot(d)).normalized();return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),b
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
clips={};positions={};mouths={};floor=[];contacts=[];body_audit=[];hind_audit=[];air_limb_audit=[];deps=bpy.context.evaluated_depsgraph_get()
for clip,count in [('walk',49 if performance_pass else 24),('rear-breath',73 if performance_pass else 40),('takeoff-flight-land',84),('flight-loop',33 if performance_pass else 17),('landing',31),('flight-sequence',CONNECTED_FLIGHT_FRAMES),('high-launch',55),('fire-flyover',56),('arena-flyovers',ARENA_FLYOVER_FRAMES)]:
    if (stance_only or wing_gate) and clip!='walk':continue
    if motion_gate and clip not in ('walk','rear-breath','takeoff-flight-land','flight-loop','flight-sequence'):continue
    arena_clip=clip in ('high-launch','fire-flyover','arena-flyovers')
    def state_at(t):
        if clip=='high-launch':return high_launch_state(t*(count-1))
        if clip=='fire-flyover':return fire_pass_state(t*(count-1))
        if clip=='arena-flyovers':return hunt_fitted_arena_state(t*(count-1))
        if clip=='flight-sequence':return connected_flight_state(t*(count-1))
        if clip=='flight-loop':return cruise_state(t)
        source_phase=.64+.36*t if clip=='landing' else t
        state=flight_state(max(0,source_phase));state['sourcePhase']=source_phase
        return state
    delay_scale=83/(count-1)
    flex_action=bpy.data.actions.new('Ashfang_membrane_'+clip);flex_action.use_fake_user=True;obj.data.shape_keys.animation_data_create();obj.data.shape_keys.animation_data.action=flex_action
    path_action=bpy.data.actions.new('Ashfang_path_'+clip);path_action.use_fake_user=True;path_root.animation_data_create();path_root.animation_data.action=path_action
    action=bpy.data.actions.new('Ashfang_'+clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;sample=[];emitters=[];skeleton=[];roots=[];attack_signals=[]
    for frame in range(33 if fold_sweep else 4 if wing_gate else 1 if stance_only else count):
        phase=frame/(count-1);altitude=0;rear=0;spread=.08;flap=0;pitch=0;advance=0;jaw=0;flight=None;foot_goals={}
        if clip=='walk':bob=.008*math.sin(phase*math.pi*4);pitch=.025*math.sin(phase*math.pi*2)
        elif clip=='rear-breath':
            rear=smooth(phase/.25)*(1-smooth((phase-.78)/.22));bob=.025*rear;pitch=-.62*rear;spread=.14+.18*rear;jaw=.48*smooth((phase-.22)/.12)*(1-smooth((phase-.68)/.12))
        else:
            flight=state_at(phase);altitude=flight['altitude'];bob=flight['bob'];pitch=flight['pitch'];spread=flight['spread'];flap=flight['flap'];advance=flight['advance']
        if flight:jaw=flight.get('jaw',jaw)
        performance=walk_controls(phase) if performance_pass and clip=='walk' else None
        breathing=breath_control(phase) if performance_pass and clip=='rear-breath' else None
        if performance:bob+=performance['sink']
        if breathing:bob+=.008*breathing['inhale'];jaw+=.04*breathing['exhale']
        if wing_gate and not fold_sweep:
            phase=0;bob=0;pitch=0;spread=[.08,.4,1,1][frame];flap=[0,-.25,-.5,0][frame]
        if fold_sweep:
            phase=0;bob=0;pitch=0;spread=.08+.92*frame/32;flap=-.5*math.sin(math.pi*frame/32)
        path_root.location=(flight.get('actorX',0),flight.get('actorY',0),0) if flight else (0,0,0)
        path_root.rotation_euler=(0,flight.get('actorBank',0),flight.get('actorYaw',0)) if flight else (0,0,0)
        path_root.keyframe_insert('location',frame=frame+1);path_root.keyframe_insert('rotation_euler',frame=frame+1)
        bpy.context.view_layer.update()
        pose_phase=flight.get('sourcePhase',phase) if flight else phase
        # Pressure inflates the bays under power, then reverses gently during
        # recovery. Zero displacement at each spar keeps attachment continuous.
        if flight:
            velocity=(flap-state_at(phase-.008*delay_scale)['flap'])/.008
            membrane.value=max(-.65,min(1,velocity*.065))*spread
        else:membrane.value=0
        membrane.keyframe_insert('value',frame=frame+1)
        rotation=Quaternion((1,0,0),pitch);origin=Vector(bones['pelvis']['head']);offset=Vector((0,advance,altitude+bob));point=lambda p:origin+rotation@(Vector(p)-origin)+offset
        segment('root',bones['root']['head'],bones['root']['tail'])
        posed={}
        if performance or breathing:
            body_head=origin+offset+Vector((performance['shift'] if performance else 0,0,0))
            controls=[('pelvis','pelvisYaw'),('spine','spineYaw'),('chest','chestYaw'),('neck.0','neckYaw'),('neck.1','headYaw')]
            for k,(n,control) in enumerate(controls):
                if performance:
                    yaw=performance[control];roll=performance['roll']*(1-k*.22)
                    body_rotation=Quaternion((0,0,1),yaw)@Quaternion((0,1,0),roll)@rotation
                else:
                    bend=pitch*(.30+.175*k)+breathing['recoil']*(k/4)
                    body_rotation=Quaternion((1,0,0),bend)
                body_tail=body_head+body_rotation@Vector(bones[n]['tail']-bones[n]['head'])
                segment(n,body_head,body_tail,body_rotation);posed[n]=(body_head.copy(),body_rotation);body_head=body_tail
            h=body_head
            headrotation=Quaternion((0,0,1),performance['headYaw'])@Quaternion((1,0,0),pitch*.2) if performance else Quaternion((1,0,0),pitch*.22+breathing['recoil'])
        elif flight:
            controls=[('pelvis','pelvisTilt'),('spine','spineBend'),('chest','chestLift'),('neck.0','neckBase'),('neck.1','neckTip')]
            body_head=origin+offset
            for n,control in controls:
                body_rotation=Quaternion((1,0,0),pitch+flight[control])
                body_tail=body_head+body_rotation@Vector(bones[n]['tail']-bones[n]['head'])
                segment(n,body_head,body_tail,body_rotation);posed[n]=(body_head.copy(),body_rotation);body_head=body_tail
            h=body_head;headrotation=Quaternion((1,0,0),pitch+flight['headCounter'])
        else:
            for n in ['pelvis','spine','chest','neck.0','neck.1']:
                segment(n,point(bones[n]['head']),point(bones[n]['tail']),rotation);posed[n]=(point(bones[n]['head']),rotation)
            h=point(bones['head']['head']);headrotation=Quaternion((1,0,0),rear*.68)@rotation
        segment('head',h,h+headrotation@Vector(bones['head']['tail']-bones['head']['head']),headrotation)
        def attached(parent,p):
            anchor,r=posed[parent];return anchor+r@(Vector(p)-Vector(bones[parent]['head']))
        jh=h+headrotation@Vector(bones['jaw']['head']-bones['head']['head']);jr=headrotation@Quaternion((1,0,0),jaw);segment('jaw',jh,jh+jr@Vector(bones['jaw']['tail']-bones['jaw']['head']),jr)
        mh=h+headrotation@Vector(bones['mouth']['head']-bones['head']['head']);segment('mouth',mh,mh+headrotation@Vector((0,-.055,0)),headrotation)
        for side,sign in [('L',1),('R',-1)]:
            for limb,shift in [('fore',0 if side=='L' else .5),('hind',.25 if side=='L' else .75)]:
                n=f'{limb}.0.{side}';parent='chest' if limb=='fore' else 'pelvis'
                hip=attached(parent,bones[n]['head']);ankle=Vector(bones[f'{limb}.2.{side}']['head']);clearance=0
                if limb=='fore':ankle.y+=.07
                else:ankle.x=sign*.16
                rest_goal=ankle.copy();fn=f'{limb}.2.{side}'
                carried_controls=None
                fr=rotation if altitude>.01 or (limb=='fore' and rear>.01) else Quaternion((1,0,0),0)
                if flight:
                    lag=(.008 if side=='L' else .013)+(.012 if limb=='hind' else 0)
                    carried_controls=carried_limb(flight,state_at(phase-lag*delay_scale),state_at(phase-(lag+.012)*delay_scale),limb)
                    air_limb_audit.append(dict(clip=clip,frame=frame,limb=limb,side=side,controls=carried_controls))
                    fr=fr.slerp(posed[parent][1]@Quaternion((1,0,0),carried_controls['wrist']),carried_controls['amount'])
                if flight and limb=='hind':fr=Quaternion((1,0,0),flight['toeRoll'])@fr
                sole_height=-.197-float((soles[fn]@np.array(fr.to_matrix()).T)[:,2].min())+.0015
                if clip=='walk':
                    t=(phase+shift)%1
                    if t<.72:ankle.y+=.10*(t/.72-.5)
                    else:
                        t=(t-.72)/.28;ankle.y+=.05-.10*t;clearance=.045*math.sin(t*math.pi)
                    ankle.z=sole_height+clearance
                elif flight:
                    tuck=flight[limb+'Tuck']
                    ground_goal=rest_goal+Vector((0,advance if pose_phase>=.30 else 0,0))
                    if limb=='hind':
                        # Rotate the hock about a fixed toe anchor during drive.
                        foot_vector=Vector(bones[fn]['tail']-bones[fn]['head'])
                        ground_goal=ground_goal+foot_vector-fr@foot_vector
                    ground_goal.z=sole_height
                    carried=attached(parent,rest_goal)+posed[parent][1]@Vector((0,carried_controls['carryY'],carried_controls['carryZ']))
                    if limb=='hind':carried.y+=.035*flight['kickTrail']
                    release=1 if clip=='flight-loop' else smooth((pose_phase-(.17 if limb=='fore' else .26))/(.06 if limb=='fore' else .04))
                    ankle=ground_goal.lerp(carried,release)
                    if limb=='fore':ankle.y-=.020*flight['landingReach']
                else:
                    if limb=='fore':ankle=ankle.lerp(point(rest_goal)+Vector((0,.055,.065)),rear)
                if clip!='walk' and altitude<.01:
                    catch_clearance=.025*(1-smooth((pose_phase-.81)/.035)) if flight and limb=='hind' and pose_phase>.76 and pose_phase<.845 else 0
                    ankle.z=max(ankle.z,sole_height+catch_clearance)
                foot_goals[fn]=ankle.copy()
                # Rear knee goes forward/down, hock back, toe forward. The old
                # +Y pole inverted this bend and placed knees above the hips.
                pole=posed[parent][1]@Vector((sign*.30,-1,0)) if limb=='hind' else Vector((sign*.6,-1,0))
                knee,ankle=ik(hip,ankle,lengths[n],lengths[f'{limb}.1.{side}'],pole)
                segment(n,hip,knee);segment(f'{limb}.1.{side}',knee,ankle);segment(fn,ankle,ankle+fr@Vector(bones[fn]['tail']-bones[fn]['head']),fr)
                for digit in range(3):
                    proximal=f'toe.{limb}.{digit}.0.{side}';distal=f'toe.{limb}.{digit}.1.{side}'
                    base=ankle+fr@(Vector(bones[proximal]['head'])-Vector(bones[fn]['head']))
                    swing=(phase+shift)%1
                    toe_release=.20*math.sin(math.pi*(swing-.72)/.28) if performance and swing>.72 else 0
                    curl=carried_controls['proximal'] if carried_controls else toe_release
                    curl_tip=carried_controls['distal'] if carried_controls else toe_release*.65
                    pr=fr@Quaternion((1,0,0),curl*(1-.07*abs(digit-1)))
                    middle=base+pr@Vector(bones[proximal]['tail']-bones[proximal]['head']);segment(proximal,base,middle,pr)
                    dr=pr@Quaternion((1,0,0),curl_tip*(1-.08*abs(digit-1)))
                    segment(distal,middle,middle+dr@Vector(bones[distal]['tail']-bones[distal]['head']),dr)
                if limb=='hind':
                    local_knee=posed[parent][1].inverted()@(knee-hip)
                    hind_audit.append(dict(clip=clip,frame=frame,side=side,kneeOffsetPelvisLocal=list(local_knee),extensionRatio=float((ankle-hip).length/(lengths[n]+lengths[f'{limb}.1.{side}'])),toeRoll=flight['toeRoll'] if flight else 0))
            wingroot=attached('chest',bones['wing.upper.'+side]['head']);wing_rotation=posed['chest'][1]
            opening=min(1,max(0,spread));fold=1-opening
            # Each transform moves its joint from the previous joint, retaining
            # bone lengths. Shoulder powers the stroke, elbow opens the span,
            # and the wrist/digits trail through the membrane recovery.
            shoulder=wing_rotation@Quaternion((0,0,1),sign*.75*fold)@Quaternion((0,1,0),sign*(.25*fold+flap))
            upper='wing.upper.'+side;fore='wing.fore.'+side
            closed_upper=Vector(bones[upper]['tail']-bones[upper]['head']).rotation_difference(Vector((sign*.035,.17,.025)))
            shoulder=shoulder.slerp(wing_rotation@closed_upper,fold)

            elbow=wingroot+shoulder@Vector(bones[upper]['tail']-bones[upper]['head']);segment(upper,wingroot,elbow,shoulder)
            # Sample the SAME shoulder stroke at successive delays. Recovery bends
            # the elbow and feathers the wrist; the powered stroke extends it.
            delayed=state_at(phase-.018*delay_scale)['flap'] if flight else flap
            earlier=state_at(phase-.006*delay_scale)['flap'] if flight else flap
            recovery=max(0,min(1,(earlier-flap)*5))*opening
            elbow_lag=(delayed-flap)*.65*opening
            fore_rotation=shoulder@Quaternion((0,0,1),sign*(.65*fold+.65*recovery))@Quaternion((0,1,0),sign*(.10*fold+elbow_lag))@Quaternion((1,0,0),.30*recovery)
            closed_fore=Vector(bones[fore]['tail']-bones[fore]['head']).rotation_difference(Vector((sign*-.04,-.32,.005+.14*rear)))
            fore_rotation=fore_rotation.slerp(wing_rotation@closed_fore,fold)
            wrist=elbow+fore_rotation@Vector(bones[fore]['tail']-bones[fore]['head']);segment(fore,elbow,wrist,fore_rotation)
            for finger in range(4):
                previous=wrist
                for j in range(2):
                    n=f'wing.finger.{finger}.{j}.{side}'
                    digit_delay=.026+finger*.004+j*.009
                    delayed_digit=state_at(phase-digit_delay*delay_scale)['flap'] if flight else flap
                    lag=(delayed_digit-delayed)*.80*opening
                    lag+=.12*recovery*(finger/3+j*.4)
                    r=fore_rotation@Quaternion((0,0,1),sign*((.10+.10*finger)*fold+recovery*(.08+.10*finger)))@Quaternion((0,1,0),sign*(.20*fold+lag))
                    # Gather each digit toward the trailing body line when
                    # folded. Quaternion interpolation retains segment lengths
                    # and opens the fan without scaling its vertices.
                    rest_direction=Vector(bones[n]['tail']-bones[n]['head'])
                    # Fold back at BOTH wrist and finger knuckle. Aligning all
                    # segments tailward made a sail longer than the torso.
                    folded_direction=Vector((sign*(-.02+finger*.006),.8 if j==0 else -.8,-.02+rear*.24)).normalized()
                    folded_rotation=rest_direction.rotation_difference(folded_direction)
                    r=r.slerp(wing_rotation@folded_rotation,fold)
                    tip=previous+r@rest_direction;segment(n,previous,tip,r);previous=tip
        # Translation-only membrane controls follow the actual rib endpoints.
        # This avoids cancellation of opposing rotation matrices when folding.
        for side in ['L','R']:
            endpoints=[('root',rig.pose.bones['wing.upper.'+side].head.copy()),('elbow',rig.pose.bones['wing.upper.'+side].tail.copy()),('wrist',rig.pose.bones['wing.fore.'+side].tail.copy())]+[(f'mid.{f}',rig.pose.bones[f'wing.finger.{f}.0.{side}'].tail.copy()) for f in range(4)]+[(f'tip.{f}',rig.pose.bones[f'wing.finger.{f}.1.{side}'].tail.copy()) for f in range(4)]
            for anchor_name,anchor in endpoints:
                segment(f'membrane.{anchor_name}.{side}',anchor,anchor+Vector((0,0,.02)),Quaternion())
        if not fold_correction_ready:
            for bind in membrane_bind:
                index=bind['index'];side=bind['side']
                folded_membrane.data[index].co=sum(bones[f'membrane.{name}.{side}']['head']*weight for name,weight in bind['anchors'])
            fold_correction_ready=True
        folded_membrane.value=min(1,max(0,(1-spread)/.92))
        folded_membrane.keyframe_insert('value',frame=frame+1)
        # Rotate the articulated chain about its attached base until its actual
        # skinned surface clears the floor. No vertex flattening or body lift.
        tail_correction=0
        for contact_iteration in range(45):
            previous=None
            for i in range(len(tail)-1):
                n=f'tail.{i}';h=attached('pelvis',bones[n]['head']) if previous is None else previous;lagged=state_at(phase-(.018+i*.012)*delay_scale) if flight else None;tail_response=(lagged['pelvisTilt']*.35+lagged['tailKick']*(1-i/(len(tail)+1))) if lagged else 0;r=Quaternion((1,0,0),(flight.get('tailPitch',pitch*.15) if flight else pitch*.15)+tail_response+tail_correction)@Quaternion((0,0,1),(.12*(flight.get('tailSin',math.sin(pose_phase*math.pi*2))*math.cos(i*.35)-flight.get('tailCos',math.cos(pose_phase*math.pi*2))*math.sin(i*.35)) if flight else (.18 if performance else .12)*math.sin(pose_phase*math.pi*2-i*.48-(.8 if performance else 0))));previous=h+r@Vector(bones[n]['tail']-bones[n]['head']);segment(n,h,previous,r)
            ev=obj.evaluated_get(deps);contact_mesh=ev.to_mesh()
            tail_min=min(contact_mesh.vertices[index].co.z for index in tail_indices)
            ev.to_mesh_clear()
            if tail_min>=-.1975:break
            tail_correction+=.015
        if tail_min<-.198:
            (out/'contact-failure.json').write_text(json.dumps(dict(clip=clip,frame=frame,tailMinZ=tail_min,tailCorrectionRadians=tail_correction,completeRigSaved=False),indent=2)+'\n')
            (out/'floor-audit.partial.json').write_text(json.dumps(floor,indent=2)+'\n')
            (out/'paw-contact-audit.partial.json').write_text(json.dumps(contacts,indent=2)+'\n')
            raise RuntimeError(f'Tail contact unresolved: {clip} {frame} {tail_min}')
        for p in rig.pose.bones:
            p.rotation_mode='QUATERNION'
            for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=frame+1,group=p.name)
        bpy.context.scene.frame_set(frame+1);bpy.context.view_layer.update();ev=obj.evaluated_get(deps);evaluated=ev.to_mesh();world=obj.matrix_world.copy();coords=np.array([world@p.co for p in evaluated.vertices],np.float32);sample.append(coords)
        contacts.append(dict(clip=clip,frame=frame,phaseLabel=flight['label'] if flight else clip,paws={n:dict(minZ=float(coords[indices,2].min()),ikGoalError=float((rig.pose.bones[n].head-foot_goals[n]).length)) for n,indices in foot_indices.items()}))
        skeleton.append([[list(world@rig.pose.bones[n].head),list(world@rig.pose.bones[n].tail)] for n in bones]);roots.append(list(world@Vector((0,advance,altitude+bob))));attack_signals.append([flight.get('fireStrength',0) if flight else 0])
        body_audit.append(dict(clip=clip,frame=frame,root=roots[-1],joints={n:dict(head=list(rig.pose.bones[n].head),tail=list(rig.pose.bones[n].tail)) for n in ['pelvis','spine','chest','neck.0','neck.1','head']}))
        lowest=int(coords[:,2].argmin());dominant=max(obj.data.vertices[lowest].groups,key=lambda g:g.weight)
        floor.append(dict(clip=clip,frame=frame,minZ=float(coords[:,2].min()),altitude=altitude,rootAdvance=advance,tailCorrectionRadians=tail_correction,lowestVertex=lowest,lowestDominantGroup=obj.vertex_groups[dominant.group].name,penetratingVertexFraction=float((coords[:,2]<-.198).mean())));ev.to_mesh_clear();emitters.append([list(world@mh),list(world.to_3x3()@(headrotation@Vector((0,-1,0))))])
    for curve in list(action.fcurves)+list(path_action.fcurves)+list(flex_action.fcurves):
        for key in curve.keyframe_points:key.interpolation='LINEAR'
    clips[clip]=dict(frames=count,fps=24,loop=clip in ('walk','flight-loop'),action=action.name,events=(CONNECTED_FLIGHT_EVENTS if clip=='flight-sequence' else [dict(phase=(e['phase']-.64)/.36,name=e['name']) for e in FLIGHT_EVENTS if e['phase']>=.64] if clip=='landing' else FLIGHT_EVENTS if clip=='takeoff-flight-land' else []),strideDistanceModelUnits=.10/.72 if clip=='walk' else None,reviewRenderer='arena' if arena_clip else 'block');positions[clip]=np.array(sample);mouths[clip]=np.array(emitters)
    if stance_only:clips[clip].update(frames=1,loop=False,silhouetteGateOnly=True)
    if wing_gate:clips[clip].update(frames=33 if fold_sweep else 4,loop=False,poseGateOnly=True,poses='33-step diagnostic fold sweep' if fold_sweep else ['folded','partial','raised-open','level-open'])
    np.savez_compressed(out/(clip+'-samples.npz'),positions=positions[clip],faces=faces,uv=uv,semanticLabels=source_labels,mouth=mouths[clip],bonePoints=np.array(skeleton),boneNames=np.array(list(bones)),rootMotion=np.array(roots),attackSignals=np.array(attack_signals))
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=24;scene.render.fps=24;rig.animation_data.action=bpy.data.actions['Ashfang_walk'];obj.data.shape_keys.animation_data.action=bpy.data.actions['Ashfang_membrane_walk'];path_root.animation_data.action=bpy.data.actions['Ashfang_path_walk'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-rigged.blend'),compress=True);(out/'profile.json').write_text(json.dumps(dict(clips=clips,groundRoot=[0,0,-.197],nativeCell=192,modelToPixel=80,tier=1,targetGroundedViewportWidthFraction=[.15,.25],boneCount=len(bones),skinOwnership=ownership,ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n');(out/'floor-audit.json').write_text(json.dumps(floor,indent=2)+'\n');print('Saved source rig and '+('one stance sample' if stance_only else 'nine motion studies'),flush=True)

(out/'paw-contact-audit.json').write_text(json.dumps(contacts,indent=2)+'\n')

(out/'body-motion-audit.json').write_text(json.dumps(body_audit,indent=2)+'\n')

(out/'hind-leg-audit.json').write_text(json.dumps(hind_audit,indent=2)+'\n')
(out/'air-limb-audit.json').write_text(json.dumps(air_limb_audit,indent=2)+'\n')
