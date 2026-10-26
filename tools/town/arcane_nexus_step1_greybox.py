"""Arcane Nexus T1 greybox — independent 3D mesh, no projected painting.

Reproduce: pip install numpy trimesh && python tools/town/arcane_nexus_step1_greybox.py
Output: artifacts/town-nexus/arcane-nexus-step1-greybox.glb
This is an UNAPPROVED prototype. See docs/design/town-t1-t2-geometry-first-asset-audit.md.
"""
from pathlib import Path
import math
import numpy as np
import trimesh as tm

OUT = Path("artifacts/town-nexus")
OUT.mkdir(parents=True, exist_ok=True)
OBJECTS = {}


def add(name, mesh):
    if not isinstance(mesh, tm.Trimesh):
        raise TypeError(name)
    OBJECTS[name] = mesh
    return mesh


def box(name, center, size):
    m = tm.creation.box(extents=size)
    m.apply_translation(center)
    return add(name, m)


def cyl(name, center, radius, height, sections=40):
    m = tm.creation.cylinder(radius=radius, height=height, sections=sections)
    m.apply_translation(center)
    return add(name, m)


def beam(name, a, b, radius=.045, sections=9):
    a, b = np.array(a), np.array(b)
    vector = b - a
    if np.linalg.norm(vector) < 1e-8:
        return
    m = tm.creation.cylinder(radius=radius, height=np.linalg.norm(vector), sections=sections)
    m.apply_transform(tm.geometry.align_vectors([0, 0, 1], vector))
    m.apply_translation((a+b)/2)
    return add(name, m)


def ring(name, center, radius=.8, tube=.075, start=0, end=2*math.pi, plane="xz", segments=42):
    c = np.array(center, dtype=float)

    def point(t):
        p = c.copy()
        if plane == "xz":
            p[0] += radius * math.cos(t)
            p[2] += radius * math.sin(t)
        elif plane == "xy":
            p[0] += radius * math.cos(t)
            p[1] += radius * math.sin(t)
        elif plane == "yz":
            p[1] += radius * math.cos(t)
            p[2] += radius * math.sin(t)
        return p

    samples = np.linspace(start, end, segments)
    for i, (a, b) in enumerate(zip(samples[:-1], samples[1:])):
        beam(f"{name}.{i:02}", point(a), point(b), tube, 6)


def roof(name, cx, cy, xwidth, ywidth, eave, rise, thickness=.19):
    x0, x1 = cx-xwidth/2, cx+xwidth/2
    y0, y1 = cy-ywidth/2, cy+ywidth/2
    halves = []
    for (a, b) in [((x0,y0,eave),(cx,y0,eave+rise)),((cx,y0,eave+rise),(x1,y0,eave))]:
        a, b = np.array(a), np.array(b)
        ay, by = a.copy(), b.copy()
        ay[1] = y1
        by[1] = y1
        pts = np.array([a,b,by,ay,a+[0,0,-thickness],b+[0,0,-thickness],by+[0,0,-thickness],ay+[0,0,-thickness]])
        faces = np.array([[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],
                          [1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]])
        halves.append(tm.Trimesh(vertices=pts, faces=faces, process=True))
    add(name, tm.util.concatenate(halves))
    beam(name+".ridge", (cx,y0,eave+rise+.05), (cx,y1,eave+rise+.05), .085)


def dome(name, cx, cy, base, radius=2.1, height=1.55, segments=56, latitudes=12):
    vertices, faces = [], []
    for j in range(latitudes+1):
        theta = j/latitudes*math.pi/2
        r = radius*math.cos(theta)
        z = base+height*math.sin(theta)
        for i in range(segments):
            a = 2*math.pi*i/segments
            vertices.append([cx+r*math.cos(a),cy+r*math.sin(a),z])
    for j in range(latitudes):
        for i in range(segments):
            a = j*segments+i
            b = j*segments+(i+1)%segments
            c = (j+1)*segments+i
            d = (j+1)*segments+(i+1)%segments
            faces.extend([[a,b,c],[b,d,c]])
    add(name, tm.Trimesh(vertices=vertices, faces=faces, process=False))
    for i in range(8):
        angle = 2*math.pi*i/8
        pts = []
        for j in range(12):
            theta = j/11*math.pi/2
            pts.append([cx+(radius+.045)*math.cos(theta)*math.cos(angle),
                        cy+(radius+.045)*math.cos(theta)*math.sin(angle),
                        base+(height+.045)*math.sin(theta)])
        for k in range(len(pts)-1):
            beam(f"{name}.rib{i}.{k}", pts[k], pts[k+1], .038, 6)


