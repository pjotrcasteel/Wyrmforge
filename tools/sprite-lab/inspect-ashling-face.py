"""Local head inspection with per-pixel original-surface coordinates."""
from pathlib import Path
import numpy as np,torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];folder=root/'art/source/enemies/ashling/model/local-appearance-002';out=folder/'eye-study-v1';out.mkdir(exist_ok=False)
s=np.load(folder/'textured-v1/textured-mesh.npz');t=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous();v=t(s['vertices']);faces=t(s['faces'],torch.int32)
# Front orthographic close-up, +Z up, looking along +Y.
clip=torch.stack([(v[:,0]-.025)/.24,(v[:,2]-.25)/.24,(v[:,1]+.5)/2,torch.ones_like(v[:,0])],-1)
ctx=dr.RasterizeCudaContext();r,_=dr.rasterize(ctx,clip[None],faces,[512,512]);uv=dr.interpolate(t(s['uv'])[None],r,faces)[0];texture=t(np.asarray(Image.open(folder/'textured-v1/hollow-albedo.png').convert('RGB'))/255).flip(0)[None];color=dr.texture(texture,uv,filter_mode='nearest')[0]
color[r[0,:,:,3]==0]=t([.07,.06,.08]);rgb=(color.flip(0).cpu().numpy().clip(0,1)*255).astype('uint8');image=Image.fromarray(rgb);image.save(out/'face.png')
pos=dr.interpolate(v[None],r,faces)[0][0].flip(0).cpu().numpy();np.savez_compressed(out/'surface-map.npz',positions=pos,visible=(r[0,:,:,3]>0).flip(0).cpu().numpy())
draw=ImageDraw.Draw(image)
for x in range(0,512,32):draw.line((x,0,x,512),fill=(85,65,65));draw.text((x+1,2),str(x),fill='white')
for y in range(0,512,32):draw.line((0,y,512,y),fill=(85,65,65));draw.text((1,y+1),str(y),fill='white')
image.save(out/'face-grid.png');print('Saved head surface inspection')
