"""Depth-tested source geometry, never camera-facing flame stickers."""
import numpy as np
import torch
import nvdiffrast.torch as dr
from functools import lru_cache

@lru_cache(maxsize=3)
def load_fire(path):
    with np.load(path) as source:
        return {key:source[key] for key in source.files}

def composite_fire(rig,clip,index,ctx,matrix,raster,rgb,alpha):
    path=rig/f'body-fire-{clip}-samples.npz'
    if not path.exists():return rgb,alpha
    source=load_fire(path)
    def t(a,dtype=torch.float32):return torch.tensor(np.asarray(a),device=rgb.device,dtype=dtype).contiguous()
    v=t(source['positions'][index]);f=t(source['faces'],torch.int32);colors=t(source['colors'][index])
    smoke_path=rig/f'body-smoke-{clip}-samples.npz'
    if smoke_path.exists():
        body=load_fire(rig/f'{clip}-samples.npz')
        world=dr.interpolate(t(body['positions'][index])[None],raster,t(body['faces'],torch.int32))[0][0]
        distance=torch.cdist(world.reshape(-1,3),v[::49]).min(1).values.reshape(rgb.shape[:2])
        bounce=.14*torch.exp(-distance/.10)*(raster[0,:,:,3]>0)
        stone=(rgb[:,:,0]<.45)|(rgb[:,:,0]<rgb[:,:,1]*1.5)
        rgb=rgb+bounce[:,:,None]*t([1,.29,.045])*stone[:,:,None]
    projected=torch.cat([v,torch.ones_like(v[:,:1])],1)@matrix.T
    fire,_=dr.rasterize(ctx,projected[None],f,list(raster.shape[1:3]));color=dr.interpolate(colors[None],fire,f)[0][0]
    visible=(fire[0,:,:,3]>0)&((raster[0,:,:,3]==0)|(fire[0,:,:,2]<=raster[0,:,:,2]))
    rgb=torch.where(visible[:,:,None],color,rgb);alpha=torch.maximum(alpha,visible.float())
    if smoke_path.exists():
        smoke=load_fire(smoke_path);centers=t(smoke['centers'][index]);radii=t(smoke['radii'][index]);densities=t(smoke['densities'][index])
        h,w=rgb.shape[:2];gy,gx=torch.meshgrid((torch.arange(h,device=rgb.device)+.5)*2/h-1,(torch.arange(w,device=rgb.device)+.5)*2/w-1,indexing='ij')
        scale=torch.linalg.vector_norm(matrix[:3,:3],dim=1)
        center_clip=torch.cat([centers,torch.ones_like(centers[:,:1])],1)@matrix.T
        depth=torch.where(visible,fire[0,:,:,2],raster[0,:,:,2])/scale[2]
        occupied=(alpha>0);optical=torch.zeros_like(alpha)
        for c,radius,density in zip(center_clip,radii,densities):
            d2=((gx-c[0])/scale[0])**2+((gy-c[1])/scale[1])**2
            half=torch.sqrt((radius*radius-d2).clamp(min=0))
            length=torch.where(occupied,(depth-c[2]/scale[2]+half).clamp(min=0),2*half)
            length=torch.minimum(length,2*half)
            optical+=density*length/(2*radius)
        opacity=(1-torch.exp(-optical)).clamp(max=.78)
        soot=t([.070,.061,.055]);combined=alpha+opacity*(1-alpha)
        rgb=(rgb*alpha[:,:,None]*(1-opacity[:,:,None])+soot*opacity[:,:,None])/combined[:,:,None].clamp(min=1e-6)
        alpha=combined
    return rgb,alpha
