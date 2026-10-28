"""Actual source-mesh support patches, in armature rest space (metres).

A patch uses vertices fully owned by the declared contact bone and within a
quarter native source pixel of its lowest surface. This is a finite-resolution
support approximation, not a full rigid-body collision/contact simulation.
"""
from mathutils import Vector
from kinematics import convex_hull

def mesh_sole_patch(rig,actor,bone_name,units_per_pixel):
    if bone_name not in rig.data.bones or actor.vertex_groups.get(bone_name) is None:
        raise ValueError('Missing actual source contact bone: '+bone_name)
    group=actor.vertex_groups[bone_name].index
    to_rig=rig.matrix_world.inverted() @ actor.matrix_world
    owned=[(v.index,to_rig @ v.co) for v in actor.data.vertices
           if any(g.group==group and g.weight>=1-1e-6 for g in v.groups)]
    if len(owned)<3:raise ValueError('Contact requires a fully owned mesh surface: '+bone_name)
    floor=min(point.z for _,point in owned);band=units_per_pixel*.25
    patch=[(index,point) for index,point in owned if point.z<=floor+band]
    hull=convex_hull([point for _,point in patch])
    if len(hull)<3:raise ValueError('Degenerate actual mesh support patch: '+bone_name)
    twice_area=0;cx=cy=0
    for a,b in zip(hull,hull[1:]+hull[:1]):
        cross=a[0]*b[1]-b[0]*a[1];twice_area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross
    if twice_area<=1e-10:raise ValueError('Degenerate actual mesh support area: '+bone_name)
    center=Vector((cx/(3*twice_area),cy/(3*twice_area),floor))
    by_xy={}
    for index,point in patch:
        key=(point.x,point.y)
        if key not in by_xy or point.z<by_xy[key][1].z:by_xy[key]=(index,point)
    hull_vertices=[by_xy[tuple(point)] for point in hull]
    return {'bone':bone_name,'restContactPoint':list(center),
            'vertexIndices':[index for index,_ in patch],
            'hullVertexIndices':[index for index,_ in hull_vertices],
            'restHull':[list(point) for _,point in hull_vertices],
            'groundBandMetres':band,'minimumRestZ':floor,
            'definition':'actual fully-owned sole vertices within quarter native source pixel of lowest surface'}

def fit_upright_contact_bind(rig,actor,chains,units_per_pixel):
    """Offline upright-source repair using real weighted joint rings, not scaling
    the character. The content author selects chains; runtime has no such branch.
    Keeps mesh/UV/weights unchanged and fits knee/ankle XY at existing joint Z.
    """
    import bpy,statistics
    transform=rig.matrix_world.inverted() @ actor.matrix_world
    changes={};report=[]
    for chain in chains:
        upper,middle,end=(rig.data.bones[name] for name in chain)
        points={}
        for bone in [middle,end]:
            group=actor.vertex_groups[bone.name].index;z=bone.head_local.z
            band=[transform @ vertex.co for vertex in actor.data.vertices
                  if any(g.group==group and g.weight>.5 for g in vertex.groups)
                  and abs((transform @ vertex.co).z-z)<=units_per_pixel]
            if len(band)<3:raise ValueError('Insufficient actual joint-ring vertices: '+bone.name)
            points[bone.name]=Vector((statistics.median(p.x for p in band),statistics.median(p.y for p in band),z))
        patch=mesh_sole_patch(rig,actor,end.name,units_per_pixel)
        knee,ankle=points[middle.name],points[end.name]
        toe=Vector((*patch['restContactPoint'][:2],end.tail_local.z))
        changes[upper.name]=(upper.head_local.copy(),knee)
        changes[middle.name]=(knee,ankle)
        changes[end.name]=(ankle,toe)
        report.append({'bones':chain,'knee':list(knee),'ankle':list(ankle),'toe':list(toe),'meshVertexCount':len(actor.data.vertices)})
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,(head,tail) in changes.items():
        bone=rig.data.edit_bones[name];bone.head=head;bone.tail=tail
    bpy.ops.object.mode_set(mode='OBJECT')
    for bone in rig.pose.bones:bone.matrix_basis.identity()
    bpy.context.view_layer.update()
    # Rest-skin fidelity is a gate: editing the rig must not alter accepted mesh.
    evaluated=actor.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
    if len(mesh.vertices)!=len(actor.data.vertices):raise ValueError('Unsupported topology-changing source modifier')
    rest_error=max((vertex.co-actor.data.vertices[vertex.index].co).length for vertex in mesh.vertices)
    evaluated.to_mesh_clear()
    if rest_error>units_per_pixel/1024:raise ValueError(f'Rest-skin deformation after bind repair: {rest_error}')
    return {'method':'actual weighted upright joint rings; original joint heights and mesh/UV/weights retained','chains':report,'maxRestSkinDisplacementMetres':rest_error}
