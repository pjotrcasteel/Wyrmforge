"""Original authored deformable wing surfaces guided by Ashfang's card.
No cinematic assets: membrane texture coordinates point into the original card.
"""
import numpy as np
def wing_layout(sign):
    # Author the extended skeleton; folding is articulated in shoulder, elbow,
    # wrist and digits rather than scaling or rotating a single wing slab.
    root=np.array((sign*.075,-.11,.12));elbow=np.array((sign*.26,-.10,.14));wrist=np.array((sign*.57,-.20,.21))
    tips=[np.array((sign*x,y,z)) for x,y,z in [(1.12,-.12,.18),(1.02,.20,.10),(.77,.44,.06),(.34,.48,.025)]]
    middles=[wrist*.42+tip*.58 for tip in tips]
    return root,elbow,wrist,middles,tips
def rebuild_wings(v,faces,uv,source_labels):
    old=(source_labels==0)&(v[:,2]>.055)&(v[:,1]>-.22)&(abs(v[:,0])>.065)
    retained=faces[~np.any(old[faces],axis=1)];used=np.unique(retained);mapping=np.full(len(v),-1);mapping[used]=np.arange(len(used));retained=mapping[retained]
    vertices=v[used].tolist();coords=(uv[used]*[.5,1]).tolist();triangles=retained.tolist();body_count=len(vertices);camber=[0.0]*body_count;labels=source_labels[used].tolist()
    def card_uv(p):return [.5+p[0]/228*.5,1-p[1]/193]
    def append_tri(points,texcoords):
        start=len(vertices);steps=10;indices={}
        for i in range(steps+1):
            for j in range(steps+1-i):
                a=i/steps;b=j/steps;c=1-a-b;point=points[0]*c+points[1]*a+points[2]*b;point=point.copy()
                # Concave trailing bays remain attached to the four fingers.
                # The boundary retreats toward the root between spar tips,
                # retaining full span at each tip rather than a broad paddle.
                point+=(points[0]-point)*(.16*4*a*b*(a+b)**2)
                point[2]-=.035*a*b*c*12
                labels.append(0);camber.append(.055*27*a*b*c)
                indices[i,j]=len(vertices);vertices.append(point.tolist());coords.append(card_uv(np.array(texcoords[0])*c+np.array(texcoords[1])*a+np.array(texcoords[2])*b))
        for i in range(steps):
            for j in range(steps-i):
                triangles.append([indices[i,j],indices[i+1,j],indices[i,j+1]])
                if i+j<steps-1:triangles.append([indices[i+1,j],indices[i+1,j+1],indices[i,j+1]])
    for sign in [1,-1]:
        root,elbow,wrist,middles,tips=wing_layout(sign);rim=[wrist]+tips;texture_rim=[(169,32),(216,76),(205,92),(190,101),(174,111)]
        for i in range(len(rim)-1):append_tri([root,rim[i],rim[i+1]],[(150,101),texture_rim[i],texture_rim[i+1]])
        for a,b,radius in [(root,elbow,.009),(elbow,wrist,.007)]+[(wrist,mid,.005) for mid in middles]+[(mid,tip,.0035) for mid,tip in zip(middles,tips)]:
            direction=b-a;direction/=np.linalg.norm(direction);right=np.cross(direction,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(direction,right);start=len(vertices)
            for ring in [0,1]:
                for j in range(8):
                    labels.append(0);camber.append(0.0);angle=j*np.pi/4;vertices.append(((a if ring==0 else b)+radius*(right*np.cos(angle)+up*np.sin(angle))).tolist());coords.append(card_uv((170,38)))
            for j in range(8):
                k=(j+1)%8;triangles.extend([[start+j,start+k,start+8+j],[start+k,start+8+k,start+8+j]])
    return np.array(vertices),np.array(triangles,np.int32),np.array(coords),body_count,int(old.sum()),np.array(camber),np.array(labels)
