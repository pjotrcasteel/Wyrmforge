import bpy,hashlib,json
r=bpy.data.objects['Zahmatorah_Skeleton'];b=bpy.data.objects['Zagmatorah'];r.data.pose_position='POSE'
for track in r.animation_data.nla_tracks:track.mute=True
for action in bpy.data.actions:
 r.animation_data.action=action
 if action.slots:r.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(1);bpy.context.view_layer.update();e=b.evaluated_get(bpy.context.evaluated_depsgraph_get());coords=[tuple(round(c,5) for c in v.co) for v in e.data.vertices]
 values=[(f.data_path,f.array_index,round(f.keyframe_points[0].co.y,5)) for f in action.fcurves if f.keyframe_points]
 print('SOURCE_POSE',action.name,hashlib.sha256(json.dumps(coords).encode()).hexdigest()[:12],hashlib.sha256(json.dumps(values).encode()).hexdigest()[:12],[(p.name,tuple(p.scale)) for p in r.pose.bones if any(abs(s-1)>.01 for s in p.scale)][:3])
