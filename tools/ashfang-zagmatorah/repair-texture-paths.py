"""Repair shared archive texture links without changing geometry, rig or pose."""
import argparse,json,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Refusing to overwrite a milestone')
out.mkdir(parents=True);fixed=[]
for image in bpy.data.images:
    if image.source!='FILE':continue
    name=Path(image.filepath.replace('\\','/')).name
    actual=out.parent/'M0-001/original/download/textures'/name
    if not actual.is_file():raise RuntimeError('Texture not found: '+str(actual))
    image.filepath=str(actual);image.reload()
    image.filepath='//../M0-001/original/download/textures/'+name
    fixed.append(name)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True,relative_remap=False)
(out/'dependency-repair.json').write_text(json.dumps({'repaired':fixed,'cause':'save_as_mainfile relative_remap rebased paths already authored for destination','fix':'Save explicit destination-relative paths with relative_remap=False','geometryRigPoseChanged':False},indent=2))
