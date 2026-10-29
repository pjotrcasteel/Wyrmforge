import bpy,json
r=bpy.data.objects['Zahmatorah_Skeleton'];r.data.pose_position='POSE'
for a in bpy.data.actions:
 r.animation_data.action=a
 if a.slots:r.animation_data.action_slot=a.slots[0]
 bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 print('ACTION',a.name)
 for name in ['Shoulder_l','UpperArm_l','ArmConnection_l','ForeArm_l','Arm_l','Feet_l','UpperLeg_l']:
  b=r.pose.bones[name];print(name,tuple(round(v,3) for v in b.rotation_quaternion),tuple(round(v,3) for v in b.rotation_euler),tuple(round(v,3) for v in b.head))
