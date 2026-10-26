"""WyrmForge Arcane Nexus: geometry-first T1/T2 Step 4 greybox.

Real individual 3D architectural components, no town painting/albedo projection.
Export: GLB with semantic object groups. Optional --render requires VTK and Pillow.
Uses a common grey material only; shaded darker inset details show structural depth.
All dimensions are provisional until owner signs off the silhouette/camera match.
"""
from __future__ import annotations
from collections import defaultdict
from pathlib import Path
import math
import sys
import numpy as np
import trimesh as tm

OUT=Path(sys.argv[1]) if len(sys.argv)>1 and not sys.argv[1].startswith('--') else Path('artifacts/town-nexus/step4')
OUT.mkdir(parents=True,exist_ok=True)
PARTS=defaultdict(list)
GREY={'wall':(170,174,180,255),'stone':(161,167,175,255),'dark':(101,108,119,255),
      'roof':(140,146,156,255),'trim':(201,205,210,255),'metal':(187,191,197,255),
      'ground':(220,222,226,255),'wood':(151,155,163,255)}


def add(group, mesh, material='stone'):
    if not isinstance(mesh,tm.Trimesh) or mesh.is_empty: raise ValueError(group)
    mesh.visual.face_colors=np.asarray(GREY[material],dtype=np.uint8)
    PARTS[group].append(mesh)
    return mesh

def box(group,center,size,material='stone'):
    m=tm.creation.box(extents=size);m.apply_translation(center);return add(group,m,material)

def cylinder(group,center,r,h,material='stone',sections=36):
    m=tm.creation.cylinder(radius=r,height=h,sections=sections);m.apply_translation(center);return add(group,m,material)

def cone(group,center,r,h,material='stone',sections=12):
    m=tm.creation.cone(radius=r,height=h,sections=sections);m.apply_translation(center);return add(group,m,material)

def sphere(group,center,r,material='metal',subdivisions=2):
    m=tm.creation.icosphere(subdivisions=subdivisions,radius=r);m.apply_translation(center);return add(group,m,material)

def beam(group,a,b,r=.046,material='trim',sections=7):
    a,b=np.array(a,dtype=float),np.array(b,dtype=float)
    d=b-a;L=np.linalg.norm(d)
    if L<1e-5:return
    m=tm.creation.cylinder(radius=r,height=L,sections=sections)
    m.apply_transform(tm.geometry.align_vectors([0,0,1],d));m.apply_translation((a+b)/2)
    add(group,m,material)

def extrude_xy(group,poly,z0,z1,material='stone'):
    """A solid extruded world-horizontal footprint: not a camera silhouette."""
    n=len(poly); verts=np.array([(x,y,z) for z in (z0,z1) for x,y in poly],float)
    fs=[]
    for i in range(1,n-1):fs.extend([(0,i+1,i),(n,n+i,n+i+1)])
    for i in range(n): j=(i+1)%n;fs.extend([(i,j,n+j),(i,n+j,n+i)])
    return add(group,tm.Trimesh(vertices=verts,faces=fs,process=True),material)

def panel_xz(group,outline,y0,y1,material='stone'):
    """True frontal wall thickness with explicit side faces."""
    n=len(outline);v=np.array([(x,y,z) for y in (y0,y1) for x,z in outline],float)
    fs=[]
    for i in range(1,n-1):fs.extend([(0,i,i+1),(n,n+i+1,n+i)])
    for i in range(n):j=(i+1)%n;fs.extend([(i,j,n+j),(i,n+j,n+i)])
    return add(group,tm.Trimesh(vertices=v,faces=fs,process=True),material)

