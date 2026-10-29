import argparse,json,sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve()
if out.exists():raise SystemExit('Review exists')
out.mkdir(parents=True);scene=bpy.context.scene;scene.camera=bpy.data.objects['Cranial detail camera'];scene.cycles.samples=32;scene.render.resolution_x=1000;scene.render.resolution_y=750
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';key=bpy.data.objects['Zagmatorah'].data.shape_keys.key_blocks['Ashfang recessed eye globes'];shader=bpy.data.materials['DragonEye'].node_tree.nodes.get('Principled BSDF')
variants=[]
for value in (0,.25,.5):
 key.value=value;shader.inputs['Emission Strength'].default_value=2.5;scene.render.filepath=str(out/('recess-'+str(value)+'.png'));bpy.ops.render.render(write_still=True);variants.append({'recess':value,'eyeEmission':2.5,'file':scene.render.filepath})
(out/'variants.json').write_text(json.dumps(variants,indent=2))
