"""Actual head cameras at inspection resolution, plus native full-body context."""
from pathlib import Path
import sys,json
import numpy as np,torch
import nvdiffrast.torch as dr
from ashfang_surface_uv import uv_triangles
from PIL import Image,ImageDraw
from ashfang_preview_lighting import shade,palette_for
rig=Path(sys.argv[1]);out=rig/(sys.argv[2] if len(sys.argv)>2 else 'head-review-v1');out.mkdir(exist_ok=False)
s=np.load(rig/'walk-samples.npz');labels=s['semanticLabels'];head=np.isin(labels,[2,6,9,10,11,12,21,22]);faces=s['faces'][np.all(head[s['faces']],axis=1)]
def t(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device='cuda',dtype=dtype).contiguous()
ctx=dr.RasterizeCudaContext();v=t(s['positions'][0]);hom=torch.cat([v,torch.ones_like(v[:,:1])],1);f=t(faces,torch.int32);uv=t(s['uv']);albedo=Image.open(rig/'ashfang-albedo.png').convert('RGB');texture=t(np.asarray(albedo)/255).flip(0)[None];palette=palette_for(albedo)
cell=256;board=Image.new('RGB',(cell*3,cell*2+64),(38,39,43));draw=ImageDraw.Draw(board);audits=[]
for col,(name,eye) in enumerate([('Front',(0,-3,.3)),('Profile',(3,0,.3)),('Game angle',(2,-3,2.2))]):
 forward=-np.array(eye)/np.linalg.norm(eye);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward);target=np.array([0,-.35,.16]);m=np.eye(4,dtype=np.float32)
 m[0,:3]=right*500/(cell/2);m[1,:3]=up*500/(cell/2);m[0,3]=-np.dot(right,target)*500/(cell/2);m[1,3]=-np.dot(up,target)*500/(cell/2);m[2,:3]=forward*.2
 raster,_=dr.rasterize(ctx,(hom@t(m).T)[None],f,[cell,cell]);alpha=raster[0,:,:,3]>0;tex=dr.interpolate(uv[None],raster,uv_triangles(s,f))[0];rgb=dr.texture(texture,tex,filter_mode='nearest')[0]
 for row,color in enumerate([shade(torch.ones_like(rgb)*.48,v,f,raster),shade(rgb,v,f,raster)]):
  raw=(torch.cat([color,alpha[:,:,None]],-1).flip(0).clamp(0,1).cpu().numpy()*255).astype('uint8');im=Image.fromarray(raw)
  if row:
   q=im.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');q.putalpha(im.getchannel('A'));im=q
  im.save(out/f'head-{col}-{row}.png');board.paste(im,(col*cell,row*(cell+24)),im);draw.text((col*cell+5,row*(cell+24)+cell+4),name+' / '+('clay' if row==0 else 'texture'),fill=(220,210,190))
 audits.append(dict(view=name,clipped=bool(alpha[0].any() or alpha[-1].any() or alpha[:,0].any() or alpha[:,-1].any())))
draw.text((8,cell*2+50),'SOURCE INSPECTION 500 px/unit; native game context is reviewed separately at 110 px/unit',fill=(220,210,190));board.save(out/'head-inspection.png')
(out/'review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),inspectionOnly=True,modelToPixel=500,views=audits,ownerAccepted=False),indent=2)+'\n')
print(out,flush=True)