def roof(group,cx,cy,width,depth,eave,rise,material='roof',decorate=True):
    """Two real solid sloped roof planes; steep pitched silhouette with slate-course seams."""
    x0,x1=cx-width/2,cx+width/2;y0,y1=cy-depth/2,cy+depth/2
    ridge=eave+rise
    for side,(lo,hi) in enumerate([((x0,y0,eave),(cx,y0,ridge)),((cx,y0,ridge),(x1,y0,eave))]):
        a,b=np.array(lo),np.array(hi);ay=a.copy();ay[1]=y1;by=b.copy();by[1]=y1
        off=np.array((0,0,-.125))
        v=np.array([a,b,by,ay,a+off,b+off,by+off,ay+off]);f=np.array([[0,1,2],[0,2,3],[4,6,5],[4,7,6],
             [0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]])
        add(group,tm.Trimesh(vertices=v,faces=f,process=True),material)
        if decorate:
            for i in range(1,11):
                t=i/11; aa=a+(b-a)*t; bb=ay+(by-ay)*t
                aa[2]+=.021;bb[2]+=.021
                beam(group+'.slate-courses',aa,bb,.015,'dark',6)
            for j in range(1,9):
                t=j/9; q=a+(ay-a)*t;u=b+(by-b)*t;q[2]+=.026;u[2]+=.026
                beam(group+'.slate-seams',q,u,.008,'roof',5)
    beam(group+'.ridge',(cx,y0,ridge+.06),(cx,y1,ridge+.06),.065,'trim')
    for y in (y0,y1):
        for x,z in ((x0,eave),(cx,ridge),(x1,eave)):
            sphere(group+'.end-finials',(x,y,z),.065,'trim',1)

def pointed_arch(group,cx,y,zbottom,half_width,shoulder_z,apex_z,material='trim',r=.075,n=16):
    """Gothic lancet with paired curved arch segments meeting at a pointed apex."""
    for side in (-1,1):
        beam(group,(cx+side*half_width,y,zbottom),(cx+side*half_width,y,shoulder_z),r,material)
        start=np.array((cx+side*half_width,y,shoulder_z));apex=np.array((cx,y,apex_z))
        # Offset a quadratic curve inward, preserving straight steep slopes near cusp.
        control=np.array((cx+side*half_width*.97,y,apex_z*.61+shoulder_z*.39))
        pts=[]
        for t in np.linspace(0,1,n): pts.append((1-t)**2*start+2*(1-t)*t*control+t*t*apex)
        for a,b in zip(pts[:-1],pts[1:]):beam(group,a,b,r,material)

def tapered_pillar(group,x,y,z0,z1,r=.14,material='trim'):
    cylinder(group,(x,y,(z0+z1)/2),r,z1-z0,material,8)
    box(group+'.base',(x,y,z0+.10),(.35,.35,.20),'stone')
    box(group+'.capital',(x,y,z1-.05),(.33,.33,.14),'trim')

def buttress(group,x,y,zheight):
    box(group,(x,y,zheight*.44),(.33,.45,zheight*.85),'stone')
    cone(group+'.cap',(x,y,zheight*.94),.28,.25,'trim',4)

# ----- site and chapel: smaller, steep layered asymmetry (reference west district) -----
box('site.stone-plinth',(-.25,.4,-.21),(11.0,8.7,.42),'ground')
box('hall.foundation',(-2.80,-.25,.24),(5.6,4.2,.48),'stone')
box('hall.ground-masonry',(-2.80,-.25,1.57),(5.47,4.17,2.22),'stone')
box('hall.timber-upper',(-2.80,-.25,3.12),(5.30,4.05,.95),'wall')
roof('hall.primary-steep-slate',-2.80,-.20,6.2,4.95,3.55,2.30)
# Front-facing triangular half-timber gable cap; independently solid wall, NOT painted into image.
panel_xz('hall.front-gable', [(-5.65,3.55),(-2.80,5.86),(.05,3.55)],-2.29,-2.15,'wall')
for a,b in [((-5.65,-2.34,3.55),(-2.8,-2.34,5.86)),((-2.8,-2.34,5.86),(.05,-2.34,3.55))]:
    beam('hall.gable.rafters',a,b,.09,'wood')
for x in np.arange(-5.2,0.15,0.80):
    if -3.85<x<-2.4:continue
    beam('hall.front-studs',(x,-2.38,.67),(x,-2.38,3.48),.07,'wood')
for z in (1.2,2.8,3.5):beam('hall.front-beams',(-5.48,-2.38,z),(-.10,-2.38,z),.065,'wood')
for side in (-1,1):
    beam('hall.gable-wood-bracing',(-2.8,-2.39,4.25),(-2.8+side*1.35,-2.39,3.55),.075,'wood')
