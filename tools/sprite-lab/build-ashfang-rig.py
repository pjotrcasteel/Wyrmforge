"""Persistent quadruped/wing rig on the original offline reconstructed surface.
Blocking actions are anatomy tests, not accepted final motion or runtime content.
"""
import bpy,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).parent))
from ashfang_wings import rebuild_wings,wing_layout
folder=Path(sys.argv[sys.argv.index('--')+1]);out=folder/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
s=np.load(folder/'textured-v1/textured-mesh.npz');original=s['vertices'];v=np.stack([original[:,1],-original[:,0],original[:,2]],1);faces=s['faces'];uv=s['uv']
v,faces,uv,body_count,removed_wing_vertices=rebuild_wings(v,faces,uv)
mesh=bpy.data.meshes.new('Ashfang original reconstructed surface');mesh.from_pydata(v.tolist(),[],faces.tolist());mesh.update();obj=bpy.data.objects.new('Ashfang skinned character',mesh);bpy.context.collection.objects.link(obj);layer=mesh.uv_layers.new(name='AppearanceUV')
for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
material=bpy.data.materials.new('Ashfang original card-derived appearance');material.use_nodes=True;texture=material.node_tree.nodes.new('ShaderNodeTexImage')
base=bpy.data.images.load(str(folder/'textured-v1/hollow-albedo.png'));raw=np.empty(len(base.pixels),np.float32);base.pixels.foreach_get(raw);raw=raw.reshape(1024,1024,4)
card=bpy.data.images.load(str(folder.parent.parent/'references/front-card-crop.png'));cp=np.empty(len(card.pixels),np.float32);card.pixels.foreach_get(cp);cp=cp.reshape(card.size[1],card.size[0],4);rows=(np.arange(1024)*card.size[1]//1024);cols=(np.arange(1024)*card.size[0]//1024);atlas=np.concatenate([raw,cp[rows[:,None],cols[None,:]]],axis=1)
image=bpy.data.images.new('Ashfang original surface and authored card wings',width=2048,height=1024);image.pixels.foreach_set(atlas.ravel());image.filepath_raw=str(out/'ashfang-albedo.png');image.file_format='PNG';image.save();image.pack();texture.image=image;texture.interpolation='Closest';shader=material.node_tree.nodes.get('Principled BSDF');material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color']);mesh.materials.append(material)
bones={}
def bone(n,a,b,parent=None,deform=True):bones[n]=dict(head=np.array(a,float),tail=np.array(b,float),parent=parent,deform=deform)
bone('root',(0,0,-.197),(0,0,-.12),deform=False);bone('pelvis',(0,.16,-.025),(0,.07,.005),'root');bone('spine',(0,.07,.005),(0,-.05,.025),'pelvis');bone('chest',(0,-.05,.025),(0,-.16,.03),'spine');bone('neck.0',(0,-.16,.03),(0,-.25,.035),'chest');bone('neck.1',(0,-.25,.035),(0,-.32,.045),'neck.0');bone('head',(0,-.32,.045),(0,-.43,.015),'neck.1');bone('jaw',(0,-.32,.012),(0,-.43,-.035),'head');bone('mouth',(0,-.435,-.005),(0,-.49,-.005),'head',False)
for side,sign in [('L',1),('R',-1)]:
    for limb,points,parent in [('fore',[(sign*.115,-.18,-.005),(sign*.15,-.22,-.075),(sign*.17,-.29,-.165),(sign*.17,-.37,-.185)],'chest'),('hind',[(sign*.105,.17,-.025),(sign*.18,.095,-.075),(sign*.18,.23,-.16),(sign*.18,.13,-.185)],'pelvis')]:
        for i in range(3):bone(f'{limb}.{i}.{side}',points[i],points[i+1],parent if i==0 else f'{limb}.{i-1}.{side}')
    wr,we,ww,middles,tips=wing_layout(sign);points=[wr,we,ww]
    bone('wing.upper.'+side,points[0],points[1],'chest');bone('wing.fore.'+side,points[1],points[2],'wing.upper.'+side)
    for finger in range(4):
        middle=middles[finger];tip=tips[finger]
        bone(f'wing.finger.{finger}.0.{side}',points[2],middle,'wing.fore.'+side);bone(f'wing.finger.{finger}.1.{side}',middle,tip,f'wing.finger.{finger}.0.{side}')
tail=[(0,.23,-.025),(0,.28,-.04),(0,.33,-.055),(-.01,.38,-.065),(-.025,.43,-.08),(-.035,.47,-.10),(-.04,.495,-.12)]
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
    elif y>.27 and abs(x)<.075:permitted=[n for n in names if n.startswith('tail.')];region='tail'
    elif y<-.30 and abs(x)<.105 and z>-.08:
        permitted=['head','jaw'] if z<.02 else ['head','neck.1'];region='head'
    elif z<-.055 and abs(x)>.035:
        limb='fore' if y<-.055 else 'hind';permitted=[f'{limb}.2.{side}'] if z<-.15 else [f'{limb}.{i}.{side}' for i in range(3)];region=limb
    elif y<-.21:permitted=['neck.0','neck.1','head','chest'];region='neck'
    else:permitted=['pelvis','spine','chest'];region='body'
    scores=np.array([1/max(.008,distance(p,bones[n]['head'],bones[n]['tail']))**4 for n in permitted]);scores/=scores.sum();ownership[region]=ownership.get(region,0)+1
    for n,w in zip(permitted,scores):
        if w>.001:obj.vertex_groups[n].add([index],float(w),'REPLACE')
rest={n:rig.data.bones[n].matrix_local.copy() for n in bones};lengths={n:rig.data.bones[n].length for n in bones}
soles={}
for limb in ['fore','hind']:
    for side in ['L','R']:
        n=f'{limb}.2.{side}';g=obj.vertex_groups[n].index
        soles[n]=np.array([p.co[:]-bones[n]['head'] for p in mesh.vertices if any(w.group==g and w.weight>.95 for w in p.groups)])
def segment(n,h,t,rotation=None):
    h,t=Vector(h),Vector(t);r=(rotation.to_matrix() if rotation else Vector(bones[n]['tail']-bones[n]['head']).rotation_difference(t-h).to_matrix())@rest[n].to_3x3();matrix=r.to_4x4();matrix.translation=h;rig.pose.bones[n].matrix=matrix;bpy.context.view_layer.update()
def ik(a,b,l1,l2,pole):
    d=b-a;distance=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();b=a+d*distance;along=(l1*l1-l2*l2+distance*distance)/(2*distance);p=Vector(pole);p=(p-d*p.dot(d)).normalized();return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),b
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
clips={};positions={};mouths={};floor=[];deps=bpy.context.evaluated_depsgraph_get()
for clip,count in [('walk',24),('rear-breath',40),('takeoff-flight-land',64)]:
    action=bpy.data.actions.new('Ashfang_'+clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action;sample=[];emitters=[]
    for frame in range(count):
        phase=frame/(count-1);altitude=0;rear=0;spread=.08;flap=0;pitch=0;advance=0;jaw=0
        if clip=='walk':bob=.008*math.sin(phase*math.pi*4);pitch=.025*math.sin(phase*math.pi*2)
        elif clip=='rear-breath':
            rear=smooth(phase/.25)*(1-smooth((phase-.78)/.22));bob=.025*rear;pitch=-.62*rear;spread=.14+.18*rear;jaw=.48*smooth((phase-.22)/.12)*(1-smooth((phase-.68)/.12))
        else:
            lift=smooth((phase-.18)/.17);land=smooth((phase-.74)/.18);altitude=.28*lift*(1-land);spread=1.12*smooth((phase-.07)/.18)*(1-smooth((phase-.87)/.13));flap=.40*math.sin((phase-.21)*math.pi*8)*smooth((phase-.18)/.12)*(1-smooth((phase-.82)/.10));bob=-.025*math.sin(min(1,phase/.20)*math.pi)*(1-lift);pitch=-.12*lift*(1-land)
        rotation=Quaternion((1,0,0),pitch);origin=Vector(bones['pelvis']['head']);offset=Vector((0,advance,altitude+bob));point=lambda p:origin+rotation@(Vector(p)-origin)+offset
        segment('root',bones['root']['head'],bones['root']['tail'])
        for n in ['pelvis','spine','chest','neck.0','neck.1']:segment(n,point(bones[n]['head']),point(bones[n]['tail']),rotation)
        h=point(bones['head']['head']);headrotation=Quaternion((1,0,0),rear*.30)@rotation;segment('head',h,h+headrotation@Vector(bones['head']['tail']-bones['head']['head']),headrotation)
        jh=h+headrotation@Vector(bones['jaw']['head']-bones['head']['head']);jr=headrotation@Quaternion((1,0,0),jaw);segment('jaw',jh,jh+jr@Vector(bones['jaw']['tail']-bones['jaw']['head']),jr)
        mh=h+headrotation@Vector(bones['mouth']['head']-bones['head']['head']);segment('mouth',mh,mh+headrotation@Vector((0,-.055,0)),headrotation)
        for side,sign in [('L',1),('R',-1)]:
            for limb,shift in [('fore',0 if side=='L' else .5),('hind',.25 if side=='L' else .75)]:
                n=f'{limb}.0.{side}';hip=point(bones[n]['head']);ankle=Vector(bones[f'{limb}.2.{side}']['head']);clearance=0
                if clip=='walk':
                    t=(phase+shift)%1
                    if t<.72:ankle.y+=.16*(t/.72-.5)
                    else:
                        t=(t-.72)/.28;ankle.y+=.08-.16*t;clearance=.045*math.sin(t*math.pi)
                    ankle.z+=clearance
                else:
                    airborne=smooth(altitude/.08);ankle=ankle.lerp(point(ankle)+Vector((0,.045,.065)),airborne)
                    if limb=='fore':ankle=ankle.lerp(point(bones[f'{limb}.2.{side}']['head'])+Vector((0,.055,.065)),rear)
                fn=f'{limb}.2.{side}';fr=rotation if altitude>.01 or (limb=='fore' and rear>.01) else Quaternion((1,0,0),0)
                if clip=='walk' or (altitude<.01 and (limb=='hind' or rear<.01)):
                    ankle.z=-.197-float((soles[fn]@np.array(fr.to_matrix()).T)[:,2].min())+clearance
                knee,ankle=ik(hip,ankle,lengths[n],lengths[f'{limb}.1.{side}'],(sign*.6,-1 if limb=='fore' else 1,0));segment(n,hip,knee);segment(f'{limb}.1.{side}',knee,ankle);segment(fn,ankle,ankle+fr@Vector(bones[fn]['tail']-bones[fn]['head']),fr)
            wingroot=point(bones['wing.upper.'+side]['head']);wr=rotation@Quaternion((0,1,0),-sign*flap)@Quaternion((0,0,1),-sign*spread)
            wingpoint=lambda p:wingroot+wr@Vector(np.array(p)-bones['wing.upper.'+side]['head'])
            for n in ['wing.upper.'+side,'wing.fore.'+side]:segment(n,wingpoint(bones[n]['head']),wingpoint(bones[n]['tail']),wr)
            for finger in range(4):
                previous=wingpoint(bones[f'wing.finger.{finger}.0.{side}']['head'])
                for j in range(2):
                    n=f'wing.finger.{finger}.{j}.{side}';r=wr@Quaternion((1,0,0),.10*math.sin(phase*math.pi*8-finger*.3)*spread);tip=previous+r@Vector(bones[n]['tail']-bones[n]['head']);segment(n,previous,tip,r);previous=tip
        previous=None
        for i in range(6):
            n=f'tail.{i}';h=point(bones[n]['head']) if previous is None else previous;r=Quaternion((1,0,0),pitch*.15)@Quaternion((0,0,1),.12*math.sin(phase*math.pi*2-i*.35));previous=h+r@Vector(bones[n]['tail']-bones[n]['head']);segment(n,h,previous,r)
        for p in rig.pose.bones:
            p.rotation_mode='QUATERNION'
            for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=frame+1,group=p.name)
        bpy.context.scene.frame_set(frame+1);bpy.context.view_layer.update();ev=obj.evaluated_get(deps);evaluated=ev.to_mesh();coords=np.array([p.co[:] for p in evaluated.vertices],np.float32);sample.append(coords);floor.append(dict(clip=clip,frame=frame,minZ=float(coords[:,2].min()),altitude=altitude));ev.to_mesh_clear();emitters.append([list(mh),list(headrotation@Vector((0,-1,0)))])
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
    clips[clip]=dict(frames=count,fps=24,loop=clip=='walk',action=action.name);positions[clip]=np.array(sample);mouths[clip]=np.array(emitters)
    np.savez_compressed(out/(clip+'-samples.npz'),positions=positions[clip],faces=faces,uv=uv,mouth=mouths[clip])
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=24;scene.render.fps=24;rig.animation_data.action=bpy.data.actions['Ashfang_walk'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-rigged.blend'));(out/'profile.json').write_text(json.dumps(dict(clips=clips,groundRoot=[0,0,-.197],nativeCell=192,modelToPixel=80,tier=1,targetGroundedViewportWidthFraction=[.15,.25],boneCount=len(bones),skinOwnership=ownership,ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n');(out/'floor-audit.json').write_text(json.dumps(floor,indent=2)+'\n');print('Saved source rig and three anatomy/motion blocking sequences',flush=True)
