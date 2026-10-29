"""Pack aligned evaluated material passes, without regional warping or live skin.

Primary image becomes unlit albedo; preserve the separate review-color pack.
No declaration of GPU/depth/device/art acceptance is made here.
"""
import argparse,hashlib,json,math,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageChops
p=argparse.ArgumentParser();p.add_argument('pack',type=Path);p.add_argument('--materials',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
m=json.loads((a.pack/'manifest.json').read_text());receipt=json.loads((a.materials/'material-receipt.json').read_text())
if m.get('skin') or m.get('regions'):raise ValueError('Complete baked sprites required')
if receipt.get('normalBasisVersion')!=2 or receipt.get('cyclesCameraToNormalBasis')!=[1,1,-1]:raise ValueError('Material normal basis requires verified Cycles camera Z conversion')
if receipt['sourceBlendSha256']!=m.get('sourceBlendSha256'):raise ValueError('Material/source Blender mismatch')
if set(receipt['directions'])!=set(m['directions']) or receipt['cell']!=96 or receipt['normalBasis']!='camera-right/up/toward':raise ValueError('Material view/basis mismatch')
if not set(m['clips'])<=set(receipt['clips']) or set(receipt['modes'])!={'albedo','normal','emissive'}:raise ValueError('Incomplete declared material passes')
a.out.mkdir(parents=True,exist_ok=True);decoded=0
for name,c in m['clips'].items():
 columns=c.get('columns',c['frames']);rows=math.ceil(c['frames']/columns);crop=c.get('crop',[0,0,c['cell'],c['cell']]);w,h=crop[2]-crop[0],crop[3]-crop[1]
 with Image.open(a.pack/c['image']) as review:alpha=review.convert('RGBA').getchannel('A')
 c['reviewColorSha256']=c['sha256'];c['materials']={}
 for mode in receipt['modes']:
  atlas=Image.new('RGBA',(columns*w,rows*len(m['directions'])*h))
  for row,direction in enumerate(m['directions']):
   for frame in range(c['frames']):
    with Image.open(a.materials/mode/name/direction/f'{frame:02d}.png') as image:
     if image.size!=(c['cell'],c['cell']):raise ValueError('Material cell dimensions mismatch')
     atlas.paste(image.convert('RGBA').crop(crop),((frame%columns)*w,(row*rows+frame//columns)*h))
  if ImageChops.difference(alpha,atlas.getchannel('A')).getbbox():raise ValueError('Evaluated material alpha mismatch: '+name+'/'+mode)
  if mode=='normal':
   pixels=np.array(atlas);mask=pixels[:,:,3]>0;v=pixels[:,:,:3][mask].astype(float)/127.5-1;length=np.linalg.norm(v,axis=1)
   if np.any(length<=math.sqrt(3)/255):raise ValueError('Source normal below quantization precision')
   pixels[:,:,:3][mask]=np.rint((v/length[:,None]+1)*127.5).clip(0,255).astype(np.uint8);atlas=Image.fromarray(pixels)
   c['sourceNormalPreNormalizationLengthRange']=[float(length.min()),float(length.max())]
  file=name+'-'+mode+'.png';atlas.save(a.out/file);item={'image':file,'sha256':hashlib.sha256((a.out/file).read_bytes()).hexdigest(),'basis':receipt['normalBasis'] if mode=='normal' else 'source-evaluated'}
  if mode=='albedo':c.update(image=file,sha256=item['sha256'],colorRole='albedo',reviewLightingOnly=False)
  else:c['materials'][mode]=item
  decoded+=atlas.width*atlas.height*4
if decoded>64*1024*1024:raise ValueError('Production sprite texture budget exceeded')
shutil.copyfile(a.pack/'profile.json',a.out/'profile.json');shutil.copyfile(a.materials/'material-receipt.json',a.out/'material-receipt.json')
m.update(productionReady=False,reviewLightingOnly=False,materialPassesAligned=True,normalBasisVersion=2,decodedTextureBytes=decoded,materialGate='Actual shared GPU lighting, depth/caster, mobile and owner acceptance remain open')
(a.out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps({'decodedTextureBytes':decoded,'alignedMaterials':True,'productionReady':False}))
