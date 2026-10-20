"""Inspect the saved death source and its exported mesh samples."""
import bpy, sys, json
from pathlib import Path
import numpy as np
root=Path(sys.argv[sys.argv.index('--')+1])
folder=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'/sys.argv[sys.argv.index('--')+2]
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-death.blend'))
character=bpy.data.objects['Hollow skinned character']
rig=bpy.data.objects['Hollow editable animation rig']
source=np.load(folder/'sampled-death.npz')
deps=bpy.context.evaluated_depsgraph_get()
rows=[]
for frame in range(1,25):
    bpy.context.scene.frame_set(frame)
    evaluated=character.evaluated_get(deps);mesh=evaluated.to_mesh()
    positions=np.array([tuple(v.co) for v in mesh.vertices])
    error=float(np.abs(positions-source['positions'][frame-1]).max())
    evaluated.to_mesh_clear()
    corrective=character.modifiers['Floor contact corrective after skinning'];corrective.show_viewport=False
    deps.update()
    evaluated=character.evaluated_get(deps);mesh=evaluated.to_mesh()
    raw=np.array([tuple(v.co) for v in mesh.vertices]);index=int(raw[:,2].argmin())
    group_names=[character.vertex_groups[g.group].name for g in character.data.vertices[index].groups if g.weight>.05]
    penetrating=np.where(raw[:,2]<-.501)[0]
    group_count={}
    for vertex in penetrating:
        groups=character.data.vertices[int(vertex)].groups
        if groups:
            group=character.vertex_groups[max(groups,key=lambda g:g.weight).group].name
            group_count[group]=group_count.get(group,0)+1
    evaluated.to_mesh_clear();corrective.show_viewport=True;deps.update()
    bone_errors=[abs(p.bone.length-p.length) for p in rig.pose.bones]
    rows.append(dict(frame=frame-1,sourceEvaluationError=error,minimumRawZ=float(raw[index,2]),lowestGroups=group_names,correctedVerticesByGroup=group_count,maxBoneLengthError=max(bone_errors)))
report=dict(frames=rows,maxSourceEvaluationError=max(r['sourceEvaluationError'] for r in rows),maxBoneLengthError=max(r['maxBoneLengthError'] for r in rows),minimumExportedZ=float(source['positions'][:,:,2].min()),finalHoldError=float(np.abs(source['positions'][20:]-source['positions'][20]).max()))
(folder/'source-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='frames'}),flush=True)
