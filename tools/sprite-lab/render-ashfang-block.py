"""Native pixel anatomy/motion review on local CUDA, not a runtime atlas."""
from pathlib import Path
import sys,json,math
import numpy as np,torch
import nvdiffrast.torch as dr
from ashfang_surface_uv import uv_triangles
from ashfang_body_fire import composite_fire
from PIL import Image,ImageDraw
from ashfang_preview_lighting import shade as shade_surface,palette_for,LIGHTING
rig=Path(sys.argv[1]);out=rig/(sys.argv[2] if len(sys.argv)>2 else 'motion-review-v1');out.mkdir(exist_ok=False);profile=json.loads((rig/'profile.json').read_text());cell=192
t=lambda a,dtype=torch.float32:torch.tensor(np.asarray(a),dtype=dtype,device='cuda').contiguous();ctx=dr.RasterizeCudaContext();texture_image=Image.open(rig/'ashfang-albedo.png' if (rig/'ashfang-albedo.png').exists() else rig.parent/'textured-v1/hollow-albedo.png').convert('RGB');texture=t(np.asarray(texture_image)/255).flip(0)[None];palette=palette_for(texture_image)
mvps=[]
for eye in [(2,-3,2.2),(3,0,.7)]:
    f=-np.array(eye,float);f/=np.linalg.norm(f);right=np.cross(f,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,f);m=np.eye(4,dtype=np.float32);m[0,:3]=right/1.2;m[1,:3]=up/1.2;m[2,:3]=f*.2;m[1,3]=-.10;mvps.append(m)
