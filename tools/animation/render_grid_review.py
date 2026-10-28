"""Render a small true-camera review from a saved pose grid; not runtime proof.

blender -b -t 2 --python tools/animation/render_grid_review.py -- artifacts/travel-study
Each sampled frame evaluates an authored whole-body pose; no image deformation.
"""
import bpy,sys,json,math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from pathlib import Path
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve()
manifest=json.loads((folder/'source-manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Hollow editable animation rig'];view=bpy.data.objects['AN unanimated view']
scene.cycles.samples=2
world_review='--world' in sys.argv
if world_review:
 scene.render.resolution_x=scene.render.resolution_y=192;scene.camera.data.ortho_scale=3.1
clip=manifest['clips']['attack-travel'];grid=clip['poseGrid'];rig.animation_data.action=bpy.data.actions['AN1_attack-travel_supported_v1']
rows=[]
for direction,row in [('S',4),('E',2)]:
 view.rotation_euler.z=math.atan2(-3.2,2.2)+math.pi/2+math.pi-row*math.pi/4
 out=folder/('world-review' if world_review else 'review')/direction;out.mkdir(parents=True,exist_ok=True)
 for i in range(grid['actionFrames']):
  gait=(i*2)%grid['phaseFrames'];frame=i*grid['phaseFrames']+gait
  scene.frame_set(frame+1)
  travel=clip['strideMetres']*i*2/grid['phaseFrames']
  rig.location.y=-travel if world_review else 0
  bpy.context.view_layer.update()
  contact_pixels=[]
  for c in clip['samples'][frame]['contacts']:
   # The authored contacts are fitted to real mesh sole patches. The historic
   # hand-picked empty landmark is not a valid overlay for corrected sources.
   point=rig.matrix_world @ Vector((c['x'],c['y'],c['z']))
   projected=world_to_camera_view(scene,scene.camera,point)
   contact_pixels.append({'id':c['id'],'pixel':[projected.x*scene.render.resolution_x,(1-projected.y)*scene.render.resolution_y],'world':list(point)})
  scene.render.filepath=str(out/f'{i:02d}.png');bpy.ops.render.render(write_still=True)
  rows.append({'direction':direction,'reviewFrame':i,'sourcePose':frame,'travelMetres':travel,'contacts':contact_pixels})
 print('GRID_REVIEW',direction,flush=True)
(folder/('world-review-samples.json' if world_review else 'review-samples.json')).write_text(json.dumps(rows,indent=2)+'\n')
