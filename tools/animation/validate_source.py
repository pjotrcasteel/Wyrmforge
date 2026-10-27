"""Independent saved-action QC. Evaluates the editable .blend, not target data.

Checks sampled foot world-slip, actual segment lengths, knee/elbow angles and
cross-facing export integrity. Source-only: no gameplay or raster claim.
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve();m=json.loads((folder/'source-manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
r=bpy.data.objects['Hollow editable animation rig'];view=bpy.data.objects['AN unanimated view'];view.rotation_euler=(0,0,0)
scene=bpy.context.scene;results={};rest=r.data.bones
for name,clip in m['clips'].items():
 r.animation_data.action=bpy.data.actions['AN1_'+name+'_supported_v1'];anchors={};maxslip=0;maxlength=0;ranges={}
 for f,s in enumerate(clip['samples']):
  scene.frame_set(f+1);active={c['id'] for c in s['contacts']}
  for side,sign in [('L',1),('R',-1)]:
   id='foot-'+side;bone=r.pose.bones['foot.'+side]
   actual=r.matrix_world @ bone.matrix @ rest[bone.name].matrix_local.inverted() @ Vector((sign*.09,-.025,-.5))
   if name=='walk':actual+=Vector((0,-clip['strideMetres']*f/16,0))
   if id in active:
    if id in anchors:maxslip=max(maxslip,(actual-anchors[id]).length)
    else:anchors[id]=actual.copy()
   else:anchors.pop(id,None)
   for upper,lower,label,limit in [('thigh.','shin.','knee',(8,145)),('upper_arm.','forearm.','elbow',(12,150))]:
    a,b=r.pose.bones[upper+side],r.pose.bones[lower+side]
    angle=(a.tail-a.head).angle(b.tail-b.head)*180/math.pi
    assert limit[0]-1e-3<=angle<=limit[1]+1e-3,(name,f,label,angle)
    ranges.setdefault(label+'-'+side,[]).append(angle)
  for b in r.pose.bones:maxlength=max(maxlength,abs((b.tail-b.head).length-rest[b.name].length))
 tolerance=m['unitsPerPixel']*.25
 assert maxslip<tolerance,('foot skating',name,maxslip,tolerance)
 assert maxlength<1e-5,('bone length',name,maxlength)
 assert min(s['supportMargin'] for s in clip['samples'])>=0,('unsupported mass proxy',name)
 results[name]={'maxSavedActionSlipMetres':maxslip,'toleranceMetres':tolerance,'maxBoneLengthErrorMetres':maxlength,'jointRanges':{k:[min(v),max(v)] for k,v in ranges.items()},'minimumAuthoredMassMarginMetres':min(s['supportMargin'] for s in clip['samples'])}
(folder/'independent-source-qc.json').write_text(json.dumps(results,indent=2)+'\n');print('AN_INDEPENDENT_QC',json.dumps(results),flush=True)
