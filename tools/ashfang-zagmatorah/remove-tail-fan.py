"""Remove the terminal tail fan non-destructively; leave source topology and rig editable."""
import argparse,json,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output).resolve()
if out.exists():raise SystemExit('Refusing to overwrite a preserved revision')
out.mkdir(parents=True)
source=Path(bpy.data.filepath);ob=bpy.data.objects['Zagmatorah']
names={g.index:g.name for g in ob.vertex_groups}
fan_material_vertices=set()
for poly in ob.data.polygons:
    mat=ob.material_slots[poly.material_index].material
    if mat and mat.name.startswith('DragonWing') and all(ob.data.vertices[i].co.x>10 for i in poly.vertices):
        fan_material_vertices.update(poly.vertices)
remove=[]
for v in ob.data.vertices:
    fan_weight=sum(g.weight for g in v.groups if names[g.group].startswith(('UpperTail','LowerTail')))
    if v.co.x>10 and ((v.index in fan_material_vertices) or (fan_weight>.01 and abs(v.co.y)>.075)):
        remove.append(v.index)
if not remove:raise RuntimeError('Tail fan selection empty')
keep=ob.vertex_groups.new(name='Ashfang retain body and tapered tail')
remove_set=set(remove)
keep.add([v.index for v in ob.data.vertices if v.index not in remove_set],1,'REPLACE')
modifier=ob.modifiers.new('Remove tail fan - reversible owner edit','MASK');modifier.vertex_group=keep.name;modifier.threshold=.5
ob['tailFanRemoved']=True
bpy.context.view_layer.update()
evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
report={'source':str(source),'sourceSha256':sha(source),'removedFanVertices':len(remove),'preservedSourceVertices':len(ob.data.vertices),'visibleVertices':len(evaluated.data.vertices),'method':'Reversible vertex-group mask covering distal membrane and lateral fan struts; central tail retained','ownerRequest':'Remove flipper part of tail','originalImportUntouched':True,'rigBonesRemoved':0}
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True)
report['sha256']=sha(out/'ashfang-master-working.blend')
(out/'tail-edit.json').write_text(json.dumps(report,indent=2))
print('TAIL_EDIT',json.dumps(report))
