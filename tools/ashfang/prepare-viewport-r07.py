"""Prepare preserved r05 for direct viewport sculpting, without geometry edits."""
from pathlib import Path
import json
import hashlib
import bpy
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=base/'milestones/M1-r05/ashfang-primary.blend'
if Path(bpy.data.filepath).resolve()!=source.resolve():raise SystemExit('Requires preserved r05')
out=base/'milestones/M1-r07'
if out.exists():raise SystemExit('Never replace native revision')
out.mkdir(parents=True)
bpy.ops.object.select_all(action='DESELECT')
head=bpy.data.objects['Ashfang r05 integrated cranial skin']
head.select_set(True);bpy.context.view_layer.objects.active=head
bpy.context.scene.tool_settings.sculpt.use_symmetry_x=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.region_3d.view_location=Vector((0,-5.12,3.36))
            space.region_3d.view_distance=5.5
            space.region_3d.view_rotation=Vector((1,-1,.22)).to_track_quat('Z','Y')
            space.region_3d.view_perspective='ORTHO'
            space.overlay.show_floor=False
bpy.context.scene['operating_constraint']='Owner authorized direct desktop control for sculpt correction'
bpy.context.scene['stage']='M1-r07 viewport sculpt preparation; no geometric changes yet'
target=out/'ashfang-viewport-start.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True)
report={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'preparedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'geometryEdited':False,'ownerAccepted':False}
(out/'viewport-preparation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
