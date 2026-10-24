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
    def project(point,view):
        clip=s['mvps'][view]@np.r_[point,1]
        return (round((clip[0]/clip[3]+1)*48),round((1-clip[1]/clip[3])*48))
    for i,panel in enumerate(panels):
        view=max(0,i-1)
        if i<2:
            a=project([.07,-2,-.5],view);b=project([.07,2,-.5],view)
            draw.line([(a[0]+i*96,a[1]),(b[0]+i*96,b[1])],fill=(65,60,66))
            for tick in range(-12,13):
                p=project([.07,tick*.09+.36*f/16,-.5],view)
                if 0<=p[0]<96:draw.line([(p[0]+i*96,p[1]),(p[0]+i*96,p[1]+3)],fill=(110,95,80))
        board.paste(panel,(i*96,0),panel);draw.text((i*96+3,98),['LEG WEIGHTS','SIDE','FRONT','GAME'][i],fill=(220,200,170))
    for side,chain in enumerate(s['skeleton'][f]):
        points=[project(p,0) for p in chain];color=(255,220,180) if side==0 else (170,235,255)
        draw.line(points,fill=color,width=1)
        for x,y in points:draw.rectangle((x-1,y-1,x+1,y+1),fill=color)
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
d=json.loads((out/'gait-diagnostics.json').read_text());groups={}
for marker in d:
    if marker['support']:
        p=np.array(marker['toe'])[:2]-[0,.36*(marker['frame']-1)/16]
        groups.setdefault((marker['side'],marker['interval']),[]).append(p)
drift=max(float(np.ptp(points,axis=0).max()) for points in groups.values())
bounds=[im.getbbox() for im in games]
report=dict(loopError=float(abs(s['positions'][0]-s['positions'][-1]).max()),minimumMeshZ=float(s['positions'][:,:,2].min()),finite=bool(np.isfinite(s['positions']).all()),supportToeHorizontalDrift=drift,gameFrameBounds=bounds,gameClipped=any(b is None or min(b[:2])<2 or max(b[2:])>94 for b in bounds),uniqueGameFrames=len({im.tobytes() for im in games}),kneeAngles={side:[round(min(x['kneeAngle'] for x in d if x['side']==side),1),round(max(x['kneeAngle'] for x in d if x['side']==side),1)] for side in ['L','R']},ownerAccepted=False,runtimeIntegrated=False)
(dest/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
