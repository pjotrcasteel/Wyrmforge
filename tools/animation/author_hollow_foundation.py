"""Reproducible source-supported Hollowed proof, candidate, never art approval.

Run: blender -b -t 2 --python tools/animation/author_hollow_foundation.py -- --out artifacts/animation --render
No old walk or attack action is sampled. Contacts, body torque, wrists and
secondary motion are authored together on the actual cape-free source mesh.
"""
import argparse,sys,json,math,hashlib
from pathlib import Path
import bpy
from mathutils import Vector,Matrix,Euler
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kinematics import solve_chain, segment_matrix, support_margin
from source_contacts import mesh_sole_patch,fit_upright_contact_bind
from hollow_ragged_silhouette import shorten_hanging_cloth
from hollow_source_embers import attach_internal_fire
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-zombie-reach-v3-standard/hollow-rigged.blend'
parser=argparse.ArgumentParser();parser.add_argument('--out',default='artifacts/animation');parser.add_argument('--render',action='store_true');parser.add_argument('--all',action='store_true');parser.add_argument('--only',default='walk,attack,pivot,pivot-negative');parser.add_argument('--samples',type=int,default=4);parser.add_argument('--phase-samples',type=int,choices=[8,16,32],default=16);parser.add_argument('--action-samples',type=int,choices=[8,16],default=16)
parser.add_argument('--travel-heading-degrees',type=float,default=0,help='Source-authored travel direction relative to the committed body facing; study only.')
parser.add_argument('--stride-metres',type=float,default=.36,help='Authored source gait distance per cycle, not a gameplay speed.')
parser.add_argument('--flexion-reserve-pixels',type=float,default=0,help='Lower the authored source pelvis to reserve knee flexion; native source pixels, not runtime root correction.')
parser.add_argument('--pelvis-drop-metres',type=float,default=0,help='Explicit authored crouch height for longer source strides; no change to contact tolerances.')
parser.add_argument('--stance-fraction',type=float,default=.62,help='Authored fraction of each contact cycle spent on the ground.')
parser.add_argument('--guides',action='store_true',help='Preserve pre-balance whole-body guide actions for the shared runtime support solve; guides alone are not grounded acceptance.')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
if not math.isfinite(args.travel_heading_degrees) or abs(args.travel_heading_degrees)>45:parser.error('travel heading must be finite and within -45..45 degrees')
if not math.isfinite(args.stride_metres) or args.stride_metres<=0:parser.error('source stride must be finite and positive')
if not math.isfinite(args.flexion_reserve_pixels) or not 0<=args.flexion_reserve_pixels<=2:parser.error('source flexion reserve must be finite and within 0..2 native pixels')
if not math.isfinite(args.pelvis_drop_metres) or not 0<=args.pelvis_drop_metres<=.10:parser.error('source crouch must be finite and within 0..0.10 metres')
if not math.isfinite(args.stance_fraction) or not .5<args.stance_fraction<.9:parser.error('source stance fraction must be within 0.5..0.9')
if args.travel_heading_degrees and any(c not in ['walk','attack-travel'] for c in args.only.split(',')):parser.error('directional studies require --only walk,attack-travel')
TRAVEL_ROTATION=Matrix.Rotation(math.radians(args.travel_heading_degrees),4,'Z')
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
bind_repair=fit_upright_contact_bind(rig,actor,[[prefix+side for prefix in ['thigh.','shin.','foot.']] for side in ['L','R']],1.55/96)
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
SOLE_Z=-.50
STRIDE=args.stride_metres
DIRECTIONS=['N','NE','E','SE','S','SW','W','NW']
SOLE_PATCHES={side:mesh_sole_patch(rig,actor,'foot.'+side,1.55/96) for side in ['L','R']}
SUPPORT_MARGIN=.5*1.55/96
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
    stance_fraction=args.stance_fraction
    if q<stance_fraction:
        local_y=STRIDE*(q-stance_fraction/2);z=SOLE_Z;stance=True
    else:
        a=(q-stance_fraction)/(1-stance_fraction);local_y=STRIDE*(stance_fraction/2-smooth(a)*stance_fraction);z=SOLE_Z+.055*math.sin(math.pi*a);stance=False
    # Preserve anatomical stance width and the source sole orientation; change
    # the direction of the actual step, not the identity of left/right feet.
    return Vector((sign*.085,0,z))+TRAVEL_ROTATION @ Vector((0,local_y,0)),stance

