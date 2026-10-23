"""Persistent surface-bound 3D flame motion, independent of the render camera."""
from pathlib import Path
import sys,json,math
import numpy as np

rig=Path(sys.argv[1]);bind=np.load(rig/'surface-bind.npz');rest=bind['positions'];labels=bind['semanticLabels']
inferno='--inferno' in sys.argv
targets=[(0,y,z,.12) for y,z in [(-.25,.20),(-.12,.19),(0,.18),(.13,.15),(.25,.10)]]
targets += [(sign*.10,y,.09,.075) for sign in (-1,1) for y in (-.2,-.08,.10)]
targets += [(x,y,z,.10) for x,y,z in [(-.03,.48,.10),(-.08,.75,.15),(-.145,.98,.26)]]
anchors=[]
for x,y,z,height in targets:
    pool=np.flatnonzero(np.isin(labels,[1,5,6,20,21,23]));ids=pool[np.argsort(((rest[pool]-[x,y,z])**2).sum(1))[:3]]
    anchors.append(dict(vertices=ids.tolist(),height=height))
faces=[];rings=7;sides=7
for emitter in range(len(anchors)*2):
    offset=emitter*rings*sides
    for ring in range(rings-1):
        for j in range(sides):
            a=offset+ring*sides+j;b=offset+ring*sides+(j+1)%sides;c=a+sides;d=b+sides;faces.extend([[a,b,c],[b,d,c]])
faces=np.array(faces,np.int32);profile=json.loads((rig/'profile.json').read_text());reports={}
for path in rig.glob('*-samples.npz'):
    if path.name.startswith('body-'):continue
    clip=path.name[:-12];s=np.load(path);positions=s['positions'];spec=profile['clips'][clip];frames=[];colors=[]
    for frame,p in enumerate(positions):
        time=frame/(len(positions)-1)*round((len(positions)-1)/spec['fps']*3) /3 if spec['loop'] else frame/spec['fps']
        verts=[];rgb=[]
        for i,anchor in enumerate(anchors):
            ids=anchor['vertices'];origin=p[ids].mean(0)
            previous=positions[max(0,frame-1),ids].mean(0);velocity=(origin-previous)*spec['fps']
            # Cyclic loops use a central derivative with matching endpoints.
            if spec['loop']:
                n=len(positions)-1;k=frame%n;velocity=(positions[(k+1)%n,ids].mean(0)-positions[(k-1)%n,ids].mean(0))*spec['fps']*.5
            for tongue in range(2):
                phase=time*math.tau*3+i*2.399+tongue*1.7
                height=anchor['height']*(.85+.23*math.sin(phase))*(1 if tongue==0 else .66)*(1.55 if inferno else 1)
                for ring in range(rings):
                    u=ring/(rings-1);center=origin+np.array([.012*math.sin(phase-u*4)*u,.065*u*u+.014*math.cos(phase-u*5)*u,height*u])
                    center-=np.clip(velocity,-2,2)*(.045*u*u)
                    center[0]+=(tongue-.5)*.018
                    radius=(.023 if tongue==0 else .014)*(1-u)**.65*(1+.25*math.sin(phase+u*7))*(1.40 if inferno else 1)+.0002
                    for j in range(sides):
                        a=j*math.tau/sides;verts.append(center+[radius*math.cos(a),radius*math.sin(a),0])
                        rgb.append([1,max(.025,(.32-.29*u) if tongue==0 else (.70-.64*u)),max(.002,.06*(1-u))] if inferno else [1,max(.06,.76-.70*u),max(.005,.16-.18*u)])
        frames.append(verts);colors.append(rgb)
    values=np.array(frames,np.float32);assert np.isfinite(values).all()
    np.savez_compressed(rig/f'body-fire-{clip}-samples.npz',positions=values,faces=faces,colors=np.array(colors,np.float32))
    if '--smoke' in sys.argv:
        centers=[];radii=[];densities=[]
        for frame,p in enumerate(positions):
            cs=[];rs=[];ds=[]
            for i,anchor in enumerate(anchors):
                for puff in range(5):
                    # Continuous particle ages wrap only at zero density.
                    seconds=frame/spec['fps'];age=(seconds*.8+puff/5+i*.137)%1
                    if spec['loop']:age=(frame/(len(positions)-1)*2+puff/5+i*.137)%1
                    delay=age*.9*spec['fps'];sample=frame-delay
                    if spec['loop']:sample%=len(positions)-1
                    sample=max(0,min(len(positions)-1,sample));lo=int(sample);hi=min(len(positions)-1,lo+1);mix=sample-lo
                    origin=(positions[lo,anchor['vertices']].mean(0)*(1-mix)+positions[hi,anchor['vertices']].mean(0)*mix)
                    drift=np.array([.025*math.sin(i*2.4+age*6),.09*age,(.15 if inferno else .10)+.22*age])
                    cs.append(origin+drift);rs.append(.024+.070*age);ds.append(.66*math.sin(math.pi*age)**.85)
            centers.append(cs);radii.append(rs);densities.append(ds)
        np.savez_compressed(rig/f'body-smoke-{clip}-samples.npz',centers=np.array(centers,np.float32),radii=np.array(radii,np.float32),densities=np.array(densities,np.float32))
    reports[clip]=dict(frames=len(values),finite=True,loopError=float(abs(values[0]-values[-1]).max()) if spec['loop'] else None)
(rig/'body-fire-source.json').write_text(json.dumps(dict(anchors=anchors,profile='crimson-inferno' if inferno else 'shadowfire',flameHeightMultiplier=1.55 if inferno else 1,flameWidthMultiplier=1.40 if inferno else 1,method='Surface-bound volumetric tongues; buoyant upward drift, rearward trail and local motion drag; deterministic periodic flicker',smoke='Historical surface-bound expanding density spheres with buoyant rise and drift' if '--smoke' in sys.argv else None,clips=reports,gameplayDamage=False,ownerAccepted=False),indent=2)+'\n');print('Authored fire on',len(reports),'motions',flush=True)
