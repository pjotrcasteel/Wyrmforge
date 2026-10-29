"""Replay complete runtime matrices in Blender and compare every exported vertex."""
import argparse,json,sys
from pathlib import Path
import bpy,numpy as np
from mathutils import Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
from weighted_skin_reference import deform
p=argparse.ArgumentParser();p.add_argument('pack',type=Path);p.add_argument('study',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
meta=json.loads((a.pack/'skin.json').read_text());surface=json.loads((a.pack/'poses.json').read_text());study=json.loads(a.study.read_text());raw=(a.pack/'skin.bin').read_bytes()
def attribute(name):
 s=meta['attributes'][name];return np.frombuffer(raw,dtype={'f':'<f4','H':'<u2','I':'<u4'}[s['component']],count=s['count']*s['itemSize'],offset=s['offset']).reshape(s['count'],s['itemSize'])
positions=attribute('position').astype(float);indices=np.column_stack([attribute('skinIndex'+('' if i==0 else str(i+1))) for i in range(meta['influenceSets'])]);weights=np.column_stack([attribute('skinWeight'+('' if i==0 else str(i+1))) for i in range(meta['influenceSets'])]);inverse=np.array([np.linalg.inv(np.array(b['rest']).reshape(4,4).T) for b in surface['bones']])
bpy.ops.wm.open_mainfile(filepath=str((a.pack/'source-skin-lod.blend').resolve()))
rig=bpy.data.objects['Hollow editable animation rig'];mesh=bpy.data.objects['AN source skin candidate'];rig.animation_data_clear();bpy.data.objects['AN unanimated view'].rotation_euler=(0,0,0)
to_rig=rig.matrix_world.inverted()@mesh.matrix_world
rest=np.array([list(to_rig@v.co) for v in mesh.data.vertices]);mapping={}
for i,v in enumerate(rest):mapping.setdefault(tuple(np.round(v,5)),[]).append(i)
order=np.array([min(mapping[tuple(np.round(v,5))],key=lambda i:np.linalg.norm(rest[i]-v)) for v in positions])
if np.linalg.norm(rest[order]-positions,axis=1).max()>1e-6:raise ValueError('Export vertex provenance mismatch')
maximum=0;count=0
selected=study['poses'][::24]+[min(study['poses'],key=lambda pose:abs(pose['timestamp']-1.2666667) if pose['sequence']=='corner' else 1e9)]
for pose in selected:
 matrices=np.array(pose['matrices']).reshape(-1,4,4).transpose(0,2,1)
 for i,bone in enumerate(surface['bones']):
  rig.pose.bones[bone['id']].matrix=Matrix(matrices[i].tolist());bpy.context.view_layer.update()
 bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());data=evaluated.to_mesh()
 actual=np.array([list(to_rig@v.co) for v in data.vertices])[order];evaluated.to_mesh_clear()
 predicted=deform(positions,indices,weights,matrices,inverse,meta['skinningMode'])
 error=float(np.linalg.norm(actual-predicted,axis=1).max());maximum=max(maximum,error)
 if error>1e-5:raise ValueError(f'Blender evaluated vertex mismatch {pose["sequence"]}/{pose["timestamp"]}: {error}')
 count+=1
result={'mode':meta['skinningMode'],'poses':count,'verticesPerPose':len(positions),'maximumEvaluatedVertexErrorMetres':maximum,'geometrySha256':meta['bufferSha256'],'runtimeAccepted':False}
a.out.write_text(json.dumps(result,indent=2)+'\n');print('PRESERVE_VOLUME_MESH',json.dumps(result))