# A second setback gable with dormer (front left), and a masonry chimney, not a flat cuboid.
box('hall.left-annex.wall',(-5.13,.64,1.3),(1.25,3.15,2.6),'wall')
roof('hall.left-annex.roof',-5.12,.45,1.85,3.75,2.55,1.5)
box('hall.chimney.stone',(-4.68,1.05,4.52),(.66,.68,2.55),'stone')
box('hall.chimney.cap',(-4.68,1.05,5.88),(.88,.86,.18),'trim')
for dz in (.4,.9,1.45,1.95):box('hall.chimney.mortar',(-4.68,.68,3.45+dz),(.69,.06,.035),'dark')
# Entrance porch is a sculpted steeper pointed gable, not a rectangular door stuck on the front.
box('hall.porch.lower',(-3.92,-2.54,1.31),(2.26,1.56,2.62),'stone')
roof('hall.porch.pitched-roof',-3.92,-2.66,2.82,2.20,2.75,1.78)
panel_xz('hall.porch.gable',[(-5.24,2.72),(-3.92,4.53),(-2.60,2.72)],-3.48,-3.33,'wall')
for a,b in [((-5.24,-3.50,2.72),(-3.92,-3.50,4.53)),((-3.92,-3.50,4.53),(-2.6,-3.50,2.72))]:
    beam('hall.porch.gable-wood',a,b,.085,'wood')
box('hall.porch.recess',(-3.92,-3.42,1.08),(1.18,.08,2.13),'dark')
pointed_arch('hall.porch.pointed-arch',-3.92,-3.55,0,.69,1.84,2.47,'trim',.11)
for side in (-1,1):
    tapered_pillar('hall.porch.column',-3.92+side*.77,-3.59,0,2.4,.11)
for i in range(4):box('hall.porch.stairs',(-3.92,-4.46+i*.31,.07+i*.14),(2.1-i*.08,.46,.16+i*.05),'stone')
# Side mullioned windows with genuine protruding tracery.
for x in (-1.35,-.37):
    box('hall.windows.inset',(x,-2.45,1.73),(.55,.12,1.5),'dark')
    pointed_arch('hall.windows.pointed',x,-2.55,1.03,.32,2.08,2.61,'trim',.059)
    beam('hall.windows.mullion',(x,-2.56,1.15),(x,-2.56,2.3),.033,'trim')
for x in (-5.44,-.14):buttress('hall.corner-buttresses',x,-2.18,2.8)
# Hanging school banner from hall right facade, a three-dimensional textile panel.
panel_xz('hall.sigil-banner',[(-1.27,2.78),(-.61,2.78),(-.61,1.32),(-.94,1.08),(-1.27,1.32)],-2.54,-2.48,'wood')
beam('hall.sigil-banner.pole',(-1.41,-2.61,2.85),(-.48,-2.61,2.85),.056,'metal')

# ----- Signature structure: round Gothic observatory with OPEN structural cage -----
# Corrected from step 1's solid hemisphere that concealed the magical centerpiece.
CX,CY=1.50,.82
cylinder('observatory.round-masonry',(CX,CY,2.80),1.82,4.78,'stone',56)
cylinder('observatory.ground-plinth',(CX,CY,.47),2.08,.43,'trim',60)
for h,r in ((.75,1.96),(2.72,1.91),(4.88,1.99),(5.34,2.10)):
    cylinder('observatory.masonry-moldings',(CX,CY,h),r,.16,'trim',56)
# Visible masonry rows (thin raised courses, offset segmented stones) along cylindrical facade.
for z in np.arange(.9,5.15,.40):
    for j in range(28):
        a=(j+(int(z*10)%2)*.5)*2*math.pi/28
        start=(CX+1.85*math.cos(a),CY+1.85*math.sin(a),z)
        end=(CX+1.85*math.cos(a+.18),CY+1.85*math.sin(a+.18),z)
        beam('observatory.masonry-joints',start,end,.015,'dark',5)
