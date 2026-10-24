"""Export original #307 oak geometry; preserve editable source, do not bake lighting.
Run: blender -b --python tools/art/export-lighting-oak.py
"""
import importlib.util
import json
import struct
from pathlib import Path
import bpy
root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('original', Path(__file__).parent/'lighting-source/step3_wet_forest.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
original.build_tree(original.ASSETS['ancient_oak'])
original.setup_camera(8.4)
source = root/'art/source/environment/lighting-proof/ancient-oak.blend'
source.parent.mkdir(parents=True, exist_ok=True)
if source.exists():
    raise RuntimeError('Refusing to overwrite editable source')
bpy.ops.wm.save_as_mainfile(filepath=str(source))
groups = {}
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    matrix = obj.matrix_world
    normal_matrix = matrix.to_3x3().inverted().transposed()
    for tri in mesh.loop_triangles:
        mat = obj.data.materials[tri.material_index]
        bucket = groups.setdefault(mat.name, {'vertices': [], 'material': mat})
        for vertex in tri.vertices:
            p = matrix @ mesh.vertices[vertex].co
            n = (normal_matrix @ mesh.vertices[vertex].normal).normalized()
            bucket['vertices'].extend([*p, *n])
    evaluated.to_mesh_clear()
out = root/'src/Wyrmforge.Presentation.Web/wwwroot/art/lighting-proof'
out.mkdir(parents=True, exist_ok=True)
buffer = bytearray()
manifest = {'source': '#307 @ 8c963f8351a758b0fb468fd1340088ff7b904abf',
    'approval': 'original-candidate-not-approved', 'geometry': 'original layered leaf meshes (not alpha cards)',
    'stride': 6, 'groups': []}
for index, (name, bucket) in enumerate(groups.items()):
    ramp = next((n for n in bucket['material'].node_tree.nodes if n.type == 'VALTORGB'), None)
    linear = [(ramp.color_ramp.elements[0].color[i]+ramp.color_ramp.elements[-1].color[i])/2 for i in range(3)] if ramp else [.15]*3
    srgb = [12.92*v if v <= .0031308 else 1.055*v**(1/2.4)-.055 for v in linear]
    color = '#'+''.join(f'{round(max(0,min(1,v))*255):02x}' for v in srgb)
    vertices = bucket['vertices']
    manifest['groups'].append({'id': f'oak-{index}', 'sourceMaterial': name, 'byteOffset': len(buffer),
        'vertexCount': len(vertices)//6, 'color': color})
    buffer.extend(struct.pack('<'+'f'*len(vertices), *vertices))
(out/'oak.bin').write_bytes(buffer)
(out/'oak.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('Exported original oak:', len(buffer), 'bytes;', len(groups), 'material groups')
