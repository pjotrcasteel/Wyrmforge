"""Reversible first Ashfang surface and proportion study; no rig/animation replacement."""
import argparse, json, sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser(); p.add_argument('--config',required=True); p.add_argument('--output',required=True); a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
c=json.loads(Path(a.config).read_text()); out=Path(a.output).resolve()
if out.exists(): raise SystemExit('Refusing to overwrite a milestone')
out.mkdir(parents=True)
source=Path(bpy.data.filepath); mesh=bpy.data.objects['Zagmatorah']; rig=bpy.data.objects['Zahmatorah_Skeleton']
rig.data.pose_position='REST'
mesh.shape_key_add(name='Basis'); shape=mesh.shape_key_add(name='Ashfang shoulder neck and crown study')
mask=mesh.data.attributes.new('AshfangHeat','FLOAT','POINT')
groups={g.index:g.name for g in mesh.vertex_groups}
for v in mesh.data.vertices:
    w={groups[g.group]:g.weight for g in v.groups}
    shoulder=sum(value for name,value in w.items() if name in ('Spine01','Shoulder_l','Shoulder_r'))
    neck=sum(value for name,value in w.items() if name.startswith('Neck'))
    head=sum(w.get(name,0) for name in ('Head','UpperHead'))
    co=v.co.copy(); co+=v.normal*(shoulder*c['shoulderInflation']+neck*c['neckInflation'])
    co.y*=1+(c['headWidth']-1)*head
    # Crown growth only above skull; jaw and eyeball weights excluded.
    if co.z>3.6: co.z+=(co.z-3.6)*(c['hornGrowth']-1)*head
    shape.data[v.index].co=co
    mask.data[v.index].value=min(1, .13+.75*shoulder+.62*neck+.5*head)
shape.value=1
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    nt=mat.node_tree; n=nt.nodes; l=nt.links
    bsdf=next(x for x in n if x.type=='BSDF_PRINCIPLED')
    original=bsdf.inputs['Base Color'].links[0].from_socket if bsdf.inputs['Base Color'].is_linked else None
    tint=n.new('ShaderNodeMixRGB'); tint.name='Ashfang charred source pigment'; tint.blend_type='MULTIPLY'; tint.inputs[0].default_value=1
    tint.inputs[2].default_value=(.018,.013,.012,1) if 'Wing' not in mat.name else (.22,.045,.018,1)
    if original:l.new(original,tint.inputs[1])
    l.new(tint.outputs[0],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=.88
    bsdf.inputs['Specular IOR Level'].default_value=.16
    bsdf.inputs['Metallic'].default_value=0
    # Preserve UV texture normal and opacity connections; object-space fissures deform with mesh.
    tex=n.new('ShaderNodeTexCoord'); vor=n.new('ShaderNodeTexVoronoi'); vor.feature='DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value=c['fractureScale']; "l.new(tex.outputs['Object'],vor.inputs['Vector'])
    warp=n.new('ShaderNodeTexNoise'); warp.inputs['Scale'].default_value=2.1; warp.inputs['Detail'].default_value=3.0; l.new(tex.outputs['Object'],warp.inputs['Vector'])
    add=n.new('ShaderNodeVectorMath'); add.operation='ADD'; l.new(tex.outputs['Object'],add.inputs[0]); l.new(warp.outputs['Color'],add.inputs[1]); l.new(add.outputs[0],vor.inputs['Vector'])"
    ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.008; ramp.color_ramp.elements[0].color=(1,1,1,1); ramp.color_ramp.elements[1].position=c['fractureWidth']; ramp.color_ramp.elements[1].color=(0,0,0,1); l.new(vor.outputs['Distance'],ramp.inputs[0])
    attr=n.new('ShaderNodeAttribute'); attr.attribute_name='AshfangHeat'
    mult=n.new('ShaderNodeMath'); mult.operation='MULTIPLY'; l.new(ramp.outputs[0],mult.inputs[0]); l.new(attr.outputs['Fac'],mult.inputs[1])
    power=n.new('ShaderNodeMath'); power.operation='MULTIPLY'; power.inputs[1].default_value=c['emissionStrength']*(.22 if 'Wing' in mat.name else 1); "l.new(mult.outputs[0],power.inputs[0])
    patch=n.new('ShaderNodeTexNoise'); patch.inputs['Scale'].default_value=1.1; patch.inputs['Detail'].default_value=2; l.new(tex.outputs['Object'],patch.inputs['Vector'])
    select=n.new('ShaderNodeMapRange'); select.inputs['From Min'].default_value=.49; select.inputs['From Max'].default_value=.65; l.new(patch.outputs['Fac'],select.inputs['Value'])
    selective=n.new('ShaderNodeMath'); selective.operation='MULTIPLY'; l.new(mult.outputs[0],selective.inputs[0]); l.new(select.outputs['Result'],selective.inputs[1]); l.new(selective.outputs[0],power.inputs[0])"
    bsdf.inputs['Emission Color'].default_value=(1,.075,.003,1); l.new(power.outputs[0],bsdf.inputs['Emission Strength'])
    if 'Eye' in mat.name:
        for link in list(bsdf.inputs['Emission Strength'].links): l.remove(link)
        bsdf.inputs['Emission Strength'].default_value=2.5
rig.data.pose_position='POSE'
(out/'config.json').write_text(json.dumps(c,indent=2))
bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True)
(out/'candidate-report.json').write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),'candidateSha256':sha(out/'ashfang-master-working.blend'),'changes':['Reversible weighted shoulder/neck inflation and crown shape key','Charred source albedo tint, retained normals and opacity','Anatomically weighted procedural fracture emission, provisional pattern'],'limitations':['Wyvern anatomy differs from approved four-legged card','No animated source actions','Procedural fissure pattern requires authored art review','Not deformation validated or owner accepted'],'config':c},indent=2))