# Emphatic gothic pointed window frames wrapping facade, oriented to radial viewpoint.
for i,angle in enumerate([math.radians(a) for a in (202,235,273,311,346)]):
    x=CX+1.83*math.cos(angle);y=CY+1.83*math.sin(angle)
    cylinder('observatory.window-insets',(x,y,2.89),.22,1.23,'dark',12)
    beam('observatory.lancet-peaks',(x,y,3.42),(x,y,3.76),.105,'trim')
    cylinder('observatory.window-mullions',(x,y,2.85),.045,.95,'trim',10)
# Round walls require facade windows to follow surface tangents, not be flat
# orthographic stickers. Build each dark inset and trim in the tangent plane.
for angle in [math.radians(a) for a in (220,256,296,330)]:
    normal=np.array([math.cos(angle),math.sin(angle),0.0])
    tangent=np.array([-math.sin(angle),math.cos(angle),0.0])
    def location(horizontal,z,depth=1.84):
        return np.array([CX,CY,z])+normal*depth+tangent*horizontal
    # A surface inset set just proud of the stonework, but with dark recess
    # materials to establish clear Gothic traceries in the untextured view.
    p=location(0,2.93,1.86)
    plate=tm.creation.box(extents=(.47,.055,1.47))
    rot=np.eye(4);rot[:3,0]=tangent;rot[:3,1]=normal;rot[:3,2]=[0,0,1]
    plate.apply_transform(rot);plate.apply_translation(p)
    add('observatory.pointed-windows.dark-recess',plate,'dark')
    l,r=location(-.26,2.13,1.96),location(.26,2.13,1.96)
    beam('observatory.pointed-windows.mullions',l,location(-.26,3.52,1.96),.056,'trim')
    beam('observatory.pointed-windows.mullions',r,location(.26,3.52,1.96),.056,'trim')
    beam('observatory.pointed-windows.center-bar',location(0,2.2,1.96),location(0,3.36,1.96),.041,'trim')
    top=location(0,3.92,1.97)
    for side in (-1,1):
        ps=[location(side*.26,3.48,1.97),location(side*.18,3.72,1.97),top]
        for a,b in zip(ps[:-1],ps[1:]):beam('observatory.pointed-windows.lancet-tops',a,b,.047,'trim')

# Facade hanging banners, anchored above second level.
for angle in (math.radians(270),math.radians(332)):
    x=CX+1.88*math.cos(angle);y=CY+1.88*math.sin(angle)
    # banner drapes hang from attached thin support using a real rectangular 3D plate
    box('observatory.sigil-banners',(x,y,3.23),(.61,.14,1.58),'wood')
    beam('observatory.banner-poles',(x-.39,y-.14,4.12),(x+.39,y-.14,4.12),.06,'metal')
# Open observatory platform and lower meridian ring, no solid roof!
cylinder('observatory.upper-walkway',(CX,CY,5.48),2.17,.25,'stone',64)
cylinder('observatory.gothic-rail-base',(CX,CY,5.73),2.23,.17,'trim',64)
for k in range(16):
    t=2*math.pi*k/16
    x,y=CX+2.12*math.cos(t),CY+2.12*math.sin(t)
    cylinder('observatory.open-railing-posts',(x,y,6.08),.058,.64,'metal',8)
for j in range(64):
    a,b=2*math.pi*j/64,2*math.pi*(j+1)/64
    beam('observatory.open-railing-rails',(CX+2.13*math.cos(a),CY+2.13*math.sin(a),6.42),
         (CX+2.13*math.cos(b),CY+2.13*math.sin(b),6.42),.040,'trim',5)
# Cage has 10 rib paths, arching above the actual void: tall asymmetric pointed Gothic canopy.
base_z,apex_z,radius=5.78,8.60,2.15
for k in range(10):
    angle=k*2*math.pi/10
    pts=[]
    for t in np.linspace(0,1,17):
        # sin arch drops radius to zero; rise peaks toward the aperture in dome.
        rr=radius*math.cos(t*math.pi/2)
        zz=base_z+(apex_z-base_z)*math.sin(t*math.pi/2)
        pts.append((CX+rr*math.cos(angle),CY+rr*math.sin(angle),zz))
    for a,b in zip(pts[:-1],pts[1:]):beam('observatory.open-canopy.ribs',a,b,.062,'metal',7)
