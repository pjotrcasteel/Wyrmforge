"""Offline authoring kinematics; no runtime solver or gameplay authority.

Coordinates: Blender armature space, metres, Z up. All segment matrices are
assigned in armature space; Blender derives local basis against the bind pose.
"""
import bpy
from math import acos, sqrt
from mathutils import Vector, Matrix


def two_bone_points(start, target, pole, upper_length, lower_length):
    """Solve fixed-length chain in a pole-defined plane, fail on singular input."""
    start, target, pole = Vector(start), Vector(target), Vector(pole)
    ray = target - start
    distance = ray.length
    if not abs(upper_length-lower_length)+1e-6 < distance < upper_length+lower_length-1e-6:
        raise ValueError(f'unreachable chain: {distance:.6f}; lengths={upper_length:.6f},{lower_length:.6f}')
    axis = ray.normalized()
    bend = pole-start-axis*(pole-start).dot(axis)
    if bend.length < 1e-6:
        raise ValueError('singular pole: plane must be explicit')
    bend.normalize()
    along = (upper_length**2-lower_length**2+distance**2)/(2*distance)
    height = sqrt(max(0, upper_length**2-along**2))
    middle = start + axis*along + bend*height
    flex = 180-acos(max(-1,min(1,(upper_length**2+lower_length**2-distance**2)/(2*upper_length*lower_length))))*180/3.141592653589793
    return middle, flex


def segment_matrix(rest_bone, head, tail):
    """Preserve rest roll, length and scale; rotate the bind axis onto the target."""
    head,tail=Vector(head),Vector(tail)
    axis=rest_bone.tail_local-rest_bone.head_local
    rotation=axis.rotation_difference(tail-head).to_matrix().to_4x4() @ rest_bone.matrix_local.to_3x3().to_4x4()
    rotation.translation=head
    return rotation


def solve_chain(rig, upper, lower, target, pole, limits=(5,155)):
    first,second=rig.pose.bones[upper],rig.pose.bones[lower]
    middle,flex=two_bone_points(first.head,target,pole,rig.data.bones[upper].length,rig.data.bones[lower].length)
    if not limits[0] <= flex <= limits[1]:
        raise ValueError(f'{upper} joint limit: {flex:.3f} outside {limits}')
    first.matrix=segment_matrix(rig.data.bones[upper],first.head,middle)
    bpy.context.view_layer.update()
    second.matrix=segment_matrix(rig.data.bones[lower],middle,target)
    bpy.context.view_layer.update()
    return flex


def convex_hull(points):
    points=sorted(set(tuple(p[:2]) for p in points))
    def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    if len(points)<3:return points
    lower=[]
    for p in points:
        while len(lower)>1 and cross(lower[-2],lower[-1],p)<=0:lower.pop()
        lower.append(p)
    upper=[]
    for p in reversed(points):
        while len(upper)>1 and cross(upper[-2],upper[-1],p)<=0:upper.pop()
        upper.append(p)
    return lower[:-1]+upper[:-1]


def support_margin(com, points):
    """Signed minimum edge distance of the actual support footprint hull."""
    hull=convex_hull(points)
    if len(hull)<3:raise ValueError('finite sole/palm footprint required')
    margins=[]
    for a,b in zip(hull,hull[1:]+hull[:1]):
        dx,dy=b[0]-a[0],b[1]-a[1]
        margins.append((dx*(com[1]-a[1])-dy*(com[0]-a[0]))/sqrt(dx*dx+dy*dy))
    return min(margins)
