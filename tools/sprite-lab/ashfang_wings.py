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
    vertices=v[used].tolist();coords=(uv[used]*[.5,1]).tolist();triangles=retained.tolist();body_count=len(vertices);camber=[0.0]*body_count;labels=source_labels[used].tolist();membrane_bind=[];spar_bind={};seam_cache={}
    def card_uv(p):return [.5+p[0]/228*.5,1-p[1]/193]
    def append_tri(points,texcoords,sign,anchor_names):
        start=len(vertices);steps=10;indices={}
        for i in range(steps+1):
            for j in range(steps+1-i):
                a=i/steps;b=j/steps;c=1-a-b;point=points[0]*c+points[1]*a+points[2]*b;point=point.copy()
                # Concave trailing bays remain attached to the four fingers.
                # The boundary retreats toward the root between spar tips,
                # retaining full span at each tip rather than a broad paddle.
                point[2]-=.035*a*b*c*12
                cache_key=(sign,tuple(np.round(point,9)))
                if cache_key in seam_cache:
                    indices[i,j]=seam_cache[cache_key];continue
                seam_cache[cache_key]=len(vertices)
                labels.append(0);camber.append(.055*27*a*b*c)
                membrane_bind.append(dict(index=len(vertices),side='L' if sign>0 else 'R',anchors=list(zip(anchor_names,[c,a,b]))))
                indices[i,j]=len(vertices);vertices.append(point.tolist());coords.append(card_uv(np.array(texcoords[0])*c+np.array(texcoords[1])*a+np.array(texcoords[2])*b))
        for i in range(steps):
            for j in range(steps-i):
                triangles.append([indices[i,j],indices[i+1,j],indices[i,j+1]])
                if i+j<steps-1:triangles.append([indices[i+1,j],indices[i+1,j+1],indices[i,j+1]])
    for sign in [1,-1]:
        root,elbow,wrist,middles,tips=wing_layout(sign);texture_wrist=np.array((169,32));texture_tips=[np.array(p) for p in [(216,76),(205,92),(190,101),(174,111)]]
        # Fingers originate at the wrist, not the shoulder. Each bay follows
        # both knuckles, so bent ribs cannot float above an unrelated fan.
        for bay in range(3):
            grid={};steps=12
            for row in range(steps+1):
                radial=(row/7*.58) if row<=7 else .58+(row-7)/5*.42
                for col in range(steps+1):
                    u=col/steps;t=radial-.12*4*u*(1-u)*radial**4
                    if t<=.58:
                        q=t/.58;anchors=[('wrist',1-q),(f'mid.{bay}',q*(1-u)),(f'mid.{bay+1}',q*u)]
                        point=wrist*(1-q)+(middles[bay]*(1-u)+middles[bay+1]*u)*q
                    else:
                        q=(t-.58)/.42;anchors=[(f'mid.{bay}',(1-q)*(1-u)),(f'mid.{bay+1}',(1-q)*u),(f'tip.{bay}',q*(1-u)),(f'tip.{bay+1}',q*u)]
                        point=(middles[bay]*(1-u)+middles[bay+1]*u)*(1-q)+(tips[bay]*(1-u)+tips[bay+1]*u)*q
                    point=point.copy();point[2]-=.014*4*u*(1-u)*np.sin(np.pi*t)
                    key=(sign,tuple(np.round(point,9)))
                    if key in seam_cache:grid[row,col]=seam_cache[key];continue
                    index=len(vertices);seam_cache[key]=index;grid[row,col]=index
                    vertices.append(point.tolist());labels.append(0);camber.append(.025*4*u*(1-u)*np.sin(np.pi*t))
                    coords.append(card_uv(texture_wrist*(1-t)+(texture_tips[bay]*(1-u)+texture_tips[bay+1]*u)*t))
                    membrane_bind.append(dict(index=index,side='L' if sign>0 else 'R',anchors=anchors))
            for row in range(steps):
                for col in range(steps):
                    a,b,c,d=grid[row,col],grid[row+1,col],grid[row,col+1],grid[row+1,col+1]
                    if len({a,b,c})==3:triangles.append([a,b,c])
                    if len({b,d,c})==3:triangles.append([b,d,c])
        texture_mid=texture_wrist*.42+texture_tips[3]*.58
        append_tri([root,elbow,wrist],[(150,101),(160,69),texture_wrist],sign,['root','elbow','wrist'])
        append_tri([root,wrist,middles[3]],[(150,101),texture_wrist,texture_mid],sign,['root','wrist','mid.3'])
        append_tri([root,middles[3],tips[3]],[(150,101),texture_mid,texture_tips[3]],sign,['root','mid.3','tip.3'])
        side='L' if sign>0 else 'R'
        spars=[(root,elbow,.012,'wing.upper.'+side),(elbow,wrist,.009,'wing.fore.'+side)]+[(wrist,mid,.006,f'wing.finger.{f}.0.{side}') for f,mid in enumerate(middles)]+[(mid,tip,.004,f'wing.finger.{f}.1.{side}') for f,(mid,tip) in enumerate(zip(middles,tips))]
        for a,b,radius,bone_name in spars:
            direction=b-a;direction/=np.linalg.norm(direction);right=np.cross(direction,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(direction,right);start=len(vertices)
            for ring in [0,1]:
                for j in range(8):
                    spar_bind[len(vertices)]=bone_name
                    labels.append(0);camber.append(0.0);angle=j*np.pi/4;vertices.append(((a if ring==0 else b)+radius*(right*np.cos(angle)+up*np.sin(angle))).tolist());coords.append(card_uv((170,38)))
            for j in range(8):
                k=(j+1)%8;triangles.extend([[start+j,start+k,start+8+j],[start+k,start+8+k,start+8+j]])
    return np.array(vertices),np.array(triangles,np.int32),np.array(coords),body_count,int(old.sum()),np.array(camber),np.array(labels),membrane_bind,spar_bind
