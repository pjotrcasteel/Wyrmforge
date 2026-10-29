import bpy,json
m=bpy.data.objects['Zagmatorah']; r=bpy.data.objects['Zahmatorah_Skeleton']
print('DIAG', m.matrix_world, [(x.type,x.show_viewport,x.show_render,x.object.name if x.type=='ARMATURE' and x.object else None) for x in m.modifiers],r.data.pose_position)
for a in bpy.data.actions:
 print('ACTION',a.name,'slots',[(s.identifier,s.target_id_type) for s in a.slots],'curves',len(a.fcurves),'varied',sum(len(set(round(k.co.y,5) for k in f.keyframe_points))>1 for f in a.fcurves))
print('rig',r.animation_data.action.name if r.animation_data.action else None,'slot',r.animation_data.action_slot)