reports={};all_frames={}
floor_audit=json.loads((rig/'floor-audit.json').read_text())
paw_audit=json.loads((rig/'paw-contact-audit.json').read_text()) if (rig/'paw-contact-audit.json').exists() else []
for clip,spec in profile['clips'].items():
    if spec.get('reviewRenderer')=='arena':continue
    source=np.load(rig/(clip+'-samples.npz'));faces=t(source['faces'],torch.int32);uv=t(source['uv']);frames=[];bounds=[];folder=out/clip;folder.mkdir()
    for index,position in enumerate(source['positions']):
        panels=[]
        for view,m in enumerate(mvps):
            mvp=t(m);v=t(position);projected=torch.cat([v,torch.ones_like(v[:,:1])],1)@mvp.T;r,_=dr.rasterize(ctx,projected[None],faces,[cell,cell]);coords=dr.interpolate(uv[None],r,uv_triangles(source,faces))[0];rgb=dr.texture(texture,coords,filter_mode='nearest')[0].clamp(0,1);rgb=shade_surface(rgb,v,faces,r);alpha=(r[0,:,:,3]>0).float()
            # A compact mouth-bound geometric jet tests origin/aim with the jaw.
            phase=index/max(1,spec['frames']-1);strength=min(1,max(0,(phase-.27)/.08),max(0,(.76-phase)/.10)) if clip=='rear-breath' else 0
            if strength>0:
                mouth,direction=source['mouth'][index];direction=direction/np.linalg.norm(direction);side=np.cross(direction,[0,0,1]);side/=np.linalg.norm(side);up=np.cross(side,direction);vertices=[];colors=[];triangles=[]
                for ring in range(8):
                    p=ring/7;center=mouth+direction*.65*p*strength+np.array([0,0,.035*p*p]);radius=(.012+.08*p)*strength
                    for j in range(8):
                        angle=j*math.pi/4;wave=1+.18*math.sin(index*1.7+ring*2+j);vertices.append(center+radius*wave*(side*math.cos(angle)+up*math.sin(angle)));colors.append([1,.92-.60*p,.52*(1-p)])
                        if ring:
                            a=(ring-1)*8+j;b=(ring-1)*8+(j+1)%8;c=ring*8+j;d=ring*8+(j+1)%8;triangles.extend([[a,b,c],[b,d,c]])
                fv=t(vertices);ff=t(triangles,torch.int32);fc=torch.cat([fv,torch.ones_like(fv[:,:1])],1)@mvp.T;fr,_=dr.rasterize(ctx,fc[None],ff,[cell,cell]);color=dr.interpolate(t(colors)[None],fr,ff)[0][0];visible=(fr[0,:,:,3]>0)&((r[0,:,:,3]==0)|(fr[0,:,:,2]<=r[0,:,:,2]));rgb=torch.where(visible[:,:,None],color,rgb);alpha=torch.maximum(alpha,visible.float())
            rgb,alpha=composite_fire(rig,clip,index,ctx,mvp,r,rgb,alpha)
            rgba=(torch.cat([rgb,alpha[:,:,None]],-1).flip(0).cpu().numpy()*255).clip(0,255).astype('uint8');raw=Image.fromarray(rgba);pixel=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel.putalpha(raw.getchannel('A'));pixel.save(folder/f'view-{view}-frame-{index:02d}.png');bounds.append(pixel.getbbox());panels.append(pixel)
        board=Image.new('RGB',(384,228),(24,22,27));draw=ImageDraw.Draw(board)
        for view,panel in enumerate(panels):
            m=mvps[view];advance=next(q.get('rootAdvance',0) for q in floor_audit if q['clip']==clip and q['frame']==index);p=m@np.array([0,advance,-.197,1]);x=round((p[0]+1)*96)+view*192;y=round((1-p[1])*96);alt=next(q['altitude'] for q in floor_audit if q['clip']==clip and q['frame']==index);shadow_radius=round(18-8*min(1,alt/.34));shade=round(14+5*min(1,alt/.34));draw.ellipse((x-shadow_radius,y-4,x+shadow_radius,y+4),fill=(shade,shade-1,shade+2));draw.line((view*192+35,y+5,view*192+157,y+5),fill=(52,47,45));board.paste(panel,(view*192,0),panel);draw.text((view*192+5,195),'GAME' if view==0 else 'SIDE',fill=(220,190,145))
        label=next((q['phaseLabel'] for q in paw_audit if q['clip']==clip and q['frame']==index),clip)
        draw.text((5,211),f'{index+1}/{spec["frames"]} | {label} | source {spec["fps"]} fps',fill=(190,174,150))
        frames.append(board.resize((768,456),Image.Resampling.NEAREST))
    seq=frames[:-1] if spec['loop'] else frames;durations=[(round((i+1)*100/spec['fps'])-round(i*100/spec['fps']))*10 for i in range(len(seq))];seq[0].save(out/(clip+'.gif'),save_all=True,append_images=seq[1:],duration=durations,loop=0);all_frames[clip]=frames
    position=source['positions'];reports[clip]=dict(frames=spec['frames'],finite=bool(np.isfinite(position).all()),minZ=float(position[:,:,2].min()),loopPositionError=float(abs(position[0]-position[-1]).max()) if spec['loop'] else None,clipped=any(b is None or min(b[:2])<2 or max(b[2:])>190 for b in bounds),bounds=bounds)
    print(clip,'native-pixel review rendered',flush=True)
# Native Tier-I footprint reference: no UI or runtime claim.
strip=Image.new('RGB',(390,160),(24,22,27));draw=ImageDraw.Draw(strip);frame=Image.open(out/'walk/view-0-frame-00.png');strip.paste(frame,(99,-23),frame);draw.line((0,134,389,134),fill=(90,76,65));draw.text((8,141),'390px WIDTH / TIER-I SOURCE CANDIDATE',fill=(220,190,145));strip.save(out/'tier-one-native-scale.png')
(out/'technical-review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),nativeCell=192,modelToPixel=80,lighting=LIGHTING,clips=reports,ownerAccepted=False,runtimeIntegrated=False),indent=2)+'\n');print('Saved motion and Tier-I footprint review')
