"""Local CUDA pixel and leg articulation review; no runtime export."""
from pathlib import Path
import sys,json
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
out=Path(sys.argv[1]);dest=out/'blocking-review';dest.mkdir(exist_ok=False)
s=np.load(out/'blocking-samples.npz');t=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=t(s['faces'],torch.int32);uv=t(s['uv']);colors=t(s['colors']);ctx=dr.RasterizeCudaContext()
teximage=Image.open(out.parent/'textured-v1/hollow-albedo.png').convert('RGB');texture=t(np.asarray(teximage)/255).flip(0)[None]
palette=teximage.quantize(colors=64);boards=[];games=[];strips=[]
for f,positions in enumerate(s['positions'][:16]):
    panels=[]
    for view in range(3):
        mvp=t(s['mvps'][view]);v=t(positions);clip=torch.cat([v,torch.ones_like(v[:,:1])],1)@mvp.T
        raster,_=dr.rasterize(ctx,clip[None],faces,[96,96]);alpha=(raster[0,:,:,3]>0).float()
        coords=dr.interpolate(uv[None],raster,faces)[0];rgb=dr.texture(texture,coords,filter_mode='nearest')[0]
        rgba=torch.cat([rgb.clamp(0,1),alpha[:,:,None]],-1).flip(0).cpu().numpy()
        raw=Image.fromarray((rgba*255).astype('uint8'));pixel=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel.putalpha(raw.getchannel('A'))
        if view==0:
            clay=dr.interpolate(colors[None],raster,faces)[0][0]
            clay=Image.fromarray((torch.cat([clay,alpha[:,:,None]],-1).flip(0).cpu().numpy()*255).astype('uint8'))
            panels.append(clay)
        panels.append(pixel)
    board=Image.new('RGB',(384,112),(22,20,27));draw=ImageDraw.Draw(board)
    for i,panel in enumerate(panels):
        board.paste(panel,(i*96,0),panel);draw.text((i*96+3,98),['LEG WEIGHTS','SIDE','FRONT','GAME'][i],fill=(220,200,170))
    boards.append(board.resize((1152,336),Image.Resampling.NEAREST));strips.append(panels[0]);games.append(panels[-1])
for name,duration in [('bound-review',50),('bound-slow',130)]:
    boards[0].save(dest/(name+'.gif'),save_all=True,append_images=boards[1:],duration=duration,loop=0)
strip=Image.new('RGB',(96*6,112),(22,20,27));draw=ImageDraw.Draw(strip)
for n,(f,label) in enumerate([(2,'LOAD'),(5,'DRIVE'),(7,'RELEASE'),(9,'TUCK'),(12,'CATCH'),(13,'ABSORB')]):
    strip.paste(strips[f],(n*96,0),strips[f]);draw.text((n*96+3,98),label,fill='white')
strip.resize((1728,336),Image.Resampling.NEAREST).save(dest/'key-poses.png')
game=[]
for frame in games:
    b=Image.new('RGB',(96,96),(22,20,27));b.paste(frame,(0,0),frame);game.append(b.resize((384,384),Image.Resampling.NEAREST))
game[0].save(dest/'game-review.gif',save_all=True,append_images=game[1:],duration=50,loop=0)
d=json.loads((out/'gait-diagnostics.json').read_text());report=dict(loopError=float(abs(s['positions'][0]-s['positions'][-1]).max()),minimumMeshZ=float(s['positions'][:,:,2].min()),finite=bool(np.isfinite(s['positions']).all()),kneeAngles={side:[round(min(x['kneeAngle'] for x in d if x['side']==side),1),round(max(x['kneeAngle'] for x in d if x['side']==side),1)] for side in ['L','R']},ownerAccepted=False,runtimeIntegrated=False)
(dest/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
