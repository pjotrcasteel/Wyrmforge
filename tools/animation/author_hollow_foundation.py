"""Reproducible source-supported Hollowed proof, candidate, never art approval.

Run: blender -b -t 2 --python tools/animation/author_hollow_foundation.py -- --out artifacts/animation --render
No old walk or attack action is sampled. Contacts, body torque, wrists and
secondary motion are authored together on the actual cape-free source mesh.
"""
import argparse,sys,json,math,hashlib
from pathlib import Path
import bpy
from mathutils import Vector,Matrix,Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import solve_chain, segment_matrix, support_margin
from hollow_ragged_silhouette import shorten_hanging_cloth
from hollow_source_embers import attach_internal_fire
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend'
parser=argparse.ArgumentParser();parser.add_argument('--out',default='artifacts/animation');parser.add_argument('--render',action='store_true');parser.add_argument('--all',action='store_true');parser.add_argument('--only',default='walk,attack,pivot');parser.add_argument('--samples',type=int,default=4)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=(ROOT/args.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));scene=bpy.context.scene
rig=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character']
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.matrix_basis=Matrix.Identity(4)
    for c in list(bone.constraints):bone.constraints.remove(c)
cloth=shorten_hanging_cloth(actor);fire,regions=attach_internal_fire(actor)
for socket in fire:socket.default_value=.8
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=args.samples
scene.render.resolution_x=scene.render.resolution_y=96;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.threads_mode='FIXED';scene.render.threads=2
scene.view_settings.view_transform='Standard';scene.render.fps=12
scene.camera.data.ortho_scale=1.55
scene.frame_start=1;scene.frame_end=16
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
SOLE_Z=-.50
STRIDE=.36
DIRECTIONS=['N','NE','E','SE','S','SW','W','NW']
# Separate unanimated view pivot: source yaw never overwrites the render angle.
view=bpy.data.objects.new('AN unanimated view',None);scene.collection.objects.link(view);rig.parent=view
front=math.atan2(-3.2,2.2)+math.pi/2

def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def interp(keys,t):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]

def set_local(name,angles,offset=None):
    bone=rig.pose.bones[name]
    bone.rotation_mode='XYZ';bone.rotation_euler=angles
    if offset is not None:bone.location=offset

def foot_target(side,p):
    # Unwrapped contact phase. During stance, root travel cancels local travel.
    shift=0 if side=='L' else .5
    u=p+shift;cycle=math.floor(u);q=u-cycle
    sign=1 if side=='L' else -1
    if q<.62:
        local_y=STRIDE*(q-.31);z=SOLE_Z;stance=True
    else:
        a=(q-.62)/.38;local_y=STRIDE*(.31-smooth(a)*.62);z=SOLE_Z+.055*math.sin(math.pi*a);stance=False
    return Vector((sign*.085,local_y,z)),stance