# Three horizontal rings suggest a monumental open stained-glass cage but retain see-through sides.
for z,r in ((6.1,2.10),(6.87,1.87),(7.67,1.30)):
    for j in range(60):
        a,b=2*math.pi*j/60,2*math.pi*(j+1)/60
        beam('observatory.open-canopy.hoops',(CX+r*math.cos(a),CY+r*math.sin(a),z),
             (CX+r*math.cos(b),CY+r*math.sin(b),z),.036,'metal',6)
# Distinctive APPROVED roof: left side clad in actual curved slate bays while
# the right side remains open to show the levitating orrery. These are physical
# watertight shell sectors, not a projected screenshot or overlay.
for sector in range(14):
    a0=math.radians(128+sector*11.1)
    a1=math.radians(128+(sector+1)*11.1)
    for lat in range(10):
        t0=lat/10*math.pi/2*.965
        t1=(lat+1)/10*math.pi/2*.965
        def dome_pt(a,t,inset=0):
            r=(radius-inset)*math.cos(t)
            return (CX+r*math.cos(a),CY+r*math.sin(a),base_z+(apex_z-base_z)*math.sin(t)-inset*.3)
        v=np.asarray([dome_pt(a0,t0),dome_pt(a1,t0),dome_pt(a1,t1),dome_pt(a0,t1),
                      dome_pt(a0,t0,.09),dome_pt(a1,t0,.09),dome_pt(a1,t1,.09),dome_pt(a0,t1,.09)])
        faces=np.array([(0,1,2),(0,2,3),(5,4,6),(6,4,7),(0,4,5),(0,5,1),
                        (1,5,6),(1,6,2),(2,6,7),(2,7,3),(3,7,4),(3,4,0)])
        add('observatory.slate-segmented-shell',tm.Trimesh(vertices=v,faces=faces,process=True),'roof')
        if lat in (1,3,5,7,9):
            beam('observatory.slate-shell.seams',dome_pt(a0,t1),dome_pt(a1,t1),.023,'dark',5)
# Three ornamental ribs above the partially clad shell; eastern half visibly open.
for az in (128,206,284):
    a=math.radians(az)
    pp=[(CX+radius*math.cos(t*math.pi/2)*math.cos(a),
         CY+radius*math.cos(t*math.pi/2)*math.sin(a),
         base_z+(apex_z-base_z)*math.sin(t*math.pi/2)) for t in np.linspace(0,1,19)]
    for v0,v1 in zip(pp[:-1],pp[1:]):beam('observatory.slate-shell.edge-rafters',v0,v1,.075,'trim')

cone('observatory.open-canopy.finial',(CX,CY,8.78),.16,.38,'trim',12)
# A complete mechanical armillary at center of canopy, placed high for front visibility.
SC=(CX,CY,7.12)
for idx,(az,tilt,rr) in enumerate(((0,.15,.82),(.9,.66,.88),(1.6,1.10,.91),(2.4,-.30,.96))):
    pts=[]
    A=np.array([[math.cos(az),-math.sin(az),0],[math.sin(az),math.cos(az),0],[0,0,1]])
    B=np.array([[1,0,0],[0,math.cos(tilt),-math.sin(tilt)],[0,math.sin(tilt),math.cos(tilt)]])
    for t in np.linspace(0,2*math.pi,65):
        pt=np.array(SC)+A@B@np.array([rr*math.cos(t),rr*math.sin(t),0]);pts.append(pt)
    for a,b in zip(pts[:-1],pts[1:]):beam('observatory.armillary.great-rings',a,b,.035,'metal',6)
sphere('observatory.armillary.core',SC,.30,'trim',2)
for dz in (-.6,.6):
    cone('observatory.armillary.axial-finials',(CX,CY,SC[2]+dz),.095,.18,'metal',9)
# A visible pedestal underneath the levitating armillary, never occludes the sphere.
cylinder('observatory.armillary.pedestal',(CX,CY,5.87),.38,.48,'stone',10)

