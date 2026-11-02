#!/usr/bin/env python3
"""WyrmForge deterministic Wizard volume study; no game runtime dependencies."""
from __future__ import annotations
import argparse
import base64
import io
import json
import math
import random
from pathlib import Path
from dataclasses import dataclass
from PIL import Image, ImageDraw

WIDTH, HEIGHT = 64, 80
FOOT_X, FOOT_Y = 32, 74
SCALE = 17.2
DIRECTIONS = {"S": 0, "SE": 45, "E": 90, "NE": 135, "N": 180, "NW": 225, "W": 270, "SW": 315}

# Immutable garment damage atlas: ring sector 0 faces +X, sector 6 faces +Z.
# Every viewing direction rotates these same local-space vertices and scars.
ROBE_HEM_OFFSETS=(.00,-.06,.01,.09,.27,.20,.04,-.04,.11,.25,.18,-.05,
                  .01,.03,-.07,.05,.14,.27,.17,-.02,.04,-.05,.02,.06)
ROBE_OPEN_SECTORS=frozenset({(0,4),(0,5),(0,9),(0,10),(0,17),
                             (1,4),(1,9),(1,17),(2,3),(3,2),(3,3)})
ROBE_SCARS=(("front-right-thigh",35,1.33,.36,.18),
            ("front-left-lower-robe",138,.97,.32,.14),
            ("rear-side-thigh",260,1.37,.35,.14))
# Material seam strokes are painted in the same garment coordinates, not camera pixels.
ROBE_SEAMS=(("front-right",58,.64,2.38),
            ("front-left",125,.64,2.38),
            ("rear-side",259,.78,2.38))

@dataclass(frozen=True)
class Face:
    points: tuple
    color: tuple
    feature: str

faces = []

def rgb(value):
    return tuple(int(value[i:i+2], 16) for i in (0,2,4))

def tri(a, b, c, color, feature):
    faces.append(Face((a,b,c), rgb(color), feature))

def quad(a,b,c,d,color,feature):
    tri(a,b,c,color,feature)
    tri(a,c,d,color,feature)

def revolve(levels, color, feature, segments=24, seed=0, tear=None, hem_offsets=None):
    if hem_offsets is not None and len(hem_offsets)!=segments:
        raise ValueError("hem damage profile must match the garment's angular segments")
    rng=random.Random(seed)
    jitter=[rng.uniform(-0.04,0.04) for _ in range(segments)]
    for j in range(len(levels)-1):
        y0,r0,ox0,oz0=levels[j]
        y1,r1,ox1,oz1=levels[j+1]
        for i in range(segments):
            k=(i+1)%segments
            a=2*math.pi*i/segments
            b=2*math.pi*k/segments
            if tear and tear(j,i): continue
            scale0=1+jitter[i]
            scale1=1+jitter[k]
            # Hem cuts are local-to-garment vertices shared by every facing.
            ya=y0+(hem_offsets[i] if hem_offsets is not None and j==0 else 0)
            yb=y0+(hem_offsets[k] if hem_offsets is not None and j==0 else 0)
            p0=(ox0+r0*scale0*math.cos(a),ya,oz0+r0*scale0*math.sin(a))
            p1=(ox0+r0*scale1*math.cos(b),yb,oz0+r0*scale1*math.sin(b))
            p2=(ox1+r1*scale1*math.cos(b),y1,oz1+r1*scale1*math.sin(b))
            p3=(ox1+r1*scale0*math.cos(a),y1,oz1+r1*scale0*math.sin(a))
            quad(p0,p1,p2,p3,color if i%5 else "8a8984",feature)

def box(x0,y0,z0,x1,y1,z1,color,feature):
    A=(x0,y0,z0);B=(x1,y0,z0);C=(x1,y1,z0);D=(x0,y1,z0)
    E=(x0,y0,z1);F=(x1,y0,z1);G=(x1,y1,z1);H=(x0,y1,z1)
    for a,b,c,d in ((A,B,C,D),(F,E,H,G),(E,A,D,H),(B,F,G,C),(D,C,G,H),(E,F,B,A)):
        quad(a,b,c,d,color,feature)

