"""Evaluated geometry normals in camera right/up/TOWARD-viewer convention.

Cycles internally reverses Blender camera Z (blender/camera.cpp camera matrix).
Its Vector Transform camera output therefore needs Z reversed for our sprite
tangent convention. X/Y are unchanged; this is not an RGB-derived normal.
"""
def camera_normal_colour(tree,normal_socket):
    transform=tree.nodes.new('ShaderNodeVectorTransform');transform.vector_type='NORMAL';transform.convert_from='WORLD';transform.convert_to='CAMERA'
    tree.links.new(normal_socket,transform.inputs['Vector'])
    mapping=tree.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY_ADD';mapping.inputs[1].default_value=(.5,.5,-.5);mapping.inputs[2].default_value=(.5,.5,.5)
    tree.links.new(transform.outputs[0],mapping.inputs[0])
    return mapping.outputs[0]