# ----- Portal at lower RIGHT: pointed VOLUMETRIC arched passage with gothic facade -----
box('portal.chapel.foundations',(4.28,.08,.25),(2.55,3.72,.5),'stone')
box('portal.chapel.masonry',(4.28,.08,1.95),(2.57,3.75,3.36),'stone')
# lower covered terrace rather than a generic one-piece gable
# The approved Nexus portal lives BELOW a raised walkable stone gallery, not
# below a generic pitched cottage roof. The gallery is real structural stone.
box('portal.gallery.stone-deck',(4.28,.11,3.93),(3.16,4.12,.36),'stone')
for x in np.arange(2.84,5.85,.43):
    tapered_pillar('portal.gallery.front-balustrade',x,-1.99,4.07,4.68,.066,'trim')
beam('portal.gallery.front-hand-rail',(2.78,-1.99,4.78),(5.79,-1.99,4.78),.067,'trim')
for y in np.arange(-1.90,2.13,.49):
    tapered_pillar('portal.gallery.side-balustrade',5.88,y,4.07,4.68,.066,'trim')
beam('portal.gallery.side-hand-rail',(5.88,-1.93,4.78),(5.88,2.10,4.78),.067,'trim')
# Corner piers complete a load-bearing stone gallery silhouette.
for x,y in ((2.78,-1.99),(5.82,-1.99),(5.82,2.1)):
    box('portal.gallery.corner-piers',(x,y,4.44),(.30,.30,.91),'stone')
    cone('portal.gallery.pier-finials',(x,y,5.0),.18,.25,'trim',8)
# Stone arch face closer to foreground, with deeply set dark portal void.
box('portal.frame.front-facade',(4.27,-1.88,1.78),(2.66,.42,3.57),'stone')
box('portal.frame.recess',(4.27,-2.12,1.44),(1.55,.07,2.72),'dark')
for scale,thick in ((1.17,.125),(.98,.09),(.79,.065)):
    pointed_arch('portal.pointed-recess.arches',4.27,-2.24,.22,scale,2.68,3.42,'trim',thick,16)
# Arch springs and corbels as actual depth accents.
for side in (-1,1):
    tapered_pillar('portal.gothic-piers',4.27+side*1.20,-2.26,.18,3.24,.15)
    buttress('portal.gothic-buttress',4.27+side*1.38,-1.90,3.04)
# Separate rough-cut blocks built outward from the facade plane. Unlike a flat
# masonry texture, these cast real tiny shadows and remain present off-axis.
for row in range(8):
    z=.32+row*.45
    for i in range(3):
        x=2.99+(i+(row%2)*.20)*.27
        box('portal.masonry.left-dressed-stones',(x,-2.12,z),(.24,.12,.24),'stone')
        x=5.19+(i-(row%2)*.20)*.22
        box('portal.masonry.right-dressed-stones',(x,-2.12,z),(.17,.12,.24),'stone')
# Real climbing vine stems, modeled as irregular tubes around the portal side.
for dx in (.0,.24):
    pts=[(5.61+dx,-2.12,0.31)]
    for k in range(1,15):
        z=.31+k*.26
        pts.append((5.61+dx+math.sin(k*.71)*.10,-2.17+math.cos(k*.52)*.09,z))
    for a,b in zip(pts[:-1],pts[1:]):beam('portal.gothic-climbing-vines',a,b,.028,'wood',6)
# Orbital magic device represented by independent nested 3D elliptical rings inside the arch.
for r in (.69,.47,.26):
    pts=[]
    for t in np.linspace(0,2*math.pi,49):pts.append((4.27+r*math.cos(t),-2.33,1.60+1.34*r*math.sin(t)))
    for a,b in zip(pts[:-1],pts[1:]):beam('portal.glyph-rings',a,b,.030,'metal',7)
sphere('portal.center-stone',(4.27,-2.34,1.60),.18,'metal')
# Stair axis matches front-right diagonal. Five distinct solid risers with wider bottom.
for i in range(6):
    box('portal.stairs', (4.27,-3.46+i*.33,.11+i*.135), (3.18-i*.14,.49,.22+i*.045),'stone')
for side in (-1,1):
    box('portal.stair-parapets',(4.27+side*1.63,-2.60,.73),(.27,1.88,1.18),'stone')
    for z in (.5,1.0):beam('portal.stair-parapet-trim',(4.27+side*1.63,-3.42,z*.68),
                                     (4.27+side*1.63,-1.75,z),.051,'trim')

