#!/usr/bin/env python3
"""Hollowed new-from-zero H1 anatomical sculpture. STATIC ART ONLY.

Original multi-surface sculpt generated in model space. There is NO import of
WyrmForge's rejected Hollowed source, and NO animation/renderer/runtime edits.
Geometry is real triangulated 3D, not an image. H1 concept, NOT H2 topology.
Output: glb plus honest original-source orthographic 3D review images.

Dependencies: numpy, scipy, scikit-image, trimesh, Pillow, vtk.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
import trimesh
from skimage.measure import marching_cubes

FLESH=(113,107,100,255)
FLESH_DARK=(94,91,88,255)
BONE=(161,151,133,255)
TOOTH=(182,168,146,255)
CHAR=(47,44,44,255)
CLAY=(159,149,139,255)


def tube(points, radii, sides=12):
    """Closed curved tapering tube, including point caps; independent real geometry."""
    q=np.asarray(points,float)
    verts=[];faces=[]
    for i,(p,r) in enumerate(zip(q,radii)):
        d=q[min(len(q)-1,i+1)]-q[max(0,i-1)]
        d/=max(np.linalg.norm(d),1e-9)
        v=np.array([0.,0.,1.]) if abs(d[2])<.85 else np.array([0.,1.,0.])
        u=np.cross(d,v);u/=np.linalg.norm(u);v=np.cross(d,u)
        rx,ry=(r,r) if np.isscalar(r) else r
        for j in range(sides):
            a=j*2*math.pi/sides
            verts.append(p+u*rx*np.cos(a)+v*ry*np.sin(a))
        if i:
            for j in range(sides):
                a=(i-1)*sides+j; b=(i-1)*sides+(j+1)%sides
                c=i*sides+(j+1)%sides; d=i*sides+j
                faces.extend(((a,b,c),(a,c,d)))
    verts.extend([q[0],q[-1]]); a=len(verts)-2;b=len(verts)-1
    for j in range(sides):
        faces.append((a,j,(j+1)%sides));faces.append((b,(len(q)-1)*sides+(j+1)%sides,(len(q)-1)*sides+j))
    mesh=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=True)
    return mesh


class Field:
    """SDF primary connected undead soft tissue with real carved eye/wound cavities."""
    def __init__(self,step=.030):
        self.step=step
        self.x=np.arange(-1.45,1.45+step,step,dtype=np.float32)
        self.y=np.arange(-1.65,1.0+step,step,dtype=np.float32)
        self.z=np.arange(-.08,3.83+step,step,dtype=np.float32)
        self.X=self.x[:,None,None];self.Y=self.y[None,:,None];self.Z=self.z[None,None,:]
        self.f=np.full((len(self.x),len(self.y),len(self.z)),8,dtype=np.float32)
    def blend(self,v,s=.02):
        k=max(s,1e-8)
        h=np.maximum(k-np.abs(v-self.f),0)/k
        self.f=np.minimum(v,self.f)-h*h*k*.25
    def ellipsoid(self,c,r,blend=.01):
        dx=(self.X-c[0])/r[0];dy=(self.Y-c[1])/r[1];dz=(self.Z-c[2])/r[2]
        f=(np.sqrt(dx*dx+dy*dy+dz*dz)-1)*min(r)
        self.blend(f,blend)
    def capsule(self,a,b,r,blend=.03):
        a=np.asarray(a);b=np.asarray(b);d=b-a;l=float(np.dot(d,d))
        t=np.clip(((self.X-a[0])*d[0]+(self.Y-a[1])*d[1]+(self.Z-a[2])*d[2])/max(l,1e-8),0,1)
        v=np.sqrt((self.X-a[0]-d[0]*t)**2+(self.Y-a[1]-d[1]*t)**2+(self.Z-a[2]-d[2]*t)**2)
        rad=r if np.isscalar(r) else r[0]*(1-t)+r[1]*t
        self.blend(v-rad,blend)
    def carve_ellipsoid(self,c,r):
        v=np.sqrt(((self.X-c[0])/r[0])**2+((self.Y-c[1])/r[1])**2+((self.Z-c[2])/r[2])**2)
        self.f=np.maximum(self.f,-(v-1)*min(r))
    def mesh(self):
        vs,fs,_,_=marching_cubes(self.f,0,spacing=(self.step,)*3)
        vs+=np.array((self.x[0],self.y[0],self.z[0]))
        return trimesh.Trimesh(vertices=vs,faces=fs,process=True)


def make_wretch():
    """Heavy shoulders over collapsed waist; large skull; damaged human-not-demon anatomy."""
    s=Field(); components=[];serial={}
    def add(name,geo,color):
        serial[name]=serial.get(name,0)+1
        geo.visual.vertex_colors=np.tile(np.array(color,dtype=np.uint8),(len(geo.vertices),1))
        components.append((f'{name}_{serial[name]:02d}',geo,color))
    def curve(name,points,rs,color=BONE,sides=12):
        add(name,tube(points,rs,sides=sides),color)
    def oval(name,c,r,color=BONE,sub=2):
        m=trimesh.creation.icosphere(subdivisions=sub)
        m.vertices*=np.asarray(r);m.apply_translation(c)
        add(name,m,color)

    # Irregular structure: centerline leans forward, one clavicle raised and head tilted.
    pelvis=(0,.17,1.26)
    chest=(-.07,-.15,2.23)
    neck=(-.11,-.37,2.64)
    skull=(-.17,-.56,3.06)
    # Pelvis, skinny asymmetrical belly, separate thorax volumes rather than a smooth barrel.
    s.ellipsoid((.0,.16,1.28),(.32,.235,.245),.05)
    s.capsule((0,.16,1.4),(-.06,-.10,1.95),(.145,.18),.12)
    s.ellipsoid((-.07,-.14,2.11),(.41,.245,.46),.14)
    s.ellipsoid((-.09,-.17,2.36),(.46,.27,.24),.12)
    s.ellipsoid((-.06,-.26,2.45),(.36,.24,.19),.10)
    s.capsule((-.08,-.18,2.44),(-.14,-.35,2.74),(.125,.155),.07)
    s.ellipsoid((-.15,-.39,2.62),(.15,.17,.15),.06)
    # Clearly HUMAN cranium: broad brain-case, narrow lower face, heavy brow, broken jaw.
    s.ellipsoid(skull,(.330,.267,.313),.06)
    s.ellipsoid((-.103,-.367,3.09),(.272,.206,.301),.055)
    s.ellipsoid((-.303,-.63,2.98),(.145,.12,.174),.024)
    # Infected flesh droops across half a destroyed orbital rim.
    s.ellipsoid((-.034,-.720,3.04),(.081,.070,.150),.025)
    s.ellipsoid((-.18,-.69,2.88),(.238,.198,.21),.065)
    s.ellipsoid((-.18,-.80,2.83),(.18,.12,.105),.023)
    s.capsule((-.19,-.79,2.91),(-.21,-.84,2.74),(.085,.057),.03)
    # One side of lower jaw collapsed; mouth open. Jaw remains supported at hinge.
    s.capsule((-.36,-.65,2.81),(-.34,-.83,2.68),(.067,.058),.027)
    s.capsule((.02,-.64,2.78),(.005,-.80,2.63),(.052,.042),.022)
    s.capsule((-.34,-.83,2.68),(-.19,-.89,2.65),(.056,.043),.028)
    s.capsule((-.19,-.89,2.65),(.005,-.80,2.63),(.048,.034),.018)

    # Actual bone sockets cut deep THROUGH flesh surface; not emissive eye decals.
    s.carve_ellipsoid((-.324,-.775,3.065),(.148,.181,.134))
    s.carve_ellipsoid((-.030,-.765,3.075),(.086,.119,.104))
    s.carve_ellipsoid((-.180,-.835,2.92),(.061,.09,.13))
    s.carve_ellipsoid((-.19,-.864,2.715),(.146,.105,.051))
    # Two sunken ash holes on real torso, eccentric, edges showing depth and underside.
    s.carve_ellipsoid((-.265,-.347,2.18),(.246,.23,.286))
    s.carve_ellipsoid((.27,-.323,1.99),(.116,.145,.139))
    # Subtle waist and cheek tear, not detached fabric.
    s.carve_ellipsoid((.31,-.072,1.47),(.113,.18,.17))
    s.carve_ellipsoid((.17,-.774,2.907),(.08,.075,.10))

    # Arms: asymmetry and broken proportions, one longer reaching arm.
    arm_paths=[
        [(-.49,-.17,2.47),(-.66,-.41,2.22),(-.68,-.59,1.89),(-.48,-.91,1.52)],
        [(.32,-.25,2.25),(.59,-.47,1.84),(.82,-.70,1.50),(1.00,-1.10,1.18)],
    ]
    for side,path in zip((-1,1),arm_paths):
        shoulder,elbow_line,*_=path
        s.ellipsoid(shoulder,(.22,.21,.23),.08)
        s.capsule(path[0],path[1],(.205,.142) if side<0 else (.160,.119),.075)
        s.capsule(path[1],path[2],(.125,.105) if side<0 else (.115,.084),.07)
        s.capsule(path[2],path[3],(.098,.076),.06)
        w=path[3]
        s.ellipsoid((w[0],w[1]-.07,w[2]-.06),(.135,.146,.175),.045)
        for i in range(4):
            o=(i-1.5)*.085
            p=(w[0]+o,w[1]-.13,w[2]-.14)
            m=(p[0]+side*.035,w[1]-.29-(i%2)*.025,w[2]-.22)
            t=(m[0]+side*.035+(i-1.5)*.025,m[1]-.16-(i==1)*.045,m[2]-.125)
            s.capsule(p,m,(.047,.032),.03)
            s.capsule(m,t,(.032,.007),.015)
        t=(w[0]-side*.14,w[1]-.14,w[2]-.055)
        e=(t[0]-side*.13,t[1]-.13,t[2]-.14)
        s.capsule(w,t,(.07,.051),.02);s.capsule(t,e,(.043,.008),.02)
    # Deformed but weight-bearing legs. Injured right tibia & inward knee.
    legs=[
        ((-.23,.09,1.22),(-.40,-.20,.70),(-.49,-.09,.19)),
        ((.22,.15,1.24),(.27,-.03,.73),(.51,.20,.17)),
    ]
    for side,(hip,knee,ankle) in zip((-1,1),legs):
        s.capsule(hip,knee,(.205,.128),.07)
        s.ellipsoid(knee,(.125,.113,.13),.055)
        s.capsule(knee,ankle,(.113,.067),.055)
        ax,ay,az=ankle
        s.ellipsoid((ax,ay-.12,.095),(.122,.241,.092),.045)
        for j in range(3):
            x=ax+(j-1)*.071
            s.capsule((x,ay-.18,.07),(x+(j-1)*.022,ay-.34,.055),(.043,.017),.025)

    main=s.mesh()
    # Marching-cubes occasionally yields degenerate islands at sub-voxel tips.
    # Filter micro-components only (<64 faces); retain every anatomical volume.
    pieces=[c for c in main.split(only_watertight=False) if len(c.faces)>=64]
    main=trimesh.util.concatenate(pieces) if len(pieces)>1 else pieces[0]
    add('connected_anatomical_tissue',main,FLESH)

    # Anatomic bony landmarks become *attached* to flesh, not floating toy pieces.
    for side in (-1,1):
        # Vault with broken orbital ridges/zygoma so cavities are framed in real 3D.
        center_x=skull[0]+side*.141
        curve('socket_brow',[(center_x-side*.105,-.75,3.16),
                            (center_x,-.837,3.176),
                            (center_x+side*.11,-.754,3.153)], [.037,.042,.028],BONE)
        curve('cheekbone',[(center_x+side*.10,-.708,3.02),
                           (center_x+side*.092,-.80,2.977),
                           (center_x,-.82,2.927)], [.049,.049,.028],BONE)
        # clavicle follows actual anterior shoulder line, broken on right.
        b=.48 if side<0 else .37
        curve('clavicle', [(-.07,-.41,2.46),(.08*side-.07,-.395,2.48),
                          (b*side-.07,-.29,2.41)], [.051,.060,.05],BONE)
        # Rib arcs mounted on thorax; spaced, decreasing in size toward abdomen.
        if side < 0:
          for i in range(5):
            z=2.34-i*.135
            width=(.34-.036*i)
            side_x=-.07+side*width
            # Large frontal curves, partially embedded into clay body.
            curve('exposed_left_rib', [(-.07,-.337, z+.006),
                         (-.07+side*.12,-.347,z+.018),
                         (-.07+side*(width*.82),-.325,z+.036),
                         (side_x,-.240,z+.01),
                         (side_x-side*.035,-.085,z-.034)],
                  [.019,.025,.035,.031,.017],BONE,10)
        if side < 0:
            curve('iliac_bone', [(side*.14,.06,1.32),(side*.29,.03,1.43),
                                 (side*.32,.15,1.31)], [.042,.053,.036],BONE)
    curve('sternum',[(-.07,-.372,2.50),(-.075,-.36,2.31),(-.055,-.30,2.12)],
          [.039,.049,.022],BONE)
    # Deliberately uneven teeth across the physical mouth gap.
    for i in range(5):
        x=-.31+i*.057
        y=-.871+(abs(i-2)*.014)
        if i!=3:
            curve('incisor',[(x,y,2.776),(x+.009,y-.02,2.722)], [.017,.005],TOOTH,7)
    # Dorsal vertebrae exposed through partly eroded right-side back, not a backpack.
    for z in (2.27,2.10):
        oval('spinous_process',(-.07,.111,z),(.019,.020,.024),BONE,1)
    # Dark, connected wound interior physically follows carved depth and cannot float on backside.
    oval('deep_rib_wound',(-.256,-.193,2.18),(.158,.022,.177),CHAR,2)
    oval('deep_abdominal_wound',(.268,-.188,1.99),(.076,.029,.107),CHAR,2)

    # One expressive segmented hand with real claw bases (no debris particles).
    for side,w in [(-1,arm_paths[0][-1]),(1,arm_paths[1][-1])]:
        for j in range(4):
            o=(j-1.5)*.085
            p=(w[0]+o+side*.06,w[1]-.41-(j%2)*.02,w[2]-.295)
            e=(p[0]+side*.035,w[1]-.51-(j==1)*.045,w[2]-.39)
            curve('exposed_claw_tip',[p,e],[.030,.003],TOOTH,8)

    # Shared source-space severe cervical/upper-spine kyphosis: deform *every*
    # anatomical part, not per-frame sprites and not renderer-specific posing.
    for _,mesh,_ in components:
        v=mesh.vertices
        weight=np.clip((v[:,2]-1.32)/2.0,0.0,1.0)
        v[:,1]-=(weight**1.2)*.28
        v[:,0]+=(weight**1.4)*.035
        mesh.vertices=v
    scene=trimesh.Scene()
    for key,mesh,_ in components:
        scene.add_geometry(mesh,geom_name=key,node_name=key)
    return scene,main,components


def vtk_actor(poly,color,clay=False,silhouette=False):
    import vtk
    verts=vtk.vtkPoints(); verts.SetDataTypeToFloat()
    for v in poly.vertices: verts.InsertNextPoint(*map(float,v))
    polys=vtk.vtkCellArray()
    for tri in poly.faces:
        t=vtk.vtkTriangle()
        for i,v in enumerate(tri):t.GetPointIds().SetId(i,int(v))
        polys.InsertNextCell(t)
    pd=vtk.vtkPolyData();pd.SetPoints(verts);pd.SetPolys(polys)
    normals=vtk.vtkPolyDataNormals();normals.SetInputData(pd)
    normals.SetFeatureAngle(62);normals.ConsistencyOn();normals.SplittingOff()
    mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(normals.GetOutputPort())
    actor=vtk.vtkActor();actor.SetMapper(mapper)
    c=(.055,.054,.055) if silhouette else ((.65,.63,.60) if clay else tuple(v/255 for v in color[:3]))
    actor.GetProperty().SetColor(*c)
    actor.GetProperty().SetAmbient(1 if silhouette else .32)
    actor.GetProperty().SetDiffuse(0 if silhouette else .68)
    actor.GetProperty().SetSpecular(0 if silhouette else .05)
    return actor


def render(src,outdir):
    import vtk
    from PIL import Image,ImageDraw,ImageFont
    from io import BytesIO
    views={'front':(0,-8.0,2.15),'threequarter':(-5.0,-7.0,2.9),
           'profile':(-8.0,-.10,2.3),'back':(0,8.0,2.15)}
    for mode in ('clay','material','silhouette'):
        imgs=[]
        for name,eye in views.items():
            ren=vtk.vtkRenderer();ren.SetBackground(.085,.088,.10)
            for _,mesh,col in src:
                ren.AddActor(vtk_actor(mesh,col,mode=='clay',mode=='silhouette'))
            cam=ren.GetActiveCamera();cam.SetPosition(*eye);cam.SetFocalPoint(0,-.27,1.72)
            cam.SetViewUp(0,0,1);cam.ParallelProjectionOn();cam.SetParallelScale(1.96)
            key=vtk.vtkLight();key.SetLightTypeToSceneLight()
            key.SetPosition(-3,-6,7);key.SetFocalPoint(0,0,2);key.SetIntensity(.9)
            ren.AddLight(key)
            fill=vtk.vtkLight();fill.SetLightTypeToSceneLight()
            fill.SetPosition(4,4,5);fill.SetFocalPoint(0,0,1.7);fill.SetIntensity(.35)
            ren.AddLight(fill)
            ren.ResetCameraClippingRange()
            win=vtk.vtkRenderWindow();win.SetOffScreenRendering(True)
            win.AddRenderer(ren);win.SetSize(400,490);win.SetMultiSamples(4)
            win.Render()
            cap=vtk.vtkWindowToImageFilter();cap.SetInput(win)
            cap.SetInputBufferTypeToRGB();cap.ReadFrontBufferOff();cap.Update()
            writer=vtk.vtkPNGWriter();writer.SetWriteToMemory(True)
            writer.SetInputConnection(cap.GetOutputPort());writer.Write()
            im=Image.open(BytesIO(memoryview(writer.GetResult()).tobytes())).convert('RGB')
            draw=ImageDraw.Draw(im)
            draw.text((14,12),f'{name.upper()} | {mode.upper()} | REAL 3D SOURCE',fill=(229,226,217))
            imgs.append(im)
            win.Finalize()
        img=Image.new('RGB',(400*4,490),(18,18,22))
        for i,im in enumerate(imgs):img.paste(im,(i*400,0))
        img.save(outdir/f'hollowed-anatomical-v3-{mode}-4views.png')
        if mode in ('clay','silhouette'):
            # Actual downsampled native game-scale preview; no fake detail.
            native=img.resize((96*4,118),Image.Resampling.BOX)
            native.save(outdir/f'hollowed-anatomical-v3-{mode}-native96.png')


def main():
    p=argparse.ArgumentParser();p.add_argument('--output',default='artifacts/hollow-rebuild/h1-anatomical-v3')
    p.add_argument('--render',action='store_true');args=p.parse_args()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    scene,main,parts=make_wretch()
    path=out/'hollowed-anatomical-v3.glb';scene.export(path)
    report={'status':'H1 ANATOMICAL STUDY ONLY — NOT APPROVED, NOT BLENDER RENDERED',
            'source':'new original implicit sculpt and attached 3D bony landmarks',
            'never_imported':['previous Hollowed','Ashling','universal animation engine'],
            'base_mesh_watertight':bool(main.is_watertight),
            'base_mesh_components':len(main.split(only_watertight=False)),
            'base_faces':len(main.faces),'parts':len(parts),
            'total_triangles':sum(len(p.faces) for _,p,_ in parts),
            'bounds_m':scene.bounds.tolist(),'glb_sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    (out/'model-qc.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if args.render:render(parts,out)


if __name__=='__main__': main()