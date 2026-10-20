"""Editable Ashling rig and a contact-driven scuttle; no runtime replacement."""
import bpy, math, json, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion

folder=Path(sys.argv[sys.argv.index('--')+1])
out=folder/(sys.argv[sys.argv.index('--')+2]);out.mkdir(exist_ok=False)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
source=np.load(folder/'textured-v1/textured-mesh.npz')
v,faces,uv=[source[k].copy() for k in ['vertices','faces','uv']]
original_count=len(v)
# Reconstruct the missing slender tail from the card's curved silhouette.
# This remains an editable, explicitly authored addition, not inferred anatomy.
tail=np.array([[.07,.30,-.09],[.08,.39,-.11],[.12,.49,-.18],[.15,.58,-.25],
               [.12,.67,-.26],[.04,.73,-.20],[-.04,.74,-.13],[-.09,.70,-.08],[-.10,.65,-.07]])
tail_vertices=[];tail_uv=[];tail_faces=[];sides=8
color_source=bpy.data.images.load(str(folder/'textured-v1/hollow-albedo.png'))
color_source.colorspace_settings.name='Non-Color'
pixels=np.empty(len(color_source.pixels),np.float32);color_source.pixels.foreach_get(pixels)
albedo=pixels.reshape(color_source.size[1],color_source.size[0],4)[:,:,:3]*255
texel=albedo[np.clip((uv[:,1]*1023).astype(int),0,1023),np.clip((uv[:,0]*1023).astype(int),0,1023)]
skin_candidates=np.where((v[:,2]<-.1)&(v[:,2]>-.3)&(v[:,1]<.2)&(texel[:,0]>65)&(texel[:,0]<150))[0]
skin_index=skin_candidates[np.argmin(np.linalg.norm(texel[skin_candidates].astype(float)-[100,65,49],axis=1))]
skin_uv=uv[skin_index]
for ring,point in enumerate(tail):
    tangent=tail[min(ring+1,len(tail)-1)]-tail[max(0,ring-1)]
    tangent/=np.linalg.norm(tangent)
    right=np.cross(tangent,[0,0,1]);right/=np.linalg.norm(right)
    up=np.cross(tangent,right)
    radius=.022*(1-ring/(len(tail)-.3))+.002
    for j in range(sides):
        angle=j*2*math.pi/sides
        tail_vertices.append(point+radius*(right*math.cos(angle)+up*math.sin(angle)))
        tail_uv.append(skin_uv)
        if ring:
            a=original_count+(ring-1)*sides+j;b=original_count+(ring-1)*sides+(j+1)%sides
            c=original_count+ring*sides+j;d=original_count+ring*sides+(j+1)%sides
            tail_faces.extend([[a,b,c],[b,d,c]])
v=np.concatenate([v,np.array(tail_vertices)]);uv=np.concatenate([uv,np.array(tail_uv)])
faces=np.concatenate([faces,np.array(tail_faces)])
data=bpy.data.meshes.new('Ashling cleaned surface and authored tail')
data.from_pydata(v.tolist(),[],faces.tolist());data.update()
character=bpy.data.objects.new('Ashling skinned character',data);bpy.context.collection.objects.link(character)
layer=data.uv_layers.new(name='AppearanceUV')
for polygon in data.polygons:
    polygon.use_smooth=True
    for index in polygon.loop_indices:layer.data[index].uv=uv[data.loops[index].vertex_index]
material=bpy.data.materials.new('Original card-derived appearance');material.use_nodes=True
texture=material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image=bpy.data.images.load(str(folder/'textured-v1/hollow-albedo.png'));texture.image.pack();texture.interpolation='Closest'
shader=material.node_tree.nodes.get('Principled BSDF')
material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
material.node_tree.links.new(texture.outputs['Color'],shader.inputs['Emission Color'])
shader.inputs['Emission Strength'].default_value=.35;shader.inputs['Roughness'].default_value=.95
character.data.materials.append(material)
bones={}
def bone(name,head,tip,parent=None,deform=True):bones[name]=dict(head=np.array(head,float),tail=np.array(tip,float),parent=parent,deform=deform)
bone('root',(.07,.22,-.5),(.07,.22,-.4),deform=False)
bone('pelvis',(.07,.22,-.08),(.07,.17,.015),'root')
bone('spine',(.07,.17,.015),(.06,.09,.12),'pelvis')
bone('chest',(.06,.09,.12),(.035,-.03,.205),'spine')
bone('neck',(.035,-.03,.205),(.025,-.14,.235),'chest')
bone('head',(.025,-.14,.235),(.025,-.21,.32),'neck')
for side,shoulder,elbow,wrist,hand,hip,knee,ankle in [
 ('L',(.25,.09,.145),(.37,-.02,.015),(.36,-.16,-.085),(.35,-.22,-.19),(.18,.22,-.09),(.26,.12,-.25),(.34,.33,-.435)),
 ('R',(-.13,.06,.145),(-.27,-.025,.015),(-.36,-.19,-.09),(-.40,-.25,-.21),(-.025,.22,-.09),(-.15,.08,-.25),(-.23,.19,-.435))]:
    bone('clavicle.'+side,bones['chest']['head'],shoulder,'chest')
    bone('upper_arm.'+side,shoulder,elbow,'clavicle.'+side)
    bone('forearm.'+side,elbow,wrist,'upper_arm.'+side)
    bone('hand.'+side,wrist,hand,'forearm.'+side)
    bone('thigh.'+side,hip,knee,'pelvis');bone('shin.'+side,knee,ankle,'thigh.'+side)
    bone('foot.'+side,ankle,np.array(ankle)+[0,-.16,-.055],'shin.'+side)
    sign=1 if side=='L' else -1
    bone('cloth.'+side,(.07+sign*.04,.29,-.08),(.07+sign*.06,.34,-.35),'pelvis')