# ----- Raised side terrace: balustrade, separate armillary, useful props -----
box('terrace.stone-platform',(4.19,2.55,4.05),(3.53,2.02,.34),'stone')
for x in np.arange(2.68,5.70,.44):
    tapered_pillar('terrace.balustrade-front',x,3.52,4.18,4.78,.055,'trim')
beam('terrace.balustrade-cap',(2.57,3.52,4.86),(5.77,3.52,4.86),.07,'trim')
for y in np.arange(1.68,3.56,.43):
    tapered_pillar('terrace.balustrade-side',5.89,y,4.18,4.78,.055,'trim')
beam('terrace.balustrade-side-cap',(5.89,1.52,4.86),(5.89,3.56,4.86),.07,'trim')
# Contrasting exposed mechanism on the terrace, much like the small gold armillary in approved art.
cylinder('terrace.second-armillary.pedestal',(4.97,2.68,4.91),.15,1.05,'stone',10)
for k,(az,tilt) in enumerate(((0,0),(.8,.55),(1.6,-.6))):
    A=np.array([[math.cos(az),-math.sin(az),0],[math.sin(az),math.cos(az),0],[0,0,1]])
    B=np.array([[1,0,0],[0,math.cos(tilt),-math.sin(tilt)],[0,math.sin(tilt),math.cos(tilt)]])
    pp=[np.array([4.97,2.68,5.80])+A@B@np.array([.57*math.cos(t),.57*math.sin(t),0]) for t in np.linspace(0,2*math.pi,45)]
    for a,b in zip(pp[:-1],pp[1:]):beam('terrace.second-armillary.rings',a,b,.026,'metal',6)
sphere('terrace.second-armillary.center',(4.97,2.68,5.80),.13,'trim',2)
# Real entrance-area props to establish full-volume scale (not flat billboards).
for x,y in ((-1.25,-3.37),(-.52,-3.51),(1.12,-2.97)):
    box('front.wooden-stalls',(x,y,.67),(.66,.52,.13),'wood')
    for dx in (-.26,.26):
        box('front.wooden-stalls-legs',(x+dx,y,.35),(.08,.08,.61),'wood')
for x,y in ((-5.55,-3.42),(-.8,-3.47),(2.55,-2.62)):
    cylinder('front.stone-bollards',(x,y,.52),.16,1.04,'stone',8)
    cone('front.stone-bollards.finials',(x,y,1.12),.23,.30,'trim',8)

# Scene GLB: semantic compound meshes, each with independent volume (and optional material details).
scene=tm.Scene()
for name,items in PARTS.items():
    combined=tm.util.concatenate(items) if len(items)>1 else items[0]
    # Keep consistent face groups/materials for low-color greybox inspection.
    scene.add_geometry(combined,node_name=name,geom_name=name)
scene.export(OUT/'arcane-nexus-step4-greybox.glb')
triangles=sum(sum(len(x.faces) for x in group) for group in PARTS.values())
print(f'Exported: {len(PARTS)} semantic meshes, {sum(map(len,PARTS.values()))} parts, {triangles} triangles')

