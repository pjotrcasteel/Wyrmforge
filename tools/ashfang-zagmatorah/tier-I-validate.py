"""Read-only anatomy/dependency fingerprint, optionally create a self-contained packed master."""
import argparse,hashlib,json,struct,sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent));from import_source import inventory,sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--compare');p.add_argument('--pack-master');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton']
def digest(rows):
 h=hashlib.sha256()
 for row in rows:h.update(struct.pack('<'+'d'*len(row),*row))
 return h.hexdigest()
r={'geometry':digest([tuple(v.co) for v in body.data.vertices]+[tuple(p.vertices) for p in body.data.polygons]),'uv':digest([tuple(loop.uv) for layer in body.data.uv_layers for loop in layer.data]),'weights':digest([(v.index,g.group,g.weight) for v in body.data.vertices for g in v.groups]),'bones':digest([tuple(x for row in b.matrix_local for x in row) for b in rig.data.bones]),'boneHierarchy':[(b.name,b.parent.name if b.parent else None) for b in rig.data.bones],'objects':[(o.name,o.type) for o in bpy.context.scene.objects],'transforms':{o.name:[list(row) for row in o.matrix_world] for o in bpy.context.scene.objects},'vertices':len(body.data.vertices),'polygons':len(body.data.polygons),'boneCount':len(rig.data.bones),'tailMask':[(m.name,m.type,m.vertex_group) for m in body.modifiers if m.type=='MASK']}
# Lists survive JSON roundtrip consistently.
r=json.loads(json.dumps(r))
if a.compare:
 baseline=json.loads(Path(a.compare).read_text());keys=['geometry','uv','weights','bones','boneHierarchy','objects','vertices','polygons','boneCount','tailMask','transforms'];r['baselineChecks']={k:r[k]==baseline[k] for k in keys};assert all(r['baselineChecks'].values()),r['baselineChecks']
if a.pack_master:
 dest=Path(a.pack_master).resolve();assert not dest.exists();dest.parent.mkdir(parents=True,exist_ok=True);bpy.ops.file.pack_all()
 # Keep source rig and mesh selected sensibly; no review floor, light or FX objects.
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
 for screen in bpy.data.screens:
  for area in screen.areas:
   if area.type=='VIEW_3D':
    area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_location=(2.0,0,2);area.spaces.active.region_3d.view_distance=20
 bpy.ops.wm.save_as_mainfile(filepath=str(dest),compress=True,relative_remap=False)
i=inventory();r['missingDependencies']=[im['name'] for im in i['images'] if not im['packed'] and not im['exists']];r['packedImages']=sum(im['packed'] for im in i['images']);r['images']=i['images'];r['source']=bpy.data.filepath;r['sourceSha256']=sha(Path(bpy.data.filepath));assert not r['missingDependencies']
Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(r,indent=2));print('ANATOMY_AND_DEPENDENCIES_PASS',r['sourceSha256'],r.get('baselineChecks'))
