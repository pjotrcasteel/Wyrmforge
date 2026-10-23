"""New material candidate from an unchanged rig/motion source; preserve originals."""
import bpy,sys,json,shutil
import numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from ashfang_material import stone_separation
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]);out=Path(args[1]);out.mkdir(exist_ok=False)
for file in source.iterdir():
    if file.is_file() and file.name not in ('ashfang-rigged.blend','ashfang-albedo.png'):shutil.copy2(file,out/file.name)
bpy.ops.wm.open_mainfile(filepath=str(source/'ashfang-rigged.blend'));bpy.context.preferences.filepaths.save_version=0
image=next(n.image for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.size[0]==2048)
raw=np.empty(len(image.pixels),np.float32);image.pixels.foreach_get(raw);raw=raw.reshape(1024,2048,4);raw[:,:1024]=stone_separation(raw[:,:1024].copy())
image.pixels.foreach_set(raw.ravel());image.filepath_raw=str(out/'ashfang-albedo.png');image.file_format='PNG';image.save();image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-rigged.blend'))
(out/'material-provenance.json').write_text(json.dumps(dict(source=str(source),geometryAndMotionUnchanged=True,uvUnchanged=True,appearanceChanged='cool charcoal stone with retained incandescent boundaries',ownerAccepted=False),indent=2)+'\n')