# Optional true triangle-based offscreen rendering (no ImageGen, no artwork projection).
if '--render' in sys.argv:
    import vtk
    from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy
    from PIL import Image, ImageDraw, ImageFont
    def vtkmesh(m):
        points=vtk.vtkPoints();points.SetData(numpy_to_vtk(np.asarray(m.vertices,dtype=np.float32),deep=True))
        cells=vtk.vtkCellArray()
        for a,b,c in m.faces:
            cell=vtk.vtkTriangle()
            for j,k in enumerate((a,b,c)):cell.GetPointIds().SetId(j,int(k))
            cells.InsertNextCell(cell)
        poly=vtk.vtkPolyData();poly.SetPoints(points);poly.SetPolys(cells);return poly
    def render(cam=(9,-15,9),size=(1024,850),scale=6.1):
        ren=vtk.vtkRenderer();ren.SetBackground(.96,.97,.98);ren.AutomaticLightCreationOff()
        for loc,intensity in (((-8,-14,23),1.3),((11,8,17),.42)):
            lamp=vtk.vtkLight();lamp.SetPosition(*loc);lamp.SetFocalPoint(-.1,0,3);lamp.SetIntensity(intensity);ren.AddLight(lamp)
        for name,items in PARTS.items():
            for mesh in items:
                mp=vtk.vtkPolyDataMapper();mp.SetInputData(vtkmesh(mesh));mp.ScalarVisibilityOff()
                a=vtk.vtkActor();a.SetMapper(mp);p=a.GetProperty()
                color=mesh.visual.face_colors[0][:3]/255
                p.SetColor(*color);p.SetAmbient(.30);p.SetDiffuse(.72);p.SetSpecular(.055);p.SetInterpolationToFlat();ren.AddActor(a)
        win=vtk.vtkRenderWindow();win.SetOffScreenRendering(True);win.SetMultiSamples(4);win.AddRenderer(ren);win.SetSize(*size)
        camera=ren.GetActiveCamera();camera.ParallelProjectionOn();camera.SetFocalPoint(-.1,0,3.75)
        camera.SetPosition(*cam);camera.SetViewUp(0,0,1);camera.SetParallelScale(scale)
        ren.ResetCameraClippingRange();win.Render()
        wi=vtk.vtkWindowToImageFilter();wi.SetInput(win);wi.SetInputBufferTypeToRGB();wi.ReadFrontBufferOff();wi.Update()
        dims=wi.GetOutput().GetDimensions();rgb=vtk_to_numpy(wi.GetOutput().GetPointData().GetScalars()).reshape(dims[1],dims[0],3)
        return Image.fromarray(np.flipud(rgb).copy())
    town=render((10,-15,10));offaxis=render((-10,-13,10));front=render((1,-18,8))
    for name,im in (('town-angle',town),('off-axis',offaxis),('front',front)):
        im.save(OUT/f'arcane-nexus-step4-{name}.png')
    # Comparison board: real canonical crop, true 3D renders; no generated/reference-changing output.
    refpath=Path('/mnt/data/town_t2_actual/town-t2-390x844-night-west.png')
    if '--reference' in sys.argv:
        refpath=Path(sys.argv[sys.argv.index('--reference')+1])
    ref=(Image.open(refpath).convert('RGB').crop((0,0,390,406)) if refpath.exists() else Image.new('RGB',(390,406),'#8c99aa'))
    ref=ref.resize((585,609),Image.Resampling.LANCZOS)
    board=Image.new('RGB',(1970,1510),'#e7edf4');d=ImageDraw.Draw(board)
    fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans'
    font=lambda n,bold=False:ImageFont.truetype(fontpath+('-Bold' if bold else '')+'.ttf',n)
    d.rectangle((0,0,1970,136),fill='#152438')
    d.text((42,27),'WYRMFORGE / ARCANE NEXUS / GEOMETRY STEP 4',font=font(37,True),fill='white')
    d.text((44,83),'True 3D mesh / grey materials / no painting projection or image geometry',font=font(20),fill='#b7ccdf')
    d.text((37,163),'CANONICAL GAME ART — WEST DISTRICT',font=font(22,True),fill='#21334a')
    d.text((655,163),'STEP 4: TOWN CAMERA',font=font(22,True),fill='#21334a')
    d.text((655,786),'STEP 4: OFF-AXIS',font=font(22,True),fill='#21334a')
    board.paste(ref,(38,218))
    for im,p in ((town,(650,220)),(offaxis,(650,842))):
        im=im.copy();im.thumbnail((1260,520));board.paste(im,p)
    d.text((42,1420),f'{len(PARTS)} mesh groups / {triangles:,} triangles / 3D GLB exported / pending visual approval',font=font(23,True),fill='#28374b')
    d.text((42,1461),'STEP 4 CHECK: partially clad observatory, exposed armillary, multiple gables, gallery over pointed portal, actual 3D masonry',font=font(17),fill='#586c85')
    board.save(OUT/'arcane-nexus-step4-comparison.png')
    print('Rendered greybox PNGs to',OUT)