records={};actions={}
for clip in args.only.split(','):
    action=bpy.data.actions.new('AN1_'+clip+'_supported_v1');rig.animation_data_create();rig.animation_data.action=action
    action.use_fake_user=True;actions[clip]=action
    samples=[];last_points={};slips=[];joint_ranges={};length_error=0
    for index in range(17):
        scene.frame_set(index+1)
        p=index/16;t=index/15 if index<16 else 1
        rig.location=(0,0,0);rig.rotation_mode='XYZ';rig.rotation_euler=(0,0,0)
        yaw=0
        # Torso has separate load/torque/recoil curves; no independent leg loop.
        attack=clip=='attack'
        torque=interp([(0,0),(.27,-.27),(.43,-.30),(.56,.34),(.72,.22),(1,0)],t) if attack else .045*math.sin(2*math.pi*p)
        lean=interp([(0,.09),(.3,-.08),(.47,-.03),(.58,.19),(.76,.12),(1,.09)],t) if attack else .09+.025*math.sin(4*math.pi*p)
        pelvis_x=.085*math.sin(2*math.pi*p) if not attack else interp([(0,0),(.3,-.018),(.6,.024),(1,0)],t)
        pelvis_z=-.065+.009*math.cos(4*math.pi*p) if not attack else interp([(0,-.056),(.32,-.073),(.57,-.059),(.75,-.068),(1,-.056)],t)
        # Offsets are local to the true bind orientation (not world premultiplies).
        set_local('root',(0,0,0),(0,0,0))
        pelvis=rig.pose.bones['pelvis'];pelvis.matrix=Matrix.Translation(Vector((pelvis_x,0,pelvis_z+.025))) @ rest['pelvis']
        set_local('spine',(lean*.45,0,-torque*.30));set_local('chest',(lean*.55,0,torque))
        set_local('neck',(.06,0,-torque*.15));set_local('head',(.05+.025*math.sin(2*math.pi*p-.7),.09,-torque*.20))
        set_local('cloth.L',(.045*math.sin(2*math.pi*p-.5),0,0));set_local('cloth.R',(.035*math.sin(2*math.pi*p-1),0,0))
        for side,sign in [('L',1),('R',-1)]:set_local('clavicle.'+side,(0,.025*sign,torque*.15))
        bpy.context.view_layer.update()
        contacts=[];footprints=[]
        for side,sign in [('L',1),('R',-1)]:
            if attack:
                sole=Vector((sign*.085,-.06 if side=='L' else .055,SOLE_Z));stance=True
            elif clip=='pivot':
                # One sole stays planted; the other visibly lifts, repositions,
                # and lands before the next support phase. Body yaw is supplied
                # by the eventual sequence; this clip is a step, not a root spin.
                sole=Vector((sign*.085,0,SOLE_Z));stance=side=='L' or p<.12 or p>.88
                if not stance:
                    a=(p-.12)/.76;sole.y=-.055*math.sin(math.pi*a);sole.z+=.055*math.sin(math.pi*a)
            else:sole,stance=foot_target(side,p)
            footrest=rig.data.bones['foot.'+side]
            landmark=Vector((sign*.09,-.025,SOLE_Z))
            ankle=sole-(landmark-footrest.head_local)
            flex=solve_chain(rig,'thigh.'+side,'shin.'+side,ankle,Vector((sign*.09,-.5,-.2)),(8,145))
            fmatrix=footrest.matrix_local.copy();fmatrix.translation=ankle;rig.pose.bones['foot.'+side].matrix=fmatrix
            bpy.context.view_layer.update()
            actual=rig.pose.bones['foot.'+side].matrix @ rest['foot.'+side].inverted() @ landmark
            world=actual+Vector((0,-STRIDE*p if clip=='walk' else 0,0))
            if stance:
                # A new support epoch may reuse a limb ID after a swing.
                if side in last_points:slips.append((world-last_points[side]).length)
                last_points[side]=world.copy()
                contacts.append({'id':'foot-'+side,'x':actual.x,'y':actual.y,'z':actual.z})
                footprints += [(actual.x+x,actual.y+y) for x,y in [(-.027,-.055),(.027,-.055),(.027,.055),(-.027,.055)]]
            else:last_points.pop(side,None)
            joint_ranges.setdefault('knee-'+side,[]).append(flex)
        # Shoulder-to-claw trajectories stay on the striking side of the ribcage.
        for side,sign in [('L',1),('R',-1)]:
            if attack and side=='R':
                x=interp([(0,-.25),(.30,-.30),(.44,-.29),(.57,-.12),(.72,-.18),(1,-.25)],t)
                y=interp([(0,-.14),(.30,.015),(.44,-.01),(.57,-.34),(.72,-.27),(1,-.14)],t)
                z=interp([(0,.05),(.30,.24),(.44,.25),(.57,.16),(.72,.02),(1,.05)],t)
            else:
                x=sign*(.245+.012*math.sin(2*math.pi*p-.5));y=-.14+.04*math.sin(2*math.pi*p+(0 if side=='L' else math.pi)-.45);z=.035+.015*math.sin(2*math.pi*p-.7)
            target=Vector((x,y,z))
            flex=solve_chain(rig,'upper_arm.'+side,'forearm.'+side,target,Vector((sign*.6,.08,.15)),(12,150))
            hand=rig.data.bones['hand.'+side];direction=Vector((sign*.15,-.8,-.6)).normalized()
            rig.pose.bones['hand.'+side].matrix=segment_matrix(hand,target,target+direction*hand.length)
            bpy.context.view_layer.update();joint_ranges.setdefault('elbow-'+side,[]).append(flex)
        com=Vector((pelvis_x,-.012,0))
        # This is a declared pelvis-based mass proxy, not validated whole-body COM.
        margin=support_margin(com,footprints)
        sample={'contacts':contacts,'com':[com.x,com.y],'supportMargin':margin,'balance':'supported' if margin>=0 else 'catch','massModel':'pelvis-proxy-not-whole-body-COM'}
        samples.append(sample)
        for bone in rig.pose.bones:
            bone.keyframe_insert('location',frame=index+1);bone.keyframe_insert('rotation_euler' if bone.rotation_mode=='XYZ' else 'rotation_quaternion',frame=index+1);bone.keyframe_insert('scale',frame=index+1)
        for bone in rig.pose.bones:length_error=max(length_error,abs((bone.tail-bone.head).length-rig.data.bones[bone.name].length))
    for slot in action.slots:
        for layer in action.layers:
            for strip in layer.strips:
                bag=strip.channelbag(slot)
                if bag:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:key.interpolation='LINEAR'
    records[clip]={'samples':samples[:16],'maxStanceSlipMetres':max(slips,default=0),'maxBoneLengthErrorMetres':length_error,'jointRangesDegrees':{k:[min(v),max(v)] for k,v in joint_ranges.items()},'strideMetres':STRIDE if clip=='walk' else 0,'frames':16,'fps':12}
    print('AN_CLIP',clip,json.dumps({k:v for k,v in records[clip].items() if k!='samples'}),flush=True)
# Pack images into editable source rather than depending on another workstation.
bpy.ops.file.pack_all()
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hollow-foundation.blend'))
skeleton=[{'id':b.name,'parent':b.parent.name if b.parent else None,'length':b.length,'rest':[x for row in b.matrix_local for x in row]} for b in rig.data.bones]
manifest={'schemaVersion':2,'candidateNotApproved':True,'runtimeIntegrated':False,'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'blenderVersion':bpy.app.version_string,'coordinateSpace':'actor-xy-ground-z-up','sourceUnits':'metres','unitsPerPixel':1.55/96,'skeleton':skeleton,'skeletonSignature':hashlib.sha256(json.dumps(skeleton,sort_keys=True).encode()).hexdigest(),'clips':records,'directions':DIRECTIONS,'cloth':cloth,'emissionRegions':regions,'sourceQCOnly':True,'wholeBodyCOMValidated':False}
(OUT/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if args.render:
    for clip,action in actions.items():
        rig.animation_data.action=action
        for row,direction in enumerate(DIRECTIONS):
            if not args.all and direction not in ['S','E']:continue
            view.rotation_euler.z=front+math.pi-row*math.pi/4
            folder=OUT/'frames'/clip/direction;folder.mkdir(parents=True,exist_ok=True)
            for index in range(16):
                scene.frame_set(index+1);scene.render.filepath=str(folder/f'{index:02d}.png');bpy.ops.render.render(write_still=True)
            print('AN_RENDER',clip,direction,flush=True)
print('AN_OUTPUT',str(OUT),flush=True)
