"""RTX 5090 native-pixel rasterization of an evaluated deforming mesh."""
from pathlib import Path
import sys
import json
import numpy as np
import torch
import torch.nn.functional as F
import nvdiffrast.torch as dr
from PIL import Image

out=Path(sys.argv[1])
revision=sys.argv[2] if len(sys.argv)>2 else 'walk-pixels-v1'
destination=out/revision
destination.mkdir(exist_ok=False)
source=np.load(out/'sampled-walk.npz')
texture_path=out.parent/'textured-rgb-v2/hollow-albedo.png'
tensor=lambda a,dtype=torch.float32: torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=tensor(source['faces'],torch.int32)
uv=tensor(source['uv'])
mvp=tensor(source['mvp'])
texture=tensor(np.asarray(Image.open(texture_path).convert('RGB'))/255).flip(0)[None]
ctx=dr.RasterizeCudaContext()
palette_path=Path(__file__).resolve().parents[2]/'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow.png'
reference=Image.open(palette_path).convert('RGBA')
rgb=Image.new('RGB',reference.size,(32,24,20))
rgb.paste(reference,mask=reference.getchannel('A'))
palette=rgb.quantize(colors=64,method=Image.Quantize.MEDIANCUT)
palette.save(destination/'shared-palette.png')
frames=[]
for index,positions in enumerate(source['positions'][:16]):
    vertices=tensor(positions)
    clip=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
    raster,_=dr.rasterize(ctx,clip[None],faces,[96,96])
    texcoords=dr.interpolate(uv[None],raster,faces)[0]
    color=dr.texture(texture,texcoords,filter_mode='nearest')[0]
    # Baked appearance contains the detailed light pattern. A small normal-based
    # response preserves volume while avoiding smooth shiny/plastic shading.
    triangles=vertices[faces.long()]
    normal=F.normalize(torch.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0],dim=-1),dim=-1)
    vn=torch.zeros_like(vertices)
    for corner in range(3): vn.index_add_(0,faces[:,corner].long(),normal)
    normals=F.normalize(dr.interpolate(F.normalize(vn,dim=-1)[None],raster,faces)[0][0],dim=-1)
    light=F.normalize(tensor([-2,-3,5]),dim=0)
    lambert=(normals*light).sum(-1).clamp(0,1)
    shade=.88+.18*torch.floor(lambert*3)/3
    color=(color*shade[:,:,None]).clamp(0,1)
    alpha=(raster[0,:,:,3]>0).float()
    rgba=torch.cat([color,alpha[:,:,None]],dim=-1).flip(0).cpu().numpy()
    raw=Image.fromarray((rgba*255).astype(np.uint8))
    quantized=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA')
    quantized.putalpha(raw.getchannel('A'))
    quantized.save(destination/f'walk-{index:02d}.png')
    frames.append(quantized)
atlas=Image.new('RGBA',(96*8,96*2))
for index,frame in enumerate(frames): atlas.alpha_composite(frame,((index%8)*96,(index//8)*96))
atlas.save(destination/'hollow-walk.png')
strip=Image.new('RGBA',(96*16,96))
for index,frame in enumerate(frames): strip.alpha_composite(frame,(index*96,0))
strip.save(destination/'hollow-walk-strip.png')
ground=mvp@tensor([0,0,-.5,1])
anchor=[round(float((ground[0]/ground[3]+1)*48)),round(float((1-ground[1]/ground[3])*48))]
manifest=dict(schemaVersion='1.1',name='The Hollow — local 3D pixel walk proof',animation='walk',
              source=dict(width=768,height=192,columns=8,rows=2,frameWidth=96,frameHeight=96,offsetX=0,offsetY=0),
              playback=dict(fps=12,loop=True),frames=16,direction='three-quarter front',
              status='visual-candidate',visualAccepted=False,runtimeIntegrated=False,
              rasterizer='local RTX nvdiffrast; nearest texture; fixed 64-color Wyrmforge Hollow ramp',
              sourceRig='../hollow-rigged.blend',travelPerCycle=.19/.62*60,anchor=anchor)
(destination/'hollow-walk.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# GIF is a review derivative only; PNGs retain exact RGBA/pixel values.
background=(22,20,27)
gif=[]
for frame in frames:
    canvas=Image.new('RGBA',(96,96),background+(255,))
    canvas.alpha_composite(frame)
    gif.append(canvas.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
gif[0].save(destination/'walk-review.gif',save_all=True,append_images=gif[1:],duration=83,loop=0)
print('Rendered 16 actual skinned poses on',torch.cuda.get_device_name(),flush=True)
