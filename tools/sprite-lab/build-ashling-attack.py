"""Editable dual claw rake from approved Ashling anatomy, sampled for local GPU rendering."""
import bpy,sys,math,json
import numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
root=Path(sys.argv[sys.argv.index('--')+1]);out=root/'model/local-appearance-002'/sys.argv[sys.argv.index('--')+2];out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(root/'model/local-appearance-002/rigged-block-v4a/ashling-rigged.blend'))
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene;scene.frame_set(1);rig=bpy.data.objects['Ashling editable animation rig'];obj=bpy.data.objects['Ashling skinned character']
initial={p.name:p.matrix.copy() for p in rig.pose.bones}
heads={b.name:initial[b.name]@b.matrix_local.inverted()@b.head_local for b in rig.data.bones}
tails={b.name:initial[b.name]@b.matrix_local.inverted()@b.tail_local for b in rig.data.bones};lengths={b.name:b.length for b in rig.data.bones}
rig.animation_data.action.use_fake_user=True;action=bpy.data.actions.new('Ashling_fire_infused_dual_claw_rake');rig.animation_data.action=action
def track(f,keys):
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if f<=b:
            t=max(0,min(1,(f-a)/(b-a)));t=t*t*(3-2*t);return x+(y-x)*t
    return keys[-1][1]
def segment(n,h,t):
    rotation=(tails[n]-heads[n]).rotation_difference(t-h).to_matrix()@initial[n].to_3x3();m=rotation.to_4x4();m.translation=h;rig.pose.bones[n].matrix=m;bpy.context.view_layer.update()
def ik(a,b,l1,l2,pole):
    delta=b-a;distance=min(delta.length,l1+l2-.001);distance=max(distance,abs(l1-l2)+.001);d=delta.normalized();b=a+d*distance
    along=(l1*l1-l2*l2+distance*distance)/(2*distance);p=Vector(pole);p=(p-d*p.dot(d)).normalized()
    return a+d*along+p*math.sqrt(max(0,l1*l1-along*along)),b
for f in range(22):
    # Reset the complete hierarchy before authoring this frame.
    for p in rig.pose.bones:p.matrix=initial[p.name];bpy.context.view_layer.update()
    yaw=track(f,[(0,0),(6,-.24),(9,.32),(11,.22),(14,-.32),(17,-.14),(21,0)])
    lean=track(f,[(0,0),(6,-.12),(9,.16),(11,.04),(14,.18),(17,.08),(21,0)])
    advance=track(f,[(0,0),(6,.025),(9,-.055),(11,-.025),(14,-.065),(17,-.025),(21,0)])
    rotation=Quaternion((0,0,1),yaw)@Quaternion((1,0,0),lean);center=heads['pelvis'];offset=Vector((0,advance,0));point=lambda p:center+rotation@(p-center)+offset
    for n in ['pelvis','spine','chest','neck','head']:segment(n,point(heads[n]),point(tails[n]))
    for side,sign,start,hit in [('R',-1,6,9),('L',1,10,14)]:
        hip=point(heads['thigh.'+side]);ankle=heads['foot.'+side];knee,ankle=ik(hip,ankle,lengths['thigh.'+side],lengths['shin.'+side],(sign*.35,-1,0))
        segment('thigh.'+side,hip,knee);segment('shin.'+side,knee,ankle);rig.pose.bones['foot.'+side].matrix=initial['foot.'+side];bpy.context.view_layer.update()
        shoulder=point(heads['upper_arm.'+side]);segment('clavicle.'+side,point(heads['clavicle.'+side]),shoulder)
        ready=Vector((.07+sign*.26,.015,.19));strike=Vector((.07+sign*.04,-.39,-.015));follow=Vector((.07-sign*.15,-.24,-.15))
        wrist=track(f,[(0,heads['hand.'+side]),(start,ready),(hit,strike),(hit+2,follow),(18,point(heads['hand.'+side])),(21,heads['hand.'+side])])
        elbow,wrist=ik(shoulder,wrist,lengths['upper_arm.'+side],lengths['forearm.'+side],(sign,.15,.1));segment('upper_arm.'+side,shoulder,elbow);segment('forearm.'+side,elbow,wrist)
        finger=track(f,[(0,tails['hand.'+side]-heads['hand.'+side]),(start,Vector((sign*.03,-.05,.09))),(hit,Vector((-sign*.04,-.12,-.04))),(hit+2,Vector((-sign*.09,-.025,-.065))),(21,tails['hand.'+side]-heads['hand.'+side])]).normalized()*lengths['hand.'+side]
        segment('hand.'+side,wrist,wrist+finger)
        n='cloth.'+side;h=point(heads[n]);segment(n,h,h+Quaternion((0,0,1),yaw*.6)@(tails[n]-heads[n]))
    previous=None
    for i in range(8):
        n=f'tail.{i}';h=point(heads[n]) if previous is None else previous;previous=h+Quaternion((0,0,1),yaw*(1+i*.08))@(tails[n]-heads[n]);segment(n,h,previous)
    for p in rig.pose.bones:
        for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(prop,frame=f+1,group=p.name)
for curve in action.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1;scene.frame_end=22;scene.render.fps=24;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashling-attack.blend'))
deps=bpy.context.evaluated_depsgraph_get();positions=[];hands=[];handmask=np.zeros(len(obj.data.vertices),np.float32)
for vertex in obj.data.vertices:
    handmask[vertex.index]=sum(g.weight for g in vertex.groups if obj.vertex_groups[g.group].name.startswith('hand.'))
for frame in range(1,23):
    scene.frame_set(frame);ev=obj.evaluated_get(deps);mesh=ev.to_mesh();positions.append(np.array([v.co[:] for v in mesh.vertices],np.float32))
    if frame==1:
        mesh.calc_loop_triangles();faces=np.array([t.vertices[:] for t in mesh.loop_triangles],np.int32);uv=np.zeros((len(mesh.vertices),2),np.float32)
        for loop in mesh.loops:uv[loop.vertex_index]=mesh.uv_layers.active.data[loop.index].uv
    ev.to_mesh_clear();hands.append([[list(rig.pose.bones['hand.'+side].head),list(rig.pose.bones['hand.'+side].tail)] for side in ['L','R']])
camera=scene.camera;mvp=camera.calc_matrix_camera(deps,x=96,y=96,scale_x=1,scale_y=1)@camera.matrix_world.inverted()
np.savez_compressed(out/'attack-samples.npz',positions=positions,faces=faces,uv=uv,mvp=np.array(mvp),hands=hands,handmask=handmask)
(out/'profile.json').write_text(json.dumps(dict(frames=22,fps=24,loop=False,attack='staggered fire-infused claw rakes',groundRoot=[.07,.22,-.5],fireIgnitionFrames=[3,7],clawContactFrames=[9,14],fireFadeFrames=[16,21],ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n')
print('Saved editable claw attack and evaluated mesh samples',flush=True)
