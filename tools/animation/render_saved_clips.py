"""Render declared actions from saved source, without regenerating authoring.
Uses the same true eight-camera basis and source sampling as the author.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--clips',default='attack-travel');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
m=json.loads((a.source/'source-manifest.json').read_text());blend=a.source/'hollow-foundation.blend';bpy.ops.wm.open_mainfile(filepath=str(blend.resolve()))
s=bpy.context.scene;r=bpy.data.objects['Hollow editable animation rig'];view=bpy.data.objects['AN unanimated view']
for clip in a.clips.split(','):
 r.animation_data.action=bpy.data.actions['AN1_'+clip+'_supported_v1']
 for row,direction in enumerate(m['directions']):
  view.rotation_euler.z=math.atan2(-3.2,2.2)+math.pi/2+math.pi-row*math.pi/4
  folder=a.source/'frames'/clip/direction;folder.mkdir(parents=True,exist_ok=True)
  for index in range(m['clips'][clip]['frames']):
   s.frame_set(index+1);s.render.filepath=str((folder/f'{index:02d}.png').resolve());bpy.ops.render.render(write_still=True)
  print('SAVED_SOURCE_RENDER',clip,direction,flush=True)
(a.source/'render-receipt.json').write_text(json.dumps({'sourceBlendSha256':hashlib.sha256(blend.read_bytes()).hexdigest(),'clips':a.clips.split(','),'directions':m['directions'],'samples':s.cycles.samples,'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
