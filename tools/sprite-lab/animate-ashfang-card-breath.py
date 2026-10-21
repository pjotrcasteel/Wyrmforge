"""Sustained breath study using the card's actual breath pose and flame pixels.
Does not provide windup/recovery transitions or gameplay damage timing.
"""
from pathlib import Path
import json,math
import numpy as np,torch
from PIL import Image,ImageDraw
base=Path('art/source/enemies/ashfang/restart-2026-10-21');out=base/'card-breath-001';out.mkdir(exist_ok=False);(out/'frames').mkdir()
ref=Image.open(base/'action-reference-001/breath-original.png').convert('RGBA');W,H=ref.size
near=[(5,45),(12,28),(28,16),(49,7),(61,4),(70,0),(75,6),(77,13),(72,11),(71,21),(73,30),(83,34),(88,43),(83,48),(75,50),(68,54),(64,51),(60,56),(55,59),(48,63),(48,55),(45,47),(42,40),(36,38),(30,38),(26,44),(23,50),(20,57),(20,49),(22,41),(18,39),(13,42),(10,48),(7,55),(7,47)]
far=[(155,30),(168,25),(177,22),(187,27),(197,29),(205,35),(210,40),(216,44),(221,51),(214,47),(210,43),(201,40),(194,36),(183,35),(176,37),(170,42),(164,45)]
bodypoly=[(0,77),(12,80),(24,80),(39,77),(51,70),(58,60),(63,50),(73,43),(79,37),(89,27),(95,23),(103,21),(106,17),(115,21),(114,12),(125,18),(134,27),(135,20),(142,27),(146,25),(156,38),(164,45),(166,51),(160,57),(155,65),(149,72),(146,69),(148,57),(141,53),(132,57),(126,64),(128,70),(133,76),(141,82),(146,86),(146,91),(137,91),(128,87),(120,81),(111,72),(106,69),(107,78),(113,83),(118,88),(114,92),(108,91),(104,93),(100,90),(95,92),(91,86),(85,78),(77,73),(75,81),(76,85),(82,88),(79,92),(72,91),(66,91),(60,87),(55,88),(51,85),(45,87),(36,86),(28,88),(20,87),(13,85),(5,85),(0,82)]
holes=[[(15,81),(31,82),(43,79),(49,77),(46,82),(35,83),(24,84)],[(78,80),(85,82),(90,86),(91,89),(81,87)],[(110,74),(118,76),(124,82),(128,85),(119,85),(113,80)]]
mask=Image.new('L',ref.size);draw=ImageDraw.Draw(mask)
for poly in [near,far,bodypoly]:draw.polygon(poly,fill=255)
for poly in holes:draw.polygon(poly,fill=0)
body=ref.copy();body.putalpha(mask);body.save(out/'body-rest.png')
firemask=Image.new('L',ref.size);ImageDraw.Draw(firemask).polygon([(151,47),(166,44),(187,49),(208,44),(217,27),(244,25),(263,41),(275,61),(301,65),(301,112),(208,112),(174,98),(157,80),(151,65)],fill=255)
rgb=np.array(ref)[:,:,:3].astype(float);red,green,blue=rgb.transpose(2,0,1)
hot=(red>85)&(red>green*1.12)&(red>blue*1.6)
alpha=np.where(hot,np.clip((red-65)/70,0,1)*255,0).astype('uint8');alpha=np.minimum(alpha,np.array(firemask))
fire=ref.copy();fire.putalpha(Image.fromarray(alpha));fire.save(out/'fire-rest.png')
device='cuda';bodytex=torch.from_numpy(np.array(body).astype(np.float32)/255).permute(2,0,1)[None].to(device);firetex=torch.from_numpy(np.array(fire).astype(np.float32)/255).permute(2,0,1)[None].to(device)
yy,xx=np.mgrid[:H,:W].astype(np.float32)
def sample(texture,sx,sy):
 grid=np.stack([sx/(W-1)*2-1,sy/(H-1)*2-1],-1).astype(np.float32)
 with torch.inference_mode():a=torch.nn.functional.grid_sample(texture,torch.from_numpy(grid)[None].to(device),mode='nearest',align_corners=True)
 return Image.fromarray((a[0].permute(1,2,0).cpu().numpy()*255).round().astype('uint8'))
N=48;fps=24;frames=[];previews=[];cw,ch=384,192
for f in range(N):
 p=2*math.pi*f/N
 chest=np.exp(-((xx-110)/38)**2-((yy-53)/27)**2)*np.clip((86-yy)/20,0,1)
 wing=np.exp(-((xx-42)/44)**2-((yy-22)/23)**2)
 posed=sample(bodytex,xx+.4*math.sin(p*2)*chest,yy+.65*math.sin(p*2)*chest+1.4*math.sin(p-.5)*wing)
 # Flow increases downstream; the mouth origin remains fixed.
 downstream=np.clip((xx-152)/85,0,1)
 sx=xx-downstream*(2.2*np.sin(yy*.18-p*4)+1.1*np.sin(xx*.13-p*6))
 sy=yy+downstream*(2.5*np.sin(xx*.13-p*4)+1.3*np.sin(yy*.23-p*6))
 flame=sample(firetex,sx,sy)
 frame=Image.new('RGBA',(cw,ch));frame.alpha_composite(posed,(32,40));frame.alpha_composite(flame,(32,40));frame.save(out/'frames'/f'breath-{f:03}.png');frames.append(frame)
 preview=Image.new('RGB',(1152,576),(34,33,37));im=frame.resize(preview.size,Image.Resampling.NEAREST);preview.paste(im,(0,0),im);ImageDraw.Draw(preview).text((16,16),'ASHFANG / ORIGINAL BREATH POSE / SUSTAINED FIRE STUDY',fill=(235,210,180));previews.append(preview)
atlas=Image.new('RGBA',(cw*8,ch*6))
for i,im in enumerate(frames):atlas.paste(im,(i%8*cw,i//8*ch))
atlas.save(out/'breath-atlas.png');previews[0].save(out/'breath-preview.gif',save_all=True,append_images=previews[1:],duration=1000/fps,loop=0,optimize=False)
sheet=Image.new('RGB',(cw*3,ch*2),(34,33,37))
for i,f in enumerate(range(0,N,8)):sheet.paste(frames[f],(i%3*cw,i//3*ch),frames[f])
sheet.save(out/'contact-sheet.png')
(out/'source.json').write_text(json.dumps(dict(bodyPolygons=[near,far,bodypoly],negativeSpaces=holes,source='../action-reference-001/breath-original.png',method='Original card RGB, authored alpha, local CUDA deformation and flame advection',frames=N,fps=fps,cell=[cw,ch],gpu=torch.cuda.get_device_name(),ownerAccepted=False,status='Sustained breath study only; not complete attack',remaining=['Windup and recovery pose transitions','Mouth/jaw articulation','Silhouette and alpha review','Native game integration and damage timing']),indent=2)+'\n')
print('Rendered sustained breath study on',torch.cuda.get_device_name())
