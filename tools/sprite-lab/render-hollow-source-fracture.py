"""Render an isolated source-mesh Hollowed fracture proof, never production art.

Use the approved no-cape .blend and existing skinned death action. At fracture
the original evaluated mesh is grouped by real bone weights; seven identifiable
3D anatomical regions receive restrained, keyed and floor-clamped motion.
No generated pixel glyphs, random velocities, 2D cutouts, shader changes or C#.
Requires Blender 4.5 + Pillow; outputs require real owner visual acceptance.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-death-no-cape-standard/hollow-death.blend'
OUT = ROOT / 'artifacts/hollow-source-fracture'
FPS, FRAMES, CELL, SPLIT_FRAME = 12, 24, 128, 7
FLOOR = -0.5
DIRECTIONS = ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')
SOURCE_YAW = math.degrees(math.atan2(-3.2, 2.2)) + 90
PARTS = ('skull', 'thorax', 'pelvis', 'arm.L', 'arm.R', 'leg.L', 'leg.R')
# These restrained source-model-unit cues are art-direction data, not RNG.
# Large ribcage/pelvis fragments retain mass; head remains one recognizable piece.
MOTION = {
    # Keyframed release speeds are world units/s. Long-distance scatter
    # looks like flying confetti; preserve a central heavy thorax and pelvis.
    'skull': ((.05, -.22, 1.35), (.15, -.27, .14)),
    'thorax': ((.01, .08, .44), (-.16, .21, -.12)),
    'pelvis': ((0, .04, .23), (.06, -.13, .10)),
    'arm.L': ((1.04, -.22, .88), (.16, .39, .61)),
    'arm.R': ((-1.02, .14, .85), (-.17, -.38, -.59)),
    'leg.L': ((.60, .35, .62), (.16, -.26, .39)),
    'leg.R': ((-.65, .28, .58), (-.12, .23, -.37)),
}
parser = argparse.ArgumentParser()
parser.add_argument('--directions', choices=('S', 'all'), default='S')
args = parser.parse_args()
selected = DIRECTIONS if args.directions == 'all' else ('S',)
OUT.mkdir(parents=True, exist_ok=True)
if not SOURCE.is_file() or SOURCE.stat().st_size < 100_000:
    raise FileNotFoundError('Real editable Hollowed .blend required, not LFS pointer or substitute art')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects['Hollow editable animation rig']
character = bpy.data.objects['Hollow skinned character']
assert scene.camera and scene.camera.data.type == 'ORTHO'
assert len(character.data.polygons) > 1000
assert any(m.type == 'ARMATURE' and m.object == rig for m in character.modifiers)
assert rig.animation_data and rig.animation_data.action
assert 'Death' in rig.animation_data.action.name

def region_for_bone(name):
    if name.startswith(('head', 'neck')):
        return 'skull'
    if name.startswith(('chest', 'spine', 'clavicle')):
        return 'thorax'
    if name.startswith(('pelvis', 'root', 'cloth')):
        return 'pelvis'
    for side in ('L', 'R'):
        if name.endswith('.' + side):
            if name.startswith(('upper_arm', 'forearm', 'hand')):
                return 'arm.' + side
            if name.startswith(('thigh', 'shin', 'foot')):
                return 'leg.' + side
    return 'thorax'

# Freeze the source character's already-skinned 3D mesh at the fracture impact.
scene.frame_set(SPLIT_FRAME)
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
evaluated = character.evaluated_get(deps)
mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=deps)
assert len(mesh.polygons) == len(character.data.polygons)
assert len(mesh.vertices) == len(character.data.vertices), 'Topology-changing modifier breaks vertex-group mapping'
group_regions = {group.index: region_for_bone(group.name) for group in character.vertex_groups}
assignment = []
for polygon in mesh.polygons:
    weights = Counter()
    for vertex_index in polygon.vertices:
        for group in character.data.vertices[vertex_index].groups:
            weights[group_regions.get(group.group, 'thorax')] += group.weight
    assignment.append(max(PARTS, key=lambda part: (weights[part], -PARTS.index(part))))
counts = Counter(assignment)
for part in PARTS:
    assert counts[part] >= 30, f'Cannot extract recognizable {part} from the actual mesh: {counts}'
assert sum(counts.values()) == len(mesh.polygons)

rig_from_character = rig.matrix_world.inverted() @ character.matrix_world
pieces = {}
for part in PARTS:
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    removed = [face for index, face in enumerate(bm.faces) if assignment[index] != part]
    bmesh.ops.delete(bm, geom=removed, context='FACES')
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
    isolated = bpy.data.meshes.new('Original Hollowed skinned 3D geometry: ' + part)
    bm.to_mesh(isolated)
    bm.free()
    for material in character.data.materials:
        isolated.materials.append(material)
    assert len(isolated.polygons) == counts[part], f'Lost actual skin geometry in {part}'
    for vertex in isolated.vertices:
        vertex.co = rig_from_character @ vertex.co
    origin = sum((vertex.co for vertex in isolated.vertices), Vector()) / len(isolated.vertices)
    for vertex in isolated.vertices:
        vertex.co -= origin
    obj = bpy.data.objects.new('Hollow fracture: ' + part, isolated)
    scene.collection.objects.link(obj)
    obj.parent = rig  # preserve true 3D projection for each directional view
    obj.location = origin
    obj.rotation_mode = 'XYZ'
    obj.hide_render = True
    obj.keyframe_insert('hide_render', frame=SPLIT_FRAME - 1)
    obj.hide_render = False
    obj.keyframe_insert('hide_render', frame=SPLIT_FRAME)
    pieces[part] = (obj, origin.copy())
evaluated.to_mesh_clear()
geometry_report = {
    'source': str(SOURCE.relative_to(ROOT)),
    'parts': {part: {'faces': counts[part],
                     'vertices': len(pieces[part][0].data.vertices),
                     'uvLayers': len(pieces[part][0].data.uv_layers),
                     'materials': [material.name if material else None for material in pieces[part][0].data.materials]}
              for part in PARTS}
}
assert all(item['vertices'] and item['uvLayers'] and item['materials']
           for item in geometry_report['parts'].values()), 'Loss of source mesh UV/material/geometry data'
(OUT / 'geometry-diagnostics.json').write_text(json.dumps(geometry_report, indent=2) + '\n')
character.hide_render = False
character.keyframe_insert('hide_render', frame=SPLIT_FRAME - 1)
character.hide_render = True
character.keyframe_insert('hide_render', frame=SPLIT_FRAME)

# Actual 3D keyed pieces; per-vertex floor collision (no bouncing floating glyphs).
for frame in range(SPLIT_FRAME, FRAMES + 1):
    time = (frame - SPLIT_FRAME) / FPS
    travel = (1 - math.exp(-3.5*time)) / 3.5
    turn = 1 - math.exp(-3*time)
    for part, (obj, origin) in pieces.items():
        velocity, angles = MOTION[part]
        obj.rotation_euler = tuple(component*turn for component in angles)
        obj.location = Vector((origin.x + velocity[0]*travel,
                               origin.y + velocity[1]*travel,
                               origin.z + velocity[2]*time - 1.9*time*time))
        rotation = obj.rotation_euler.to_matrix()
        lowest_vertex = min((rotation @ vertex.co).z for vertex in obj.data.vertices)
        obj.location.z = max(obj.location.z, FLOOR - lowest_vertex)
        obj.keyframe_insert('location', frame=frame)
        obj.keyframe_insert('rotation_euler', frame=frame)

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.render.film_transparent = True
scene.render.resolution_x = CELL
scene.render.resolution_y = CELL
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.frame_start = 1
scene.frame_end = FRAMES
scene.render.fps = FPS
baseline_yaw = rig.rotation_euler.z
manifest = {
    'schemaVersion': 1, 'actor': 'hollowed', 'clip': 'fracture',
    'ownerApproved': False, 'sourceGeometry': 'original-skinned-blender-mesh',
    'injury': 'standard', 'worldSize': 124, 'anchor': [64, 88],
    'directions': list(DIRECTIONS), 'atlases': {},
    'status': 'UNAPPROVED original-mesh fracture proof',
    'sourceRig': str(SOURCE.relative_to(ROOT)),
    'frames': FRAMES, 'fps': FPS, 'cell': CELL, 'splitFrame': SPLIT_FRAME,
    'parts': dict(counts), 'directionsRendered': list(selected),
    'geometrySource': 'evaluated no-cape Blender skin; original UVs and materials',
    'proceduralPixelBones': False, 'releasedToHunts': False
}
for direction in selected:
    row = DIRECTIONS.index(direction)
    rig.rotation_euler.z = baseline_yaw + math.radians(SOURCE_YAW + 180 - row*45)
    atlas = Image.new('RGBA', (FRAMES*CELL, CELL))
    poses = []
    bounds = []
    for frame in range(1, FRAMES + 1):
        scene.frame_set(frame)
        temp = OUT / f'_render_{direction}_{frame}.png'
        scene.render.filepath = str(temp)
        bpy.ops.render.render(write_still=True)
        frame_image = Image.open(temp).convert('RGBA')
        temp.unlink()
        box = frame_image.getbbox()
        if not box or min(box[:2]) <= 0 or max(box[2:]) >= CELL:
            raise ValueError(f'Empty or clipped actual geometry: {direction} frame {frame}: {box}')
        bounds.append(box)
        poses.append(frame_image)
        atlas.alpha_composite(frame_image, ((frame - 1)*CELL, 0))
    # A screenshot containing pixels is not necessarily valid: record how
    # much of the original silhouette survives the mesh cut at frame 7.
    from PIL import ImageChops
    before = poses[SPLIT_FRAME - 2].getchannel('A').point(lambda n: 255 if n > 30 else 0).convert('1')
    after = poses[SPLIT_FRAME - 1].getchannel('A').point(lambda n: 255 if n > 30 else 0).convert('1')
    overlap = sum(ImageChops.logical_and(before, after).getdata())
    covered = sum(ImageChops.logical_or(before, after).getdata())
    overlap_ratio = overlap / max(1, covered)
    manifest.setdefault('splitSilhouetteOverlap', {})[direction] = round(overlap_ratio, 4)
    if overlap_ratio < .36:
        raise ValueError(f'Source skin discontinuity at disassembly: {direction} {overlap_ratio:.3f}')
    atlas_path = OUT / f'fracture-{direction}.png'
    atlas.save(atlas_path, optimize=True)
    checksum = hashlib.sha256(atlas_path.read_bytes()).hexdigest()
    manifest.setdefault('atlasHashes', {})[direction] = checksum
    manifest['atlases'][direction] = {'file': atlas_path.name, 'sha256': checksum}
    manifest.setdefault('boundingBoxes', {})[direction] = bounds
    samples = (0, 3, 5, 6, 7, 9, 12, 17, 23)
    sheet = Image.new('RGBA', (len(samples)*(CELL+12), CELL+36), (18, 21, 24, 255))
    pen = ImageDraw.Draw(sheet)
    for col, index in enumerate(samples):
        sheet.alpha_composite(poses[index], (col*(CELL+12)+6, 24))
        pen.text((col*(CELL+12)+4, 4), f'{index/FPS:.2f}s', fill=(222, 219, 203))
    sheet.resize((sheet.width*2, sheet.height*2), Image.Resampling.NEAREST).convert('RGB').save(
        OUT / f'fracture-{direction}-contact-sheet.png')
    gif_frames = [frame.resize((CELL*4, CELL*4), Image.Resampling.NEAREST) for frame in poses]
    gif_frames[0].save(OUT / f'fracture-{direction}.gif', save_all=True,
                       append_images=gif_frames[1:], duration=round(1000/FPS), loop=0)
    print(f'Source-derived Hollowed fracture: {direction}: {FRAMES} frames / {len(PARTS)} parts', flush=True)

rig.rotation_euler.z = baseline_yaw
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'hollow-source-fracture-UNAPPROVED.blend'))
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Unapproved 3D proof only; no production atlas or gameplay changes.', flush=True)
