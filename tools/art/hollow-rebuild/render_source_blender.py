#!/usr/bin/env python3
"""Real Blender 4.5 LTS render + editable source from independent Hollowed H1 GLB.

ART-ONLY: imports newly-authored GLB. No other WyrmForge assets, no animation
engine, no renderer patches, no game or gameplay changes. Blender render proof
is separate from (and visually stronger evidence than) VTK previews.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import bpy
from mathutils import Vector
from PIL import Image, ImageDraw


def aim(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()


def make_material(name,color,emission=False):
    m=bpy.data.materials.new(name);m.use_nodes=True
    nodes=m.node_tree.nodes
    shader=nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=.89
    if emission:
        shader.inputs['Emission Color'].default_value=(*color,1)
        shader.inputs['Emission Strength'].default_value=1
    return m


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--input',required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args()
    source=Path(args.input).resolve()
    out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
    if not source.is_file():raise FileNotFoundError(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    bodies=[obj for obj in bpy.data.objects if obj.type=='MESH']
    if not bodies:raise RuntimeError('Real mesh required; source GLB contains no 3D geometry')
    # Original object and material names are preserved for source editability.
    for obj in bodies:
        for polygon in obj.data.polygons:polygon.use_smooth=True
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.render.resolution_x=400
    scene.render.resolution_y=490
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=False
    scene.camera=None
    try:scene.view_settings.view_transform='AgX'
    except TypeError:pass
    world=bpy.data.worlds.new('Hollowed neutral clay studio')
    scene.world=world;world.use_nodes=True
    bg=world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value=(.08,.08,.093,1)
    bg.inputs['Strength'].default_value=.45
    camd=bpy.data.cameras.new('H1 eight-view source orthographic camera')
    camera=bpy.data.objects.new('H1 camera',camd)
    scene.collection.objects.link(camera);scene.camera=camera
    camd.type='ORTHO';camd.ortho_scale=3.93
    for name,xyz,power,size in [
        ('Neutral clay key',(-3,-5,7),580,4),
        ('Distant neutral rim',(3,3,6),350,4),
    ]:
        ld=bpy.data.lights.new(name,'AREA')
        lo=bpy.data.objects.new(name,ld);scene.collection.objects.link(lo)
        lo.location=xyz;aim(lo,(0,0,1.80));ld.energy=power;ld.shape='DISK';ld.size=size
    clay=make_material('H1 neutral clay: no glow',(.59,.57,.54))
    black=make_material('H1 absolute silhouette',(.016,.016,.016),emission=True)
    # Source file includes imported editable mesh and named material objects.
    scene.view_layers[0].material_override=None
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'hollowed-source-h1.blend'))
    views={
       'front':(0,-8,2.25),
       'threequarter':(-5,-7,2.8),
       'profile':(-8,-.1,2.25),
       'back':(0,8,2.25),
    }
    review={}
    for style in ('clay','material','silhouette'):
        scene.view_layers[0].material_override={
            'clay':clay,'material':None,'silhouette':black
        }[style]
        bg.inputs['Color'].default_value=(.84,.84,.84,1) if style=='silhouette' else (.08,.08,.093,1)
        pages=[]
        for view,eye in views.items():
            camera.location=eye;aim(camera,(0,-.32,1.72))
            target=out/f'{style}-{view}.png'
            scene.render.filepath=str(target)
            bpy.ops.render.render(write_still=True)
            image=Image.open(target).convert('RGB')
            ImageDraw.Draw(image).text((10,10),f'{view.upper()} | BLENDER SOURCE / {style}',fill=(20,20,20) if style=='silhouette' else (237,234,228))
            pages.append(image)
        full=Image.new('RGB',(400*len(pages),490),(30,30,30))
        for i,img in enumerate(pages):full.paste(img,(400*i,0))
        full.save(out/f'{style}-4views-BLENDER.png')
        full.resize((96*len(pages),118),Image.Resampling.BOX).save(out/f'{style}-native96-BLENDER.png')
        review[style]=[f'{style}-{x}.png' for x in views]
    # Saved source does not contain temporary review-only clay material override.
    scene.view_layers[0].material_override=None
    counts={obj.name:len(obj.data.polygons) for obj in bodies}
    (out/'blender-qc.json').write_text(json.dumps({
        'status':'H1 ORIGINAL 3D SOURCE REVIEW, NOT ART APPROVED',
        'blender_version':bpy.app.version_string,
        'blend':'hollowed-source-h1.blend',
        'mesh_objects':len(bodies),'triangles_total':sum(counts.values()),
        'mesh_polygon_count_by_object':counts,
        'review':review,'engine_modified':False,'runtime_modified':False,
        'source':source.name,
    },indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
