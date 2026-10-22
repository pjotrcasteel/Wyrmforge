"""Blender-native source inspection and neutral review; no silent placeholder stages.

blender -b INPUT --disable-autoexec --python tools/ashfang/pipeline.py --
  validate|review|benchmark|audit --output NEW_DIR --revision LABEL [--profile clay]
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

p=argparse.ArgumentParser()
p.add_argument('operation',choices=['audit','validate','review','benchmark','bake','render','export','pack'])
p.add_argument('--output',required=True)
p.add_argument('--revision',required=True)
p.add_argument('--profile',choices=['clay'],default='clay')
p.add_argument('--resolution',type=int,default=1024)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
if a.operation in ('bake','render','export','pack'):
    raise SystemExit(f'{a.operation} is unimplemented and gated by accepted model/rig; no placeholder outputs')
out=Path(a.output).resolve()
if out.exists():
    raise SystemExit('Output exists: immutable reviews require a new directory')
source=Path(bpy.data.filepath).resolve()
if not source.is_file():
    raise SystemExit('Open a saved native source first')
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
out.mkdir(parents=True)
report={'revision':a.revision,'operation':a.operation,'source':str(source),
        'sha256':source_hash,'blender':bpy.app.version_string,'ownerAccepted':False,
        'sourceOpened':True,'runtimeIntegrated':False,'objects':[], 'missingDependencies':[],
        'technicalPass':True,'limits':'Mesh format checks do not establish anatomy, deformation or motion quality.'}
for ob in bpy.data.objects:
    info={'name':ob.name,'type':ob.type}
    if ob.type=='MESH':
        import bmesh
        bm=bmesh.new()
        bm.from_mesh(ob.data)
        info.update(vertices=len(ob.data.vertices),polygons=len(ob.data.polygons),
                    boundaryEdges=sum(e.is_boundary for e in bm.edges),
                    nonManifoldEdges=sum(not e.is_manifold for e in bm.edges),
                    finite=all(math.isfinite(c) for v in ob.data.vertices for c in v.co))
        info['shapeKeys']=[key.name for key in ob.data.shape_keys.key_blocks] if ob.data.shape_keys else []
        info['shapeKeysFinite']=all(math.isfinite(c) for key in ob.data.shape_keys.key_blocks
            for point in key.data for c in point.co) if ob.data.shape_keys else True
        bm.free()
        info['armatureModifiers']=[m.object.name if m.object else None for m in ob.modifiers if m.type=='ARMATURE']
        if not info['finite'] or not info['shapeKeysFinite'] or not len(ob.data.vertices): report['technicalPass']=False
        if (ob.name=='Ashfang original primary skin' or 'integrated primary skin' in ob.name) and info['nonManifoldEdges']:
            report['technicalPass']=False
    report['objects'].append(info)
for image in bpy.data.images:
    if image.source=='FILE' and image.filepath and not image.packed_file:
        if not Path(bpy.path.abspath(image.filepath)).is_file():
            report['missingDependencies'].append(image.filepath)
report['technicalPass'] &= not report['missingDependencies']
report['actions']=[{'name':action.name,'frameRange':list(action.frame_range)} for action in bpy.data.actions]
report['rigs']=[{'name':o.name,'bones':len(o.data.bones)} for o in bpy.data.objects if o.type=='ARMATURE']

if a.operation in ('review','benchmark'):
    if not report['technicalPass']:
        (out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        raise SystemExit('Technical validation failed; inspect report before rendering')
    scene=bpy.context.scene
    scene.frame_set(1)
    visible=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
    points=[o.matrix_world@Vector(c) for o in visible for c in o.bound_box]
    low=Vector([min(v[i] for v in points) for i in range(3)])
    high=Vector([max(v[i] for v in points) for i in range(3)])
    center=(low+high)/2
    span=max(high-low)
    world=bpy.data.worlds.new('Original neutral review world')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.16,.16,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.55
    scene.world=world
    for name,position,power in [('Key',(-.7,-1.1,1.8),17000),('Fill',(1,-.2,.8),8000),('Rim',(.3,1.1,1.4),14000)]:
        light=bpy.data.lights.new('Review '+name,'AREA')
        light.energy=power
        light.size=span*.65
        ob=bpy.data.objects.new(light.name,light)
        scene.collection.objects.link(ob)
        ob.location=center+Vector(position)*span
        ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
    cam_data=bpy.data.cameras.new('Review orthographic camera')
    cam=bpy.data.objects.new(cam_data.name,cam_data)
    scene.collection.objects.link(cam)
    scene.camera=cam
    cam_data.type='ORTHO'
    cam_data.ortho_scale=span*1.18
    cam_data.clip_end=span*30
    scene.render.engine='CYCLES'
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'
    prefs.get_devices()
    for device in prefs.devices:
        device.use=device.type=='OPTIX' and '5090' in device.name
    if not any(d.use for d in prefs.devices):
        raise SystemExit('RTX 5090 OptiX unavailable; refusing silent fallback')
    scene.cycles.device='GPU'
    scene.cycles.samples=32
    scene.cycles.use_adaptive_sampling=True
    scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=a.resolution
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    report['render']={'device':'RTX 5090 OptiX','resolution':a.resolution,'samples':32,'views':[]}
    views=[('front',0,0),('side',90,0),('rear',180,0),('top',0,90),
           ('three-quarter-left',-45,25),('three-quarter-right',45,25),('game-elevated',45,34),
           ('game-extended',45,34),('game-jaw-closed',45,34),
           ('skull-side',90,8),('skull-three-quarter',45,12),('skull-jaw-closed',45,12)]
    if a.operation=='benchmark': views=views[:1]
    for index,(label,azimuth,elevation) in enumerate(views):
        for ob in bpy.data.objects:
            if ob.type=='MESH' and ob.data.shape_keys:
                for key in ob.data.shape_keys.key_blocks:
                    if key.name.startswith('Provisional relaxed digit'):
                        key.value=0 if label=='game-extended' else 1
                    if key.name=='M1 jaw closed study':
                        key.value=1 if label.endswith('jaw-closed') else 0
        bpy.context.view_layer.update()
        target=center
        if label.startswith('skull'):
            target=Vector(scene.get('camera_head_target',(0,-4.9,3.25)))
            cam_data.ortho_scale=4.8
        else:
            cam_data.ortho_scale=span*1.18
        az,el=math.radians(azimuth),math.radians(elevation)
        direction=Vector((math.sin(az)*math.cos(el),-math.cos(az)*math.cos(el),math.sin(el)))
        cam.location=target+direction*span*3
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(out/(label+'.png'))
        scene.render.film_transparent=label.startswith('game')
        # Review source preserves all geometry/materials; only scene setup added.
        if index==0:
            snapshot=out/'ashfang-review-scene.blend'
            bpy.ops.wm.save_as_mainfile(filepath=str(snapshot),compress=True)
            report['reviewSnapshot']={'path':str(snapshot),'sha256':hashlib.sha256(snapshot.read_bytes()).hexdigest()}
        start=time.perf_counter()
        bpy.ops.render.render(write_still=True)
        report['render']['views'].append({'label':label,'azimuthDegrees':azimuth,
            'elevationDegrees':elevation,'elapsedSeconds':time.perf_counter()-start})
if hashlib.sha256(source.read_bytes()).hexdigest()!=source_hash:
    raise RuntimeError('Original source changed during read/review')
(out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'report':str(out/'report.json'),'technicalPass':report['technicalPass']}))
if not report['technicalPass']: raise SystemExit(2)
