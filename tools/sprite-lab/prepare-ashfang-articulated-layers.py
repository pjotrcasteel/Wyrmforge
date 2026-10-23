"""Extract editable original-pixel limb layers; flag missing hidden anatomy.
No reconstruction or approval is implied by these preparation assets.
"""
from pathlib import Path
import json,io,zipfile
from xml.etree.ElementTree import Element,SubElement,tostring
import numpy as np
from PIL import Image,ImageDraw

base=Path('art/source/enemies/ashfang/restart-2026-10-21')
out=base/'articulated-layers-002';out.mkdir(exist_ok=False)
original=Image.open(base/'references-v5/pixel-idle-reference.png').convert('RGBA')
regions={
 'near_foreleg':[(110,61),(119,64),(120,71),(111,79),(108,83),(115,91),(126,99),(137,102),(139,107),(130,112),(122,107),(116,108),(110,100),(104,94),(98,89),(93,82),(96,75),(103,68)],
 'far_foreleg':[(134,64),(145,65),(149,72),(140,80),(137,84),(145,93),(157,99),(165,104),(164,109),(153,110),(144,103),(138,96),(131,88),(125,81),(128,74)],
 'near_hindleg':[(71,70),(82,72),(85,79),(81,89),(73,95),(72,100),(77,103),(75,109),(63,109),(57,105),(55,99),(57,91),(65,85),(65,78)],
 'far_hindleg':[(85,73),(94,76),(97,84),(95,90),(87,96),(91,100),(97,105),(95,110),(86,109),(79,102),(76,97),(78,91),(84,86)]}
bones={
 'near_foreleg':{},'far_foreleg':{},'near_hindleg':{},'far_hindleg':{}}
guide=json.loads((base/'owner-guide-001/skeleton.json').read_text())['joints']
for name in bones:
 keys=['shoulder','elbow','paw'] if 'fore' in name else ['hip','knee','hock','paw']
 bones[name]=dict(zip(keys,guide[name]))
layers=[];claimed=Image.new('L',original.size)
for name,poly in regions.items():
 mask=Image.new('L',original.size);ImageDraw.Draw(mask).polygon(poly,fill=255)
 a=np.minimum(np.asarray(mask),np.asarray(original.getchannel('A')))
 a=np.where(np.asarray(claimed)>0,0,a).astype('uint8')
 layer=original.copy();layer.putalpha(Image.fromarray(a));layer.save(out/(name+'.png'));layers.append((name,layer))
 claimed=Image.fromarray(np.maximum(np.asarray(claimed),a))
body=original.copy();body.putalpha(Image.fromarray(np.where(np.asarray(claimed)>0,0,np.asarray(original.getchannel('A'))).astype('uint8')));body.save(out/'torso-needs-hidden-overlap.png')
layers.append(('torso / missing overlap requires paint',body))
rest=Image.new('RGBA',original.size)
for _,im in reversed(layers):rest.alpha_composite(im)
a=np.asarray(original);b=np.asarray(rest);assert np.array_equal(a[a[:,:,3]>0],b[a[:,:,3]>0])
rest.save(out/'assembled-rest.png')
stack=Element('image',{'w':str(original.width),'h':str(original.height),'name':'Ashfang original-pixel articulated preparation'})
layerstack=SubElement(stack,'stack')
with zipfile.ZipFile(out/'ashfang-limb-preparation.ora','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('mimetype','image/openraster')
 for i,(name,im) in enumerate(layers):
  path=f'data/layer-{i}.png';buffer=io.BytesIO();im.save(buffer,format='PNG');z.writestr(path,buffer.getvalue())
  SubElement(layerstack,'layer',{'name':name,'src':path,'opacity':'1.0','visibility':'visible','composite-op':'svg:src-over','x':'0','y':'0'})
 buffer=io.BytesIO();rest.save(buffer,format='PNG');z.writestr('mergedimage.png',buffer.getvalue());z.writestr('stack.xml',tostring(stack))
board=Image.new('RGB',(924,600),(38,36,40));draw=ImageDraw.Draw(board)
for i,(name,im) in enumerate(layers):
 x=i%2*462;y=i//2*200
 scaled=im.resize((462,230),Image.Resampling.NEAREST);board.paste(scaled,(x,y-30),scaled);draw.text((x+12,y+175),name,fill=(235,210,180))
board.save(out/'layer-review.png')
(out/'source.json').write_text(json.dumps(dict(status='Preparation only: hidden overlap and anatomical mask review required before gait',regions=regions,bones=bones,restVisiblePixelsExact=True,ownerAccepted=False,walkReady=False,source='../references-v5/pixel-idle-reference.png'),indent=2)+'\n')
print('Saved four editable limb layers and exact original-pixel assembled rest; hidden anatomy remains unpainted.')
