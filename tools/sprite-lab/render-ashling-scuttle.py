"""Native pixel GPU render and review, using the saved Ashling mesh and poses."""
from pathlib import Path
import sys,json,math
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
out=Path(sys.argv[1]);dest=out/sys.argv[2];dest.mkdir(exist_ok=False)
yaw=math.radians(float(sys.argv[3])) if len(sys.argv)>3 else 0
source=np.load(out/'sampled-walk.npz');profile=json.loads((out/'export-profile.json').read_text())
tensor=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=tensor(source['faces'],torch.int32);uv=tensor(source['uv']);mvp=tensor(source['mvp'])
texture_image=Image.open(out.parent/'textured-v1/hollow-albedo.png').convert('RGB')
texture=tensor(np.asarray(texture_image)/255).flip(0)[None]
palette=texture_image.quantize(colors=64,method=Image.Quantize.MEDIANCUT);palette.save(dest/'palette.png')
ctx=dr.RasterizeCudaContext();frames=[]
for index,positions in enumerate(source['positions'][:16]):
    vertices=tensor(positions)
    if yaw:
        origin=tensor(profile['groundRoot']);rotation=tensor([[math.cos(yaw),-math.sin(yaw),0],[math.sin(yaw),math.cos(yaw),0],[0,0,1]])
        vertices=(vertices-origin)@rotation.T+origin
    projected=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
    raster,_=dr.rasterize(ctx,projected[None],faces,[96,96]);coords=dr.interpolate(uv[None],raster,faces)[0]
    color=dr.texture(texture,coords,filter_mode='nearest')[0]
    # Preserve the card-derived baked lighting, with opaque native pixels.
    alpha=(raster[0,:,:,3]>0).float()
    rgba=torch.cat([color.clamp(0,1),alpha[:,:,None]],dim=-1).flip(0).cpu().numpy()
    raw=Image.fromarray((rgba*255).astype(np.uint8))
    frame=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');frame.putalpha(raw.getchannel('A'))
    frame.save(dest/f'walk-{index:02d}.png');frames.append(frame)
atlas=Image.new('RGBA',(96*8,96*2))
for i,f in enumerate(frames):atlas.alpha_composite(f,(i%8*96,i//8*96))
atlas.save(dest/'ashling-scuttle.png')
markers=json.loads((out/'actual-foot-markers.json').read_text());groups={}
stride=profile['travelModelUnitsPerCycle']
for marker in markers:
    phase=(marker['frame']-1)/16;shifted=phase+(0 if marker['side']=='L' else .5)
    if shifted%1<profile['stanceFraction']:
        point=np.array(marker['contact'])+[0,-stride*phase,0]
        groups.setdefault((marker['side'],int(shifted)),[]).append(point)
drift=max(float(np.ptp(np.array(points),axis=0).max()) for points in groups.values())
seam=float(np.abs(source['positions'][0]-source['positions'][-1]).max())
bounds=[f.getbbox() for f in frames];clipped=any(b is None or b[0]<2 or b[1]<2 or b[2]>94 or b[3]>94 for b in bounds)
report=dict(loopPositionError=seam,stanceContactDrift=drift,finite=bool(np.isfinite(source['positions']).all()),clipped=clipped,frameBounds=bounds,technicalPass=seam<1e-4 and drift<1e-4 and not clipped,visualAccepted=False,runtimeIntegrated=False)
(dest/'technical-report.json').write_text(json.dumps(report,indent=2)+'\n')
root=tensor([*profile['groundRoot'],1]);anchor=mvp@root;anchor=[round(float((anchor[0]/anchor[3]+1)*48)),round(float((1-anchor[1]/anchor[3])*48))]
(dest/'manifest.json').write_text(json.dumps(dict(frames=16,fps=20,cell=96,anchor=anchor,travelModelUnitsPerCycle=stride,sourceRig='../ashling-rigged.blend',yawDegrees=math.degrees(yaw),directions=['single-view review'],visualAccepted=False,runtimeIntegrated=False),indent=2)+'\n')
gif=[];stride_gif=[]
for i,frame in enumerate(frames):
    board=Image.new('RGBA',(96,96),(22,20,27,255));board.alpha_composite(frame)
    gif.append(board.convert('RGB').resize((384,384),Image.Resampling.NEAREST))
    # Project a real ground plane. Its period divides the authored stride, so
    # the looping review cannot introduce a false ground jump at the seam.
    ground=Image.new('RGBA',(192,128),(22,20,27,255));draw=ImageDraw.Draw(ground)
    def project(x,y):
        p=np.array(profile['groundRoot'])+[x,y+stride*i/16,0]
        if yaw:
            origin=np.array(profile['groundRoot']);r=np.array([[math.cos(yaw),-math.sin(yaw),0],[math.sin(yaw),math.cos(yaw),0],[0,0,1]])
            p=(p-origin)@r.T+origin
        clip=source['mvp']@np.r_[p,1]
        return (round((clip[0]/clip[3]+1)*48)+48,round((1-clip[1]/clip[3])*48)+8)
    for line in range(-35,36):
        d=line*stride/4
        draw.line([project(d,-4),project(d,4)],fill=(44,41,48))
        draw.line([project(-4,d),project(4,d)],fill=(44,41,48))
    ground.alpha_composite(frame,(48,8));stride_gif.append(ground.convert('RGB').resize((576,384),Image.Resampling.NEAREST))
gif[0].save(dest/'scuttle-review.gif',save_all=True,append_images=gif[1:],duration=50,loop=0)
stride_gif[0].save(dest/'stride-review.gif',save_all=True,append_images=stride_gif[1:],duration=50,loop=0)
sheet=Image.new('RGBA',(384,112),(22,20,27,255));draw=ImageDraw.Draw(sheet)
for col,i in enumerate([0,4,8,12]):sheet.alpha_composite(frames[i],(col*96,0));draw.text((col*96+5,98),f'Pose {i+1}',fill=(205,184,150))
sheet.resize((1152,336),Image.Resampling.NEAREST).save(dest/'contact-poses.png')
print(json.dumps(report),flush=True)
