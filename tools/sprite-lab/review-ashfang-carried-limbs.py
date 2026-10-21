"""Compare actual old/new flight-loop limb meshes at a labelled inspection scale."""
import sys,json
from pathlib import Path
import numpy as np,torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
old=Path(sys.argv[1]);new=Path(sys.argv[2]);out=new/'limb-review-v1';out.mkdir(exist_ok=False)
def t(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device='cuda',dtype=dtype).contiguous()
ctx=dr.RasterizeCudaContext();sources=[np.load(p/'flight-loop-samples.npz') for p in [old,new]];selected=[]
for i,s in enumerate(sources):
 mask=np.isin(s['semanticLabels'],[3,4,7,8]+list(range(30,42))) if 'semanticLabels' in s else (np.arange(len(s['positions'][0]))>=1234)&(np.arange(len(s['positions'][0]))<2634)
 selected.append(t(s['faces'][np.all(mask[s['faces']],axis=1)],torch.int32))
cell=320;density=450;eye=np.array([3,-1,1.2]);forward=-eye/np.linalg.norm(eye);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward);target=np.array([0,-.04,.26]);matrix=np.eye(4,dtype=np.float32)
matrix[0,:3]=right*density/(cell/2);matrix[1,:3]=up*density/(cell/2);matrix[0,3]=-np.dot(right,target)*density/(cell/2);matrix[1,3]=-np.dot(up,target)*density/(cell/2);matrix[2,:3]=forward*.2;matrix=t(matrix)
frames=[]
for frame in range(16):
 board=Image.new('RGB',(cell*2,cell+40),(38,39,43));draw=ImageDraw.Draw(board)
 for col,(s,faces) in enumerate(zip(sources,selected)):
  v=t(s['positions'][frame]);hom=torch.cat([v,torch.ones_like(v[:,:1])],1);raster,_=dr.rasterize(ctx,(hom@matrix.T)[None],faces,[cell,cell]);alpha=raster[0,:,:,3]>0
  tris=v[faces.long()];normals=torch.nn.functional.normalize(torch.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0],dim=1),dim=1);norm=torch.zeros_like(v)
  for corner in range(3):norm.index_add_(0,faces[:,corner].long(),normals)
  pixel=dr.interpolate(torch.nn.functional.normalize(norm,dim=1)[None],raster,faces)[0][0];light=t([-.4,-.6,1]);light=light/light.norm();shade=.38+.22*(pixel*light).sum(2).clamp(0,1)
  rgba=(torch.cat([shade[:,:,None].expand(-1,-1,3),alpha[:,:,None]],-1).flip(0).cpu().numpy()*255).astype('uint8');image=Image.fromarray(rgba);board.paste(image,(col*cell,20),image)
  draw.text((col*cell+8,5),'V48 straight paws' if col==0 else 'New carried wrists and curled digits',fill=(220,210,190))
 draw.text((8,cell+24),'LIMB INSPECTION / 450 px per unit / actual source loop / torso omitted',fill=(220,210,190));frames.append(board)
frames[0].save(out/'carried-limbs.gif',save_all=True,append_images=frames[1:],duration=60,loop=0,optimize=False);frames[0].save(out/'carried-limbs.png')
(out/'review.json').write_text(json.dumps(dict(oldSource=str(old),newSource=str(new),inspectionOnly=True,modelToPixel=density,frames=16,gpu=torch.cuda.get_device_name(),ownerAccepted=False),indent=2)+'\n')
print(out,flush=True)
