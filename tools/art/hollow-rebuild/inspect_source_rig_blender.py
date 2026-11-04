#!/usr/bin/env python3
"""Read-only Blender rig anatomy inventory for Hollowed static rest-pose sculpt.

This program does not create/alter any action, keyframe, source armature, or
WyrmForge engine file. It prints source bone hierarchy, heads/tails and
evaluated skinned bounds for a future author-created REST-SHAPE study.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import bpy


def vec3(v):
    return [round(float(t), 5) for t in v]


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--input',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    source=args.input.resolve()
    root=(Path.cwd()/'artifacts/hollow-rebuild').resolve()
    if not args.output.resolve().is_relative_to(root):
        raise ValueError('Rig diagnostics cannot write outside isolated art')
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
    bpy.context.preferences.filepaths.use_scripts_auto_execute=False
    rigs=[obj for obj in bpy.data.objects if obj.type=='ARMATURE']
    meshes=[obj for obj in bpy.data.objects if obj.type=='MESH']
    info={
        'source':source.name,
        'warning':'READ-ONLY SOURCE INVENTORY, NOT AN ANIMATION OR APPROVAL',
        'rigs':[],
        'source_meshes':[],
        'source_actions_remaining':len(bpy.data.actions),
        'action_names':[a.name for a in bpy.data.actions],
    }
    if info['source_actions_remaining']!=0:
        raise ValueError('This reference .blend contains unexpected actions')
    for obj in rigs:
        bones=[]
        for b in obj.data.bones:
            head=obj.matrix_world@b.head_local
            tail=obj.matrix_world@b.tail_local
            bones.append({
                'name':b.name,'parent':b.parent.name if b.parent else None,
                'connected':bool(b.use_connect),'deform':bool(b.use_deform),
                'head_world':vec3(head),'tail_world':vec3(tail),
                'length_m':round(float(b.length),5),
                'children':len(b.children),
            })
        info['rigs'].append({
            'object':obj.name,'parent':obj.parent.name if obj.parent else None,
            'bones_count':len(bones),
            'object_location':vec3(obj.matrix_world.translation),
            'bones':bones,
        })
    for obj in meshes:
        info['source_meshes'].append({
            'name':obj.name,'vertex_count':len(obj.data.vertices),
            'vertex_groups':[g.name for g in obj.vertex_groups],
            'armature_modifiers':[
                {'name':mod.name,'target':mod.object.name if mod.object else None}
                for mod in obj.modifiers if mod.type=='ARMATURE'
            ],
        })
    path=args.output.resolve()
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')
    print('RIG INVENTORY',path,'RIGS',len(rigs),
          'BONES',sum(len(r['bones']) for r in info['rigs']),
          'ACTIONS',len(bpy.data.actions))


if __name__=='__main__':
    main()
