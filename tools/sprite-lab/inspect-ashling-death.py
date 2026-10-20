import bpy,sys,json
import numpy as np
from pathlib import Path
p=Path(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=str(p/'ashling-death.blend'));obj=bpy.data.objects['Ashling skinned character'];obj.modifiers['Death floor contact after skinning'].show_viewport=False
report=[]
for frame in [1,9,13,19,28]:
    bpy.context.scene.frame_set(frame);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();v=np.array([x.co[:] for x in mesh.vertices]);groups={}
    for i in np.where(v[:,2]<-.5)[0]:
        g=max(obj.data.vertices[int(i)].groups,key=lambda g:g.weight);n=obj.vertex_groups[g.group].name;groups[n]=groups.get(n,0)+1
    report.append(dict(frame=frame,minZ=float(v[:,2].min()),maxZ=float(v[:,2].max()),belowFloorByGroup=groups));ev.to_mesh_clear()
(p/'raw-floor-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
