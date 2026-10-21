import bpy,sys,json
from pathlib import Path
p=Path(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=str(p/'ashfang-rigged.blend'));obj=next(o for o in bpy.data.objects if o.type=='MESH');audit=json.loads((p/'floor-audit.json').read_text())
for clip in sorted(set(q['clip'] for q in audit)):
 q=min((q for q in audit if q['clip']==clip),key=lambda q:q['minZ']);v=obj.data.vertices[q['lowestVertex']];print(json.dumps(dict(clip=clip,frame=q['frame'],minZ=q['minZ'],restVertex=list(v.co),groups={obj.vertex_groups[g.group].name:g.weight for g in v.groups})),flush=True)
