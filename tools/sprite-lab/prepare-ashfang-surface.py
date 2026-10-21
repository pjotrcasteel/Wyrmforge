"""Export bind surface and install a seam-aware baked atlas, preserving animation."""
from pathlib import Path
import sys, json, shutil
import bpy
import numpy as np

args=sys.argv[sys.argv.index('--')+1:]; mode=args[0]; source=Path(args[1]); target=Path(args[2])
bpy.ops.wm.open_mainfile(filepath=str(source/'ashfang-rigged.blend'))
obj=next(o for o in bpy.data.objects if o.type=='MESH' and o.data.uv_layers)
if mode=='prepare':
    target.mkdir(exist_ok=False)
    s=np.load(source/'walk-samples.npz'); faces=s['faces']; labels=s['semanticLabels']
    rest=np.array([v.co[:] for v in obj.data.vertices],dtype=np.float32)
    # Connected authored parts get independent box charts. Vertex topology is untouched.
    parent=np.arange(len(rest))
    def root(a):
        while parent[a]!=a: parent[a]=parent[parent[a]]; a=parent[a]
        return a
    for a,b,c in faces:
        for q in (b,c): parent[root(q)]=root(a)
    component=np.array([root(i) for i in range(len(rest))]); normals=np.cross(rest[faces[:,1]]-rest[faces[:,0]],rest[faces[:,2]]-rest[faces[:,0]])
    axis=abs(normals).argmax(1); side=(normals[np.arange(len(faces)),axis]>0).astype(int)
    keys=np.stack([component[faces[:,0]],axis,side],1); unique,inverse=np.unique(keys,axis=0,return_inverse=True)
    grid=int(np.ceil(np.sqrt(len(unique)))); cell=128; size=grid*cell; uv=np.zeros((len(faces),3,2),np.float32)
    for i,(part,ax,sign) in enumerate(unique):
        mask=inverse==i; coords=rest[faces[mask]][:,:,[j for j in range(3) if j!=ax]]
        lo=coords.min((0,1)); span=np.maximum(coords.max((0,1))-lo,.00001)
        uv[mask]=((coords-lo)/span*(cell-8)+4+np.array([i%grid,i//grid])*cell)/size
    np.savez_compressed(target/'surface-bind.npz',positions=rest,faces=faces,uv=uv.reshape(-1,2),uvFaces=np.arange(len(faces)*3).reshape(-1,3),semanticLabels=labels,components=component,size=size)
    for p in source.glob('*'):
        if p.is_file() and p.suffix not in ('.blend','.npz') and p.name!='ashfang-albedo.png': shutil.copy2(p,target/p.name)
    for p in source.glob('*-samples.npz'):
        old=np.load(p); data={k:old[k] for k in old.files}; data.update(uv=uv.reshape(-1,2),uvFaces=np.arange(len(faces)*3).reshape(-1,3)); np.savez_compressed(target/p.name,**data)
    (target/'surface-charts.json').write_text(json.dumps(dict(charts=len(unique),size=size,padding=4,geometryChanged=False),indent=2))
else:
    s=np.load(target/'surface-bind.npz'); uvs=s['uv']; faces=s['faces']; layer=obj.data.uv_layers.active
    assert len(obj.data.polygons)==len(faces)
    for p in obj.data.polygons:
        assert list(p.vertices)==list(faces[p.index])
        for j,loop in enumerate(p.loop_indices): layer.data[loop].uv=uvs[p.index*3+j]
    image=bpy.data.images.load(str(target/'ashfang-albedo.png'),check_existing=False); image.pack()
    for material in obj.data.materials:
        if material and material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type=='TEX_IMAGE': node.image=image
    # Keep the authored fire editable in Blender, not only in preview exports.
    # Each action has a separate, named collection; walk is initially visible.
    fire_material=bpy.data.materials.new('Ashfang living fire');fire_material.use_nodes=True
    nodes=fire_material.node_tree.nodes;nodes.clear();attribute=nodes.new('ShaderNodeVertexColor');attribute.layer_name='FireColor'
    emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
    output=nodes.new('ShaderNodeOutputMaterial');fire_material.node_tree.links.new(attribute.outputs['Color'],emission.inputs['Color']);fire_material.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
    for path in target.glob('body-fire-*-samples.npz'):
        clip=path.name[len('body-fire-'):-len('-samples.npz')];data=np.load(path);points=data['positions'];tri=data['faces']
        collection=bpy.data.collections.new('Body fire source / '+clip);bpy.context.scene.collection.children.link(collection);collection.hide_render=clip!='walk';collection.hide_viewport=clip!='walk'
        mesh=bpy.data.meshes.new('Fire volumes / '+clip);mesh.from_pydata(points[0].tolist(),[],tri.tolist());mesh.update();fire=bpy.data.objects.new('Animated fire / '+clip,mesh);collection.objects.link(fire);mesh.materials.append(fire_material)
        color=mesh.vertex_colors.new(name='FireColor')
        for loop in mesh.loops: color.data[loop.index].color=(*data['colors'][0,loop.vertex_index],1)
        fire.shape_key_add(name='Basis')
        for frame in range(1,len(points)):
            key=fire.shape_key_add(name=f'{clip} {frame:03d}');key.data.foreach_set('co',points[frame].ravel());key.value=0;key.keyframe_insert('value',frame=frame);key.value=1;key.keyframe_insert('value',frame=frame+1);key.value=0;key.keyframe_insert('value',frame=frame+2)
        if mesh.shape_keys.animation_data:
            mesh.shape_keys.animation_data.action.name='Body fire / '+clip
            for curve in mesh.shape_keys.animation_data.action.fcurves:
                for keyframe in curve.keyframe_points:keyframe.interpolation='LINEAR'
        fire['source_clip']=clip;fire['presentation_only']=True
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(target/'ashfang-rigged.blend'),compress=True)
print(mode, str(target),flush=True)