for i in range(len(tail)-1):bone(f'tail.{i}',tail[i],tail[i+1],'pelvis' if i==0 else f'tail.{i-1}')
armature=bpy.data.armatures.new('Ashling deformation skeleton')
rig=bpy.data.objects.new('Ashling editable animation rig',armature);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,spec in bones.items():
    b=armature.edit_bones.new(name);b.head=spec['head'];b.tail=spec['tail'];b.use_deform=spec['deform']
    if spec['parent']:b.parent=armature.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
modifier=character.modifiers.new('Weighted volume-preserving deformation','ARMATURE');modifier.object=rig;modifier.use_deform_preserve_volume=True
character.parent=rig
names=[n for n,b in bones.items() if b['deform']]
for name in names:character.vertex_groups.new(name=name)
def segment_distance(points,a,b):
    delta=b-a;t=np.clip(((points-a)*delta).sum(1)/(delta@delta),0,1)
    return np.linalg.norm(points-a-t[:,None]*delta,axis=1)
distances=np.stack([segment_distance(v,bones[n]['head'],bones[n]['tail']) for n in names],axis=1)
allowed=np.zeros_like(distances,dtype=bool)
for i,(x,y,z) in enumerate(v):
    side='L' if x>.07 else 'R'
    if i>=original_count:
        ring=(i-original_count)//sides;permitted=[f'tail.{max(0,ring-1)}',f'tail.{min(ring,len(tail)-2)}']
    elif z>.19 and (y<.035 or abs(x-.07)<.18):permitted=['head','neck','chest']
    elif abs(x-.07)>.16+max(0,.12-z)*.45 and -.31<z<.23:
        permitted=['clavicle.'+side,'upper_arm.'+side,'forearm.'+side,'hand.'+side]
    elif z<-.12:
        cloth=(abs(x-.07)<.075 and y>.19 and z>-.4) or (y>.30 and z>-.22)
        permitted=['cloth.'+side,'pelvis'] if cloth else ['thigh.'+side,'shin.'+side,'foot.'+side]
        if z<-.43:permitted=['foot.'+side]
    elif z<-.03:permitted=['pelvis','spine','thigh.'+side,'cloth.'+side]
    else:permitted=['pelvis','spine','chest','neck','clavicle.'+side,'upper_arm.'+side]
    allowed[i]=[n in permitted for n in names]
scores=np.where(allowed,1/np.maximum(distances,.012)**4,0)
strongest=np.argsort(scores,axis=1)[:,-3:];weights=np.zeros_like(scores)
np.put_along_axis(weights,strongest,np.take_along_axis(scores,strongest,axis=1),axis=1)
weights/=weights.sum(1,keepdims=True)
for i,row in enumerate(weights):
    for j in np.where(row>.001)[0]:character.vertex_groups[names[j]].add([i],float(row[j]),'REPLACE')
rest={n:armature.bones[n].matrix_local.copy() for n in bones}
for pose in rig.pose.bones:pose.rotation_mode='QUATERNION'
def segment(name,head,tip):
    head,tip=Vector(head),Vector(tip)
    rotation=Vector(bones[name]['tail']-bones[name]['head']).rotation_difference(tip-head).to_matrix()@rest[name].to_3x3()
    m=rotation.to_4x4();m.translation=head;rig.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def ik(hip,ankle,l1,l2):
    delta=ankle-hip;length=delta.length;direction=delta.normalized()
    along=(l1*l1-l2*l2+length*length)/(2*length)
    pole=Vector((0,-1,0));pole-=direction*pole.dot(direction);pole.normalize()
    assert length<l1+l2,('unreachable ankle',length,l1+l2)
    return hip+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
