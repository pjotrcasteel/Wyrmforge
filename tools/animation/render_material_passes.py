"""Export source-evaluated unlit albedo, camera-basis normal and emission.

No RGB-derived normals. One Blender scene, same rig/action/camera/frame for
all material passes. Depth/caster geometry remains a separate open gate.
"""
import bpy,sys,argparse,math,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--out',required=True);p.add_argument('--clips',default='walk,attack');p.add_argument('--directions',default='N,NE,E,SE,S,SW,W,NW');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.source).resolve()))
source_manifest=json.loads((Path(a.source).resolve().parent/'source-manifest.json').read_text())
scene=bpy.context.scene;rig=bpy.data.objects['Hollow editable animation rig'];actor=bpy.data.objects['Hollow skinned character'];view=bpy.data.objects['AN unanimated view']
# Keep the saved source sampling. Changing sample count changes silhouette-edge
# coverage and prevents exact albedo/normal/emission/source alpha agreement.
scene.cycles.device='CPU'
out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
original=list(actor.data.materials)
materials={}
for mode in ['albedo','normal','emissive']:
    result=[]
    for material in original:
        m=material.copy();m.name='AN '+mode;tree=m.node_tree
        output=next(n for n in tree.nodes if n.type=='OUTPUT_MATERIAL')
        for link in list(output.inputs['Surface'].links):tree.links.remove(link)
        emission=tree.nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
        tree.links.new(emission.outputs[0],output.inputs['Surface'])
        if mode=='albedo':
            bsdf=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
            if bsdf.inputs['Base Color'].is_linked:tree.links.new(bsdf.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
            else:emission.inputs['Color'].default_value=bsdf.inputs['Base Color'].default_value
        elif mode=='normal':
            geometry=tree.nodes.new('ShaderNodeNewGeometry');transform=tree.nodes.new('ShaderNodeVectorTransform');transform.vector_type='NORMAL';transform.convert_from='WORLD';transform.convert_to='CAMERA'
            tree.links.new(geometry.outputs['Normal'],transform.inputs['Vector'])
            mapping=tree.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY_ADD';mapping.inputs[1].default_value=(.5,.5,.5);mapping.inputs[2].default_value=(.5,.5,.5)
            tree.links.new(transform.outputs[0],mapping.inputs[0]);tree.links.new(mapping.outputs[0],emission.inputs['Color'])
        else:
            attribute=tree.nodes.new('ShaderNodeAttribute');attribute.attribute_name='hollow_inner_fire'
            colour=tree.nodes.new('ShaderNodeMixRGB');colour.blend_type='MULTIPLY';colour.inputs[0].default_value=1;colour.inputs[2].default_value=(1,.23,.018,1)
            tree.links.new(attribute.outputs['Fac'],colour.inputs[1]);tree.links.new(colour.outputs[0],emission.inputs['Color'])
        result.append(m)
    materials[mode]=result
front=math.atan2(-3.2,2.2)+math.pi/2
for clip in a.clips.split(','):
    rig.animation_data.action=bpy.data.actions['AN1_'+clip+'_supported_v1']
    for row,direction in enumerate(['N','NE','E','SE','S','SW','W','NW']):
        if direction not in a.directions.split(','):continue
        view.rotation_euler.z=front+math.pi-row*math.pi/4
        for index in range(source_manifest['clips'][clip]['frames']):
            scene.frame_set(index+1)
            for mode in materials:
                for slot,m in enumerate(materials[mode]):actor.data.materials[slot]=m
                scene.view_settings.view_transform='Raw' if mode=='normal' else 'Standard'
                folder=out/mode/clip/direction;folder.mkdir(parents=True,exist_ok=True)
                scene.render.filepath=str(folder/f'{index:02d}.png');bpy.ops.render.render(write_still=True)
        print('AN_MATERIAL',clip,direction,flush=True)
print('AN_MATERIAL_OUTPUT',str(out),flush=True)