def checked_chain(rig,upper,lower,target,pole,limits):
    try:return solve_chain(rig,upper,lower,target,pole,limits)
    except ValueError as error:raise ValueError(f'{clip} pose {index}, {upper}, head={list(rig.pose.bones[upper].head)}, target={list(target)}: {error}') from error

(OUT/'source-preflight.json').write_text(json.dumps({'bindRepair':bind_repair,'patches':SOLE_PATCHES,'rest':{k:[v for row in matrix for v in row] for k,matrix in rest.items()}},sort_keys=True))
records={};actions={}
GRID_PHASES=args.phase_samples
GRID_ACTIONS=args.action_samples
for clip in args.only.split(','):
    action=bpy.data.actions.new('AN1_'+clip+'_supported_v1');rig.animation_data_create();rig.animation_data.action=action
    action.use_fake_user=True;actions[clip]=action
    samples=[];last_points={};slips=[];joint_ranges={};length_error=0;guide_frames=[]
    grid=clip=='attack-travel'
    frame_count=GRID_PHASES*GRID_ACTIONS if grid else GRID_PHASES if clip=='walk' else 16
    for index in range(frame_count if grid else frame_count+1):
        scene.frame_set(index+1)
        gait_index=index%GRID_PHASES if grid else index
        p=gait_index/(GRID_PHASES if grid or clip=='walk' else 16);t=(index//GRID_PHASES)/(GRID_ACTIONS-1) if grid else (index/15 if index<16 else 1)
        # A grid is a sampled whole-body surface, not a sequential action.
        # Each row starts a new gait/contact experiment at a fixed action time.
        if grid and gait_index==0:last_points={}
        rig.location=(0,0,0);rig.rotation_mode='XYZ';rig.rotation_euler=(0,0,0)
        turn_sign=-1 if clip=='pivot-negative' else 1
        yaw=turn_sign*math.pi/4*smooth((p-.08)/.84) if clip.startswith('pivot') else 0
        rig.rotation_euler.z=yaw
        # Torso has separate load/torque/recoil curves; no independent leg loop.
        attack=clip in ['attack','attack-travel']
        torque=interp([(0,0),(.27,-.27),(.43,-.30),(.56,.34),(.72,.22),(1,0)],t) if attack else .045*math.sin(2*math.pi*p)
        lean=interp([(0,.09),(.3,-.08),(.47,-.03),(.58,.19),(.76,.12),(1,.09)],t) if attack else .09+.025*math.sin(4*math.pi*p)
        if grid:
            # The moving action is a whole-body surface whose first/last rows
            # exactly match the same gait. Only its interior reserves flexion.
            action_weight=smooth(t/.20)*(1-smooth((t-.80)/.20))
            torque=.045*math.sin(2*math.pi*p)*(1-action_weight)+torque*action_weight
            lean=(.09+.025*math.sin(4*math.pi*p))*(1-action_weight)+lean*action_weight
        pelvis_x=.085*math.sin(2*math.pi*p) if not attack or grid else interp([(0,0),(.3,-.018),(.6,.024),(1,0)],t)
        pelvis_z=-.09+.009*math.cos(4*math.pi*p) if not attack or grid else interp([(0,-.081),(.32,-.098),(.57,-.084),(.75,-.093),(1,-.081)],t)
        # Moving contact poses need flexion reserve for the actual sole patch,
        # rather than extending toward the old empty virtual foot landmark.
        if grid:pelvis_z-=.015*action_weight
        pelvis_z-=args.flexion_reserve_pixels*1.55/96
        pelvis_z-=args.pelvis_drop_metres
        # Offsets are local to the true bind orientation (not world premultiplies).
        set_local('root',(0,0,0),(0,0,0))
        pelvis=rig.pose.bones['pelvis'];pelvis.matrix=Matrix.Translation(TRAVEL_ROTATION @ Vector((pelvis_x,0,pelvis_z+.025))) @ rest['pelvis']
        set_local('spine',(lean*.45,0,-torque*.30));set_local('chest',(lean*.55,0,torque))
        set_local('neck',(.06,0,-torque*.15));set_local('head',(.05+.025*math.sin(2*math.pi*p-.7),.09,-torque*.20))
        set_local('cloth.L',(.045*math.sin(2*math.pi*p-.5),0,0));set_local('cloth.R',(.035*math.sin(2*math.pi*p-1),0,0))
        for side,sign in [('L',1),('R',-1)]:set_local('clavicle.'+side,(0,.025*sign,torque*.15))
        bpy.context.view_layer.update()
        contacts=[];footprints=[];feet_poses={};hand_targets={}
        for side,sign in [('L',1),('R',-1)]:
            if attack and not grid:
                sole=Vector((sign*.085,-.06 if side=='L' else .055,SOLE_Z));stance=True
            elif clip.startswith('pivot'):
                # Two actual weight-bearing steps complete one 45 degree turn.
                start=Vector((sign*.085,0,SOLE_Z))
                end=Matrix.Rotation(turn_sign*math.pi/4,4,'Z') @ start
                begin,finish=(.48,.96) if side=='L' else (.04,.48)
                a=max(0,min(1,(p-begin)/(finish-begin)))
                stance=p<=begin or p>=finish
                world_sole=start.lerp(end,smooth(a));world_sole.z+=.05*math.sin(math.pi*a)
                sole=Matrix.Rotation(-yaw,4,'Z') @ world_sole
            else:sole,stance=foot_target(side,p)
            footrest=rig.data.bones['foot.'+side]
            landmark=Vector(SOLE_PATCHES[side]['restContactPoint'])
            foot_yaw=(turn_sign*math.pi/4*smooth(a) if clip.startswith('pivot') else 0)-yaw
            foot_rotation=Matrix.Rotation(foot_yaw,4,'Z')
            ankle=sole-foot_rotation.to_3x3() @ (landmark-footrest.head_local)
            flex=checked_chain(rig,'thigh.'+side,'shin.'+side,ankle,TRAVEL_ROTATION @ Vector((sign*.09,-.5,-.2)),(8,145))
            fmatrix=foot_rotation @ footrest.matrix_local;fmatrix.translation=ankle;rig.pose.bones['foot.'+side].matrix=fmatrix
            bpy.context.view_layer.update()
            feet_poses[side]=(ankle.copy(),fmatrix.copy())
            actual=rig.pose.bones['foot.'+side].matrix @ rest['foot.'+side].inverted() @ landmark
            world=Matrix.Rotation(yaw,4,'Z') @ actual+TRAVEL_ROTATION @ Vector((0,-STRIDE*p if clip=='walk' or grid else 0,0))
            if stance:
                # A new support epoch may reuse a limb ID after a swing.
                if side in last_points:slips.append((world-last_points[side]).length)
                last_points[side]=world.copy()
                contacts.append({'id':'foot-'+side,'x':actual.x,'y':actual.y,'z':actual.z})
                for point in SOLE_PATCHES[side]['restHull']:
                    support=rig.pose.bones['foot.'+side].matrix @ rest['foot.'+side].inverted() @ Vector(point)
                    footprints.append((support.x,support.y))
            else:last_points.pop(side,None)
            joint_ranges.setdefault('knee-'+side,[]).append(flex)
        # Shoulder-relative authored performance. The passive arm hangs under
        # gravity; the lead arm reaches. A shoulder/pelvis move carries the wrist
        # target with it rather than leaving an isolated hand fixed in space.
        for side,sign in [('L',1),('R',-1)]:
            shoulder=rig.pose.bones['upper_arm.'+side].head.copy()
            length=rig.data.bones['upper_arm.'+side].length+rig.data.bones['forearm.'+side].length
            leading=side=='R'
            direction=Vector((sign*.10,-.75,-.65)).normalized() if leading else Vector((sign*.08,.08,-.994)).normalized()
            baseline=direction*length*(.90 if leading else .94)
            lag=.012*math.sin(2*math.pi*p-.65)-.012*math.sin(-.65)
            if attack and leading:
                offset=Vector((
                    interp([(0,baseline.x),(.30,-.07),(.44,-.07),(.57,-.015),(.72,-.06),(.86,-.04),(1,baseline.x)],t),
                    interp([(0,baseline.y),(.30,.035),(.44,-.025),(.57,-.29),(.72,-.23),(.86,-.15),(1,baseline.y)],t),
                    interp([(0,baseline.z),(.30,-.13),(.44,-.11),(.57,-.10),(.72,-.25),(.86,-.24),(1,baseline.z)],t)))
                if grid:offset=baseline*(1-action_weight)+offset*action_weight+Vector((0,lag*(1-action_weight),0))
                hand_direction=Vector((sign*.10,-.80,-.60)).normalized()
            else:
                lag=.012*math.sin(2*math.pi*p-.65)-.012*math.sin(-.65)
                offset=baseline+Vector((0,lag,0))
                hand_direction=Vector((sign*.10,-.80,-.60)).normalized() if leading else Vector((sign*.04,-.08,-.995)).normalized()
            target=shoulder+offset
            pole_offset=Vector((sign*.14,.04,-.15)) if leading else Vector((sign*.12,-.12,-.15))
            flex=checked_chain(rig,'upper_arm.'+side,'forearm.'+side,target,shoulder+pole_offset,(12,150))
            hand=rig.data.bones['hand.'+side]
            rig.pose.bones['hand.'+side].matrix=segment_matrix(hand,target,target+hand_direction*hand.length)
            bpy.context.view_layer.update();joint_ranges.setdefault('elbow-'+side,[]).append(flex)
            hand_targets[side]=(target.copy(),hand_direction.copy(),pole_offset.copy())
        # Author-provided segment mass fractions, applied to actual posed
        # segment centres. This is an approximation, not a dynamics simulation.
        weights={'pelvis':.18,'spine':.12,'chest':.20,'neck':.02,'head':.08}
        for side in ['L','R']:
            weights.update({'thigh.'+side:.10,'shin.'+side:.04,'foot.'+side:.02,
                            'upper_arm.'+side:.035,'forearm.'+side:.02,'hand.'+side:.01})
        com=sum(((rig.pose.bones[name].head+rig.pose.bones[name].tail)*.5*weight for name,weight in weights.items()),Vector())/sum(weights.values())
        margin=support_margin(com,footprints)
        if args.guides:guide_frames.append((rig.rotation_euler.copy(),{bone.name:bone.matrix_basis.copy() for bone in rig.pose.bones}))
        # A kinematic balance pass moves the pelvis/mass, then re-solves the
        # SAME planted ankles. It cannot translate the contact targets or bones.
        # No unsupported pose is relabelled as a catch without a real step.
        for balance_iteration in range(10):
            if margin>=SUPPORT_MARGIN:break
            goal=Vector((sum(c['x'] for c in contacts)/len(contacts),sum(c['y'] for c in contacts)/len(contacts),com.z))
            shift=(goal-com)*.65;shift.z=0
            if shift.length>.025:shift.normalize();shift*=.025
            matrix=rig.pose.bones['pelvis'].matrix.copy();matrix.translation+=shift
            rig.pose.bones['pelvis'].matrix=matrix;bpy.context.view_layer.update()
            for side,sign in [('L',1),('R',-1)]:
                ankle,fmatrix=feet_poses[side]
                flex=checked_chain(rig,'thigh.'+side,'shin.'+side,ankle,TRAVEL_ROTATION @ Vector((sign*.09,-.5,-.2)),(8,145))
                rig.pose.bones['foot.'+side].matrix=fmatrix;bpy.context.view_layer.update()
                joint_ranges['knee-'+side].append(flex)
                target,direction,pole_offset=hand_targets[side];target+=shift
                flex=checked_chain(rig,'upper_arm.'+side,'forearm.'+side,target,rig.pose.bones['upper_arm.'+side].head+pole_offset,(12,150))
                hand=rig.data.bones['hand.'+side];rig.pose.bones['hand.'+side].matrix=segment_matrix(hand,target,target+direction*hand.length)
                bpy.context.view_layer.update();joint_ranges['elbow-'+side].append(flex)
            com=sum(((rig.pose.bones[name].head+rig.pose.bones[name].tail)*.5*weight for name,weight in weights.items()),Vector())/sum(weights.values())
            margin=support_margin(com,footprints)
        if margin<SUPPORT_MARGIN-1e-6:raise ValueError(f'Unbalanced {clip} frame {index}: mass projection {margin:.6f}m outside support')
        sample={'contacts':contacts,'com':[com.x,com.y],'supportMargin':margin,
                'balance':'supported' if margin>=0 else 'catch','authoredYawRadians':yaw,
                'massModel':'authored-segment-centres-approximation',
                'rootTravelMetres':STRIDE*p if clip=='walk' or grid else 0,
                'rootTravelVectorMetres':list(TRAVEL_ROTATION @ Vector((0,-STRIDE*p if clip=='walk' or grid else 0,0))),
                'gaitPhase':p,'actionProgress':t if attack else None}
        samples.append(sample)
        rig.keyframe_insert("rotation_euler",frame=index+1)
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
    records[clip]={'samples':samples[:frame_count],'maxStanceSlipMetres':max(slips,default=0),'maxBoneLengthErrorMetres':length_error,'jointRangesDegrees':{k:[min(v),max(v)] for k,v in joint_ranges.items()},'strideMetres':STRIDE if clip=='walk' or grid else 0,'frames':frame_count,'fps':GRID_ACTIONS/(16/12) if grid else GRID_PHASES/(16/12) if clip=='walk' else 12}
    if grid and 'walk' in records:records[clip]['transitionReference']='walk'
    if clip=='walk' or grid:
        records[clip]['rootStrideVectorMetres']=list(TRAVEL_ROTATION @ Vector((0,-STRIDE,0)))
        records[clip]['travelHeadingDegrees']=args.travel_heading_degrees
    if grid:records[clip]['poseGrid']={'phaseFrames':GRID_PHASES,'actionFrames':GRID_ACTIONS,'order':'action-major','phaseSampling':'nearest','actionSampling':'nearest'}
    if args.guides:
        guide=bpy.data.actions.new('AN1_'+clip+'_guide_v1');guide.use_fake_user=True;rig.animation_data.action=guide
        for frame,(rotation,channels) in enumerate(guide_frames):
            scene.frame_set(frame+1);rig.rotation_euler=rotation;rig.keyframe_insert('rotation_euler',frame=frame+1)
            for bone in rig.pose.bones:
                bone.matrix_basis=channels[bone.name];bone.keyframe_insert('location',frame=frame+1);bone.keyframe_insert('rotation_euler' if bone.rotation_mode=='XYZ' else 'rotation_quaternion',frame=frame+1);bone.keyframe_insert('scale',frame=frame+1)
        records[clip]['guideAction']=guide.name;records[clip]['guideMassSupported']=False;rig.animation_data.action=action
    print('AN_CLIP',clip,json.dumps({k:v for k,v in records[clip].items() if k!='samples'}),flush=True)
# Pack images into editable source rather than depending on another workstation.
bpy.ops.file.pack_all()
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'hollow-foundation.blend'))
skeleton=[{'id':b.name,'parent':b.parent.name if b.parent else None,'length':b.length,'rest':[x for row in b.matrix_local for x in row]} for b in rig.data.bones]
projection_by_direction={}
for row,direction in enumerate(DIRECTIONS):
    view.rotation_euler.z=front+math.pi-row*math.pi/4;bpy.context.view_layer.update()
    def pixel(point):
        p=world_to_camera_view(scene,scene.camera,rig.matrix_world @ point);return [p.x*96,(1-p.y)*96]
    origin=pixel(Vector((0,0,0)));axes=[pixel(Vector(axis)) for axis in [(1,0,0),(0,1,0),(0,0,1)]]
    projection_by_direction[direction]=[axes[k][0]-origin[0] for k in range(3)]+[origin[0]]+[axes[k][1]-origin[1] for k in range(3)]+[origin[1]]