def cylinder(a,b,r,color,feature,segments=10):
    v=tuple(b[i]-a[i] for i in range(3))
    length=math.sqrt(sum(x*x for x in v))
    n=tuple(x/length for x in v)
    c=(0,1,0) if abs(n[1])<.9 else (1,0,0)
    cross=lambda u,w:(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0])
    u=cross(n,c);u_len=math.sqrt(sum(x*x for x in u));u=tuple(x/u_len for x in u)
    w=cross(n,u)
    for i in range(segments):
        t=2*math.pi*i/segments; t1=2*math.pi*(i+1)/segments
        offset=lambda t:tuple(r*(math.cos(t)*u[j]+math.sin(t)*w[j]) for j in range(3))
        o=offset(t);o1=offset(t1)
        p=tuple(a[j]+o[j] for j in range(3));p1=tuple(a[j]+o1[j] for j in range(3))
        q=tuple(b[j]+o[j] for j in range(3));q1=tuple(b[j]+o1[j] for j in range(3))
        quad(p,p1,q1,q,color,feature)

def sphere(center,radii,color,feature):
    cx,cy,cz=center;rx,ry,rz=radii;segments=14;bands=8
    for j in range(bands):
        v0=-math.pi/2+math.pi*j/bands
        v1=-math.pi/2+math.pi*(j+1)/bands
        for i in range(segments):
            u0=2*math.pi*i/segments;u1=2*math.pi*(i+1)/segments
            point=lambda u,v:(cx+rx*math.cos(v)*math.cos(u),cy+ry*math.sin(v),cz+rz*math.cos(v)*math.sin(u))
            quad(point(u0,v0),point(u1,v0),point(u1,v1),point(u0,v1),color,feature)

def cape_panel(side,front=False):
    x=side
    quad((.13*x,2.54,.30 if front else -.12),(.61*x,2.44,.13),
         (.78*x,1.39,.04),(.18*x,1.63,.39 if front else -.18),"777773","cape-panel")
    tri((.61*x,2.44,.13),(.86*x,1.36,-.04),(.78*x,1.39,.04),"96938c","cape-torn-edge")

