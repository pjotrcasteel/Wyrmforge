"""Validate the packed source and align its opening timeline to the walk action."""
from pathlib import Path
import sys,json
import bpy
import numpy as np

rig=Path(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=str(rig/'ashfang-rigged.blend'));bpy.context.preferences.filepaths.save_version=0
body=next(o for o in bpy.data.objects if o.type=='MESH' and o.data.uv_layers)
bind=np.load(rig/'surface-bind.npz');rest=np.array([v.co[:] for v in body.data.vertices]);assert np.allclose(rest,bind['positions'],atol=1e-7)
profile=json.loads((rig/'profile.json').read_text());checks={}
for clip,spec in profile['clips'].items():
    fire=bpy.data.objects['Animated fire / '+clip];assert len(fire.data.shape_keys.key_blocks)==spec['frames']
    checks[clip]=dict(editableFlameShapes=len(fire.data.shape_keys.key_blocks),bodyFrames=spec['frames'])
images=[n.image for m in body.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE'];assert all(i.packed_file for i in images)
bpy.context.scene.frame_end=profile['clips']['walk']['frames'];bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(rig/'ashfang-rigged.blend'),compress=True)
(rig/'editable-source-checks.json').write_text(json.dumps(dict(restSurfaceMatches=True,bodyTexturesPacked=True,openingTimelineFrames=bpy.context.scene.frame_end,actions=checks,smokeSource='Separate analytic density-sphere NPZ arrays and reproducible source recipe; not a Blender fluid cache'),indent=2)+'\n');print('Editable source verified',flush=True)
