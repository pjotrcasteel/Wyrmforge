"""Render the accepted skinned walk in eight actual facings on the local RTX GPU."""
from pathlib import Path
import sys, json, math, hashlib
import numpy as np
import torch
import torch.nn.functional as F
import nvdiffrast.torch as dr
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[2]
death='--death' in sys.argv
cell=128 if death else 96
count=24 if death else 16
anchor=[64,88] if death else [48,72]
stem='hollow-death' if death else 'hollow-movement'
model=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
rig=model/(sys.argv[sys.argv.index('--rig')+1] if '--rig' in sys.argv else ('rigged-death-v5' if death else 'rigged-pixel-v3'))
revision=sys.argv[sys.argv.index('--revision')+1] if '--revision' in sys.argv else ('death-eight-directions-v4' if death else 'movement-eight-directions-v1')
out=root/'art/source/enemies/hollow/rigged-poc/exports'/revision
out.mkdir(exist_ok=False)
sample_path=rig/('sampled-death.npz' if death else 'sampled-walk.npz')
source=np.load(sample_path)
tensor=lambda a,dtype=torch.float32: torch.tensor(a,dtype=dtype,device='cuda').contiguous()
faces=tensor(source['faces'],torch.int32)
uv=tensor(source['uv'])
mvp=tensor(source['mvp'])
texture=tensor(np.asarray(Image.open(rig.parent/'textured-rgb-v2/hollow-albedo.png').convert('RGB'))/255).flip(0)[None]
ctx=dr.RasterizeCudaContext()
palette=Image.open(model/'rigged-pixel-v3/walk-pixels-v1/shared-palette.png')
palette.save(out/'shared-palette.png')
directions=['N','NE','E','SE','S','SW','W','NW']
# Camera right and towards-camera ground vectors define screen compass headings.
front=math.degrees(math.atan2(-3.2,2.2))+90
atlas=Image.new('RGBA',(cell*count,cell*8))
frames={}; rects=[]; measurements=[]; orientation=[]
for row,direction in enumerate(directions):
    degrees=front+180-row*45
    angle=math.radians(degrees)
    rotation=tensor([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    orientation.append(dict(direction=direction,row=row,rotationDegrees=degrees,flipX=False))
    frames[direction]=[]
    folder=out/'frames'/direction
    folder.mkdir(parents=True)
    for index,positions in enumerate(source['positions'][:count]):
        vertices=tensor(positions)@rotation.T
        clip=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
        raster,_=dr.rasterize(ctx,clip[None],faces,[cell,cell])
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
        frame.save(folder/f'{"death" if death else "walk"}-{index:02d}.png')
        atlas.alpha_composite(frame,(index*cell,row*cell))
        frames[direction].append(frame)
        bounds=frame.getbbox()
        assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<cell and bounds[3]<cell,(direction,index,bounds)
        assert set(np.unique(np.asarray(frame)[:,:,3]))<={0,255}
        measurements.append(dict(direction=direction,frame=index,bounds=bounds,opaquePixels=int((np.asarray(frame)[:,:,3]>0).sum())))
        rects.append(dict(direction=direction,index=index,x=index*cell,y=row*cell,width=cell,height=cell,anchor=anchor,flipX=False))
    print(direction,'rendered',flush=True)
atlas.save(out/(stem+'.png'))
manifest=dict(schemaVersion='1.1',name='The Hollow — eight-direction '+('death' if death else 'movement'),animation='death' if death else 'walk',layout='eight',
    source=dict(width=cell*count,height=cell*8,columns=count,rows=8,frameWidth=cell,frameHeight=cell,offsetX=0,offsetY=0),
    directions=directions,framesPerDirection=count,frames=count*8,playback=dict(fps=12,loop=not death,holdLastFrame=death),anchor=anchor,
    drawCellWorldSize=cell*93/96,travelPerCycle=0 if death else .19/.62*60,frameRects=rects,orientations=orientation,
    sourceRig=str(rig.relative_to(root)/('hollow-death.blend' if death else 'hollow-rigged.blend')).replace('\\','/'),
    sourcePoseSha256=hashlib.sha256(sample_path.read_bytes()).hexdigest(),
    visualAccepted=False,runtimeIntegrated=False)
(out/(stem+'.manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n')
review=[]
for index in range(count):
    board=Image.new('RGBA',(4*(cell+16),2*(cell+24)),(22,20,27,255))
    draw=ImageDraw.Draw(board)
    for row,direction in enumerate(directions):
        x=(row%4)*(cell+16)+8;y=(row//4)*(cell+24)+20
        draw.text((x,y-16),direction,fill=(205,194,177))
        draw.line((x,y+anchor[1],x+cell-1,y+anchor[1]),fill=(52,47,51))
        board.alpha_composite(frames[direction][index],(x,y))
    review.append(board.convert('RGB').resize((board.width*2,board.height*2),Image.Resampling.NEAREST))
review[0].save(out/'all-directions-review.gif',save_all=True,append_images=review[1:],duration=[83]*(count-1)+[1200 if death else 83],loop=0)
review[12 if death else 4].save(out/'all-directions-preview.png')
phases=[0,3,7,10,13,23] if death else [0,4,8,12]
sheet=Image.new('RGBA',(len(phases)*cell,8*(cell+16)),(22,20,27,255))
draw=ImageDraw.Draw(sheet)
for row,direction in enumerate(directions):
    draw.text((4,row*(cell+16)),direction,fill=(205,194,177))
    for col,index in enumerate(phases):sheet.alpha_composite(frames[direction][index],(col*cell,row*(cell+16)+16))
sheet.resize((sheet.width*2,sheet.height*2),Image.Resampling.NEAREST).save(out/'contact-poses.png')
report=dict(gpu=torch.cuda.get_device_name(),frames=len(rects),noClipping=True,binaryAlpha=True,sharedPalette=True,
    closingPoseError=float(np.abs(source['positions'][-1]-source['positions'][-2 if death else 0]).max()),measurements=measurements,
    hardwareSettingsChanged=False,method='Rotate the same evaluated skinned poses in 3D; fixed camera and world lighting; no mirrored directions')
(out/'technical-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='measurements'}),flush=True)
