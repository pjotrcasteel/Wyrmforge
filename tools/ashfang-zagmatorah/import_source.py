"""Read-only source import, dependency recovery, and compact Blender inventory.
Run: blender -b --factory-startup --python import_source.py -- --source DIR --output NEW_DIR
"""
import argparse, hashlib, json, math, shutil, sys
from pathlib import Path
import bpy, bmesh


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()


def inventory():
    report = {'blender': bpy.app.version_string, 'objects': [], 'actions': [], 'images': [], 'materials': []}
    for ob in bpy.data.objects:
        item = {'name': ob.name, 'type': ob.type, 'dimensions': list(ob.dimensions)}
        if ob.type == 'MESH':
            mesh = ob.data
            mesh.calc_loop_triangles()
            bm = bmesh.new(); bm.from_mesh(mesh)
            item.update(vertices=len(mesh.vertices), polygons=len(mesh.polygons), triangles=len(mesh.loop_triangles),
                        uvMaps=[u.name for u in mesh.uv_layers],
                        boundaryEdges=sum(e.is_boundary for e in bm.edges),
                        nonManifoldEdges=sum(not e.is_manifold for e in bm.edges),
                        finite=all(math.isfinite(c) for v in mesh.vertices for c in v.co),
                        unweightedVertices=sum(not len(v.groups) for v in mesh.vertices),
                        vertexGroups=[g.name for g in ob.vertex_groups],
                        materials=[s.material.name if s.material else None for s in ob.material_slots],
                        armatures=[m.object.name if m.object else None for m in ob.modifiers if m.type == 'ARMATURE'])
            bm.free()
        if ob.type == 'ARMATURE':
            item['bones'] = [{'name': b.name, 'parent': b.parent.name if b.parent else None,
                              'head': list(b.head_local), 'tail': list(b.tail_local), 'deform': b.use_deform} for b in ob.data.bones]
            item['constraints'] = [{'bone': b.name, 'constraints': [c.type for c in b.constraints]} for b in ob.pose.bones if b.constraints]
        report['objects'].append(item)
    for a in bpy.data.actions:
        report['actions'].append({'name': a.name, 'frames': list(a.frame_range)})
    for img in bpy.data.images:
        if img.source == 'FILE':
            report['images'].append({'name': img.name, 'path': img.filepath, 'size': list(img.size),
                                     'packed': bool(img.packed_file), 'exists': Path(bpy.path.abspath(img.filepath)).is_file()})
    for mat in bpy.data.materials:
        report['materials'].append({'name': mat.name, 'textures': [n.image.name for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if mat.use_nodes else []})
    return report


if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--source', required=True); p.add_argument('--output', required=True)
    args = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source, out = Path(args.source).resolve(), Path(args.output).resolve()
    if out.exists(): raise SystemExit('Refusing to overwrite an immutable import directory')
    fbx = source / 'source/Zagmatorah.fbx'
    if not fbx.is_file(): raise SystemExit('Expected source/Zagmatorah.fbx')
    out.mkdir(parents=True)
    shutil.copytree(source, out / 'original/download')
    manifest = [{'path': str(f.relative_to(source)), 'bytes': f.stat().st_size, 'sha256': sha(f)} for f in sorted(source.rglob('*')) if f.is_file()]
    (out / 'source-checksums.json').write_text(json.dumps(manifest, indent=2))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(out / 'original/download/source/Zagmatorah.fbx'), use_image_search=True)
    textures = out / 'original/download/textures'
    for img in bpy.data.images:
        match = textures / Path(img.filepath.replace('\\', '/')).name
        if img.source == 'FILE' and match.is_file(): img.filepath = str(match); img.reload()
    bpy.context.view_layer.update()
    report = inventory()
    (out / 'import-inventory.json').write_text(json.dumps(report, indent=2))
    # No shading, geometry, rig, action or pose edits in this preserved conversion.
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'original/zagmatorah-original-import.blend'), compress=True)
    (out / 'master').mkdir()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'master/ashfang-master-working.blend'), compress=True)
    (out / 'native-checksums.json').write_text(json.dumps({str(f.relative_to(out)): sha(f) for f in out.rglob('*.blend')}, indent=2))
    print('ASHFANG_IMPORT', json.dumps({'objects': len(report['objects']), 'actions': len(report['actions']), 'images': len(report['images'])}))
