"""Render actual 33-state source deformation, with bounded-geometry checks."""
import sys,json
from pathlib import Path
import numpy as np
import torch
import nvdiffrast.torch as dr
from ashfang_surface_uv import uv_triangles
from PIL import Image,ImageDraw
from ashfang_preview_lighting import shade,palette_for
rig=Path(sys.argv[1]);out=rig/(sys.argv[2] if len(sys.argv)>2 else 'fold-sweep-review-v1');out.mkdir(exist_ok=False)
s=np.load(rig/'walk-samples.npz');positions=s['positions'];faces_np=s['faces']
assert len(positions)==33 and np.isfinite(positions).all()
edges=np.concatenate([faces_np[:,[0,1]],faces_np[:,[1,2]],faces_np[:,[2,0]]])
edge_max=float(max(np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1).max() for p in positions))
# Rib tubes intentionally contain longitudinal edges up to 0.43 units;
# their lengths remain rigid. A 0.5-unit bound contains these authored spars.
span=np.ptp(positions,axis=1);assert span.max()<3 and edge_max<.5,(span.max(),edge_max)
assert positions[:,:,2].min()>-.198
def tensor(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device='cuda',dtype=dtype).contiguous()
ctx=dr.RasterizeCudaContext();faces=tensor(faces_np,torch.int32);uv=tensor(s['uv'])
albedo=Image.open(rig/'ashfang-albedo.png').convert('RGB');palette=palette_for(albedo)
texture=tensor(np.asarray(albedo)/255).flip(0)[None];cell=320;density=110
eye=np.array([2,-3,2.2]);forward=-eye/np.linalg.norm(eye);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
matrix=np.eye(4,dtype=np.float32);matrix[0,:3]=right*density/(cell/2);matrix[1,:3]=up*density/(cell/2);matrix[2,:3]=forward*.2;matrix[1,3]=-.1
matrix=tensor(matrix);frames=[];clipped=[]
for index,p in enumerate(positions):
    v=tensor(p);hom=torch.cat([v,torch.ones_like(v[:,:1])],1);raster,_=dr.rasterize(ctx,(hom@matrix.T)[None],faces,[cell,cell])
    alpha=raster[0,:,:,3]>0;clipped.append(bool(alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any()))
    tex=dr.interpolate(uv[None],raster,uv_triangles(s,faces))[0];color=dr.texture(texture,tex,filter_mode='nearest')[0]
    board=Image.new('RGB',(cell*2,cell+36),(38,39,43));draw=ImageDraw.Draw(board)
    for col,rgb in enumerate([shade(torch.ones_like(color)*.48,v,faces,raster),shade(color,v,faces,raster)]):
        rgba=(torch.cat([rgb,alpha[:,:,None]],-1).flip(0).clamp(0,1).cpu().numpy()*255).astype('uint8');image=Image.fromarray(rgba)
        if col:
            q=image.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');q.putalpha(image.getchannel('A'));image=q
        board.paste(image,(col*cell,20),image)
    draw.text((12,6),'Clay / actual source',fill=(220,210,190));draw.text((cell+12,6),'Texture / native pixels',fill=(220,210,190))
    draw.text((12,cell+20),'Fold diagnostic: not flight or combat animation',fill=(220,210,190));frames.append(board)
assert not any(clipped)
sequence=frames+frames[-2:0:-1];sequence[0].save(out/'fold-unfold.gif',save_all=True,append_images=sequence[1:],duration=70,loop=0,optimize=False)
frames[0].save(out/'folded.png');frames[16].save(out/'partial.png');frames[-1].save(out/'open.png')
(out/'review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),samples=33,allFinite=True,maxEdge=edge_max,maxSpan=span.max(axis=0).tolist(),minZ=float(positions[:,:,2].min()),clipped=False,modelToPixel=density,cell=cell,diagnosticOnly=True,ownerAccepted=False,combatAnimationValidated=False),indent=2)+'\n')
print(out,flush=True)
