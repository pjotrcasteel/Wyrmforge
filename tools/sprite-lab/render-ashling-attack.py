"""Native pixel fire-claw attack: deterministic editable 3D VFX, local CUDA raster."""
from pathlib import Path
import sys,json,math,hashlib
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];asset=root/'art/source/enemies/ashling';rig=asset/'model/local-appearance-002'/sys.argv[1]
out=asset/'exports'/sys.argv[2];out.mkdir(exist_ok=False,parents=True)
s=np.load(rig/'attack-samples.npz');profile=json.loads((rig/'profile.json').read_text());count=profile['frames'];cell=128
t=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous()
ctx=dr.RasterizeCudaContext();faces=t(s['faces'],torch.int32);uv=t(s['uv']);mvp=t(s['mvp']);mvp[:2]*=96/128;origin=t(profile['groundRoot'])
teximage=Image.open(rig.parent/'textured-v1/hollow-albedo.png').convert('RGB');texture=t(np.asarray(teximage)/255).flip(0)[None]
base=teximage.quantize(colors=56);pal=base.getpalette()[:168]+[82,15,12,145,30,10,214,55,9,255,100,12,255,153,25,255,204,58,255,237,130,255,251,211]
palette=Image.new('P',(1,1));palette.putpalette(pal);palette.save(out/'palette.png')
intensities=np.interp(np.arange(count),[0,1,4,6,15,18,21],[0,0,.55,1,1,.45,0]);effect_positions=[];effect_colors=[];effect_faces=[]
def flame_mesh(frame):
    vertices=[];colors=[];triangles=[];strength=float(intensities[frame])
    def cone(center,radius,height,phase,inner=False):
        start=len(vertices);center=np.array(center);bend=np.array([math.sin(phase)*.018,math.cos(phase)*.012,0])*strength
        for j in range(4):
            a=j*math.pi/2;vertices.append(center+np.array([math.cos(a)*radius,math.sin(a)*radius,0]));colors.append([1,.98,.78] if inner else [1,.82,.20])
        vertices.append(center+bend+[0,0,height]);colors.append([1,.89,.36] if inner else [1,.26,.025])
        for j in range(4):triangles.append([start+j,start+(j+1)%4,start+4])
        triangles.extend([[start,start+2,start+1],[start,start+3,start+2]])
    for side in range(2):
        wrist,tip=s['hands'][frame,side];direction=tip-wrist;right=np.cross(direction,[0,0,1]);right/=np.linalg.norm(right)
        for finger in range(3):
            phase=frame*1.7+side*2+finger*2.1
            center=wrist+direction*(.55+.16*(finger%2))+right*((finger-1)*.027)
            center[2]+=.012
            height=(.075+.035*(.5+.5*math.sin(phase)))*strength
            cone(center,.025*strength,height,phase)
            cone(center+[0,0,.004],.014*strength,height*.82,phase,True)
        # Short, detached embers follow the claw, without masking the whole arm.
        for particle in range(2):
            life=((frame+particle*3+side*2)%7)/7
            center=tip+right*((particle-.5)*.04)+[.009*math.sin(frame+particle),.025*life,.035+.075*life]
            cone(center,.006*strength,.016*strength,frame+particle,True)
    return np.array(vertices,np.float32),np.array(colors,np.float32),np.array(triangles,np.int32)
for f in range(count):
    v,c,fa=flame_mesh(f);effect_positions.append(v);effect_colors.append(c);effect_faces=fa