# Architectural massing: not silhouette extrusions; every component has its own volume.
box("site.foundation",(-.3,0,-.20),(11.6,8.9,.40))
box("hall.stone.lower",(-2.55,.05,1.05),(5.65,4.35,2.1))
box("hall.upper",(-2.55,.05,2.76),(5.48,4.28,1.55))
roof("hall.slate.double_pitch",-2.55,.05,6.5,5.15,3.5,1.94)
box("hall.entrance.mass",(-3.50,-2.45,1.30),(2.2,1.30,2.60))
roof("hall.entrance.gable",-3.50,-2.45,2.66,1.85,2.67,1.35)
box("hall.door.recess",(-3.48,-3.12,.87),(1.0,.10,1.74))
for side,x in enumerate([-4.07,-2.92]):
    box(f"hall.door.stone_jamb.{side}",(x,-3.14,1.0),(.20,.28,2.00))
    for z in [.60,1.50,2.18]:
        box(f"hall.front.timber.horizontal.{side}.{z}",(x+.1,-2.13,z),(.18,.17,.09))
for x in [-5.17,-3.98,-2.73,-1.57,-.23]:
    box(f"hall.timber.front.stud.{x}",(x,-2.18,2.64),(.14,.16,1.65))
for x in [-1.2,-.2]:
    box(f"hall.window.{x}",(x,-2.21,2.0),(.56,.12,1.0))
    ring(f"hall.window.arch.{x}",(x,-2.27,2.51),radius=.28,tube=.07,start=0,end=math.pi,plane="xz",segments=12)

# Round Gothic observatory and dome.
cyl("observatory.round.wall",(1.37,.66,3.63),2.12,5.16,48)
cyl("observatory.drums.lower",(1.37,.66,1.27),2.32,.25,56)
cyl("observatory.drums.mid",(1.37,.66,4.73),2.31,.27,56)
cyl("observatory.drums.cornice",(1.37,.66,6.12),2.35,.25,56)
dome("observatory.astrolabe.dome",1.37,.66,6.27,2.28,1.82)
cyl("observatory.apex.stone",(1.37,.66,8.12),.25,.20,20)
for i,angle in enumerate([math.pi*1.1,math.pi*1.4,math.pi*1.72,math.pi*1.95]):
    x=1.37+2.12*math.cos(angle)
    y=.66+2.12*math.sin(angle)
    cyl(f"observatory.window.{i}",(x,y,3.62),.17,1.12,10)
    beam(f"observatory.window.pinnacle.{i}",(x,y,4.15),(x,y,4.61),.13)

# Armillary/astrolabe, real intersecting inclined 3D circles.
for a in (0,math.pi/3,2*math.pi/3):
    pts=[]
    for t in np.linspace(0,2*math.pi,48):
        c,s=math.cos(t),math.sin(t)
        pts.append((1.37+1.07*c*math.cos(a),.66+1.07*s,7.04+1.07*c*math.sin(a)))
    for i in range(len(pts)-1):
        beam(f"astrolabe.ring.{a:.2f}.{i}",pts[i],pts[i+1],.035,6)
add("astrolabe.central.core",tm.creation.icosphere(subdivisions=2,radius=.34).apply_translation((1.37,.66,7.04)))

# Freestanding dimensional portal building, mouldings and stair volumes.
box("portal.chapel.volume",(4.46,-.46,1.95),(2.45,3.80,3.90))
roof("portal.chapel.roof",4.46,-.46,2.75,4.48,4.04,1.00)
box("portal.vertical.recess",(4.44,-2.44,1.60),(1.63,.13,2.80))
for i,r in enumerate([1.13,.93,.71]):
    ring(f"portal.arch.ring.{i}",(4.44,-2.56,2.19),radius=r,
         tube=.095 if i==0 else .07,start=0,end=math.pi,plane="xz",segments=26)
    for side in (-1,1):
        box(f"portal.arch.pillar.{i}.{side}",(4.44+side*r,-2.58,1.05),(.12,.18,2.23))
for i in range(5):
    box(f"portal.stairs.{i}",(4.44,-3.65+i*.31,.09+i*.16),(2.95-i*.16,.48,.18+i*.04))

box("balcony.platform",(4.15,2.39,4.17),(3.20,2.14,.25))
for x in [2.62,3.28,3.94,4.60,5.25]:
    box(f"balcony.rail.front.{x}",(x,3.41,4.65),(.12,.14,.94))
box("balcony.railing.beam",(4.07,3.41,5.11),(3.20,.14,.12))
for y in [1.52,2.14,2.80,3.41]:
    box(f"balcony.rail.side.{y}",(5.62,y,4.65),(.14,.12,.94))
box("balcony.railing.side",(5.62,2.45,5.11),(.14,2.17,.12))
for i,(x,y) in enumerate([(-5.16,-2.25),(-.1,-2.25),(3.2,-2.32),(5.65,-2.32)]):
    box(f"buttress.{i}",(x,y,.93),(.44,.62,1.86))

scene=tm.Scene()
for name,mesh in OBJECTS.items():
    color=np.array([117,121,130,255] if ".window." in name or ".recess" in name
                   else [165,169,177,255],dtype=np.uint8)
    mesh.visual.face_colors=color
    scene.add_geometry(mesh,node_name=name,geom_name=name)
file=OUT/"arcane-nexus-step1-greybox.glb"
scene.export(file)
print(f"Exported {file} with {len(OBJECTS)} parts and {sum(len(x.faces) for x in OBJECTS.values())} triangles")
