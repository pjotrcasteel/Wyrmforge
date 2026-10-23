"""Preserve r03 and remove unintended double-counted r02 shape-key offsets."""
import hashlib
import json
from pathlib import Path
import shutil
import bpy

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=Path(bpy.data.filepath).resolve()
if source!=(base/'milestones/M1-r03/ashfang-primary.blend').resolve():
    raise SystemExit('Requires preserved original r03 source')
output=source.with_name('ashfang-primary-key-corrected.blend')
working=base/'working/ashfang-working-r03-key-corrected.blend'
if output.exists() or working.exists(): raise SystemExit('Never overwrite a native revision')
before=hashlib.sha256(source.read_bytes()).hexdigest()
keys=bpy.data.objects['Ashfang original primary skin'].data.shape_keys.key_blocks
basis=keys['Basis']
previous=keys['r02 primary sternum scapula neck planes']
current=keys['r03 wing-root and cervical primary mass']
for b,p,c in zip(basis.data,previous.data,current.data):
    c.co-=p.co-b.co
bpy.context.scene['shape_key_mix_correction']='r02 offset counted once; previous native retained'
bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
shutil.copy2(output,working)
if hashlib.sha256(source.read_bytes()).hexdigest()!=before: raise RuntimeError('Prior source altered')
report={'precedingSourceSha256':before,'fix':'remove duplicate r02 offset from mixed r03 key',
        'technicalOnly':True,'ownerAccepted':False,
        'files':[{'path':str(f.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),
                  'bytes':f.stat().st_size} for f in (output,working)]}
(source.parent/'key-mix-correction.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
