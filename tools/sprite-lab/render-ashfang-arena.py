"""Local CUDA fixed-camera flyover art study. No gameplay or damage simulation."""
from pathlib import Path
import sys,json,math
import numpy as np,torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
from ashfang_preview_lighting import shade,palette_for
rig=Path(sys.argv[1]);out=rig/(sys.argv[2] if len(sys.argv)>2 else 'arena-review-v1');out.mkdir(exist_ok=False)
s=np.load(rig/'arena-flyovers-samples.npz');vtx=s['positions'];faces=s['faces'];mouth=s['mouth'];signals=s['attackSignals'][:,0];roots=s['rootMotion']
W,H=390,520;density=52
forward=-np.array((2,-3,2.2),float);forward/=np.linalg.norm(forward)
right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
m=np.eye(4,dtype=np.float32);m[0,:3]=right*density*2/W;m[1,:3]=up*density*2/H;m[2,:3]=forward*.015;m[1,3]=1-330*2/H
T=lambda a,dtype=torch.float32:torch.tensor(np.asarray(a),dtype=dtype,device='cuda').contiguous()
ctx=dr.RasterizeCudaContext();F=T(faces,torch.int32);UV=T(s['uv']);M=T(m)
texture_image=Image.open(rig/'ashfang-albedo.png').convert('RGB');texture=T(np.asarray(texture_image)/255).flip(0)[None];palette=palette_for(texture_image)
def project(p):return (round(W/2+np.dot(right,p)*density),round(330-np.dot(up,p)*density))
def raster(vertices,triangles):
    vertices=T(vertices);triangles=T(triangles,torch.int32);clip=torch.cat([vertices,torch.ones_like(vertices[:,:1])],-1)@M.T
    return dr.rasterize(ctx,clip[None],triangles,[H,W])[0],vertices,triangles
# Reuse the current game's native ash tile; never redraw approved world art.
tile=Image.open('src/Wyrmforge.Presentation.Web/wwwroot/art/tiles.png').convert('RGB').crop((0,0,64,64));background=Image.new('RGB',(W,H))
for y in range(0,H,64):
    for x in range(0,W,64):background.paste(tile,(x,y))
warning_paths=[]
for start,end in [(79,134),(155,210)]:
    path=[]
    for i in range(start,end+1):
        origin,direction=mouth[i]
        if signals[i]>.1 and direction[2]<-.1:
            path.append(origin+direction*((-.197-origin[2])/direction[2]))
    warning_paths.append(path)