np.savez_compressed(out/'fire-effect-source.npz',positions=effect_positions,colors=effect_colors,faces=effect_faces,intensities=intensities,handLandmarks=s['hands'])
firefaces=t(effect_faces,torch.int32);mask=t(s['handmask']);directions=['N','NE','E','SE','S','SW','W','NW'];atlas=Image.new('RGBA',(128*count,128*8));frames={};rects=[];measurements=[];orientations=[]
bearing=math.degrees(math.atan2(-3.2-.22,2.2-.07));ground=mvp@t([*profile['groundRoot'],1]);anchor=[round(float((ground[0]/ground[3]+1)*64)),round(float((1-ground[1]/ground[3])*64))]
for row,direction in enumerate(directions):
    angle=math.radians(bearing+270-row*45);rotation=t([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    orientations.append(dict(direction=direction,rotationDegrees=math.degrees(angle),flipX=False));folder=out/'frames'/direction;folder.mkdir(parents=True);frames[direction]=[]
    for f in range(count):
        v=(t(s['positions'][f])-origin)@rotation.T+origin;clip=torch.cat([v,torch.ones_like(v[:,:1])],1)@mvp.T
        raster,_=dr.rasterize(ctx,clip[None],faces,[128,128]);coords=dr.interpolate(uv[None],raster,faces)[0];rgb=dr.texture(texture,coords,filter_mode='nearest')[0].clamp(0,1)
        glow=dr.interpolate(mask[None,:,None],raster,faces)[0][0].clamp(0,1)*float(intensities[f])
        rgb=rgb*(1-glow*.75)+t([1,.39,.035])*glow*.75
        fv=(t(effect_positions[f])-origin)@rotation.T+origin;fc=torch.cat([fv,torch.ones_like(fv[:,:1])],1)@mvp.T
        fr,_=dr.rasterize(ctx,fc[None],firefaces,[128,128]);firecolor=dr.interpolate(t(effect_colors[f])[None],fr,firefaces)[0][0]
        visible=(fr[0,:,:,3]>0)&((raster[0,:,:,3]==0)|(fr[0,:,:,2]<=raster[0,:,:,2]+1e-5))
        rgb=torch.where(visible[:,:,None],firecolor,rgb);alpha=((raster[0,:,:,3]>0)|visible).float()
        raw=Image.fromarray((torch.cat([rgb,alpha[:,:,None]],-1).flip(0).cpu().numpy().clip(0,1)*255).astype('uint8'))
        frame=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');frame.putalpha(raw.getchannel('A'));bounds=frame.getbbox()
        assert bounds and min(bounds[:2])>=2 and max(bounds[2:])<=126,(direction,f,bounds)
        frame.save(folder/f'attack-{f:02d}.png');frames[direction].append(frame);atlas.alpha_composite(frame,(f*128,row*128))
        measurements.append(dict(direction=direction,frame=f,bounds=bounds,visibleFirePixels=int(visible.sum().item())))
        rects.append(dict(direction=direction,index=f,x=f*128,y=row*128,width=128,height=128,anchor=anchor,flipX=False))
    print(direction,'fire-claw attack rendered',flush=True)
atlas.save(out/'ashling-attack.png');boards=[]
for f in range(count):
    board=Image.new('RGB',(512,288),(22,20,27));draw=ImageDraw.Draw(board)
    for row,d in enumerate(directions):
        x=row%4*128;y=row//4*144;draw.text((x+4,y+3),d,fill=(205,184,150));board.paste(frames[d][f],(x,y+16),frames[d][f])
    boards.append(board.resize((1024,576),Image.Resampling.NEAREST))
for name,duration in [('eight-directions-review',42),('eight-directions-slow',95)]:
    seq=boards+[boards[-1]]*8;seq[0].save(out/(name+'.gif'),save_all=True,append_images=seq[1:],duration=duration,loop=0)
single=[]
for f in range(count):
    b=Image.new('RGB',(256,144),(22,20,27));draw=ImageDraw.Draw(b)
    for n,d in enumerate(['S','SW']):b.paste(frames[d][f],(n*128,0),frames[d][f])
    draw.text((4,130),'FIRE-INFUSED CLAW RAKE',fill=(245,189,100));single.append(b.resize((1024,576),Image.Resampling.NEAREST))
seq=single+[single[-1]]*8;seq[0].save(out/'fire-claw-review.gif',save_all=True,append_images=seq[1:],duration=55,loop=0)
sheet=Image.new('RGB',(128*6,144*2),(22,20,27));draw=ImageDraw.Draw(sheet)
for row,d in enumerate(['S','SW']):
    for col,(f,label) in enumerate([(0,'REST'),(5,'INFUSE'),(9,'RAKE R'),(14,'RAKE L'),(17,'FADE'),(21,'RECOVER')]):
        sheet.paste(frames[d][f],(col*128,row*144),frames[d][f]);draw.text((col*128+3,row*144+130),label,fill=(245,189,100))
sheet.resize((1536,576),Image.Resampling.NEAREST).save(out/'attack-key-poses.png')
manifest=dict(animation='attack',framesPerDirection=count,fps=24,loop=False,directions=directions,cell=128,anchor=anchor,frameRects=rects,orientations=orientations,clawContactFrames=profile['clawContactFrames'],fireEffect='hand-bound depth-tested geometric flames, hand heat tint and embers',sourceRig=str((rig/'ashling-attack.blend').relative_to(root)),atlasSha256=hashlib.sha256((out/'ashling-attack.png').read_bytes()).hexdigest(),ownerAccepted=False,runtimeIntegrated=False)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
report=dict(gpu=torch.cuda.get_device_name(),frames=count*8,minimumMeshZ=float(s['positions'][:,:,2].min()),recoveryPositionError=float(abs(s['positions'][0]-s['positions'][-1]).max()),measurements=measurements,ownerAccepted=False,runtimeIntegrated=False)
(out/'render-report.json').write_text(json.dumps(report,indent=2)+'\n');print('Saved attack and fire source, directional atlas and previews',flush=True)
