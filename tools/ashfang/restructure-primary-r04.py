"""R04 original anatomical reconstruction, retaining all preceding native work.

Replace the soft cranial volume and compressed wing-fan shortcut. Explicit new
cranial planes, recessed orbits, separated mandible and length-preserving wing
landmarks are primary anatomy studies, not a final sculpt/rig/flight certificate.
"""
import hashlib
import json
import math
from pathlib import Path
import shutil

import bpy
import bmesh
from mathutils import Vector, Matrix

root=Path(__file__).resolve().parents[2]
base=root/'art/source/enemies/ashfang/original-2026-10-22'
source=Path(bpy.data.filepath).resolve()
if source!=(base/'milestones/M1-r03/ashfang-primary-key-corrected.blend').resolve():
    raise SystemExit('Requires original r03 key-corrected native source')
out=base/'milestones/M1-r04'
if out.exists(): raise SystemExit('Revision exists; never overwrite unique source')
out.mkdir(parents=True)
before=hashlib.sha256(source.read_bytes()).hexdigest()
scene=bpy.context.scene
pre=out/'ashfang-before-anatomical-restructure.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(pre),compress=True)

forms=bpy.data.collections.new('R04 current primary anatomy')
wing=bpy.data.collections.new('R04 articulated wing study')
construction=bpy.data.collections.new('R04 retained Boolean construction')
for c in (forms,wing,construction): scene.collection.children.link(c)
clay=bpy.data.materials['Neutral anatomy clay']
horn=bpy.data.materials['Neutral horn and claw clay']
membrane=bpy.data.materials['Neutral membrane clay']
dark=bpy.data.materials['Neutral mouth cavity']
eye=bpy.data.materials['Neutral recessed eye']

def mesh(name,vertices,faces,collection=forms,mat=clay,smooth=False):
    data=bpy.data.meshes.new(name)
    data.from_pydata(vertices,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(data);bm.free()
    ob=bpy.data.objects.new(name,data);collection.objects.link(ob)
    data.materials.append(mat)
    for f in data.polygons:f.use_smooth=smooth
    return ob

def catmull(points,steps=6):
    out=[]
    for i in range(len(points)-1):
        aa,b,c,d=[points[j] for j in (max(0,i-1),i,i+1,min(len(points)-1,i+2))]
        for j in range(steps):
            t=j/steps
            out.append(tuple(.5*(2*bv+(-av+cv)*t+(2*av-5*bv+4*cv-dv)*t*t+
                       (-av+3*bv-3*cv+dv)*t*t*t) for av,bv,cv,dv in zip(aa,b,c,d)))
    return out+[tuple(points[-1])]

def tube(name,points,radii,collection=wing,mat=clay,sides=16):
    raw=[tuple(p)+tuple(r) for p,r in zip(points,radii)]
    curve=catmull(raw)
    verts=[];faces=[]
    for i,v in enumerate(curve):
        p=Vector(v[:3]);t=Vector(curve[min(i+1,len(curve)-1)][:3])-Vector(curve[max(0,i-1)][:3])
        t.normalize();side=t.cross(Vector((0,0,1)))
        if side.length<.01:side=t.cross(Vector((0,1,0)))
        side.normalize();up=side.cross(t).normalized()
        for j in range(sides):
            theta=math.tau*j/sides
            verts.append(tuple(p+side*max(.002,v[3])*math.cos(theta)+up*max(.002,v[4])*math.sin(theta)))
    for i in range(len(curve)-1):
        for j in range(sides):
            n=(j+1)%sides
            faces.append((i*sides+j,i*sides+n,(i+1)*sides+n,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(curve)-1)*sides+j for j in range(sides))])
    return mesh(name,verts,faces,collection,mat,True)

