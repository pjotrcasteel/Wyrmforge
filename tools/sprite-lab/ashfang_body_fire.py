"""Depth-tested source geometry, never camera-facing flame stickers."""
import numpy as np
import torch
import nvdiffrast.torch as dr

def composite_fire(rig,clip,index,ctx,matrix,raster,rgb,alpha):
    path=rig/f'body-fire-{clip}-samples.npz'
    if not path.exists():return rgb,alpha
    with np.load(path) as source:
        def t(a,dtype=torch.float32):return torch.tensor(np.asarray(a),device=rgb.device,dtype=dtype).contiguous()
        v=t(source['positions'][index]);f=t(source['faces'],torch.int32);colors=t(source['colors'][index])
    projected=torch.cat([v,torch.ones_like(v[:,:1])],1)@matrix.T
    fire,_=dr.rasterize(ctx,projected[None],f,list(raster.shape[1:3]));color=dr.interpolate(colors[None],fire,f)[0][0]
    visible=(fire[0,:,:,3]>0)&((raster[0,:,:,3]==0)|(fire[0,:,:,2]<=raster[0,:,:,2]))
    return torch.where(visible[:,:,None],color,rgb),torch.maximum(alpha,visible.float())
