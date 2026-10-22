import bpy,json
from pathlib import Path
r=bpy.data.objects['Zahmatorah_Skeleton'];bpy.context.view_layer.update()
d={'rigMatrix':[list(row) for row in r.matrix_world],'bones':[{'name':b.name,'parent':b.parent.name if b.parent else None,'head':list(b.head_local),'tail':list(b.tail_local),'length':b.length,'matrix':[list(row) for row in b.matrix_local]} for b in r.data.bones]}
Path('artifacts/ashfang/rig-animation-audit.json').write_text(json.dumps(d,indent=2))
for b in r.data.bones:print(b.name,'parent',b.parent.name if b.parent else '-', 'head',tuple(round(v,2) for v in b.head_local),'tail',tuple(round(v,2) for v in b.tail_local))
