"""Large and native real-camera reviews; source geometry and appearance both shown."""
from pathlib import Path
import sys,json,math
import numpy as np,torch
import torch.nn.functional as F
import nvdiffrast.torch as dr
from gsplat import rasterization
from PIL import Image,ImageDraw

folder=Path(sys.argv[1]);out=folder/'large-native-review-v1';out.mkdir(exist_ok=False)
raw=np.load(folder/'raw-mesh.npz');g=np.load(folder/'gaussian-appearance.npz')
def t(x,dtype=torch.float32):return torch.tensor(np.asarray(x),device='cuda',dtype=dtype).contiguous()
v=t(raw['vertices']);faces=t(raw['faces'],torch.int32);vertex_color=t(raw['colors'][:,:3]);center=(v.min(0).values+v.max(0).values)/2
means=t(g['means']);quats=t(g['quats']);scales=t(g['scales']);opacity=t(g['opacities']).flatten();colors=(t(g['sh'])[:,0,:]*.28209479177387814+.5).clamp(0,1)
tri=v[faces.long()];normals=torch.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0],dim=1);summed=torch.zeros_like(v)
for j in range(3):summed.index_add_(0,faces[:,j].long(),normals)
normals=F.normalize(summed,dim=1);ctx=dr.RasterizeCudaContext();ref=Image.open(folder.parent/'references/pixel-idle-reference.png').convert('RGBA');palette=ref.convert('RGB').quantize(colors=64)
board=Image.new('RGB',(1024,640),(32,31,34));draw=ImageDraw.Draw(board);audit=[]
def rgba(rgb,a,flip=False):
    array=torch.cat([rgb,a],-1)
    if flip:array=array.flip(0)
    return Image.fromarray((array.clamp(0,1).cpu().numpy()*255).astype('uint8'))
with torch.no_grad():
 for view,angle in enumerate(range(0,360,45)):
    a=math.radians(angle);forward=-np.array([math.sin(a),-math.cos(a),.55]);forward/=np.linalg.norm(forward);right=np.cross(forward,[0,0,1]);right/=np.linalg.norm(right);up=np.cross(right,forward)
    local=v-center;px=local@t(right);py=local@t(up);density=min(1024*.43/float(px.abs().max()),768*.40/float(py.abs().max()))
    rmat=t(np.stack([right,-up,forward]));eye=center-t(forward)*3;viewmat=torch.eye(4,device='cuda');viewmat[:3,:3]=rmat;viewmat[:3,3]=-rmat@eye
    m=torch.eye(4,device='cuda');m[0,:3]=t(right)*density/512;m[1,:3]=t(up)*density/384;m[2,:3]=t(forward)*.4;m[:3,3]=-m[:3,:3]@center
    projected=torch.cat([v,torch.ones_like(v[:,:1])],1)@m.T;r,_=dr.rasterize(ctx,projected[None],faces,[768,1024]);alpha=(r[0,:,:,3:]>0).float();n=F.normalize(dr.interpolate(normals[None],r,faces)[0][0],dim=2);diffuse=(n*t([-.35,-.55,.76])).sum(2).abs();clay=(.32+.48*diffuse)[:,:,None].repeat(1,1,3)
    clay_image=rgba(clay,alpha,True);clay_image.save(out/f'clay-{angle:03d}.png')
    colour=dr.interpolate(vertex_color[None],r,faces)[0][0];rgba(colour,alpha,True).save(out/f'mesh-colour-{angle:03d}.png')
    k=t([[density,0,512],[0,density,384],[0,0,1]])
    rgb,ga,_=rasterization(means,quats,scales,opacity,colors,viewmat[None],k[None],1024,768,near_plane=.1,far_plane=10,camera_model='ortho')
    appearance=rgba(rgb[0]/ga[0].clamp(min=1e-6),ga[0]);appearance.save(out/f'appearance-{angle:03d}.png')
    kn=k.clone();kn[0,:]*=96/1024;kn[1,:]*=72/768
    nrgb,na,_=rasterization(means,quats,scales,opacity,colors,viewmat[None],kn[None],96,72,near_plane=.1,far_plane=10,camera_model='ortho')
    native=rgba(nrgb[0]/na[0].clamp(min=1e-6),na[0]);pixel=native.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel.putalpha(native.getchannel('A'));pixel.save(out/f'native-{angle:03d}.png')
    x=view%4*256;y=view//4*320;small=appearance.resize((256,192),Image.Resampling.LANCZOS);board.paste(small,(x,y),small);enlarged=pixel.resize((192,144),Image.Resampling.NEAREST);board.paste(enlarged,(x+32,y+166),enlarged);draw.text((x+8,y+298),f'{angle} deg / actual source / native 96px',fill=(230,200,165))
    mask=np.asarray(appearance.getchannel('A'))>128;clipped=bool(mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any());audit.append(dict(viewDegrees=angle,clippedAppearance=clipped,meshFinite=bool(torch.isfinite(v).all())))
    print('Reviewed',angle,flush=True)
board.save(out/'large-native-turnaround.png')
(out/'review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(),inspectionResolution=[1024,768],nativeResolution=[96,72],sourceGeometryVertices=len(v),sourceGeometryFaces=len(faces),views=audit,ownerAccepted=False,rigged=False,styleAccepted=False,notes='Appearance and clay are separately saved. Native images rendered at native resolution, quantized to original card palette. Large previews are not accepted artwork or a finished rig.'),indent=2)+'\n')
