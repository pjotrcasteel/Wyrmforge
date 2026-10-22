"""Explicit static inspection pose and bounded foreleg isolation test; no animation claim."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Quaternion,Vector
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Revision already exists')
out.mkdir(parents=True);source=Path(bpy.data.filepath);rig=bpy.data.objects['Zahmatorah_Skeleton']
if rig.animation_data:
    rig.animation_data.action=None
    for t in rig.animation_data.nla_tracks:t.mute=True
rig.data.pose_position='POSE'
for b in rig.pose.bones:b.matrix_basis.identity()
def rotate(name,axis,degrees):
    b=rig.pose.bones[name];q=b.bone.matrix_local.to_quaternion();b.rotation_mode='QUATERNION';b.rotation_quaternion=q.inverted()@Quaternion(Vector(axis),math.radians(degrees))@q
# Static pose only: open the inherited folded wings to expose shoulder/forelegs.
for side,sign in [('l',-1),('r',1)]:rotate('UpperArm_'+side,(1,0,0),sign*48)
rotate('LowerHead',(0,1,0),-12)
rig['AshfangReviewPose']='Static raised-wing inspection pose, not motion or rig acceptance'
bpy.context.view_layer.update()
def snapshot(name):
    obj=bpy.data.objects[name].evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [obj.matrix_world@v.co for v in obj.data.vertices]
tracked=['Zagmatorah','Ashfang provisional foreleg l','Ashfang provisional foreleg r']
before={n:snapshot(n) for n in tracked}
rotate('AshfangFore_UpperLeg_l',(0,1,0),18);bpy.context.view_layer.update()
changes={n:max((v-before[n][i]).length for i,v in enumerate(snapshot(n))) for n in tracked}
if changes['Ashfang provisional foreleg l']<.01 or changes['Zagmatorah']>1e-5 or changes['Ashfang provisional foreleg r']>1e-5:raise RuntimeError('Independent foreleg isolation check failed '+str(changes))
rig.pose.bones['AshfangFore_UpperLeg_l'].matrix_basis.identity();bpy.context.view_layer.update()
# Dependencies already use stable relative archive layout; save without repacking.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True)
(out/'pose-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'staticPose':{'wingUpperArmDegrees':48,'jawDegrees':12},'forelegIsolationMaxVertexTravel':changes,'technicalIsolationPass':True,'ownerAccepted':False,'limits':['A single isolation test is not full deformation acceptance','Foreleg seams, muscle shape, wing/jaw intersections and stance need visual correction','No animation authored']},indent=2))