stance=.32;sweep=.24;diagnostics=[]
for frame in range(17):
    phase=frame/16;angle=2*math.pi*phase
    # Two short bounds per cycle: compress, push off, tuck, then catch the
    # landing on the opposite foot. There is deliberately no walking double support.
    bound=(phase*2)%1;support=stance*2
    flight=max(0,(bound-support)/(1-support))
    arc=4*flight*(1-flight)
    height=(-.035-.065*math.sin(math.pi*bound/support)) if bound<support else -.035+.14*arc
    offset=Vector((.016*math.cos(angle),0,height))
    rotation=Quaternion((0,0,1),.10*math.sin(angle))@Quaternion((1,0,0),.10+.075*math.sin(2*angle-.4))
    origin=Vector(bones['pelvis']['head']);point=lambda p:origin+rotation@(Vector(p)-origin)+offset
    segment('root',bones['root']['head'],bones['root']['tail'])
    for n in ['pelvis','spine','chest']:segment(n,point(bones[n]['head']),point(bones[n]['tail']))
    # Raise the gaze from the hero's downward snarl so the face and horns read
    # from the elevated gameplay camera, without changing its anatomy.
    neck_origin=point(bones['neck']['head']);gaze=Quaternion((1,0,0),math.radians(-20))
    head_point=lambda p:neck_origin+gaze@(point(p)-neck_origin)
    for n in ['neck','head']:segment(n,head_point(bones[n]['head']),head_point(bones[n]['tail']))
    for side,sign,shift in [('L',1,0),('R',-1,.5)]:
        p=(phase+shift)%1
        if p<stance:travel=-sweep/2+sweep*p/stance;lift=0
        else:
            t=(p-stance)/(1-stance);travel=sweep/2-sweep*(t*t*(3-2*t));lift=.10*math.sin(math.pi*t)**1.15+.12*arc
        hip=Vector(bones['thigh.'+side]['head'])+offset
        ankle=Vector((.07+sign*.205,.25+travel,-.435+lift))
        l1=np.linalg.norm(bones['thigh.'+side]['tail']-bones['thigh.'+side]['head'])
        l2=np.linalg.norm(bones['shin.'+side]['tail']-bones['shin.'+side]['head'])
        knee=ik(hip,ankle,l1,l2);segment('thigh.'+side,hip,knee);segment('shin.'+side,knee,ankle)
        segment('foot.'+side,ankle,ankle+Vector((0,-.16,-.055)))
        shoulder=point(bones['upper_arm.'+side]['head']);segment('clavicle.'+side,point(bones['clavicle.'+side]['head']),shoulder)
        arm_rotation=Quaternion((0,0,1),sign*.16*arc)@Quaternion((1,0,0),-.10+.42*math.sin(2*math.pi*(p-.1)))@rotation
        elbow=shoulder+arm_rotation@Vector(bones['upper_arm.'+side]['tail']-bones['upper_arm.'+side]['head'])
        wrist=elbow+arm_rotation@Vector(bones['forearm.'+side]['tail']-bones['forearm.'+side]['head'])
        hand=wrist+arm_rotation@Vector(bones['hand.'+side]['tail']-bones['hand.'+side]['head'])
        segment('upper_arm.'+side,shoulder,elbow);segment('forearm.'+side,elbow,wrist);segment('hand.'+side,wrist,hand)
        cloth=bones['cloth.'+side];head=point(cloth['head'])
        segment('cloth.'+side,head,head+Quaternion((1,0,0),.15*math.sin(2*math.pi*(p-.18)))@Vector(cloth['tail']-cloth['head']))
        diagnostics.append(dict(frame=frame+1,side=side,stance=p<stance,phase=p,flight=bound>=support,bodyHeight=height,ankle=list(ankle)))
    previous=None
    for i in range(len(tail)-1):
        head=point(tail[i]) if previous is None else previous
        delta=rotation@Vector(tail[i+1]-tail[i]);delta=Quaternion((0,0,1),.20*math.sin(angle-i*.35))@Quaternion((1,0,0),.08*math.sin(2*angle-i*.4))@delta
        previous=head+delta;segment(f'tail.{i}',head,previous)
    for pose in rig.pose.bones:
        for property in ['location','rotation_quaternion','scale']:pose.keyframe_insert(property,frame=frame+1,group=pose.name)
for curve in rig.animation_data.action.fcurves:
    for key in curve.keyframe_points:key.interpolation='LINEAR'
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=16;scene.render.fps=20;scene.frame_set(1)
bpy.ops.object.camera_add(location=(2.2,-3.2,2.6));camera=bpy.context.object
camera.rotation_euler=(Vector((.07,.22,-.03))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=1.7;scene.camera=camera
scene.render.resolution_x=scene.render.resolution_y=96
(out/'gait-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
(out/'export-profile.json').write_text(json.dumps(dict(frames=16,fps=20,stanceFraction=stance,sweepModelUnits=sweep,travelModelUnitsPerCycle=sweep/stance,groundRoot=[.07,.22,-.5],tail='authored editable curve based on concept; eight deform bones',ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashling-rigged.blend'))
print('Saved',len(v),'vertices',len(bones),'bones; Ashling scuttle candidate',flush=True)