def plane_loft(name,profiles):
    # Polygonal cranial planes, not circular rings. Each profile:
    # y,half-width,dorsal roof,ventral floor. Symmetrical primary topology.
    vertices=[];faces=[]
    for y,w,roof,floor in profiles:
        h=roof-floor
        contour=[(0,roof),(.50*w,roof+.035),(.88*w,roof-.10*h),
                 (w,floor+.64*h),(.95*w,floor+.18*h),(.50*w,floor),
                 (0,floor-.025),(-.50*w,floor),(-.95*w,floor+.18*h),
                 (-w,floor+.64*h),(-.88*w,roof-.10*h),(-.50*w,roof+.035)]
        vertices.extend((x,y,z) for x,z in contour)
    n=12
    for i in range(len(profiles)-1):
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((len(profiles)-1)*n+j for j in range(n))])
    ob=mesh(name,vertices,faces)
    bevel=ob.modifiers.new('Cranial primary plane edge radius','BEVEL')
    bevel.width=.065;bevel.segments=3
    return ob

# Bake only the new r04 body copy; the immediately preceding native preserves
# all r03 keys and previous anatomy. No unique mesh or project is deleted.
old=bpy.data.objects['Ashfang original primary skin']
graph=bpy.context.evaluated_depsgraph_get()
data=bpy.data.meshes.new_from_object(old.evaluated_get(graph),depsgraph=graph)
body=bpy.data.objects.new('Ashfang r04 integrated primary skin',data);forms.objects.link(body)
old.name='History r03 skin with all editable keys'
old.hide_render=True;old.hide_set(True)

