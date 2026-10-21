"""Persistent quadruped/wing rig on the original offline reconstructed surface.
Blocking actions are anatomy tests, not accepted final motion or runtime content.
"""
import bpy,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).parent))
from ashfang_wings import rebuild_wings,wing_layout
from ashfang_motion import flight_state,FLIGHT_EVENTS
folder=Path(sys.argv[sys.argv.index('--')+1]);out=folder/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
s=np.load(folder/'textured-v1/textured-mesh.npz');original=s['vertices'];v=np.stack([original[:,1],-original[:,0],original[:,2]],1);faces=s['faces'];uv=s['uv']
# Original source sculpt: lift and broaden the low reconstructed skull/neck so
# the face reads in front of folded wings at Tier-I size. UV detail is preserved.
head_mix=np.clip((-v[:,1]-.21)/.12,0,1);head_mix=head_mix*head_mix*(3-2*head_mix)
head_mix*=np.clip((v[:,2]+.09)/.055,0,1)
v[:,0]*=1+.35*head_mix;v[:,1]-=.32*head_mix*np.maximum(0,-v[:,1]-.22);v[:,2]+=.052*head_mix+.15*head_mix*np.maximum(0,v[:,2]-.015)
# Extend the existing balancing tail surface and its skeleton together.
v[:,1]+=.65*np.maximum(0,v[:,1]-.23)*np.clip((.09-abs(v[:,0]))/.025,0,1)
# Build haunch volume on the existing surface, preserving its texture/skin.
# Restrict the radial sculpt to the upper rear limb, clear of tail and soles.
for sign in [1,-1]:
    a=np.array((sign*.105,.17,-.025));b=np.array((sign*.18,.095,-.075));d=b-a
    t=np.clip(((v-a)@d)/(d@d),0,1);radial=v-(a+t[:,None]*d)
    region=(v[:,1]>.025)&(v[:,1]<.255)&(v[:,2]>-.125)&(v[:,2]<.015)&(v[:,0]*sign>.065)
    influence=np.exp(-np.sum(radial*radial,axis=1)/(.065**2))*region
    v+=radial*(.40*influence[:,None])
