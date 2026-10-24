"""Surface-bound emissive eye pixel pass over preserved approved sprite frames."""
from pathlib import Path
import sys,json,math,hashlib
import numpy as np,torch
import nvdiffrast.torch as dr
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];asset=root/'art/source/enemies/ashling';source=asset/'exports'/sys.argv[1];out=asset/'exports'/sys.argv[2];out.mkdir(exist_ok=False)
m=json.loads((source/'manifest.json').read_text());animation=m['animation'];movement=animation=='movement';stem='move' if movement else animation;cell=96 if movement else 128;count=m['framesPerDirection'];rig=(root/m['sourceRig']).parent
s=np.load(rig/('sampled-walk.npz' if movement else animation+'-samples.npz'));rest=np.load(asset/'model/local-appearance-002/textured-v1/textured-mesh.npz')['vertices'];study=np.load(asset/'model/local-appearance-002/eye-study-v1/surface-map.npz')
centers=np.array([study['positions'][326,192],study['positions'][319,281]])
mask=np.zeros(len(s['positions'][0]),np.float32)
for center in centers:
    delta=rest-center;distance=(delta[:,0]/.020)**2+(delta[:,2]/.013)**2
    eye=np.exp(-distance*1.8)*(abs(delta[:,1])<.024);mask[:len(rest)]=np.maximum(mask[:len(rest)],eye)
t=lambda a,dtype=torch.float32:torch.tensor(a,dtype=dtype,device='cuda').contiguous();faces=t(s['faces'],torch.int32);weight=t(mask)[None,:,None];mvp=t(s['mvp']);mvp[:2]*=96/cell
origin=t([.07,.22,-.5]);ctx=dr.RasterizeCudaContext();atlas=Image.new('RGBA',(count*cell,8*cell));allframes={};changes=[];report_colors=set()
for row,d in enumerate(m['directions']):
    angle=math.radians(m['orientations'][row]['rotationDegrees']);rotation=t([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
    folder=out/'frames'/d;folder.mkdir(parents=True);allframes[d]=[]
    for f in range(count):
        v=(t(s['positions'][f])-origin)@rotation.T+origin;clip=torch.cat([v,torch.ones_like(v[:,:1])],1)@mvp.T;r,_=dr.rasterize(ctx,clip[None],faces,[cell,cell]);w=dr.interpolate(weight,r,faces)[0][0,:,:,0].flip(0).cpu().numpy()
        strength=float(np.interp(f,[0,3,8,13,count-1],[1,1,.45,0,0])) if animation=='death' else 1
        image=Image.open(source/'frames'/d/f'{stem}-{f:02d}.png').convert('RGBA');pixels=np.array(image);before=pixels.copy();active=(w*strength>.12)&(pixels[:,:,3]>0)
        level=w*strength
        for threshold,color in [(.12,[145,30,10]),(.23,[214,55,9]),(.36,[255,100,12]),(.55,[255,204,58]),(.78,[255,251,211])]:pixels[active&(level>=threshold),:3]=color
        changed=np.any(pixels[:,:,:3]!=before[:,:,:3],axis=2);assert np.array_equal(pixels[:,:,3],before[:,:,3]);assert not np.any(changed&~active)
        image=Image.fromarray(pixels);image.save(folder/f'{stem}-{f:02d}.png');atlas.alpha_composite(image,(f*cell,row*cell));allframes[d].append(image);changes.append(dict(direction=d,frame=f,changedPixels=int(changed.sum()),intensity=strength));report_colors.update(map(tuple,pixels[pixels[:,:,3]>0,:3]))
    print(d,animation,'eyes rendered',flush=True)
assert len(report_colors)<=64,len(report_colors)
atlasname=f'ashling-{animation}.png';atlas.save(out/atlasname);m.update(atlasSha256=hashlib.sha256((out/atlasname).read_bytes()).hexdigest(),appearanceRevision='surface-bound fiery eyes v1',priorExport=str(source.relative_to(root)),eyeDeathFadeEndFrame=13,ownerAccepted=False,runtimeIntegrated=False)
if movement:m['directionalExportOwnerAccepted']=False
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');np.savez_compressed(out/'eye-source.npz',vertexWeights=mask,restSurfaceCenters=centers)
boards=[];singles=[]
for f in range(count):
    b=Image.new('RGB',(cell*4,(cell+16)*2),(22,20,27));draw=ImageDraw.Draw(b)
    for row,d in enumerate(m['directions']):
        x=row%4*cell;y=row//4*(cell+16);b.paste(allframes[d][f],(x,y+16),allframes[d][f]);draw.text((x+4,y+2),d,fill=(220,190,145))
    boards.append(b.resize((b.width*2,b.height*2),Image.Resampling.NEAREST))
    b=Image.new('RGB',(cell*2,cell),(22,20,27))
    for i,d in enumerate(['S','SW']):b.paste(allframes[d][f],(i*cell,0),allframes[d][f])
    singles.append(b.resize((cell*6,cell*3),Image.Resampling.NEAREST))
duration=50 if movement else 42;seq=boards if movement else boards+[boards[-1]]*(20 if animation=='death' else 8);seq[0].save(out/'eight-directions-review.gif',save_all=True,append_images=seq[1:],duration=duration,loop=0)
seq=singles if movement else singles+[singles[-1]]*(20 if animation=='death' else 8);seq[0].save(out/'fiery-eyes-review.gif',save_all=True,append_images=seq[1:],duration=duration,loop=0)
report=dict(passed=True,animation=animation,frames=8*count,paletteColors=len(report_colors),alphaAndGeometryUnchanged=True,onlyVisibleEyeSurfacePixelsChanged=True,changes=changes,ownerAccepted=False,runtimeIntegrated=False)
(out/'eye-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('Saved',animation,'eyes;',len(report_colors),'palette colors')
