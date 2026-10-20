"""Editable asymmetric Ashling fall, failed brace and settled corpse."""
import bpy,sys,json,math
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
root=Path(sys.argv[sys.argv.index('--')+1]);out=root/'model/local-appearance-002'/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(root/'model/local-appearance-002/rigged-block-v4a/ashling-rigged.blend'));bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['Ashling editable animation rig'];obj=bpy.data.objects['Ashling skinned character']
initial={p.name:p.matrix.copy() for p in rig.pose.bones};heads={b.name:initial[b.name]@b.matrix_local.inverted()@b.head_local for b in rig.data.bones};tails={b.name:initial[b.name]@b.matrix_local.inverted()@b.tail_local for b in rig.data.bones};lengths={b.name:b.length for b in rig.data.bones}
rig.animation_data.action.use_fake_user=True;action=bpy.data.actions.new('Ashling_death_failed_brace_side_collapse');rig.animation_data.action=action
def track(f,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if f<=b:
            t=max(0,min(1,(f-a)/(b-a)));t=t*t*(3-2*t);return x+(y-x)*t
    return keys[-1][1]
def segment(n,h,t):
    r=(tails[n]-heads[n]).rotation_difference(t-h).to_matrix()@initial[n].to_3x3();m=r.to_4x4();m.translation=h;rig.pose.bones[n].matrix=m;bpy.context.view_layer.update()
def ik(a,b,l1,l2,pole):
    delta=b-a;distance=max(abs(l1-l2)+.001,min(delta.length,l1+l2-.001));d=delta.normalized();b=a+d*distance;along=(l1*l1-l2*l2+distance*distance)/(2*distance);p=Vector(pole);p=(p-d*p.dot(d)).normalized();return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),b
diagnostics=[]
for f in range(28):
    for p in rig.pose.bones:p.matrix=initial[p.name];bpy.context.view_layer.update()
    pitch=track(f,[(0,0),(3,-.12),(6,.30),(9,.95),(12,1.48),(14,1.32),(18,1.45),(23,1.45),(27,1.45)])
    roll=track(f,[(0,0),(3,-.08),(7,.12),(12,.40),(16,.58),(22,.60),(27,.60)])
    drop=track(f,[(0,0),(3,.01),(6,-.07),(9,-.16),(12,-.23),(14,-.21),(18,-.23),(22,-.23),(27,-.23)])
    advance=track(f,[(0,0),(3,.035),(8,-.025),(12,-.12),(18,-.14),(27,-.14)])
    rotation=Quaternion((0,1,0),roll)@Quaternion((1,0,0),pitch);center=heads['pelvis'];offset=Vector((0,advance,drop));point=lambda p:center+rotation@(p-center)+offset
    for n in ['pelvis','spine','chest','neck']:segment(n,point(heads[n]),point(tails[n]))
    head=point(heads['head']);lag=track(f,[(0,0),(6,-.12),(12,.10),(15,-.06),(22,0),(27,0)]);segment('head',head,head+Quaternion((1,0,0),lag)@rotation@(tails['head']-heads['head']))
    fold=track(f,[(0,0),(4,0),(11,1),(27,1)])
    for side,sign in [('L',1),('R',-1)]:
        hip=point(heads['thigh.'+side]);target=Vector((.07+sign*(.25 if side=='L' else .18),.42 if side=='L' else .30,-.43))
        ankle=heads['foot.'+side].lerp(target,fold);pole=Vector((sign*.35,-1,0)).lerp(Vector((sign*.8,.4,1)),fold);knee,ankle=ik(hip,ankle,lengths['thigh.'+side],lengths['shin.'+side],pole)
        segment('thigh.'+side,hip,knee);segment('shin.'+side,knee,ankle);footrotation=Quaternion((0,1,0),sign*fold*.7)@Quaternion((1,0,0),fold*-.4);segment('foot.'+side,ankle,ankle+footrotation@(tails['foot.'+side]-heads['foot.'+side]))
        shoulder=point(heads['upper_arm.'+side]);segment('clavicle.'+side,point(heads['clavicle.'+side]),shoulder)
        brace=track(f,[(0,0),(4,0),(8,1),(27,1)]);spread=track(f,[(0,0),(10,0),(14,1),(27,1)])
        target=Vector((.07+sign*(.27+.07*spread),-.34+(0 if side=='L' else .08),-.395))
        wrist=point(heads['hand.'+side]).lerp(target,brace);elbow,wrist=ik(shoulder,wrist,lengths['upper_arm.'+side],lengths['forearm.'+side],(sign,.15,.6));segment('upper_arm.'+side,shoulder,elbow);segment('forearm.'+side,elbow,wrist)
        finger=(rotation@(tails['hand.'+side]-heads['hand.'+side])).lerp(Vector((sign*.04,-.10,-.01)),brace).normalized()*lengths['hand.'+side];segment('hand.'+side,wrist,wrist+finger)
        n='cloth.'+side;h=point(heads[n]);segment(n,h,h+rotation@(tails[n]-heads[n]))
    previous=None
    for i in range(8):
        n=f'tail.{i}';h=point(heads[n]) if previous is None else previous
        lag=track(max(0,f-i*.3),[(0,0),(4,-.16),(10,.24),(14,-.14),(19,.04),(23,0),(27,0)])
        previous=h+Quaternion((0,0,1),lag)@rotation@(tails[n]-heads[n]);segment(n,h,previous)
    for p in rig.pose.bones:
        for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=f+1,group=p.name)
    diagnostics.append(dict(frame=f,drop=drop,pitch=pitch,roll=roll,advance=advance))
