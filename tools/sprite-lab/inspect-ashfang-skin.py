"""Inspect real foot skin extents in an editable source rig."""
import bpy, sys, json
import numpy as np
from pathlib import Path
rig=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(rig/'ashfang-rigged.blend'))
obj=next(o for o in bpy.data.objects if o.type=='MESH')
report={}
for group in obj.vertex_groups:
    if not group.name.startswith(('fore.2.','hind.2.')):continue
    points=np.array([v.co[:] for v in obj.data.vertices if any(g.group==group.index and g.weight>.95 for g in v.groups)])
    report[group.name]=dict(vertices=len(points),restMin=points.min(0).tolist(),restMax=points.max(0).tolist())
(rig/'foot-skin-bounds.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)