view.rotation_euler=(0,0,0)
manifest={'schemaVersion':2,'groundZMetres':SOLE_Z,'bindRepair':bind_repair,'solePatches':SOLE_PATCHES,'minimumSupportMarginMetres':SUPPORT_MARGIN,'massWeights':weights,'projectionByDirection':projection_by_direction,'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'contactChains':[{'id':'foot-'+side,'upper':'thigh.'+side,'middle':'shin.'+side,'end':'foot.'+side,'pole':[sign*.09,-.5,-.2],'restContactPoint':SOLE_PATCHES[side]['restContactPoint'],'limits':[8,145],'bindSpace':'rig-source'} for side,sign in [('L',1),('R',-1)]],'candidateNotApproved':True,'runtimeIntegrated':False,'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'blenderVersion':bpy.app.version_string,'coordinateSpace':'actor-xy-ground-z-up','sourceUnits':'metres','unitsPerPixel':1.55/96,'skeleton':skeleton,'skeletonSignature':hashlib.sha256(json.dumps(skeleton,sort_keys=True).encode()).hexdigest(),'clips':records,'directions':DIRECTIONS,'cloth':cloth,'emissionRegions':regions,'sourceQCOnly':True,'wholeBodyCOMValidated':False,'massModel':'authored-segment-centres-approximation-not-physical-dynamics'}
manifest['contactCycles']=[{'id':'foot-'+side,'phaseOffset':offset,'stanceFraction':args.stance_fraction,'neutral':[sign*.085,0,SOLE_Z],'liftMetres':.055} for side,sign,offset in [('L',1,0),('R',-1,.5)]]
manifest['flexionReserveMetres']=args.flexion_reserve_pixels*1.55/96
manifest['authoredPelvisDropMetres']=args.pelvis_drop_metres
manifest['turnSupport']={'radians':math.pi/4,'durationSeconds':16/12,'phaseCycles':1}
for chain in manifest['contactChains']:
    chain['pole']=list(TRAVEL_ROTATION @ Vector(chain['pole']))
(OUT/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if args.render:
    for clip,action in actions.items():
        rig.animation_data.action=action
        for row,direction in enumerate(DIRECTIONS):
            if not args.all and direction not in ['S','E']:continue
            view.rotation_euler.z=front+math.pi-row*math.pi/4
            folder=OUT/'frames'/clip/direction;folder.mkdir(parents=True,exist_ok=True)
            for index in range(records[clip]['frames']):
                scene.frame_set(index+1);scene.render.filepath=str(folder/f'{index:02d}.png');bpy.ops.render.render(write_still=True)
            print('AN_RENDER',clip,direction,flush=True)
print('AN_OUTPUT',str(OUT),flush=True)
