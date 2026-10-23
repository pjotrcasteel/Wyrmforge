"""Surface-conforming articulated armor study, derived from preserved Zagmatorah anatomy."""
import argparse,json,math,sys
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from import_source import sha
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output).resolve()
if out.exists():raise SystemExit('Immutable revision already exists')
out.mkdir(parents=True)
source=Path(bpy.data.filepath);body=bpy.data.objects['Zagmatorah'];rig=bpy.data.objects['Zahmatorah_Skeleton'];rig.data.pose_position='REST';bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(dg);surface=evaluated.to_mesh()
bvh=BVHTree.FromPolygons([v.co.copy() for v in surface.vertices],[tuple(p.vertices) for p in surface.polygons],all_triangles=False)
mat=bpy.data.materials.new('Ashfang fractured obsidian armor');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.008,.006,.005,1);bs.inputs['Roughness'].default_value=.80;bs.inputs['Specular IOR Level'].default_value=.20
noise=mat.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=38;noise.inputs['Detail'].default_value=2
bump=mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.035
mat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
verts=[];faces=[];assignments=[];plates=[]
# The source's long axis is X, head at -X. Radial shells follow living body,
# with clear joint gaps and larger shoulder plates rather than arbitrary spikes.
def shell(label,x,angle,length,width,rise,bone):
    center_z=rig.data.bones[bone].head_local.z
    def project(dx,da,extra=0):
        theta=angle+da;direction=Vector((0,math.sin(theta),math.cos(theta)))
        origin=Vector((x+dx,0,center_z))
        hit,norm,index,dist=bvh.ray_cast(origin,direction,3.0)
        if hit is None or dist>(.85 if bone in ('Head','UpperHead','Neck01') else 1.25):return None
        return hit+direction*extra
    outline=[(-.52,-.32),(-.24,-.55),(.38,-.40),(.60,0),(.38,.40),(-.24,.55)]
    ring=[project(u*length,v*width,.025) for u,v in outline]
    peak=project(.22*length,0,rise*.38)
    if peak is None or any(v is None for v in ring):return
    start=len(verts);radial=Vector((0,math.sin(angle),math.cos(angle)))
    verts.extend(ring);verts.append(peak);verts.extend([v-radial*.075 for v in ring])
    for i in range(6):
        j=(i+1)%6;faces.append((start+i,start+j,start+6));faces.append((start+i,start+7+i,start+7+j,start+j))
    faces.append(tuple(start+7+i for i in reversed(range(6))))
    assignments.append((list(range(start,len(verts))),bone));plates.append(label)
# Each axial row belongs to a specific existing bone, keeping individual scales rigid.
rows=[('brow',-3.72,'UpperHead',.72,.43,.22),('crown',-3.24,'Head',.64,.48,.38),
      ('nape',-2.90,'Neck01',.68,.56,.32),('neck-middle',-2.24,'Neck02',.83,.66,.30),
      ('neck-root',-1.50,'Neck03',.93,.76,.34),('shoulder',-.63,'Spine01',1.1,.82,.47),
      ('chest',.20,'Spine01',1.08,.84,.40),('back',1.08,'Spine02',1.00,.76,.33),
      ('hip',1.95,'Spine03',1.10,.72,.28)]
for label,x,bone,length,width,rise in rows:
    for angle in (-.86,0,.86):shell(label+str(angle),x,angle,length,width,rise,bone)
# Lower lateral chest plates leave wing-root joints exposed.
for x,bone in [(-.75,'Spine01'),(.10,'Spine01'),(.95,'Spine02')]:
    for angle in (-1.5,1.5):shell('pectoral',x,angle,.85,.62,.20,bone)
me=bpy.data.meshes.new('Ashfang conforming armor geometry');me.from_pydata(verts,[],faces);me.update()
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
armor=bpy.data.objects.new('Ashfang articulated cranial and thoracic armor',me);bpy.context.collection.objects.link(armor);armor.data.materials.append(mat)
for indices,bone in assignments:
    group=armor.vertex_groups.get(bone) or armor.vertex_groups.new(name=bone);group.add(indices,1,'REPLACE')
modifier=armor.modifiers.new('Shared original skeleton','ARMATURE');modifier.object=rig
bevel=armor.modifiers.new('Worn plate edges','BEVEL');bevel.width=.025;bevel.segments=2
armor['purpose']='Authored surface-conforming plate study; deformation and card fidelity require review'
evaluated.to_mesh_clear();rig.data.pose_position='POSE'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-master-working.blend'),compress=True)
report={'source':str(source),'sourceSha256':sha(source),'sha256':sha(out/'ashfang-master-working.blend'),'plateCount':len(plates),'armorVertices':len(verts),'armorFaces':len(faces),'bones':sorted(set(b for _,b in assignments)),'preservedTailCorrection':True,'ownerAccepted':False,'limitations':['Separate forelegs not yet authored','Plate intersections and deformation pending review','Master identity not accepted']}
(out/'armor-report.json').write_text(json.dumps(report,indent=2));print('ARMOR_STUDY',json.dumps(report))
