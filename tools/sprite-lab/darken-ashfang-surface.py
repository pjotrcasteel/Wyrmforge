"""Owner-directed charcoal variant; preserve fire, source geometry and motion."""
from pathlib import Path
import sys,shutil,json
import bpy
import numpy as np

args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]);out=Path(args[1]);out.mkdir(exist_ok=False)
for path in source.iterdir():
    if path.is_file() and path.suffix in ('.json','.npz'):shutil.copy2(path,out/path.name)
bpy.ops.wm.open_mainfile(filepath=str(source/'ashfang-rigged.blend'))
body=next(o for o in bpy.data.objects if o.type=='MESH' and o.data.uv_layers)
nodes=[n for m in body.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
original=nodes[0].image;image=original.copy();image.name='Ashfang near-black charcoal and molten fire'
pixels=np.array(image.pixels[:],np.float32).reshape(-1,4);rgb=pixels[:,:3].copy()
emissive=(rgb[:,0]>.48)&(rgb[:,0]>rgb[:,1]*1.6)
bone=(rgb[:,0]>.50)&(rgb[:,1]>.43)&(rgb[:,2]>.25)
stone=~(emissive|bone)
pixels[stone,:3]*=np.array([.38,.40,.43],np.float32)
assert np.array_equal(pixels[emissive],np.concatenate([rgb[emissive],pixels[emissive,3:]],1))
image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(out/'ashfang-albedo.png');image.file_format='PNG';image.save();image.pack()
for node in nodes:node.image=image
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-rigged.blend'),compress=True)
(out/'charcoal-material.json').write_text(json.dumps(dict(source=str(source),method='Near-black cool charcoal on non-emissive surface; molten seams, flames, eyes and fangs retained',surfaceMultiplier=[.38,.40,.43],emissiveTexelsUnchanged=True,geometryChanged=False,motionChanged=False,ownerAccepted=False),indent=2)+'\n')
print('Saved charcoal source',out,flush=True)