for curve in action.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1;scene.frame_end=28;scene.render.fps=24
# Standard editable post-skin floor contact, identical in the saved source and samples.
group=bpy.data.node_groups.new('Ashling death floor contact','GeometryNodeTree');group.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');group.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
nodes=group.nodes;links=group.links;inp=nodes.new('NodeGroupInput');output=nodes.new('NodeGroupOutput');pos=nodes.new('GeometryNodeInputPosition');split=nodes.new('ShaderNodeSeparateXYZ');maximum=nodes.new('ShaderNodeMath');maximum.operation='MAXIMUM';maximum.inputs[1].default_value=-.5;combine=nodes.new('ShaderNodeCombineXYZ');setpos=nodes.new('GeometryNodeSetPosition')
links.new(inp.outputs['Geometry'],setpos.inputs['Geometry']);links.new(pos.outputs['Position'],split.inputs[0]);links.new(split.outputs['X'],combine.inputs['X']);links.new(split.outputs['Y'],combine.inputs['Y']);links.new(split.outputs['Z'],maximum.inputs[0]);links.new(maximum.outputs[0],combine.inputs['Z']);links.new(combine.outputs[0],setpos.inputs['Position']);links.new(setpos.outputs['Geometry'],output.inputs['Geometry']);modifier=obj.modifiers.new('Death floor contact after skinning','NODES');modifier.node_group=group
deps=bpy.context.evaluated_depsgraph_get();positions=[];hands=[];mask=np.zeros(len(obj.data.vertices),np.float32)
for vertex in obj.data.vertices:mask[vertex.index]=sum(g.weight for g in vertex.groups if obj.vertex_groups[g.group].name.startswith('hand.'))
for f in range(28):
    scene.frame_set(f+1);ev=obj.evaluated_get(deps);mesh=ev.to_mesh();positions.append(np.array([v.co[:] for v in mesh.vertices],np.float32))
    if f==0:
        mesh.calc_loop_triangles();faces=np.array([t.vertices[:] for t in mesh.loop_triangles],np.int32);uv=np.zeros((len(mesh.vertices),2),np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    ev.to_mesh_clear();hands.append([[list(rig.pose.bones['hand.'+side].head),list(rig.pose.bones['hand.'+side].tail)] for side in ['L','R']])
camera=scene.camera;mvp=camera.calc_matrix_camera(deps,x=96,y=96,scale_x=1,scale_y=1)@camera.matrix_world.inverted()
np.savez_compressed(out/'death-samples.npz',positions=positions,faces=faces,uv=uv,mvp=np.array(mvp),hands=hands,handmask=mask)
(out/'profile.json').write_text(json.dumps(dict(frames=28,fps=24,loop=False,animation='death',groundRoot=[.07,.22,-.5],impactFrame=12,corpseHoldStartFrame=23,ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n');(out/'pose-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n');scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashling-death.blend'));print('Saved editable collapse and settled corpse samples')