frames=[];embers=[];audit=[];phases=json.loads((rig/'paw-contact-audit.json').read_text());labels={x['frame']:x['phaseLabel'] for x in phases if x['clip']=='arena-flyovers'}
for frame,points in enumerate(vtx):
    board=background.copy();draw=ImageDraw.Draw(board)
    # Cast shadow remains on the actual root's ground projection, never under
    # the airborne sprite's screen position. High climb fades it naturally.
    ground=roots[frame].copy();ground[2]=-.197;sx,sy=project(ground);height=max(0,roots[frame,2]);radius=max(5,round(22/(1+height*.3)));dark=round(10+10*min(1,height/9))
    # The silhouette is a true vertical projection of the current 3D pose.
    # Its wings keep flapping while the actual body remains above the camera.
    shadow_points=points.copy();shadow_points[:,2]=-.197
    sr,_,_=raster(shadow_points,faces)
    shadow_alpha=((sr[0,:,:,3]>0).flip(0).cpu().numpy()*145).astype('uint8')
    shadow_layer=Image.new('RGBA',(W,H),(3,3,5,0));shadow_layer.putalpha(Image.fromarray(shadow_alpha))
    board.paste(shadow_layer,(0,0),shadow_layer);draw=ImageDraw.Draw(board)
    # These lead-in lanes are an art proposal, not shipped damage telegraphs.
    lane_index=0 if 55<=frame<=85 else 1 if 135<=frame<=158 else None
    if lane_index is not None:
        for target in warning_paths[lane_index]:
            px,py=project(target);draw.ellipse((px-3,py-1,px+3,py+1),fill=(152,73,28))
    for born,target in embers:
        age=frame-born
        if age>=60:continue
        x,y=project(target);life=1-age/60
        draw.ellipse((x-9,y-4,x+9,y+4),fill=(int(100*life),int(32*life),8))
        for j in range(4):
            dx=round(6*math.sin(born*1.7+j*2.1));h=round((7+5*math.sin(frame*.8+j))*life)
            draw.line((x+dx,y,x+dx-1,y-h),fill=(int(235*life),int(104*life),int(20*life)),width=1)
    r,V,_=raster(points,faces);body_visible=int((r[0,:,:,3]>0).flip(0)[42:H-22].sum().item());coords=dr.interpolate(UV[None],r,F)[0];rgb=dr.texture(texture,coords,filter_mode='nearest')[0].clamp(0,1);rgb=shade(rgb,V,F,r);alpha=(r[0,:,:,3]>0).float()
    origin,direction=mouth[frame];direction=direction/np.linalg.norm(direction);strength=float(signals[frame]);target=None
    if strength>.03 and direction[2]<-.10:
        distance=(-.197-origin[2])/direction[2]
        if distance>0:
            target=origin+direction*distance
            embers.append((frame,target.copy()))
            verts=[];colors=[];tris=[];side=np.cross(direction,[0,0,1]);side/=np.linalg.norm(side);other=np.cross(side,direction)
            # A flowing irregular tube with billowing edges and a hot core.
            # Every ring is anchored along the current world-space mouth ray.
            for ring in range(23):
                t=ring/22;center=origin+direction*distance*t
                center+=side*.035*math.sin(t*18-frame*.7)*t*(1-t)
                radius=(.018+.12*t)*strength*(1+.20*math.sin(t*27-frame*.9))
                for j in range(9):
                    angle=j*math.pi*2/9;wave=1+.25*math.sin(frame*.6+ring*1.3+j*1.7)
                    verts.append(center+radius*wave*(side*math.cos(angle)+other*math.sin(angle)))
                    colors.append([1,.88-.50*t,.26*(1-t)])
                    if ring:
                        a=(ring-1)*9+j;b=(ring-1)*9+(j+1)%9;c=ring*9+j;d=ring*9+(j+1)%9;tris.extend([[a,b,c],[b,d,c]])
            fr,_,ff=raster(verts,tris)
            worldpos=dr.interpolate(T(verts)[None],fr,ff)[0][0]
            flow=dr.interpolate(T(np.repeat(np.arange(23)/22,9)[:,None])[None],fr,ff)[0][0,:,:,0]
            # Animated world-space turbulence creates hot tongues and holes,
            # instead of a uniformly coloured, opaque cone. Native pixels and
            # palette quantization keep the edge breakup readable on mobile.
            noise=torch.sin(worldpos[:,:,0]*67+worldpos[:,:,2]*43-frame*1.5)*torch.sin(worldpos[:,:,1]*79+worldpos[:,:,2]*31+frame*.7)
            heat=(.5+.5*torch.sin(flow*72-frame*2.0+noise*3.0)).clamp(0,1)
            color=torch.stack([torch.ones_like(heat),.22+.70*heat,.015+.26*heat],-1)
            visible=(fr[0,:,:,3]>0)&(noise>-.72)&((r[0,:,:,3]==0)|(fr[0,:,:,2]<=r[0,:,:,2]));rgb=torch.where(visible[:,:,None],color,rgb);alpha=torch.maximum(alpha,visible.float())
    rgba=(torch.cat([rgb,alpha[:,:,None]],-1).flip(0).cpu().numpy()*255).clip(0,255).astype('uint8');actor=Image.fromarray(rgba);pixel=actor.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel.putalpha(actor.getchannel('A'));board.paste(pixel,(0,0),pixel)
    draw=ImageDraw.Draw(board);draw.rectangle((0,0,W,42),fill=(20,18,22));draw.text((9,7),'ASHFANG / AERIAL FIRE ATTACK STUDY',fill=(226,192,147));draw.text((9,24),labels[frame],fill=(189,167,145));draw.rectangle((0,H-22,W,H),fill=(20,18,22));draw.text((9,H-16),'LOCAL SOURCE PREVIEW / NO GAMEPLAY DAMAGE',fill=(175,155,139))
    board.save(out/f'frame-{frame:03d}.png');frames.append(board)
    q=points@np.array([right,up,forward]).T
    xs=W/2+q[:,0]*density;ys=330-q[:,1]*density
    bounds=[float(xs.min()),float(ys.min()),float(xs.max()),float(ys.max())]
    fully_out=bounds[2]<0 or bounds[0]>=W or bounds[3]<42 or bounds[1]>=H-22
    audit.append(dict(frame=frame,label=labels[frame],bounds=bounds,fullyOutside=bool(fully_out),bodyVisiblePixels=body_visible,fireStrength=strength,groundTarget=target.tolist() if target is not None else None))
    if frame%60==0:print('Arena source frame',frame,flush=True)
durations=[(round((i+1)*100/24)-round(i*100/24))*10 for i in range(len(frames))];durations[-1]+=600
frames[0].save(out/'aerial-fire-attack.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0)
report=dict(gpu=torch.cuda.get_device_name(),viewport=[W,H],pixelsPerModelUnit=density,frames=len(frames),finite=bool(np.isfinite(vtx).all()),minZ=float(vtx[:,:,2].min()),fullyOutsideFrames=[x['frame'] for x in audit if x['bodyVisiblePixels']==0],passBodyVisiblePixels=sum(x['bodyVisiblePixels'] for x in audit if 79<=x['frame']<=210),fireFrames=sum(x['groundTarget'] is not None for x in audit),runtimeIntegrated=False,groundFireLifetimePreviewFrames=60,frameAudit=audit)
(out/'review.json').write_text(json.dumps(report,indent=2)+'\n');print('Saved fixed-camera arena art study',flush=True)