def build_master():
    """One continuous mesh: holes, garment seams, and staff are defined once."""
    faces.clear()
    # Under-gown behind fixed rips
    revolve([(.24,.58,0,0),(.53,.57,0,0),(1.7,.36,0,0),(2.48,.34,0,0)],
            "343337","under-robe",seed=19)
    # Outer gown, physical tears in two angular sectors of its lower hem.
    # A fixed 24-sector hem damage map, 15° per sector. The front is sector 6.
    # Positive offsets cut higher into the cloth; negative offsets leave points.
    sections=len(ROBE_HEM_OFFSETS)
    levels=[(.20,.73,0,0),(.55,.69,0,0),(.90,.59,0,0),(1.08,.55,0,0),
            (1.32,.50,0,0),(1.52,.45,0,0),(1.72,.41,0,0),(2.38,.40,0,0)]
    # Outer mesh has permanent voids: the dark under-gown is visible below.
    # They are genuine missing mesh faces, never 2D per-facing painted spots.
    def torn(j,i):
        return (j,i) in ROBE_OPEN_SECTORS
    revolve(levels,"65635f","outer-robe",sections,seed=23,tear=torn,hem_offsets=ROBE_HEM_OFFSETS)
    # Named surface scars are attached to a fixed gown azimuth and height,
    # with the actual tapered robe radius, so they cannot drift across turns.
    def outer_radius(y):
        for (low,rl,_,_),(high,rh,_,_) in zip(levels,levels[1:]):
            if low<=y<=high:
                t=(y-low)/(high-low)
                return rl+(rh-rl)*t
        return levels[0][1] if y<levels[0][0] else levels[-1][1]
    def scar_point(angle_deg,y,side=0):
        t=math.radians(angle_deg)
        r=outer_radius(y)+.055
        return (r*math.cos(t)-side*math.sin(t),y,r*math.sin(t)+side*math.cos(t))
    for name,angle_deg,y,length,width in ROBE_SCARS:
        left=scar_point(angle_deg,y,-width/2)
        right=scar_point(angle_deg,y,width/2)
        tip=scar_point(angle_deg,y-length,-width*.18)
        tri(left,right,tip,"29282b","permanent-cloth-rip")
        tri(scar_point(angle_deg,y,-width/2-.025),left,tip,
            "a4a097","frayed-rip-edge")
    # Boots and trousers
    for side in (-1,1):
        x=side*.31
        cylinder((x,.25,0),(x,1.22,0),.19,"393437","trouser")
        box(x-.22,.06,-.21,x+.21,.33,.36,"6b432c","boots")
        box(x-.21,.02,.04,x+.21,.19,.47,"855739","boot-toe")
        cylinder((x,.32,.02),(x,.40,.02),.21,"40332c","boot-cuff")
    # Torso/shoulder shawl
    revolve([(1.65,.41,0,0),(2.46,.45,0,0),(2.67,.55,0,0),(2.75,.36,0,0)],
            "77746f","torso-mantle",seed=4)
    cape_panel(-1);cape_panel(1)
    # Asymmetric, continuous over-robe trim tied to the actual 3D cloth.
    quad((-.36,2.44,.37),(-.16,2.47,.47),(.08,1.24,.56),(-.16,1.14,.52),"85817b","robe-front-overlap")
    tri((-.16,1.14,.52),(.08,1.24,.56),(-.17,.88,.49),"6b6965","robe-torn-front-tip")
    quad((.25,2.40,.34),(.44,2.33,.22),(.36,1.05,.43),(.14,1.23,.55),"72716c","robe-right-lapel")
    # Fixed belt, buckle and hanging pouch
    revolve([(1.73,.46,0,0),(1.88,.47,0,0)],"64422a","belt",seed=0)
    box(-.09,1.72,.44,.12,1.87,.50,"b89a58","buckle")
    box(.29,1.27,.38,.51,1.68,.50,"66432c","belt-pouch")
    # Sleeves and hands (right hand on x negative)
    cylinder((-.44,2.48,.04),(-.74,1.57,.20),.23,"777571","right-sleeve")
    cylinder((.44,2.48,.04),(.71,1.56,.15),.23,"696863","left-sleeve")
    sphere((-.74,1.51,.2),(.11,.13,.11),"b78b6e","right-hand")
    sphere((.71,1.46,.15),(.10,.14,.1),"b78b6e","left-hand")
    # Neck, face, and deliberate nose projection toward front z+
    cylinder((0,2.61,.1),(0,2.92,.1),.16,"a7775d","neck")
    sphere((0,2.96,.11),(.28,.31,.25),"b78b6e","face")
    tri((-.09,2.93,.35),(.10,2.93,.35),(0,2.85,.50),"a67a5c","nose")
    # Eyebrows and white beard: retained 3D objects, never re-generated per angle
    for dx in (-.13,.13):
        sphere((dx,3.04,.34),(.065,.035,.025),"5d5447","eye")
        cylinder((dx,2.99,.44),(dx*.35,2.78,.58),.075,"d1ccbb","moustache")
    # Layered beard mesh lies ahead of the robe and reaches down to chest.
    tri((-.26,2.83,.47),(.26,2.83,.47),(0,2.03,.77),"b9b8b0","beard-lock")
    tri((-.22,2.81,.55),(.00,2.81,.57),(-.10,2.15,.82),"eee5d5","beard-lock")
    tri((.00,2.81,.57),(.22,2.81,.55),(.09,2.18,.81),"d7d3c9","beard-lock")
    tri((-.09,2.55,.74),(.10,2.55,.73),(.02,1.95,.78),"aaa9a6","beard-lock")
    # Wide floppy hat with persistent bent tip and brown hat band
    revolve([(3.17,.50,0,.06),(3.22,.49,0,.06),(3.30,.32,0,.05),
             (3.40,.23,-.03,.02),(3.55,.15,-.16,-.02),(3.67,.06,-.34,-.03)],
            "817d78","floppy-hat",seed=3)
    revolve([(3.25,.34,0,.05),(3.31,.31,0,.05)],"70452b","hat-band",seed=0)
    # Single physical staff belongs to right hand at all camera angles.
    # Its axis goes through the anatomical right hand at (-.74, 1.51, .2).
    grip=(-.74,1.51,.20)
    cylinder((-.78,.10,.20),grip,.063,"734222","right-hand-staff",segments=8)
    cylinder(grip,(-.91,3.26,-.34),.060,"734222","right-hand-staff",segments=8)
    cylinder((-.91,3.24,-.34),(-.94,3.36,-.34),.14,"ad4d13","staff-flame-base",segments=9)
    sphere((-.94,3.46,-.34),(.15,.23,.13),"fd8a16","staff-fire")
    sphere((-.94,3.47,-.24),(.08,.14,.06),"ffcf53","staff-flame-core")
    return faces

