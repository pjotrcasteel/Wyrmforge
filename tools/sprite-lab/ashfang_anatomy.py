"""Local retopology of failed reconstructed surfaces, retaining card-derived UVs.
The torso remains reconstructed. Rebuilt anatomical sections are continuous
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
    remove=tail|hind|cap
    retained=faces[~np.any(remove[faces],axis=1)];used=np.unique(retained)
    mapping=np.full(len(v),-1);mapping[used]=np.arange(len(used))
    vertices=v[used].tolist();coords=uv[used].tolist();triangles=mapping[retained].tolist();labels=[0]*len(vertices)
    def loft(points,widths,heights,label,reference,steps=4,sides=12,ridges=.0):
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
                    point=center+right*np.cos(angle)*width*crag+up*np.sin(angle)*height*crag
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
    loft(TAIL_POINTS,[.071,.067,.054,.043,.032,.024,.017,.010,.002],[.060,.061,.054,.048,.040,.030,.022,.014,.003],1,source[:,1]>.25,steps=4,ridges=.10)
    for sign,label in [(1,3),(-1,4)]:
        # Heavy thigh, visible narrow hock, forward toe fan. Continuous rings
        # span the joints so there is no old belly-to-foot sheet to stretch.
        points=np.array([(sign*.105,.17,-.025),(sign*.15,.12,-.055),(sign*.18,.095,-.075),(sign*.18,.16,-.12),(sign*.18,.23,-.16),(sign*.18,.17,-.179),(sign*.18,.09,-.183),(sign*.18,.060,-.181)])
        loft(points,[.057,.050,.033,.024,.018,.022,.032,.020],[.052,.042,.028,.023,.018,.015,.012,.007],label,hind&(source[:,0]*sign>0),steps=3,ridges=.10)
    # Angular upper skull replaces the broad fused cap; lower jaw is retained.
    points=np.array([(0,-.305,.102),(0,-.365,.108),(0,-.425,.097),(0,-.49,.083),(0,-.555,.070)])
    headref=(source[:,1]<-.29)&(source[:,2]>.015)
    loft(points,[.068,.078,.061,.044,.022],[.033,.041,.030,.023,.012],2,headref,steps=3,ridges=.08)
    for sign in [1,-1]:
        horn=np.array([(sign*.059,-.345,.132),(sign*.073,-.316,.166),(sign*.081,-.280,.198),(sign*.078,-.246,.218)])
        loft(horn,[.015,.012,.007,.0008],[.015,.012,.007,.0008],2,headref,steps=3,sides=8)
    return np.array(vertices),np.array(triangles,np.int32),np.array(coords),np.array(labels),dict(removedVertices=int(remove.sum()),replacedHeadCapVertices=int(cap.sum()),replacedHindVertices=int(hind.sum()),replacedTailVertices=int(tail.sum()))
