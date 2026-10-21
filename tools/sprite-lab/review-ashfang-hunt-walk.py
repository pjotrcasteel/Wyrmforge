"""LOCAL-ONLY source composite over the owner's Hunt reference; not live gameplay."""
from pathlib import Path
import sys,json
import numpy as np,torch
import nvdiffrast.torch as dr
from PIL import Image
from ashfang_surface_uv import uv_triangles
from ashfang_preview_lighting import shade,palette_for
from ashfang_body_fire import composite_fire

rig=Path(sys.argv[1]);out=rig/'hunt-fit-review-shadowfire';out.mkdir(exist_ok=False)
fit=json.loads(Path('art/source/enemies/ashfang/references/current-hunt-fit-v3.json').read_text())
background=Image.open(fit['referenceImage']).convert('RGB').crop(fit['crop']);density=fit['pixelsPerModelUnit'];cell=256
def t(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device='cuda',dtype=dtype).contiguous()
forward=-np.array([2,-3,2.2]);forward/=np.linalg.norm(forward);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
matrix=np.eye(4,dtype=np.float32);matrix[0,:3]=right*density/(cell/2);matrix[1,:3]=up*density/(cell/2);matrix[2,:3]=forward*.2;matrix=t(matrix)
s=np.load(rig/'walk-samples.npz');faces=t(s['faces'],torch.int32);uv=t(s['uv']);uf=uv_triangles(s,faces);albedo=Image.open(rig/'ashfang-albedo.png').convert('RGB');texture=t(np.asarray(albedo)/255).flip(0)[None];palette=palette_for(albedo);ctx=dr.RasterizeCudaContext();frames=[];checks=[]
for index,p in enumerate(s['positions'][:-1]):
    v=t(p);r,_=dr.rasterize(ctx,(torch.cat([v,torch.ones_like(v[:,:1])],1)@matrix.T)[None],faces,[cell,cell]);coords=dr.interpolate(uv[None],r,uf)[0];rgb=shade(dr.texture(texture,coords,filter_mode='nearest')[0],v,faces,r);alpha=(r[0,:,:,3]>0).float();rgb,alpha=composite_fire(rig,'walk',index,ctx,matrix,r,rgb,alpha)
    raw=(torch.cat([rgb,alpha[:,:,None]],-1).flip(0).clamp(0,1).cpu().numpy()*255).astype('uint8');sprite=Image.fromarray(raw);pixel=sprite.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel.putalpha(sprite.getchannel('A'));board=background.copy();board.paste(pixel,(background.width//2-cell//2,fit['originY']-cell//2),pixel)
    checks.append(bool(np.array_equal(np.asarray(board.crop(fit['playerReferenceBounds'])),np.asarray(background.crop(fit['playerReferenceBounds'])))))
    if index in (0,12,24):board.save(out/f'frame-{index:02d}.png')
    frames.append(board)
    if index%16==0:print('Hunt walk composite',index,flush=True)
durations=[(round((i+1)*100/24)-round(i*100/24))*10 for i in range(len(frames))];frames[0].save(out/'charcoal-fire-smoke-walk.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0)
assert all(checks)
(out/'review.json').write_text(json.dumps(dict(localPrivateScreenshotComposite=True,liveGameplay=False,runtimeIntegrated=False,gpu=torch.cuda.get_device_name(),nativePixelsPerUnit=density,viewport=list(background.size),playerRegionUnchangedInSourceFrames=all(checks),frames=len(frames)),indent=2)+'\n')
