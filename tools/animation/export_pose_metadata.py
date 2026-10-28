"""Export actual saved whole-body poses for independent kinematic/skin replay.

No raster ownership, runtime acceptance, or new rendering path is implied.
"""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);m=json.loads((a.source/'source-manifest.json').read_text())
blend=a.source/'hollow-foundation.blend';bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
r=bpy.data.objects['Hollow editable animation rig'];s=bpy.context.scene
result={'sourceStudyOnly':True,'sourceBlendSha256':hashlib.sha256(blend.read_bytes()).hexdigest(),'sourceSignature':m['skeletonSignature'],
 'massWeights':m['massWeights'],'rootBone':'root','bodyBone':'pelvis','unitsPerPixel':m['unitsPerPixel'],
 'minimumSupportMarginMetres':m['minimumSupportMarginMetres'],'groundZMetres':m['groundZMetres'],'clips':{}}
result['authoringEnvelope']={'maxContactExcursion':m['clips']['walk']['strideMetres'],'maxBodyTranslation':m['clips']['walk']['strideMetres']/2}
for name,clip in m['clips'].items():
 r.animation_data.action=bpy.data.actions['AN1_'+name+'_supported_v1'];frames=[]
 for index,sample in enumerate(clip['samples']):
  s.frame_set(index+1);bpy.context.view_layer.update()
  bones={b.name:{'head':list(b.head),'tail':list(b.tail)} for b in r.pose.bones}
  contacts={}
  for c in m['contactChains']:
   end=r.pose.bones[c['end']];rest=r.data.bones[c['end']];matrix=end.matrix @ rest.matrix_local.inverted()
   patch=next(patch for patch in m['solePatches'].values() if patch['bone']==c['end'])
   contacts[c['id']]={**c,'sourceContact':list(matrix @ Vector(c['restContactPoint'])),
    'footprint':[list(matrix @ Vector(v)) for v in patch['restHull']],
    'upperLength':r.data.bones[c['upper']].length,'lowerLength':r.data.bones[c['middle']].length,
    'planted':any(q['id']==c['id'] for q in sample['contacts'])}
  frames.append({'sourceBones':bones,'sourceContacts':contacts,'balance':sample['balance']})
 result['clips'][name]={'frames':frames,'spec':{k:v for k,v in clip.items() if k!='samples'}}
a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,separators=(',',':'))+'\n')
print('SOURCE_POSE_METADATA',str(a.out),a.out.stat().st_size)
