"""Reusable humanoid source-bone template, independent of bpy.

Wizard keeps the original positions. Other humanoids can adjust dimensions,
mesh, weights and actions. Nonhumanoid actors use their own bone designs.
"""
from __future__ import annotations
from math import isfinite

_BASE_BONES = {
    'root':((0,0,0),(0,0,.14),None),
    'pelvis':((0,0,.87),(0,0,1.03),'root'),
    'spine':((0,0,1.03),(0,-.005,1.31),'pelvis'),
    'chest':((0,-.005,1.31),(0,-.015,1.58),'spine'),
    'neck':((0,-.015,1.58),(0,-.040,1.70),'chest'),
    'head':((0,-.040,1.70),(0,-.055,2.03),'neck'),
    'beard.root':((0,-.195,1.59),(0,-.215,1.39),'head'),
    'beard.tip':((0,-.215,1.39),(0,-.24,1.05),'beard.root'),
    'thigh.L':((-.19,0,.94),(-.19,-.085,.56),'pelvis'),
    'shin.L':((-.19,-.085,.56),(-.19,-.035,.18),'thigh.L'),
    'foot.L':((-.19,-.035,.18),(-.19,-.27,.105),'shin.L'),
    'thigh.R':((.19,0,.94),(.19,-.085,.56),'pelvis'),
    'shin.R':((.19,-.085,.56),(.19,-.035,.18),'thigh.R'),
    'foot.R':((.19,-.035,.18),(.19,-.27,.105),'shin.R'),
    'clavicle.L':((-.10,-.02,1.52),(-.29,-.02,1.49),'chest'),
    'upper_arm.L':((-.29,-.02,1.49),(-.39,-.10,1.25),'clavicle.L'),
    'forearm.L':((-.39,-.10,1.25),(-.32,-.23,1.04),'upper_arm.L'),
    'hand.L':((-.32,-.23,1.04),(-.31,-.30,.97),'forearm.L'),
    'clavicle.R':((.10,-.02,1.52),(.29,-.02,1.49),'chest'),
    'upper_arm.R':((.29,-.02,1.49),(.41,-.10,1.30),'clavicle.R'),
    'forearm.R':((.41,-.10,1.30),(.50,-.29,1.16),'upper_arm.R'),
    'hand.R':((.50,-.29,1.16),(.52,-.33,1.10),'forearm.R'),
}


def humanoid_bones(*, height_scale: float = 1.0, width_scale: float = 1.0,
                   depth_scale: float = 1.0, include_beard: bool = False) -> dict:
    dims=(width_scale,depth_scale,height_scale)
    if not all(isfinite(v) and v>0 for v in dims):
        raise ValueError("All rig scale parameters must be finite and positive")
    result={}
    for name,(start,end,parent) in _BASE_BONES.items():
        if not include_beard and name.startswith('beard.'):
            continue
        if parent is not None and parent not in result:
            raise ValueError("Missing parent bone "+parent+" for "+name)
        points=tuple(tuple(a*b for a,b in zip(coord,dims)) for coord in (start,end))
        if points[0]==points[1]:
            raise ValueError("Zero-length bone "+name)
        result[name]=(points[0],points[1],parent)
    return result
