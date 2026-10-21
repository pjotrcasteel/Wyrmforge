"""Local retopology of failed reconstructed surfaces, retaining card-derived UVs.
The reconstructed texture remains the appearance reference. Anatomical sections are continuous
faceted lofts with real volume, not planar cutouts or frame-specific repairs.
"""
import numpy as np
from ashfang_digits import digit_points,digit_label

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
        points=np.array([(sign*.105,.17,-.010),(sign*.15,.13,-.035),(sign*.18,.095,-.072),(sign*.18,.155,-.112),(sign*.18,.23,-.157),(sign*.18,.17,-.178),(sign*.18,.09,-.182),(sign*.18,.075,-.180)])
        loft(points,[.078,.070,.046,.032,.023,.029,.042,.024],[.068,.059,.038,.030,.022,.016,.013,.009],label,hind&(source[:,0]*sign>0),steps=4,ridges=.04)
        fore=np.array([(sign*.115,-.18,.015),(sign*.145,-.195,-.035),(sign*.15,-.22,-.075),(sign*.16,-.255,-.115),(sign*.17,-.29,-.163),(sign*.17,-.325,-.181),(sign*.17,-.35,-.183),(sign*.17,-.365,-.18)])
        loft(fore,[.065,.060,.046,.034,.025,.036,.041,.023],[.062,.053,.042,.032,.023,.015,.012,.008],7 if sign>0 else 8,(source[:,1]<-.08)&(source[:,2]<-.055)&(source[:,0]*sign>0),steps=4,ridges=.04)
        side='L' if sign>0 else 'R'
        for limb in ['fore','hind']:
            for digit in range(3):loft(digit_points(limb,side,digit),[.011,.009,.001],[.009,.007,.001],digit_label(limb,side,digit),source[:,2]<-.10,steps=4,sides=8)
    # Angular upper skull replaces the broad fused cap; lower jaw is retained.
    points=np.array([(0,-.315,.145),(0,-.36,.163),(0,-.415,.143),(0,-.46,.123),(0,-.515,.112),(0,-.570,.100)])
    headref=(source[:,1]<-.29)&(source[:,2]>.015)
    skull_profile=[(1,.15),(.78,.80),(.30,1),(-.30,1),(-.78,.80),(-1,.15),(-.78,-.65),(-.35,-1),(.35,-1),(.78,-.65)]
    loft(points,[.069,.100,.079,.061,.046,.024],[.050,.064,.047,.034,.027,.022],2,headref,steps=3,ridges=.015,profile=skull_profile)
    jaw=np.array([(0,-.35,.085),(0,-.405,.078),(0,-.47,.076),(0,-.525,.073),(0,-.568,.075)])
    loft(jaw,[.060,.066,.052,.039,.021],[.017,.019,.017,.013,.006],9,headref,steps=3,ridges=.015)
    for sign in [1,-1]:
        brow=np.array([(sign*.049,-.452,.160),(sign*.074,-.421,.183),(sign*.095,-.38,.186)])
        loft(brow,[.013,.019,.013],[.012,.016,.010],2,headref,steps=2,sides=6)
        eye=np.array([(sign*.071,-.444,.162),(sign*.078,-.431,.166),(sign*.081,-.418,.168)])
        loft(eye,[.002,.004,.002],[.002,.004,.002],10,headref,steps=2,sides=6)
        nostril=np.array([(sign*.025,-.540,.126),(sign*.026,-.549,.124),(sign*.023,-.557,.122)])
        loft(nostril,[.002,.004,.002],[.002,.003,.002],12,headref,steps=2,sides=6)
    for sign in [1,-1]:
        horn=np.array([(sign*.075,-.345,.173),(sign*.100,-.305,.220),(sign*.115,-.245,.264),(sign*.105,-.185,.290)])
        loft(horn,[.026,.020,.012,.0008],[.024,.019,.010,.0008],2,headref,steps=3,sides=8)
        cheek=np.array([(sign*.080,-.37,.105),(sign*.124,-.325,.132),(sign*.153,-.265,.155)])
        loft(cheek,[.026,.018,.001],[.020,.014,.001],2,headref,steps=2,sides=6)
        for y,x in [(-.48,.055),(-.535,.043)]:
            fang=np.array([(sign*x,y,.092),(sign*x,y-.004,.078),(sign*(x-.004),y+.004,.064)])
            loft(fang,[.009,.007,.0005],[.008,.006,.0005],11,headref,steps=2,sides=6)
        for y,z in [(-.14,.11),(-.035,.115),(.085,.095)]:
            plate=np.array([(sign*.11,y,z),(sign*.157,y+.018,z+.036),(sign*.18,y+.054,z+.065)])
            loft(plate,[.040,.031,.001],[.026,.024,.001],5,headref,steps=2,sides=6)
    # Overlapping solid stone scutes supply broad readable planes rather than
    # relying on the card's tiny orange texture detail at mobile resolution.
    def armor(center,width,length,height,label):
        x,y,z=center;start=len(vertices)
        local=[(-width/2,-length/2,0),(width/2,-length/2,0),(width/2,length*.28,.003),(0,length/2,.006),(-width/2,length*.28,.003),(0,-length*.05,height),(0,0,-.009)]
        for a,b,c in local:vertices.append([x+a,y+b,z+c]);coords.append([0,0]);labels.append(label)
        for j in range(5):
            k=(j+1)%5;triangles.extend([[start+j,start+k,start+5],[start+k,start+j,start+6]])
    for y,z,width in [(.17,.096,.095),(.065,.128,.11),(-.04,.15,.12),(-.14,.153,.105)]:
        armor((0,y,z),width,.115,.023,20)
        for sign in [-1,1]:armor((sign*.087,y+.025,z-.025),.070,.105,.019,20)
    for y,z in [(-.235,.165),(-.30,.176)]:armor((0,y,z),.095,.09,.021,21)
    armor((0,-.375,.198),.105,.09,.022,22)
    for i in range(1,6):
        p=TAIL_POINTS[i].copy();p[2]+=[0,.064,.052,.045,.036,.027][i]
        armor(p,.13*(1-i/8),.09,.014,23)
    return np.array(vertices),np.array(triangles,np.int32),np.array(coords),np.array(labels),dict(removedVertices=int(remove.sum()),replacement='Full volumetric trunk, neck, four limbs, skull/jaw and tail; original UV appearance transfer',silhouetteGateOnly=True)