def project(point,yaw):
    x,y,z=point
    a=math.radians(yaw)
    X=x*math.cos(a)+z*math.sin(a)
    Z=-x*math.sin(a)+z*math.cos(a)
    return (FOOT_X+X*SCALE,FOOT_Y-y*SCALE+Z*2.7,Z)

def render(direction, skin=None):
    if skin is not None and (skin.size != (WIDTH,HEIGHT) or skin.mode != "RGBA"):
        raise ValueError("reference sprite must be a 64x80 RGBA image")
    yaw=DIRECTIONS[direction]
    master=build_master()
    pixels=Image.new("RGBA",(WIDTH,HEIGHT),(0,0,0,0))
    zbuffer=[[-1e9 for _ in range(WIDTH)] for _ in range(HEIGHT)]
    for face in master:
        projected=[project(p,yaw) for p in face.points]
        (x0,y0,z0),(x1,y1,z1),(x2,y2,z2)=projected
        x_min=max(0,int(math.floor(min(x0,x1,x2))))
        x_max=min(WIDTH-1,int(math.ceil(max(x0,x1,x2))))
        y_min=max(0,int(math.floor(min(y0,y1,y2))))
        y_max=min(HEIGHT-1,int(math.ceil(max(y0,y1,y2))))
        denom=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(denom)<.0001:continue
        # Artist-controlled, deterministic face shading.
        p0,p1,p2=face.points
        u=[p1[i]-p0[i] for i in range(3)];v=[p2[i]-p0[i] for i in range(3)]
        normal=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        norm=math.sqrt(sum(c*c for c in normal)) or 1
        brightness=.68+.24*abs((normal[0]*-.45+normal[1]*.75+normal[2]*.5)/norm)
        if face.feature.startswith("staff-fire") or face.feature=="staff-flame-core":
            brightness=1.0
        for py in range(y_min,y_max+1):
            for px in range(x_min,x_max+1):
                cx,cy=px+.5,py+.5
                a=((y1-y2)*(cx-x2)+(x2-x1)*(cy-y2))/denom
                b=((y2-y0)*(cx-x2)+(x0-x2)*(cy-y2))/denom
                c=1-a-b
                if min(a,b,c)<-.0001:continue
                depth=a*z0+b*z1+c*z2
                if depth>zbuffer[py][px]:
                    # Local material coordinates are barycentrically interpolated from
                    # the shared 3D mesh; texture marks do not regenerate per camera.
                    wx=a*p0[0]+b*p1[0]+c*p2[0]
                    wy=a*p0[1]+b*p1[1]+c*p2[1]
                    wz=a*p0[2]+b*p1[2]+c*p2[2]
                    cloth=face.feature in {"outer-robe","torso-mantle","cape-panel","cape-torn-edge","floppy-hat"}
                    detail=1.0
                    if cloth:
                        theta=math.atan2(wz,wx)
                        # Vertical folds follow fixed local-garment azimuths. Keep
                        # the weave subtle so it does not turn into random pixels.
                        folds=math.sin(10*theta+1.15*wy)+.38*math.sin(19*theta-1.6*wy)
                        weave=math.sin(wx*47+wy*23+wz*41)*math.sin(wy*43-wz*17)
                        detail=.95+.085*folds+.018*weave
                        if face.feature=="outer-robe":
                            # Permanent vertical stitched seams, not screen-space lines.
                            for name,seam_deg,start_y,end_y in ROBE_SEAMS:
                                d=math.atan2(math.sin(theta-math.radians(seam_deg)),
                                             math.cos(theta-math.radians(seam_deg)))
                                if start_y<=wy<=end_y and abs(d)<.105:
                                    detail*=.80+.055*math.sin(wy*70)
                            # Dust and fraying below the knee use true world height.
                            hem_grime=max(0.0,min(1.0,(.92-wy)/.72))
                            detail*=1.0-.12*hem_grime
                            for name,scar_deg,scar_y,scar_length,scar_width in ROBE_SCARS:
                                d=math.atan2(math.sin(theta-math.radians(scar_deg)),
                                             math.cos(theta-math.radians(scar_deg)))
                                if abs(d)<.24 and scar_y-scar_length-.12<wy<scar_y+.12:
                                    detail*=.93
                    elif face.feature=="beard-lock":
                        # Facial hair striations also belong to the source geometry.
                        detail=.95+.08*math.sin(wx*58+wy*7)
                    base=face.color
                    # EXPERIMENTAL PLANAR DECAL: only the forward hemisphere can receive
                    # colors from this rejected S study. It is NOT an authored UV atlas.
                    if skin is not None and face.feature in {
                        "outer-robe","torso-mantle","cape-panel","cape-torn-edge",
                        "floppy-hat","robe-front-overlap","robe-right-lapel",
                        "robe-torn-front-tip","beard-lock"
                    }:
                        sx=int(round(FOOT_X+wx*SCALE))
                        sy=int(round(FOOT_Y-wy*SCALE))
                        if 0<=sx<WIDTH and 0<=sy<HEIGHT:
                            sample=skin.getpixel((sx,sy))
                            chroma=max(sample[:3])-min(sample[:3])
                            # A front view is not a complete texture atlas.  Limit the
                            # projected albedo to physically front-facing surfaces; the
                            # far side retains its own procedural cloth material.
                            local_radius=math.hypot(wx,wz)
                            frontness=wz/max(.001,local_radius)
                            front_weight=max(0.0,min(1.0,(frontness-.22)/.58))
                            front_weight=front_weight*front_weight*(3-2*front_weight)
                            if sample[3]>=160 and chroma<35 and 35<sum(sample[:3])/3<245:
                                weight=.72*front_weight
                                base=tuple(int(weight*sample[j]+(1-weight)*base[j]) for j in range(3))
                    color=tuple(min(255,max(0,int(channel*brightness*detail))) for channel in base)+(255,)
                    zbuffer[py][px]=depth
                    pixels.putpixel((px,py),color)
    return pixels

