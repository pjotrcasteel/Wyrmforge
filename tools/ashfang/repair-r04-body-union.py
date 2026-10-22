"""Close non-manifold cut junctions on the new body copy; preserve failed source."""
import hashlib
import json
from pathlib import Path
import shutil
import bpy

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=Path(bpy.data.filepath).resolve()
if source!=(base/'milestones/M1-r04/ashfang-primary.blend').resolve():
    raise SystemExit('Requires retained r04 construction source')
target=source.with_name('ashfang-primary-repaired.blend')
working=base/'working/ashfang-working-r04-repaired.blend'
if target.exists() or working.exists():raise SystemExit('Never replace a native revision')
before=hashlib.sha256(source.read_bytes()).hexdigest()
body=bpy.data.objects['Ashfang r04 integrated primary skin']
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Close primary cut junctions - prior source retained','REMESH')
mod.mode='VOXEL';mod.voxel_size=.06;mod.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=mod.name)
scene=bpy.context.scene
scene['body_union_repair']='Voxel closure of ten non-manifold cut junction edges; original retained'
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True)
shutil.copy2(target,working)
report={'precedingSourceSha256':before,'repair':'Non-manifold wing-stalk cut junctions',
        'ownerAccepted':False,'files':[{'path':str(f.relative_to(root)).replace('\\','/'),
          'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in (target,working)]}
if hashlib.sha256(source.read_bytes()).hexdigest()!=before:raise RuntimeError('Prior native changed')
(source.parent/'body-union-repair.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
