"""Render a small true-camera review from a saved pose grid; not runtime proof.

blender -b -t 2 --python tools/animation/render_grid_review.py -- artifacts/travel-study
Each sampled frame evaluates an authored whole-body pose; no image deformation.
"""
import bpy,sys,json,math
from pathlib import Path
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve()
manifest=json.loads((folder/'source-manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Hollow editable animation rig'];view=bpy.data.objects['AN unanimated view']
scene.cycles.samples=2
clip=manifest['clips']['attack-travel'];grid=clip['poseGrid'];rig.animation_data.action=bpy.data.actions['AN1_attack-travel_supported_v1']
rows=[]
for direction,row in [('S',4),('E',2)]:
 view.rotation_euler.z=math.atan2(-3.2,2.2)+math.pi/2+math.pi-row*math.pi/4
 out=folder/'review'/direction;out.mkdir(parents=True,exist_ok=True)
 for i in range(grid['actionFrames']):
  gait=(i*2)%grid['phaseFrames'];frame=i*grid['phaseFrames']+gait
  scene.frame_set(frame+1);scene.render.filepath=str(out/f'{i:02d}.png');bpy.ops.render.render(write_still=True)
  rows.append({'direction':direction,'reviewFrame':i,'sourcePose':frame,'travelMetres':clip['strideMetres']*i*2/grid['phaseFrames']})
 print('GRID_REVIEW',direction,flush=True)
(folder/'review-samples.json').write_text(json.dumps(rows,indent=2)+'\n')