def contact_sheet(skin=None):
    frames=[render(d,skin) for d in ("S","SE","E")]
    scale=8
    canvas=Image.new("RGBA",(WIDTH*scale*3+64,HEIGHT*scale+100),(17,23,29,255))
    draw=ImageDraw.Draw(canvas)
    for index,(frame,label) in enumerate(zip(frames,("S / front","SE / 45 degrees","E / profile"))):
        x=16+index*(WIDTH*scale+16)
        y=45
        for yy in range(0,HEIGHT*scale,64):
            for xx in range(0,WIDTH*scale,64):
                col=(57,64,72,255) if ((xx+yy)//64)%2 else (45,52,60,255)
                draw.rectangle((x+xx,y+yy,x+xx+63,y+yy+63),fill=col)
        canvas.alpha_composite(frame.resize((WIDTH*scale,HEIGHT*scale),Image.Resampling.NEAREST),(x,y))
        draw.text((x,20),label,fill=(231,230,223,255))
    draw.text((16,HEIGHT*scale+66),"DETERMINISTIC MASTER GEOMETRY STUDY - NOT APPROVED GAME ART",fill=(241,186,107,255))
    return canvas,frames

def comparison_sheet(skin):
    """Side-by-side 8-way continuity audit, never an art approval sheet."""
    if skin is None:
        raise ValueError("eight-way comparison requires --reference-sprite")
    directions=("S","SE","E","NE","N","NW","W","SW")
    scale=3
    stride=WIDTH*scale+12
    top=42
    row_height=HEIGHT*scale+64
    canvas=Image.new("RGBA",(len(directions)*stride+24,top+2*row_height+34),(26,29,33,255))
    draw=ImageDraw.Draw(canvas)
    for row,reference in enumerate((None,skin)):
        title="SINGLE MESH / BASE COLOR" if row==0 else "SAME MESH / FRONT-ONLY COLOR DECAL"
        draw.text((12,top+row*row_height-23),title,fill=(232,227,214,255))
        for index,direction in enumerate(directions):
            x=12+index*stride
            y=top+row*row_height
            for j in range(0,HEIGHT*scale,24):
                for i in range(0,WIDTH*scale,24):
                    checker=(i//24+j//24)%2
                    draw.rectangle((x+i,y+j,x+i+23,y+j+23),fill=(49,54,60,255) if checker else (40,45,51,255))
            frame=render(direction,reference)
            canvas.alpha_composite(frame.resize((WIDTH*scale,HEIGHT*scale),Image.Resampling.NEAREST),(x,y))
            draw.text((x+4,y+HEIGHT*scale+6),direction,fill=(232,227,214,255))
    draw.text((12,canvas.height-20),"UNAPPROVED MATERIAL STUDY / NOT GAME ART",fill=(255,180,95,255))
    return canvas

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--direction",choices=tuple(DIRECTIONS))
    p.add_argument("--json-output",action="store_true")
    p.add_argument("--preview",type=Path,help="Save a checker contact sheet")
    p.add_argument("--frames",type=Path,help="Export unapproved RGBA frames for Foundry input")
    p.add_argument("--reference-sprite",type=Path,help="Experimental front-hemisphere decal from a 64x80 RGBA S study")
    p.add_argument("--comparison",type=Path,help="Save eight-way base/decal audit (requires reference)")
    args=p.parse_args()
    skin=Image.open(args.reference_sprite).convert("RGBA") if args.reference_sprite else None
    if skin is not None and skin.size!=(WIDTH,HEIGHT):
        raise ValueError("reference sprite must be native 64x80")
    if args.frames:
        for direction in DIRECTIONS:
            target=args.frames / "idle" / direction / "00.albedo.png"
            target.parent.mkdir(parents=True,exist_ok=True)
            render(direction,skin).save(target)
    canvas=render(args.direction,skin) if args.direction else contact_sheet(skin)[0]
    if args.preview:
        args.preview.parent.mkdir(parents=True,exist_ok=True)
        canvas.save(args.preview)
    if args.comparison:
        args.comparison.parent.mkdir(parents=True,exist_ok=True)
        comparison_sheet(skin).save(args.comparison)
    if args.json_output:
        out=io.BytesIO()
        canvas.save(out,format="PNG")
        print(json.dumps({"png":base64.b64encode(out.getvalue()).decode(),"size":list(canvas.size),"faces":len(faces)}))
    elif not args.preview and not args.frames and not args.comparison:
        canvas.show()

if __name__=="__main__":
    main()
