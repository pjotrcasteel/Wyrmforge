"""Depth-tested source geometry, never camera-facing flame stickers."""
import numpy as np
import torch
import nvdiffrast.torch as dr
from functools import lru_cache

@lru_cache(maxsize=1)
def load_fire(path):
    with np.load(path) as source:
        return {key:source[key] for key in source.files}

def composite_fire(rig,clip,index,ctx,matrix,raster,rgb,alpha):
    path=rig/f'body-fire-{clip}-samples.npz'
    if not path.exists():return rgb,alpha
    source=load_fire(path)
    def t(a,dtype=torch.float32):return torch.tensor(np.asarray(a),device=rgb.device,dtype=dtype).contiguous()
    v=t(source['positions'][index]);f=t(source['faces'],torch.int32);colors=t(source['colors'][index])
    projected=torch.cat([v,torch.ones_like(v[:,:1])],1)@matrix.T
    fire,_=dr.rasterize(ctx,projected[None],f,list(raster.shape[1:3]));color=dr.interpolate(colors[None],fire,f)[0][0]
    visible=(fire[0,:,:,3]>0)&((raster[0,:,:,3]==0)|(fire[0,:,:,2]<=raster[0,:,:,2]))
    return torch.where(visible[:,:,None],color,rgb),torch.maximum(alpha,visible.float())
