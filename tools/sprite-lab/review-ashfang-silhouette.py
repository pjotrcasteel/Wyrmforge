"""Native-pixel source gate: actual 3D cameras, flat material and silhouette."""
import sys,json,math
from pathlib import Path
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
from ashfang_preview_lighting import shade

rig=Path(sys.argv[1]);out=rig/'silhouette-review-v1';out.mkdir(exist_ok=False)
s=np.load(rig/'walk-samples.npz');cell=192;density=94
def tensor(a,dtype=torch.float32):return torch.tensor(np.asarray(a),device='cuda',dtype=dtype).contiguous()
v=tensor(s['positions'][0]);hom=torch.cat([v,torch.ones_like(v[:,:1])],1)
faces=tensor(s['faces'],torch.int32);ctx=dr.RasterizeCudaContext()
uv=tensor(s['uv']);texture=tensor(np.asarray(Image.open(rig/'ashfang-albedo.png').convert('RGB'))/255).flip(0)[None]
board=Image.new('RGB',(cell*4,cell*3+72),(38,39,43));draw=ImageDraw.Draw(board);audit=[]
for col,(name,eye) in enumerate([('Front',(0,-3,.12)),('Side',(3,0,.12)),('Game',(2,-3,2.2)),('Rear',(0,3,.12))]):
    forward=-np.array(eye)/np.linalg.norm(eye);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
    matrix=np.eye(4,dtype=np.float32);matrix[0,:3]=right*density/(cell/2);matrix[1,:3]=up*density/(cell/2);matrix[2,:3]=forward*.2
    matrix[1,3]=-.1
    rast,_=dr.rasterize(ctx,(hom@tensor(matrix).T)[None],faces,[cell,cell]);alpha=rast[0,:,:,3]>0
    tex=dr.interpolate(uv[None],rast,faces)[0];rgb=dr.texture(texture,tex,filter_mode='nearest')[0]
    clay=shade(torch.ones_like(rgb)*.48,v,faces,rast)
    modes=[torch.ones_like(rgb)*.06,clay,shade(rgb,v,faces,rast)]
    bounds=None
    for row,color in enumerate(modes):
        rgba=(torch.cat([color,alpha[:,:,None]],-1).flip(0).clamp(0,1).cpu().numpy()*255).astype('uint8');im=Image.fromarray(rgba)
        im.save(out/f'{name.lower()}-{row}.png');bounds=im.getbbox();x=col*cell;y=row*(cell+24);board.paste(im,(x,y),im)
        draw.text((x+6,y+cell+4),name+' / '+['silhouette','clay','texture'][row],fill=(215,210,195))
    audit.append(dict(view=name,nativeBounds=bounds,width=bounds[2]-bounds[0],clipped=bool(alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any())))
board.save(out/'anatomy-gate.png')
(out/'review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),modelToPixel=density,cell=cell,views=audit,ownerAccepted=False,animationValidated=False),indent=2)+'\n')
print(out,flush=True)
