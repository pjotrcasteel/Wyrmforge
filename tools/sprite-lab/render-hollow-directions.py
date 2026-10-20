"""Render the accepted skinned walk in eight actual facings on the local RTX GPU."""
from pathlib import Path
import sys, json, math, hashlib
import numpy as np
import torch
import torch.nn.functional as F
import nvdiffrast.torch as dr
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[2]
rig=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-pixel-v3'
out=root/'art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1'
out.mkdir(exist_ok=False)
source=np.load(rig/'sampled-walk.npz')
tensor=lambda a,dtype=torch.float32: torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=tensor(source['faces'],torch.int32)
uv=tensor(source['uv'])
mvp=tensor(source['mvp'])
texture=tensor(np.asarray(Image.open(rig.parent/'textured-rgb-v2/hollow-albedo.png').convert('RGB'))/255).flip(0)[None]
ctx=dr.RasterizeCudaContext()
palette=Image.open(rig/'walk-pixels-v1/shared-palette.png')
palette.save(out/'shared-palette.png')
directions=['N','NE','E','SE','S','SW','W','NW']
# Camera right and towards-camera ground vectors define screen compass headings.
front=math.degrees(math.atan2(-3.2,2.2))+90
atlas=Image.new('RGBA',(1536,768))
frames={}; rects=[]; measurements=[]; orientation=[]
for row,direction in enumerate(directions):
    degrees=front+180-row*45
    angle=math.radians(degrees)
    rotation=tensor([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    orientation.append(dict(direction=direction,row=row,rotationDegrees=degrees,flipX=False))
    frames[direction]=[]
    folder=out/'frames'/direction
    folder.mkdir(parents=True)
    for index,positions in enumerate(source['positions'][:16]):
        vertices=tensor(positions)@rotation.T
        clip=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
        raster,_=dr.rasterize(ctx,clip[None],faces,[96,96])
        texcoords=dr.interpolate(uv[None],raster,faces)[0]
        color=dr.texture(texture,texcoords,filter_mode='nearest')[0]
        triangles=vertices[faces.long()]
        normal=F.normalize(torch.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0],dim=-1),dim=-1)
        vn=torch.zeros_like(vertices)
        for corner in range(3): vn.index_add_(0,faces[:,corner].long(),normal)
        normals=F.normalize(dr.interpolate(F.normalize(vn,dim=-1)[None],raster,faces)[0][0],dim=-1)
        lambert=(normals*F.normalize(tensor([-2,-3,5]),dim=0)).sum(-1).clamp(0,1)
        color=(color*(.88+.18*torch.floor(lambert*3)/3)[:,:,None]).clamp(0,1)
        rgba=torch.cat([color,(raster[0,:,:,3]>0).float()[:,:,None]],dim=-1).flip(0).cpu().numpy()
        raw=Image.fromarray((rgba*255).astype(np.uint8))
        frame=raw.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA')
        frame.putalpha(raw.getchannel('A'))
        frame.save(folder/f'walk-{index:02d}.png')
        atlas.alpha_composite(frame,(index*96,row*96))
        frames[direction].append(frame)
        bounds=frame.getbbox()
        assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<96 and bounds[3]<96,(direction,index,bounds)
        assert set(np.unique(np.asarray(frame)[:,:,3]))<={0,255}
        measurements.append(dict(direction=direction,frame=index,bounds=bounds,opaquePixels=int((np.asarray(frame)[:,:,3]>0).sum())))
        rects.append(dict(direction=direction,index=index,x=index*96,y=row*96,width=96,height=96,anchor=[48,72],flipX=False))
    print(direction,'rendered',flush=True)
atlas.save(out/'hollow-movement.png')
manifest=dict(schemaVersion='1.1',name='The Hollow — eight-direction movement',animation='walk',layout='eight',
    source=dict(width=1536,height=768,columns=16,rows=8,frameWidth=96,frameHeight=96,offsetX=0,offsetY=0),
    directions=directions,framesPerDirection=16,frames=128,playback=dict(fps=12,loop=True),anchor=[48,72],
    drawCellWorldSize=93,travelPerCycle=.19/.62*60,frameRects=rects,orientations=orientation,
    sourceRig=str(rig.relative_to(root)/'hollow-rigged.blend').replace('\\','/'),
    sourcePoseSha256=hashlib.sha256((rig/'sampled-walk.npz').read_bytes()).hexdigest(),
    visualAccepted=False,runtimeIntegrated=False,gaitAcceptance='Owner accepted original one-view zombie waddle; directional export awaits owner review')
(out/'hollow-movement.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
review=[]
for index in range(16):
    board=Image.new('RGBA',(4*112,2*120),(22,20,27,255))
    draw=ImageDraw.Draw(board)
    for row,direction in enumerate(directions):
        x=(row%4)*112+8;y=(row//4)*120+20
        draw.text((x,y-16),direction,fill=(205,194,177))
        draw.line((x,y+72,x+95,y+72),fill=(52,47,51))
        board.alpha_composite(frames[direction][index],(x,y))
    review.append(board.convert('RGB').resize((896,480),Image.Resampling.NEAREST))
review[0].save(out/'all-directions-review.gif',save_all=True,append_images=review[1:],duration=83,loop=0)
review[4].save(out/'all-directions-preview.png')
sheet=Image.new('RGBA',(4*96,8*112),(22,20,27,255))
draw=ImageDraw.Draw(sheet)
for row,direction in enumerate(directions):
    draw.text((4,row*112),direction,fill=(205,194,177))
    for col,index in enumerate([0,4,8,12]):sheet.alpha_composite(frames[direction][index],(col*96,row*112+16))
sheet.resize((768,1792),Image.Resampling.NEAREST).save(out/'contact-poses.png')
report=dict(gpu=torch.cuda.get_device_name(),frames=len(rects),noClipping=True,binaryAlpha=True,sharedPalette=True,
    loopMaxVertexError=float(np.abs(source['positions'][0]-source['positions'][16]).max()),measurements=measurements,
    hardwareSettingsChanged=False,method='Rotate the same evaluated skinned poses in 3D; fixed camera and world lighting; no mirrored directions')
(out/'technical-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='measurements'}),flush=True)