# Reconstructed low inter-leg webbing belongs to an arched underside, not a
# giant paw. Sculpt it upward in the source; keep actual paw rows unchanged.
belly_front=np.clip((v[:,1]+.14)/.085,0,1);belly_front=belly_front**2*(3-2*belly_front)
belly_back=np.clip((v[:,1]-.075)/.065,0,1);belly_back=1-belly_back**2*(3-2*belly_back)
low=np.clip((-.10-v[:,2])/.06,0,1)
fore_paw=((abs(v[:,0])-.17)/.085)**2+((v[:,1]+.285)/.135)**2
hind_paw=((abs(v[:,0])-.17)/.085)**2+((v[:,1]-.19)/.14)**2
clear_of_paws=np.clip((np.minimum(fore_paw,hind_paw)-1.2)/.4,0,1)
belly_surface=-.10+.02*np.maximum(0,1-abs(v[:,0])/.25)**2
v[:,2]+=np.maximum(0,belly_surface-v[:,2])*belly_front*belly_back*low*clear_of_paws
v,faces,uv,body_count,removed_wing_vertices=rebuild_wings(v,faces,uv)
mesh=bpy.data.meshes.new('Ashfang original reconstructed surface');mesh.from_pydata(v.tolist(),[],faces.tolist());mesh.update();obj=bpy.data.objects.new('Ashfang skinned character',mesh);bpy.context.collection.objects.link(obj);layer=mesh.uv_layers.new(name='AppearanceUV')
for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
material=bpy.data.materials.new('Ashfang original card-derived appearance');material.use_nodes=True;texture=material.node_tree.nodes.new('ShaderNodeTexImage')
base=bpy.data.images.load(str(folder/'textured-v1/hollow-albedo.png'));raw=np.empty(len(base.pixels),np.float32);base.pixels.foreach_get(raw);raw=raw.reshape(1024,1024,4)
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
card=bpy.data.images.load(str(folder.parent.parent/'references/front-card-crop.png'));cp=np.empty(len(card.pixels),np.float32);card.pixels.foreach_get(cp);cp=cp.reshape(card.size[1],card.size[0],4);rows=(np.arange(1024)*card.size[1]//1024);cols=(np.arange(1024)*card.size[0]//1024);atlas=np.concatenate([raw,cp[rows[:,None],cols[None,:]]],axis=1)
image=bpy.data.images.new('Ashfang original surface and authored card wings',width=2048,height=1024);image.pixels.foreach_set(atlas.ravel());image.filepath_raw=str(out/'ashfang-albedo.png');image.file_format='PNG';image.save();image.pack();texture.image=image;texture.interpolation='Closest';shader=material.node_tree.nodes.get('Principled BSDF');material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color']);mesh.materials.append(material)
bones={}
def bone(n,a,b,parent=None,deform=True):bones[n]=dict(head=np.array(a,float),tail=np.array(b,float),parent=parent,deform=deform)
bone('root',(0,0,-.197),(0,0,-.12),deform=False);bone('pelvis',(0,.16,-.025),(0,.07,.005),'root');bone('spine',(0,.07,.005),(0,-.05,.025),'pelvis');bone('chest',(0,-.05,.025),(0,-.16,.03),'spine');bone('neck.0',(0,-.16,.03),(0,-.25,.07),'chest');bone('neck.1',(0,-.25,.07),(0,-.35,.10),'neck.0');bone('head',(0,-.35,.10),(0,-.52,.065),'neck.1');bone('jaw',(0,-.35,.045),(0,-.54,.005),'head');bone('mouth',(0,-.57,.045),(0,-.625,.045),'head',False)
for side,sign in [('L',1),('R',-1)]:
    for limb,points,parent in [('fore',[(sign*.115,-.18,-.005),(sign*.15,-.22,-.075),(sign*.17,-.29,-.165),(sign*.17,-.37,-.185)],'chest'),('hind',[(sign*.105,.17,-.025),(sign*.18,.095,-.075),(sign*.18,.23,-.16),(sign*.18,.075,-.185)],'pelvis')]:
        for i in range(3):bone(f'{limb}.{i}.{side}',points[i],points[i+1],parent if i==0 else f'{limb}.{i-1}.{side}')
    wr,we,ww,middles,tips=wing_layout(sign);points=[wr,we,ww]
    bone('wing.upper.'+side,points[0],points[1],'chest');bone('wing.fore.'+side,points[1],points[2],'wing.upper.'+side)
    for finger in range(4):
        middle=middles[finger];tip=tips[finger]
        bone(f'wing.finger.{finger}.0.{side}',points[2],middle,'wing.fore.'+side);bone(f'wing.finger.{finger}.1.{side}',middle,tip,f'wing.finger.{finger}.0.{side}')
tail=[(0,.23,-.025),(0,.28,-.04),(0,.33,-.055),(-.01,.38,-.065),(-.025,.43,-.08),(-.035,.47,-.10),(-.04,.495,-.12)]
tail=[(x,y+.65*max(0,y-.23),z) for x,y,z in tail]
for i in range(6):bone(f'tail.{i}',tail[i],tail[i+1],'pelvis' if i==0 else f'tail.{i-1}')
arm=bpy.data.armatures.new('Ashfang articulated anatomy');rig=bpy.data.objects.new('Ashfang editable animation rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,b in bones.items():
    edit=arm.edit_bones.new(n);edit.head=b['head'];edit.tail=b['tail'];edit.use_deform=b['deform']
    if b['parent']:edit.parent=arm.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT');modifier=obj.modifiers.new('Anatomical surface deformation','ARMATURE');modifier.object=rig;modifier.use_deform_preserve_volume=False;obj.parent=rig
names=[n for n,b in bones.items() if b['deform']]
for n in names:obj.vertex_groups.new(name=n)
def distance(p,a,b):
    d=b-a;t=np.clip(np.dot(p-a,d)/np.dot(d,d),0,1);return np.linalg.norm(p-a-t*d)
ownership={}
for index,p in enumerate(v):
    x,y,z=p;side='L' if x>=0 else 'R'
    if index>=body_count:
        permitted=[n for n in names if n.startswith('wing.') and n.endswith('.'+side)];region='wing'
    elif y>.31 and (abs(x)<.13 or y>.35):permitted=[n for n in names if n.startswith('tail.')];region='tail'
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
        soles[n]=np.array([mesh.vertices[index].co[:]-bones[n]['head'] for index in foot_indices[n]])
def segment(n,h,t,rotation=None):
    h,t=Vector(h),Vector(t);r=(rotation.to_matrix() if rotation else Vector(bones[n]['tail']-bones[n]['head']).rotation_difference(t-h).to_matrix())@rest[n].to_3x3();matrix=r.to_4x4();matrix.translation=h;rig.pose.bones[n].matrix=matrix;bpy.context.view_layer.update()
def ik(a,b,l1,l2,pole):
    d=b-a;distance=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();b=a+d*distance;along=(l1*l1-l2*l2+distance*distance)/(2*distance);p=Vector(pole);p=(p-d*p.dot(d)).normalized();return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),b
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
clips={};positions={};mouths={};floor=[];contacts=[];body_audit=[];hind_audit=[];deps=bpy.context.evaluated_depsgraph_get()
for clip,count in [('walk',24),('rear-breath',40),('takeoff-flight-land',84)]:
    action=bpy.data.actions.new('Ashfang_'+clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;sample=[];emitters=[];skeleton=[];roots=[]
    for frame in range(count):
        phase=frame/(count-1);altitude=0;rear=0;spread=.08;flap=0;pitch=0;advance=0;jaw=0;flight=None;foot_goals={}
        if clip=='walk':bob=.008*math.sin(phase*math.pi*4);pitch=.025*math.sin(phase*math.pi*2)
        elif clip=='rear-breath':
            rear=smooth(phase/.25)*(1-smooth((phase-.78)/.22));bob=.025*rear;pitch=-.62*rear;spread=.14+.18*rear;jaw=.48*smooth((phase-.22)/.12)*(1-smooth((phase-.68)/.12))
        else:
            flight=flight_state(phase);altitude=flight['altitude'];bob=flight['bob'];pitch=flight['pitch'];spread=flight['spread'];flap=flight['flap'];advance=flight['advance']
        rotation=Quaternion((1,0,0),pitch);origin=Vector(bones['pelvis']['head']);offset=Vector((0,advance,altitude+bob));point=lambda p:origin+rotation@(Vector(p)-origin)+offset
        segment('root',bones['root']['head'],bones['root']['tail'])
        posed={}
        if flight:
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
                fr=rotation if altitude>.01 or (limb=='fore' and rear>.01) else Quaternion((1,0,0),0)
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
                    ground_goal=rest_goal+Vector((0,advance if phase>=.30 else 0,0))
                    if limb=='hind':
                        # Rotate the hock about a fixed toe anchor during drive.
                        foot_vector=Vector(bones[fn]['tail']-bones[fn]['head'])
                        ground_goal=ground_goal+foot_vector-fr@foot_vector
                    ground_goal.z=sole_height
                    carried=attached(parent,rest_goal)+Vector((0,.045*tuck,.065*tuck))
                    if limb=='hind':carried.y+=.035*flight['kickTrail']
                    release=smooth((phase-(.17 if limb=='fore' else .26))/(.06 if limb=='fore' else .04))
                    ankle=ground_goal.lerp(carried,release)
                    if limb=='fore':ankle.y-=.020*flight['landingReach']
                else:
                    if limb=='fore':ankle=ankle.lerp(point(rest_goal)+Vector((0,.055,.065)),rear)
                if clip!='walk' and altitude<.01:
                    catch_clearance=.025*(1-smooth((phase-.81)/.035)) if flight and limb=='hind' and phase>.76 and phase<.845 else 0
                    ankle.z=max(ankle.z,sole_height+catch_clearance)
                foot_goals[fn]=ankle.copy()
                # Rear knee goes forward/down, hock back, toe forward. The old
                # +Y pole inverted this bend and placed knees above the hips.
                pole=posed[parent][1]@Vector((sign*.30,-1,0)) if limb=='hind' else Vector((sign*.6,-1,0))
                knee,ankle=ik(hip,ankle,lengths[n],lengths[f'{limb}.1.{side}'],pole)
                segment(n,hip,knee);segment(f'{limb}.1.{side}',knee,ankle);segment(fn,ankle,ankle+fr@Vector(bones[fn]['tail']-bones[fn]['head']),fr)
                if limb=='hind':
                    local_knee=posed[parent][1].inverted()@(knee-hip)
                    hind_audit.append(dict(clip=clip,frame=frame,side=side,kneeOffsetPelvisLocal=list(local_knee),extensionRatio=float((ankle-hip).length/(lengths[n]+lengths[f'{limb}.1.{side}'])),toeRoll=flight['toeRoll'] if flight else 0))
            wingroot=attached('chest',bones['wing.upper.'+side]['head']);wing_rotation=posed['chest'][1]
            opening=min(1,max(0,spread));fold=1-opening
            # Each transform moves its joint from the previous joint, retaining
            # bone lengths. Shoulder powers the stroke, elbow opens the span,
            # and the wrist/digits trail through the membrane recovery.
            shoulder=wing_rotation@Quaternion((0,0,1),sign*.75*fold)@Quaternion((0,1,0),sign*(-.05*fold+flap))
            upper='wing.upper.'+side;fore='wing.fore.'+side
            elbow=wingroot+shoulder@Vector(bones[upper]['tail']-bones[upper]['head']);segment(upper,wingroot,elbow,shoulder)
            fore_rotation=shoulder@Quaternion((0,0,1),sign*.65*fold)@Quaternion((0,1,0),sign*.10*fold)
            wrist=elbow+fore_rotation@Vector(bones[fore]['tail']-bones[fore]['head']);segment(fore,elbow,wrist,fore_rotation)
            for finger in range(4):
                previous=wrist
                for j in range(2):
                    n=f'wing.finger.{finger}.{j}.{side}'
                    lag=.12*math.sin((phase-.18)*math.pi*8-finger*.18-j*.22)*opening
                    r=fore_rotation@Quaternion((0,0,1),sign*(.10+.10*finger)*fold)@Quaternion((0,1,0),sign*(.20*fold+lag))
                    # Gather each digit toward the trailing body line when
                    # folded. Quaternion interpolation retains segment lengths
                    # and opens the fan without scaling its vertices.
                    rest_direction=Vector(bones[n]['tail']-bones[n]['head'])
                    folded_direction=Vector((sign*(-.25+finger*.04),1,-.10-j*.04+rear*.24)).normalized()
                    folded_rotation=rest_direction.rotation_difference(folded_direction)
                    r=r.slerp(folded_rotation,fold)
                    tip=previous+r@rest_direction;segment(n,previous,tip,r);previous=tip
        # Rotate the articulated chain about its attached base until its actual
        # skinned surface clears the floor. No vertex flattening or body lift.
        tail_correction=0
        for contact_iteration in range(45):
            previous=None
            for i in range(6):
                n=f'tail.{i}';h=attached('pelvis',bones[n]['head']) if previous is None else previous;lagged=flight_state(max(0,phase-.018-i*.012)) if flight else None;tail_response=(lagged['pelvisTilt']*.35+lagged['tailKick']*(1-i/8)) if lagged else 0;r=Quaternion((1,0,0),pitch*.15+tail_response+tail_correction)@Quaternion((0,0,1),.12*math.sin(phase*math.pi*2-i*.35));previous=h+r@Vector(bones[n]['tail']-bones[n]['head']);segment(n,h,previous,r)
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
        bpy.context.scene.frame_set(frame+1);bpy.context.view_layer.update();ev=obj.evaluated_get(deps);evaluated=ev.to_mesh();coords=np.array([p.co[:] for p in evaluated.vertices],np.float32);sample.append(coords)
        contacts.append(dict(clip=clip,frame=frame,phaseLabel=flight['label'] if flight else clip,paws={n:dict(minZ=float(coords[indices,2].min()),ikGoalError=float((rig.pose.bones[n].head-foot_goals[n]).length)) for n,indices in foot_indices.items()}))
        skeleton.append([[list(rig.pose.bones[n].head),list(rig.pose.bones[n].tail)] for n in bones]);roots.append([0,advance,altitude+bob])
        body_audit.append(dict(clip=clip,frame=frame,root=roots[-1],joints={n:dict(head=list(rig.pose.bones[n].head),tail=list(rig.pose.bones[n].tail)) for n in ['pelvis','spine','chest','neck.0','neck.1','head']}))
        lowest=int(coords[:,2].argmin());dominant=max(obj.data.vertices[lowest].groups,key=lambda g:g.weight)
        floor.append(dict(clip=clip,frame=frame,minZ=float(coords[:,2].min()),altitude=altitude,rootAdvance=advance,tailCorrectionRadians=tail_correction,lowestVertex=lowest,lowestDominantGroup=obj.vertex_groups[dominant.group].name,penetratingVertexFraction=float((coords[:,2]<-.198).mean())));ev.to_mesh_clear();emitters.append([list(mh),list(headrotation@Vector((0,-1,0)))])
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
    clips[clip]=dict(frames=count,fps=24,loop=clip=='walk',action=action.name,events=FLIGHT_EVENTS if flight else [],strideDistanceModelUnits=.10/.72 if clip=='walk' else None);positions[clip]=np.array(sample);mouths[clip]=np.array(emitters)
    np.savez_compressed(out/(clip+'-samples.npz'),positions=positions[clip],faces=faces,uv=uv,mouth=mouths[clip],bonePoints=np.array(skeleton),boneNames=np.array(list(bones)),rootMotion=np.array(roots))
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=24;scene.render.fps=24;rig.animation_data.action=bpy.data.actions['Ashfang_walk'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-rigged.blend'));(out/'profile.json').write_text(json.dumps(dict(clips=clips,groundRoot=[0,0,-.197],nativeCell=192,modelToPixel=80,tier=1,targetGroundedViewportWidthFraction=[.15,.25],boneCount=len(bones),skinOwnership=ownership,ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n');(out/'floor-audit.json').write_text(json.dumps(floor,indent=2)+'\n');print('Saved source rig and three anatomy/motion blocking sequences',flush=True)

(out/'paw-contact-audit.json').write_text(json.dumps(contacts,indent=2)+'\n')

(out/'body-motion-audit.json').write_text(json.dumps(body_audit,indent=2)+'\n')

(out/'hind-leg-audit.json').write_text(json.dumps(hind_audit,indent=2)+'\n')
