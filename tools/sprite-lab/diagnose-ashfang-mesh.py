"""Export exact rest geometry and skin ownership for visible-defect tracing."""
import bpy,sys,numpy as np
from pathlib import Path
folder=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(folder/'ashfang-rigged.blend'))
obj=next(o for o in bpy.data.objects if o.type=='MESH')
names=[g.name for g in obj.vertex_groups]
weights=np.zeros((len(obj.data.vertices),len(names)),np.float32)
for v in obj.data.vertices:
    for g in v.groups:weights[v.index,g.group]=g.weight
np.savez_compressed(folder/'rest-skin-diagnostic.npz',vertices=np.array([v.co[:] for v in obj.data.vertices]),weights=weights,names=np.array(names))
