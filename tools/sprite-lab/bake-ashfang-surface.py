"""Local CUDA rest-space material bake. No generated frames or hosted assets."""
from pathlib import Path
import sys,json
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image

folder=Path(sys.argv[1]);s=np.load(folder/'surface-bind.npz');device='cuda'
def t(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device=device,dtype=dtype).contiguous()
uv=t(s['uv']);uf=t(s['uvFaces'],torch.int32);f=t(s['faces'],torch.int32);v=t(s['positions']);labels=t(s['semanticLabels'][:,None]);size=int(s['size'])
clip=torch.cat([uv*2-1,torch.zeros_like(uv[:,:1]),torch.ones_like(uv[:,:1])],1)
r,_=dr.rasterize(dr.RasterizeCudaContext(),clip[None],uf,[size,size]);p=dr.interpolate(v[None],r,f)[0][0];lab=dr.interpolate(labels[None],r,f)[0][0,:, :,0];valid=r[0,:,:,3]>0
components=s['components'];counts=np.bincount(components);part_size=dr.interpolate(t(counts[components,None])[None],r,f)[0][0,:,:,0][valid]
result=torch.zeros((size,size,3),device=device)+t([.09,.085,.08]);points=p[valid];kinds=lab[valid].round().long();colors=[]
for start in range(0,len(points),262144):
    x=points[start:start+262144];kind=kinds[start:start+262144]
    # Irregular large scales: continuous 3D Voronoi distance field across chart seams.
    q=x*t([24,21,28]);base=torch.floor(q);d1=torch.full((len(x),),1e6,device=device);d2=d1.clone();seed=d1.clone()
    for a in (-1,0,1):
      for b in (-1,0,1):
       for c in (-1,0,1):
        cell=base+t([a,b,c]);h=torch.sin(cell@t([127.1,311.7,74.7]))*43758.5453;h=h-torch.floor(h)
        jitter=torch.stack([h,torch.frac(h*17.17),torch.frac(h*43.71)],1)*.65+.175
        dist=((cell+jitter-q)**2).sum(1);near=dist<d1;seed=torch.where(near,h,seed);d2=torch.minimum(d2,torch.where(near,d1,dist));d1=torch.minimum(d1,dist)
    edge=(torch.sqrt(d2)-torch.sqrt(d1));groove=(1-edge/.065).clamp(0,1)
    value=.235+seed*.085-groove*.075
    rgb=value[:,None]*t([1.0,.97,.94])
    # Sparse connected heat fissures, not an orange outline around every scale.
    heat=(torch.sin(x[:,1]*19+x[:,2]*24)+torch.sin(x[:,0]*33-x[:,1]*8))>1.45
    hot=(groove>.72)&heat&(x[:,2]>.015)
    rgb=torch.where(hot[:,None],t([.73,.20,.035]),rgb)
    belly=(x[:,2]<-.015)&(abs(x[:,0])<.115)&torch.isin(kind,t([5,6,9],torch.long))
    bands=(torch.sin(x[:,1]*210)>.45).float();rgb=torch.where(belly[:,None],(.17+bands*.065)[:,None]*t([1,.82,.68]),rgb)
    armor=torch.isin(kind,t([20,21,22,23],torch.long));rgb=torch.where(armor[:,None],rgb*.83,rgb)
    wing=kind==0
    # Root-to-tip leathery striations, kept broad enough to survive pixel sampling.
    radius=torch.sqrt((abs(x[:,0])-.57)**2+(x[:,1]+.2)**2)
    fold=(.5+.5*torch.sin(radius*90+x[:,1]*12))*.018
    membrane=(.19+fold)[:,None]*t([1,.49,.33]);rgb=torch.where(wing[:,None],membrane,rgb)
    sizes=part_size[start:start+len(x)]
    hard=((kind==2)&(sizes<110))|((kind==0)&(sizes<25))
    keratin=(.17+.045*(.5+.5*torch.sin(x[:,2]*115+x[:,1]*25)))[:,None]*t([1,.94,.88])
    rgb=torch.where(hard[:,None],keratin,rgb)
    if '--fire' in sys.argv:
        # Wide hot breaks under dark plates; deliberately readable at 80px/unit.
        body=torch.isin(kind,t([1,5,6,20,21,23],torch.long))
        spine=(abs(x[:,0])<.045)&(x[:,2]>.07)
        chest=(x[:,1]<-.11)&(x[:,1]>-.32)&(x[:,2]<.07)
        vent=(torch.sin(x[:,1]*66+x[:,2]*24+abs(x[:,0])*16)>.68)
        fissure=body&(((groove>.38)&(x[:,2]>.025))|(vent&chest)|(spine&vent))
        rgb=torch.where(fissure[:,None],t([1,.36,.025]),rgb)
        core=fissure&((groove>.83)|(chest&vent))
        rgb=torch.where(core[:,None],t([1,.68,.12]),rgb)
        leather=wing&~hard
        veins=(torch.sin(radius*43+torch.atan2(x[:,1]+.2,abs(x[:,0])-.57)*3)>.91)
        rgb=torch.where((leather&veins)[:,None],t([.68,.16,.025]),rgb)
    digits=kind>=30;tip=digits&(x[:,2]<-.12);rgb=torch.where(tip[:,None],rgb*.7,rgb)
    rgb=torch.where((kind==10)[:,None],t([1,.42,.035]),rgb)
    rgb=torch.where((kind==11)[:,None],t([.65,.56,.40]),rgb)
    rgb=torch.where((kind==12)[:,None],t([.018,.013,.012]),rgb)
    colors.append(rgb)
result[valid]=torch.cat(colors)
# Nearest sampling at triangle boundaries needs coloured gutters, otherwise
# uncovered atlas texels appear as black pinholes during animation.
filled=valid.clone()
for step in range(3):
    previous=filled.clone()
    for axis,shift in ((0,1),(0,-1),(1,1),(1,-1)):
        available=torch.roll(previous,shift,axis)&~filled
        result[available]=torch.roll(result,shift,axis)[available]
        filled|=available
raw=(result.flip(0).clamp(0,1).cpu().numpy()*255).astype('uint8');Image.fromarray(raw).save(folder/'ashfang-albedo.png')
(folder/'surface-material.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),atlasSize=size,method='rest-space stone scales and leather; molten plate breaks' if '--fire' in sys.argv else 'rest-space irregular stone scales, sparse heat fissures, ventral bands and leather membranes',externalAssets=False,textureFinal=False),indent=2)+'\n');print('Baked',size,'on',torch.cuda.get_device_name(),flush=True)
