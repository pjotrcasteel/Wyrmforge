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
feet={};diagnostics=[]
for side in ['L','R']:
    n='foot.'+side;group=obj.vertex_groups[n].index;transform=initial[n]@rig.data.bones[n].matrix_local.inverted()
    points=[transform@v.co-heads[n] for v in obj.data.vertices if any(g.group==group and g.weight>.95 for g in v.groups)]
    feet[side]=np.array(points)
for f in range(22):
    # Reset the complete hierarchy before authoring this frame.
    for p in rig.pose.bones:p.matrix=initial[p.name];bpy.context.view_layer.update()
    yaw=track(f,[(0,0),(6,-.24),(9,.32),(11,.22),(14,-.32),(17,-.14),(21,0)])
    lean=track(f,[(0,0),(6,-.12),(9,.16),(11,.04),(14,.18),(17,.08),(21,0)])
    advance=track(f,[(0,0),(5,.025),(7,-.025),(9,-.13),(11,-.15),(14,-.15),(17,-.10),(21,0)])
    lift=track(f,[(0,0),(5,-.065),(7,.025),(9,.095),(10,.065),(11,.005),(13,-.065),(16,-.02),(21,0)])
    rotation=Quaternion((0,0,1),yaw)@Quaternion((1,0,0),lean);center=heads['pelvis'];offset=Vector((0,advance,lift));point=lambda p:center+rotation@(p-center)+offset
    for n in ['pelvis','spine','chest','neck','head']:segment(n,point(heads[n]),point(tails[n]))
    for side,sign,start,hit in [('R',-1,6,9),('L',1,10,14)]:
        if side=='L':
            clearance=track(f,[(0,0),(6,0),(8,.085),(9,.13),(10,.065),(11,0),(18,0),(19,.035),(21,0)])
            foot_y=track(f,[(0,0),(6,0),(9,-.105),(11,-.15),(18,-.15),(21,0)])
            pitch=track(f,[(0,0),(5,0),(6,.23),(8,.12),(9,-.2),(11,0),(21,0)])
        else:
            clearance=track(f,[(0,0),(7,0),(8,.035),(9,.10),(10,.11),(11,.055),(12,0),(16,0),(18,.035),(20,0),(21,0)])
            foot_y=track(f,[(0,0),(7,0),(10,-.12),(12,-.15),(16,-.15),(20,0),(21,0)])
            pitch=track(f,[(0,0),(6,0),(7,.30),(9,.10),(10,-.15),(12,0),(21,0)])
        foot_rotation=Quaternion((1,0,0),pitch);relative=feet[side]@np.array(foot_rotation.to_matrix()).T
        ankle=heads['foot.'+side].copy();ankle.y+=foot_y;ankle.z=-.5+clearance-float(relative[:,2].min())
        hip=point(heads['thigh.'+side]);requested=ankle.copy();knee,ankle=ik(hip,ankle,lengths['thigh.'+side],lengths['shin.'+side],(sign*.35,-1,0))
        assert (ankle-requested).length<.001,(f,side,'unreachable foot')
        segment('thigh.'+side,hip,knee);segment('shin.'+side,knee,ankle)
        fm=(foot_rotation.to_matrix()@initial['foot.'+side].to_3x3()).to_4x4();fm.translation=ankle;rig.pose.bones['foot.'+side].matrix=fm;bpy.context.view_layer.update()
        diagnostics.append(dict(frame=f,side=side,clearance=float(clearance),ankle=list(ankle),pelvisLift=float(lift),forwardOffset=float(advance)))
        shoulder=point(heads['upper_arm.'+side]);segment('clavicle.'+side,point(heads['clavicle.'+side]),shoulder)
        ready=Vector((.07+sign*.26,.015,.19));strike=Vector((.07+sign*.04,-.39,-.015));follow=Vector((.07-sign*.15,-.24,-.15))
        wrist=track(f,[(0,heads['hand.'+side]),(start,ready),(hit,strike),(hit+2,follow),(18,point(heads['hand.'+side])),(21,heads['hand.'+side])])
        # Carry the slash with the launching torso rather than leaving it behind.
        wrist+=offset*track(f,[(0,0),(4,1),(16,1),(18,0),(21,0)])
        # The landing compresses the body; lift the finishing rake so long claws
        # clear the ground instead of cutting through it during absorption.
        wrist.z+=track(f,[(0,0),(11,0),(13,.07),(14,.10),(16,.04),(18,0),(21,0)])
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
(out/'launch-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
(out/'profile.json').write_text(json.dumps(dict(frames=22,fps=24,loop=False,attack='short launching fire-infused claw rakes',groundRoot=[.07,.22,-.5],fireIgnitionFrames=[1,6],clawContactFrames=[9,14],fireFadeFrames=[16,21],launchForwardModelUnits=.15,launchHeightModelUnits=.095,landingFrames=[11,12],rootMotionPolicy='authored visual displacement only; simulation damage and movement unchanged',ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n')
print('Saved editable claw attack and evaluated mesh samples',flush=True)