# Remove obsolete long wing-arm stalks only from the new body mesh, retain source.
bm=bmesh.new();bm.from_mesh(data)
obsolete=[v for v in bm.verts if abs(v.co.x)>1.38 and v.co.z>3.73]
bmesh.ops.delete(bm,geom=obsolete,context='VERTS')
edges=[e for e in bm.edges if e.is_boundary]
bmesh.ops.holes_fill(bm,edges=edges,sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
for f in data.polygons:f.use_smooth=True
body['preceding_editable_source']=str(pre.relative_to(root)).replace('\\','/')
body['status']='Primary anatomical copy; pre-bake native retained'

# Keep failed r03 head and wing geometry as inspectable history, not active art.
head_tokens=('Original cranial','Independent lower mandible','Mouth floor',
             'recessed eye','upper tooth','lower tooth')
for ob in list(bpy.data.objects):
    if ob==body:continue
    if any(t in ob.name for t in head_tokens) or ob.name in [o.name for o in bpy.data.collections['03 Wing construction'].objects]:
        ob.hide_render=True;ob.hide_set(True)

skull=plane_loft('R04 original cranial planes',[
    (-6.98,.25,3.10,2.88),(-6.79,.45,3.26,2.76),
    (-6.34,.61,3.30,2.77),(-5.86,.70,3.43,2.79),
    (-5.46,.78,3.56,2.83),(-5.03,.88,3.72,2.88),
    (-4.56,1.00,3.90,2.74),(-4.16,.86,3.79,2.84),(-3.94,.52,3.53,2.96)])
jaw=plane_loft('R04 independent mandible',[
    (-6.90,.25,2.58,2.43),(-6.68,.44,2.59,2.33),
    (-6.15,.57,2.60,2.28),(-5.62,.62,2.67,2.33),
    (-5.05,.69,2.79,2.43),(-4.53,.76,3.02,2.62),(-4.13,.46,3.11,2.83)])

def cutter(name,location,scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=location)
    ob=bpy.context.object;ob.name=name;ob.scale=scale
    for c in list(ob.users_collection):c.objects.unlink(ob)
    construction.objects.link(ob)
    ob.hide_render=True;ob.display_type='WIRE'
    return ob

# Preserve the new planar construction before Booleans as well as the preceding
# r03 source. Cutters remain native geometry for later edit/retopo reference.
cutters=[]
for sign,label in [(-1,'L'),(1,'R')]:
    cutters.append(cutter(label+' r04 orbital excavation',(sign*.86,-5.10,3.49),(.32,.42,.205)))
    cutters.append(cutter(label+' r04 nasal aperture',(sign*.34,-6.66,3.24),(.115,.23,.11)))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-planar-preboolean.blend'),compress=True)
bpy.ops.object.select_all(action='DESELECT');skull.select_set(True)
bpy.context.view_layer.objects.active=skull
for c in cutters:
    mod=skull.modifiers.new(c.name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c
    bpy.ops.object.modifier_apply(modifier=mod.name)
    c.hide_set(True)

lower_objects=[jaw]
tongue=tube('R04 mouth floor and tongue',[(0,-6.63,2.63),(0,-5.65,2.71),(0,-4.62,2.95)],
            [(.28,.035),(.45,.05),(.38,.08)],forms,dark,20)
lower_objects.append(tongue)
for sign,label in [(-1,'L'),(1,'R')]:
    tube(label+' r04 sheltered eye',[(sign*.73,-5.22,3.49),(sign*.80,-5.10,3.49),(sign*.76,-4.98,3.49)],
         [(.065,.04),(.10,.06),(.06,.04)],forms,eye)
    for index,(y,x,length) in enumerate([(-6.70,.35,.18),(-6.41,.49,.29),(-6.07,.58,.38),
                                       (-5.69,.64,.29),(-5.32,.70,.24),(-4.96,.74,.20)]):
        z=2.85+(y+6.4)*.07
        tube(f'{label} r04 upper rooted tooth {index}',[(sign*x,y,z),(sign*x*.98,y-.025,z-length*.55),
             (sign*x*.94,y-.06,z-length)],[ (.085,.07),(.055,.045),(.002,.002)],forms,horn,12)
        lower=tube(f'{label} r04 lower rooted tooth {index}',[(sign*x*.97,y+.15,2.64),
             (sign*x*.95,y+.14,2.75),(sign*x*.91,y+.12,2.86)],
             [(.065,.055),(.04,.035),(.002,.002)],forms,horn,12)
        lower_objects.append(lower)

# Genuine closed/open mandible study about the recorded hinge. It is a static
# design pose; no face rig or performance animation is claimed.
pivot=Vector((0,-4.22,3.04));rotate=Matrix.Rotation(math.radians(-7),3,'X')
for ob in lower_objects:
    ob.shape_key_add(name='Basis - open jaw')
    key=ob.shape_key_add(name='M1 jaw closed study',from_mix=False)
    for v in key.data:v.co=pivot+rotate@(v.co-pivot)
    key.value=0

# Rebuilt compact muscular wing-arm and finger landmarks; the folded finger
# chain keeps each segment's actual landmark length rather than scaling a fan.
origin=Vector((2.80,-.75,5.46))
extended=[[(2.80,-.75,5.46),(5.05,-.26,5.96),(7.12,.55,6.15),(8.60,1.62,5.83)],
          [(2.80,-.75,5.46),(4.66,.94,5.33),(6.05,2.65,4.90),(6.75,4.06,4.15)],
          [(2.80,-.75,5.46),(3.94,1.45,4.75),(4.50,3.57,3.87),(4.58,4.90,2.92)],
          [(2.80,-.75,5.46),(3.02,1.57,4.42),(2.81,3.12,3.36),(2.60,4.13,2.42)]]
fold_directions=[[(.20,.91,-.36),(.04,.84,-.54),(-.12,.77,-.62)],
                 [(.03,.90,-.44),(-.13,.82,-.56),(-.18,.76,-.62)],
                 [(-.24,.92,-.31),(-.37,.82,-.44),(-.39,.76,-.51)],
                 [(-.48,.86,-.17),(-.52,.77,-.36),(-.56,.72,-.41)]]
folded=[];length_checks=[]
for i,chain in enumerate(extended):
    points=[origin.copy()]
    for j,(aa,bb) in enumerate(zip(chain,chain[1:])):
        length=(Vector(bb)-Vector(aa)).length
        point=points[-1]+Vector(fold_directions[i][j]).normalized()*length
        length_checks.append({'digit':i,'segment':j,'extendedLength':length,
                              'foldedLength':(point-points[-1]).length})
        points.append(point)
    folded.append([tuple(v) for v in points])
# A body attachment edge is not an extra finger. It anchors the wing web.
extended.append([(2.80,-.75,5.46),(2.31,.90,4.20),(1.48,2.20,3.10),(1.0,2.95,2.45)])
folded.append(extended[-1])

for sign,label in [(-1,'L'),(1,'R')]:
    def mirror(points):return [(sign*x,y,z) for x,y,z in points]
    tube(label+' r04 wing shoulder humerus forearm wrist',mirror([
        (.82,-.45,3.62),(1.32,-.02,4.02),(1.73,.66,4.34),
        (2.02,.48,4.76),(2.42,-.30,5.21),(2.80,-.75,5.46)]),
        [(.43,.53),(.45,.48),(.33,.34),(.24,.27),(.19,.22),(.20,.22)])
    full=[];fold=[]
    for d,(open_chain,closed_chain) in enumerate(zip(extended,folded)):
        full.append(catmull(mirror(open_chain),12));fold.append(catmull(mirror(closed_chain),12))
        if d<4:
            ob=tube(f'{label} r04 articulated wing finger {d+1}',mirror(open_chain),
                    [(.15,.15),(.12,.12),(.065,.065),(.006,.006)])
            ob.shape_key_add(name='Basis - extended wing')
            key=ob.shape_key_add(name='Provisional relaxed digit carriage - articulated study',from_mix=False)
            # Reconstruct corresponding curved cross sections around the folded
            # polyline, preserving section count and radii, not scaled geometry.
            temporary=tube('Construction folded finger '+label+str(d),mirror(closed_chain),
                    [(.15,.15),(.12,.12),(.065,.065),(.006,.006)],construction)
            for v,other in zip(key.data,temporary.data.vertices):v.co=other.co
            temporary.hide_render=True;temporary.hide_set(True);key.value=1
    for panel in range(4):
        def surface(curves):
            vertices=[]
            rows=len(curves[panel]);cols=16
            for row in range(rows):
                u=row/(rows-1)
                aa,bb=Vector(curves[panel][row]),Vector(curves[panel+1][row])
                for col in range(cols+1):
                    t=col/cols
                    pt=aa.lerp(bb,t)
                    camber=math.sin(math.pi*t)*math.sin(math.pi*u)
                    pt.z+=.27*camber
                    pt+=(Vector(mirror([tuple(origin)])[0])-pt)*(.10*math.sin(math.pi*t)*u**5)
                    vertices.append(tuple(pt))
            return vertices
        vertices=surface(full);rows=len(full[panel]);cols=16
        faces=[]
        for row in range(rows-1):
            for col in range(cols):
                i=row*(cols+1)+col;faces.append((i,i+1,i+cols+2,i+cols+1))
        ob=mesh(f'{label} r04 articulated web panel {panel+1}',vertices,faces,wing,membrane,True)
        ob.shape_key_add(name='Basis - extended membrane')
        key=ob.shape_key_add(name='Provisional relaxed digit carriage - articulated study',from_mix=False)
        for v,co in zip(key.data,surface(fold)):v.co=co
        key.value=1
        mod=ob.modifiers.new('Membrane thickness','SOLIDIFY');mod.thickness=.025
    tube(label+' r04 wrist thumb',mirror([tuple(origin),(2.72,-1.20,5.78),(2.48,-1.42,5.77)]),
         [(.14,.14),(.085,.085),(.002,.002)],wing,horn)

scene['stage']='M1 r04 anatomical primary reconstruction; not accepted sculpt or rig'
scene['camera_head_target']=[0,-5.15,3.30]
final=out/'ashfang-primary.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(final),compress=True)
working=base/'working/ashfang-working-r04.blend'
if working.exists():raise SystemExit('Never overwrite unpreserved working source')
shutil.copy2(final,working)
if hashlib.sha256(source.read_bytes()).hexdigest()!=before:raise RuntimeError('Prior source changed')
report={'revision':'M1-r04','sourceSha256':before,'ownerAccepted':False,'rigged':False,
        'sculptComplete':False,'geometryImported':False,
        'changes':['Explicit cranial planes and recessed orbits','Independent mandible open/closed study',
                   'Replaced old wing-arm stalks','Landmark-length-preserving articulated wing studies'],
        'wingLengthChecks':length_checks,
        'maximumWingSegmentLengthError':max(abs(r['extendedLength']-r['foldedLength']) for r in length_checks),
        'limits':'Static design pose keys are not a production rig, skinning or physical flight validation',
        'files':[{'path':str(f.relative_to(root)).replace('\\','/'),'bytes':f.stat().st_size,
                  'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in
                 (pre,out/'ashfang-planar-preboolean.blend',final,working)]}
(out/'authoring-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
