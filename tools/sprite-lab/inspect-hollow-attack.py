"""Reopen the editable attack and verify exported deformation and foot support."""
import bpy, sys, json
from pathlib import Path
import numpy as np
root=Path(sys.argv[sys.argv.index('--')+1])
folder=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-attack-v2'
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-attack.blend'))
character=bpy.data.objects['Hollow skinned character'];rig=bpy.data.objects['Hollow editable animation rig']
source=np.load(folder/'sampled-attack.npz');deps=bpy.context.evaluated_depsgraph_get()
errors=[];feet={s:[] for s in ['L','R']};length_errors=[]
for frame in range(1,17):
    bpy.context.scene.frame_set(frame)
    evaluated=character.evaluated_get(deps);mesh=evaluated.to_mesh()
    positions=np.array([tuple(v.co) for v in mesh.vertices])
    errors.append(float(np.abs(positions-source['positions'][frame-1]).max()));evaluated.to_mesh_clear()
    for side in feet:feet[side].append(np.array(rig.pose.bones['foot.'+side].matrix))
    length_errors.extend(abs(p.length-p.bone.length) for p in rig.pose.bones)
report=dict(frames=16,maxSourceEvaluationError=max(errors),maxBoneLengthError=max(length_errors),
    maxFootMatrixDrift=max(float(np.abs(np.array(matrices)-matrices[0]).max()) for matrices in feet.values()),
    maxFootTranslationDrift=max(float(np.abs(np.array(matrices)[:,:3,3]-matrices[0][:3,3]).max()) for matrices in feet.values()),
    minimumVertexZ=float(source['positions'][:,:,2].min()),returnPoseError=float(np.abs(source['positions'][-1]-source['positions'][0]).max()))
print(json.dumps(report),flush=True)
assert report['maxSourceEvaluationError']==0 and report['maxFootMatrixDrift']<1e-5 and report['maxFootTranslationDrift']<1e-6 and report['returnPoseError']==0
assert report['maxBoneLengthError']<1e-5 and report['minimumVertexZ']>-.501
report['passed']=True
(folder/'source-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
