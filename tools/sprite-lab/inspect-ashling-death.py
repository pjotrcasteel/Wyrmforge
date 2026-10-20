import bpy,sys,json
import numpy as np
from pathlib import Path
p=Path(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=str(p/'ashling-death.blend'));obj=bpy.data.objects['Ashling skinned character']
if 'Death floor contact after skinning' in obj.modifiers:obj.modifiers['Death floor contact after skinning'].show_viewport=False
report=[]
for frame in [1,9,13,19,28]:
    bpy.context.scene.frame_set(frame);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();v=np.array([x.co[:] for x in mesh.vertices]);groups={}
    for i in np.where(v[:,2]<-.5)[0]:
        g=max(obj.data.vertices[int(i)].groups,key=lambda g:g.weight);n=obj.vertex_groups[g.group].name;groups[n]=groups.get(n,0)+1
    rig=bpy.data.objects['Ashling editable animation rig']
    report.append(dict(frame=frame,minZ=float(v[:,2].min()),maxZ=float(v[:,2].max()),belowFloorByGroup=groups,bones={n:dict(head=list(rig.pose.bones[n].head),tail=list(rig.pose.bones[n].tail)) for n in ['pelvis','chest','neck','head','foot.L','foot.R']}));ev.to_mesh_clear()
(p/'raw-floor-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
