"""Read existing rigs: export body ownership and attachment data, no new poses/art."""
import bpy, sys, json
from pathlib import Path
import numpy as np
from mathutils import Vector

root=Path(sys.argv[sys.argv.index('--')+1])
model=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
out=model/'layer-metadata-v1';out.mkdir(exist_ok=False)
landmarks={}
for clip,folder,file in [('walk','rigged-pixel-v3','hollow-rigged.blend'),('attack','rigged-attack-v2','hollow-attack.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(model/folder/file))
    rig=bpy.data.objects['Hollow editable animation rig']
    character=bpy.data.objects['Hollow skinned character']
    if clip=='walk':
        upper=[]
        for vertex in character.data.vertices:
            weight=0
            for g in vertex.groups:
                name=character.vertex_groups[g.group].name
                if name.startswith(('head','neck','chest','spine','clavicle','upper_arm','forearm','hand')):weight+=g.weight
                elif name=='pelvis':weight+=g.weight*max(0,min(1,(vertex.co.z+.065)/.055))
            upper.append(weight)
        np.savez_compressed(out/'body-ownership.npz',upper=np.array(upper,dtype=np.float32))
    samples=[]
    for frame in range(1,17):
        bpy.context.scene.frame_set(frame)
        pelvis=rig.pose.bones['pelvis'].matrix@rig.data.bones['pelvis'].matrix_local.inverted()
        samples.append(dict(attachment=list(pelvis@Vector((0,.01,-.038))),
            joints={name:list(rig.pose.bones[name].head) for name in ['pelvis','chest','head','upper_arm.L','upper_arm.R','hand.L','hand.R']}))
    landmarks[clip]=samples
(out/'landmarks.json').write_text(json.dumps(landmarks,separators=(',',':'))+'\n')
print('Extracted original skin ownership and 32 existing pose attachments; no color sprites written',flush=True)
