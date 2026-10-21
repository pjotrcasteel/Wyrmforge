"""Local retopology of failed reconstructed surfaces, retaining card-derived UVs.
The reconstructed texture remains the appearance reference. Anatomical sections are continuous
faceted lofts with real volume, not planar cutouts or frame-specific repairs.
"""
import numpy as np

TAIL_POINTS=np.array([(0,.23,-.025),(.005,.32,-.005),(.015,.42,.025),(.012,.53,.050),(-.008,.64,.075),(-.045,.75,.105),(-.09,.85,.145),(-.13,.94,.195),(-.15,1.005,.25)])

def rebuild_anatomy(v,faces,uv):
    source=v.copy();source_uv=uv.copy()
    tail=v[:,1]>.275
    hind=(v[:,1]>.035)&(v[:,1]<.34)&(abs(v[:,0])>.035)&(v[:,2]<-.045)
    cap=(v[:,1]<-.285)&(v[:,2]>.115)
    cap|=(v[:,1]<-.235)&(v[:,1]>-.36)&(abs(v[:,0])>.105)&(v[:,2]>.075)
    # V38 replaces the remaining fused trunk/neck/forelegs too. Keeping that
    # narrow reconstruction underneath larger wings caused the cricket shape.
    remove=np.ones(len(v),dtype=bool)
    retained=faces[~np.any(remove[faces],axis=1)];used=np.unique(retained)
    mapping=np.full(len(v),-1);mapping[used]=np.arange(len(used))
    vertices=v[used].tolist();coords=uv[used].tolist();triangles=mapping[retained].tolist();labels=[0]*len(vertices)
    def loft(points,widths,heights,label,reference,steps=4,sides=12,ridges=.0,profile=None):
        if profile is not None:sides=len(profile)
        start=len(vertices);rings=[];pool=np.flatnonzero(reference)
        if not len(pool):raise ValueError('Missing texture reference region')
        for segment in range(len(points)-1):
            for step in range(steps+(segment==len(points)-2)):
                t=step/steps;center=points[segment]*(1-t)+points[segment+1]*t
                tangent=points[segment+1]-points[segment];tangent=tangent/np.linalg.norm(tangent)
                right=np.cross(tangent,[0,0,1]);right=right/np.linalg.norm(right);up=np.cross(right,tangent)
                width=widths[segment]*(1-t)+widths[segment+1]*t;height=heights[segment]*(1-t)+heights[segment+1]*t
                ring=[]
                for j in range(sides):
                    angle=j*2*np.pi/sides;crag=1+ridges*np.cos(j*np.pi+step*np.pi/2)
                    px,py=(np.cos(angle),np.sin(angle)) if profile is None else profile[j]
                    point=center+right*px*width*crag+up*py*height*crag
                    # Transfer UVs from the corresponding original anatomical
                    # area. No textures or models from films or services.
                    query=point.copy()
                    if label==1:query[1]=.23+(center[1]-.23)*.42;query[2]=min(query[2],.02)
                    nearest=pool[np.argmin(np.sum((source[pool]-query)**2,axis=1))]
                    ring.append(len(vertices));vertices.append(point.tolist());coords.append(source_uv[nearest].tolist());labels.append(label)
                rings.append(ring)
        for a,b in zip(rings,rings[1:]):
            for j in range(sides):
                k=(j+1)%sides;triangles.extend([[a[j],b[j],a[k]],[a[k],b[j],b[k]]])
        for ring,reverse in [(rings[0],True),(rings[-1],False)]:
            center=len(vertices);vertices.append(np.mean(np.array(vertices)[ring],axis=0).tolist());coords.append(coords[ring[0]]);labels.append(label)
            for j in range(sides):
                tri=[center,ring[j],ring[(j+1)%sides]];triangles.append(tri[::-1] if reverse else tri)
    trunk=np.array([(0,.285,.002),(0,.22,.008),(0,.13,.012),(0,.025,.022),(0,-.085,.025),(0,-.17,.032),(0,-.23,.05)])
    loft(trunk,[.045,.100,.125,.145,.161,.143,.094],[.047,.080,.096,.113,.128,.116,.080],5,(abs(source[:,0])<.10)&(source[:,1]>-.20)&(source[:,1]<.25),steps=4,sides=16,ridges=.035)
    neck=np.array([(0,-.17,.047),(0,-.23,.078),(0,-.29,.104),(0,-.35,.110),(0,-.39,.099)])
    loft(neck,[.105,.102,.090,.080,.069],[.086,.088,.077,.067,.047],6,(source[:,1]<-.18)&(source[:,1]>-.36),steps=4,sides=16,ridges=.04)
    # A small run of actual dorsal stone crests, not a floating head cap.
    for y,z in [(.18,.094),(.08,.121),(-.02,.145),(-.12,.148),(-.23,.16)]:
        crest=np.array([(0,y,z),(0,y+.012,z+.035),(0,y+.028,z+.068)])
        loft(crest,[.027,.018,.001],[.020,.012,.001],5 if y>-.18 else 6,(abs(source[:,0])<.10)&(source[:,2]>.02),steps=2,sides=6)
    loft(TAIL_POINTS,[.090,.078,.060,.047,.035,.026,.018,.011,.002],[.074,.069,.058,.050,.042,.032,.023,.015,.003],1,source[:,1]>.25,steps=4,ridges=.06)
    for sign,label in [(1,3),(-1,4)]:
        # Heavy thigh, visible narrow hock, forward toe fan. Continuous rings
        # span the joints so there is no old belly-to-foot sheet to stretch.
        points=np.array([(sign*.105,.17,-.010),(sign*.15,.13,-.035),(sign*.18,.095,-.072),(sign*.18,.155,-.112),(sign*.18,.23,-.157),(sign*.18,.17,-.178),(sign*.18,.09,-.182),(sign*.18,.045,-.180)])
        loft(points,[.078,.070,.046,.032,.023,.029,.042,.024],[.068,.059,.038,.030,.022,.016,.013,.009],label,hind&(source[:,0]*sign>0),steps=4,ridges=.04)
        fore=np.array([(sign*.115,-.18,.015),(sign*.145,-.195,-.035),(sign*.15,-.22,-.075),(sign*.16,-.255,-.115),(sign*.17,-.29,-.163),(sign*.17,-.325,-.181),(sign*.17,-.37,-.183),(sign*.17,-.405,-.18)])
        loft(fore,[.065,.060,.046,.034,.025,.036,.041,.023],[.062,.053,.042,.032,.023,.015,.012,.008],7 if sign>0 else 8,(source[:,1]<-.08)&(source[:,2]<-.055)&(source[:,0]*sign>0),steps=4,ridges=.04)
    # Angular upper skull replaces the broad fused cap; lower jaw is retained.
    points=np.array([(0,-.315,.135),(0,-.365,.151),(0,-.415,.137),(0,-.445,.114),(0,-.515,.105),(0,-.565,.098)])
    headref=(source[:,1]<-.29)&(source[:,2]>.015)
    skull_profile=[(1,.15),(.78,.80),(.30,1),(-.30,1),(-.78,.80),(-1,.15),(-.78,-.65),(-.35,-1),(.35,-1),(.78,-.65)]
    loft(points,[.078,.116,.104,.079,.064,.040],[.047,.060,.050,.035,.030,.020],2,headref,steps=3,ridges=.02,profile=skull_profile)
    jaw=np.array([(0,-.35,.055),(0,-.405,.042),(0,-.47,.035),(0,-.535,.038),(0,-.565,.052)])
    loft(jaw,[.066,.072,.057,.048,.029],[.024,.025,.019,.015,.009],9,headref,steps=3,ridges=.02)
    for sign in [1,-1]:
        brow=np.array([(sign*.060,-.45,.153),(sign*.093,-.416,.177),(sign*.114,-.38,.167)])
        loft(brow,[.016,.023,.015],[.014,.019,.011],2,headref,steps=2,sides=6)
        eye=np.array([(sign*.094,-.430,.149),(sign*.097,-.421,.152),(sign*.095,-.413,.151)])
        loft(eye,[.003,.006,.003],[.003,.006,.003],10,headref,steps=2,sides=6)
    for sign in [1,-1]:
        horn=np.array([(sign*.075,-.345,.173),(sign*.100,-.305,.220),(sign*.115,-.245,.264),(sign*.105,-.185,.290)])
        loft(horn,[.026,.020,.012,.0008],[.024,.019,.010,.0008],2,headref,steps=3,sides=8)
        cheek=np.array([(sign*.080,-.37,.105),(sign*.124,-.325,.132),(sign*.153,-.265,.155)])
        loft(cheek,[.026,.018,.001],[.020,.014,.001],2,headref,steps=2,sides=6)
        for y,x in [(-.48,.055),(-.535,.043)]:
            fang=np.array([(sign*x,y,.087),(sign*x,y-.004,.060),(sign*(x-.004),y+.004,.038)])
            loft(fang,[.009,.007,.0005],[.008,.006,.0005],11,headref,steps=2,sides=6)
        for y,z in [(-.14,.11),(-.035,.115),(.085,.095)]:
            plate=np.array([(sign*.11,y,z),(sign*.157,y+.018,z+.036),(sign*.18,y+.054,z+.065)])
            loft(plate,[.040,.031,.001],[.026,.024,.001],5,headref,steps=2,sides=6)
    return np.array(vertices),np.array(triangles,np.int32),np.array(coords),np.array(labels),dict(removedVertices=int(remove.sum()),replacement='Full volumetric trunk, neck, four limbs, skull/jaw and tail; original UV appearance transfer',silhouetteGateOnly=True)
