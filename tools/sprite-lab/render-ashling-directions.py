"""Render the accepted Ashling bounding source in eight real compass directions."""
from pathlib import Path
import sys,json,math,hashlib
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parents[2]
asset=root/'art/source/enemies/ashling'
rig=asset/'model/local-appearance-002/rigged-bound-v3'
out=asset/'exports'/sys.argv[1];out.mkdir(parents=True,exist_ok=False)
sample_path=rig/'sampled-walk.npz';source=np.load(sample_path)
profile=json.loads((rig/'export-profile.json').read_text())
tensor=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=tensor(source['faces'],torch.int32);uv=tensor(source['uv']);mvp=tensor(source['mvp'])
origin=tensor(profile['groundRoot'])
image=Image.open(rig.parent/'textured-v1/hollow-albedo.png').convert('RGB')
texture=tensor(np.asarray(image)/255).flip(0)[None]
# Reuse exactly the palette of the owner-reviewed single-view candidate.
palette=Image.open(rig/'hop-front-v2/palette.png');palette.save(out/'palette.png')
ctx=dr.RasterizeCudaContext();directions=['N','NE','E','SE','S','SW','W','NW']
cell=96;count=16;fps=20;atlas=Image.new('RGBA',(cell*count,cell*8))
ground=mvp@tensor([*profile['groundRoot'],1])
anchor=[round(float((ground[0]/ground[3]+1)*cell/2)),round(float((1-ground[1]/ground[3])*cell/2))]
camera=[2.2,-3.2,2.6]
bearing=math.degrees(math.atan2(camera[1]-profile['groundRoot'][1],camera[0]-profile['groundRoot'][0]))
frames={};measurements=[];orientations=[];rects=[];direction_checks=[]
for row,direction in enumerate(directions):
    angle=math.radians(bearing+270-row*45)
    rotation=tensor([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    folder=out/'frames'/direction;folder.mkdir(parents=True);frames[direction]=[]
    orientations.append(dict(direction=direction,row=row,rotationDegrees=math.degrees(angle),flipX=False))
    # Check forward motion projects toward the labelled screen compass heading.
    forward=rotation@tensor([0,-1,0]);projected=mvp@torch.cat([forward,tensor([0])])
    dx,dy=float(projected[0]),-float(projected[1]);screen_angle=math.degrees(math.atan2(dy,dx))%360
    expected=(270+row*45)%360
    error=abs((screen_angle-expected+180)%360-180)
    # Diagonal screen projection is foreshortened, but cannot enter a wrong octant.
    assert error<22.5,(direction,screen_angle,expected)
    direction_checks.append(dict(direction=direction,screenAngle=screen_angle,octantErrorDegrees=error))
    for index,position in enumerate(source['positions'][:count]):
        vertices=(tensor(position)-origin)@rotation.T+origin
        clip=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
        raster,_=dr.rasterize(ctx,clip[None],faces,[cell,cell])
        texcoords=dr.interpolate(uv[None],raster,faces)[0]
        color=dr.texture(texture,texcoords,filter_mode='nearest')[0].clamp(0,1)
        rgba=torch.cat([color,(raster[0,:,:,3]>0).float()[:,:,None]],dim=-1).flip(0).cpu().numpy()
        raw=Image.fromarray((rgba*255).astype(np.uint8))
        frame=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');frame.putalpha(raw.getchannel('A'))
        bounds=frame.getbbox();binary=set(np.unique(np.asarray(frame)[:,:,3]))<={0,255}
        assert bounds and min(bounds[:2])>=2 and max(bounds[2:])<=94,(direction,index,bounds)
        assert binary,(direction,index,'nonbinary alpha')
        frame.save(folder/f'move-{index:02d}.png');atlas.alpha_composite(frame,(index*cell,row*cell));frames[direction].append(frame)
        measurements.append(dict(direction=direction,frame=index,bounds=bounds,visiblePixels=int((np.asarray(frame)[:,:,3]>0).sum())))
        rects.append(dict(direction=direction,index=index,x=index*cell,y=row*cell,width=cell,height=cell,anchor=anchor,flipX=False))
    assert len({hashlib.sha256(np.asarray(f).tobytes()).hexdigest() for f in frames[direction]})==count
    print(direction,'sixteen bounded, unmirrored poses complete',flush=True)
atlas.save(out/'ashling-movement.png')
manifest=dict(schemaVersion='1.1',name='Ashling — eight-direction bounding movement',animation='movement',layout='eight',source=dict(width=cell*count,height=cell*8,columns=count,rows=8,frameWidth=cell,frameHeight=cell,offsetX=0,offsetY=0),directions=directions,framesPerDirection=count,frames=count*8,playback=dict(fps=fps,loop=True),anchor=anchor,groundRoot=profile['groundRoot'],drawCellWorldSize=81.6,actorModelHeightWorldUnits=48,travelPerCycle=profile['travelModelUnitsPerCycle']*48,frameRects=rects,orientations=orientations,sourceRig=str((rig/'ashling-rigged.blend').relative_to(root)).replace('\\','/'),sourcePoseSha256=hashlib.sha256(sample_path.read_bytes()).hexdigest(),atlasSha256=hashlib.sha256((out/'ashling-movement.png').read_bytes()).hexdigest(),gaitBaseOwnerAccepted=True,directionalExportOwnerAccepted=False,runtimeIntegrated=False)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Review the same synchronized phase in each facing at native and enlarged sizes.
boards=[]
for i in range(count):
    board=Image.new('RGBA',(cell*4,112*2),(22,20,27,255));draw=ImageDraw.Draw(board)
    for row,direction in enumerate(directions):
        x=row%4*cell;y=row//4*112;draw.text((x+4,y+3),direction,fill=(205,184,150));board.alpha_composite(frames[direction][i],(x,y+16))
    board.save(out/f'review-phase-{i:02d}.png');boards.append(board.convert('RGB').resize((768,448),Image.Resampling.NEAREST))
boards[0].save(out/'eight-directions-review.gif',save_all=True,append_images=boards[1:],duration=50,loop=0)
sheet=Image.new('RGBA',(384,112*8),(22,20,27,255));draw=ImageDraw.Draw(sheet)
for row,direction in enumerate(directions):
    draw.text((4,row*112+3),direction,fill=(205,184,150))
    for col,i in enumerate([0,2,6,14]):sheet.alpha_composite(frames[direction][i],(col*cell,row*112+16))
sheet.resize((768,1792),Image.Resampling.NEAREST).save(out/'direction-contact-poses.png')
contact=json.loads((rig/'hop-front-v2/technical-report.json').read_text())
report=dict(technicalPass=True,totalFrames=128,directions=directions,framesPerDirection=16,nativeCell=cell,binaryAlpha=True,noClipping=True,noMirroredDirections=True,phaseSharedAcrossDirections=True,loopPositionError=contact['loopPositionError'],stanceContactDrift=contact['stanceContactDrift'],airborneFramesPerCycle=contact['airborneFrames'],minimumMeshZ=contact['minimumMeshZ'],directionProjectionChecks=direction_checks,measurements=measurements,directionalExportOwnerAccepted=False,runtimeIntegrated=False,gpu=torch.cuda.get_device_name())
(out/'technical-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('Saved 128 native-pixel frames, atlas, manifests and synchronized directional review on',torch.cuda.get_device_name(),flush=True)
