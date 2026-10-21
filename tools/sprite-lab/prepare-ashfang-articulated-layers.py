"""Extract editable original-pixel limb layers; flag missing hidden anatomy.
No reconstruction or approval is implied by these preparation assets.
"""
from pathlib import Path
import json,io,zipfile
from xml.etree.ElementTree import Element,SubElement,tostring
import numpy as np
from PIL import Image,ImageDraw

base=Path('art/source/enemies/ashfang/restart-2026-10-21')
out=base/'articulated-layers-001';out.mkdir(exist_ok=False)
original=Image.open(base/'references-v5/pixel-idle-reference.png').convert('RGBA')
regions={
 'near_foreleg':[(104,75),(115,76),(120,83),(121,91),(130,100),(138,102),(137,108),(130,112),(123,108),(119,109),(113,103),(110,98),(105,94),(100,87)],
 'far_foreleg':[(133,78),(145,77),(150,84),(150,90),(155,95),(163,99),(166,107),(159,110),(150,108),(143,102),(138,96),(132,91)],
 'near_hindleg':[(61,78),(75,78),(79,84),(74,91),(70,96),(69,101),(75,103),(74,108),(65,108),(58,104),(53,105),(50,100),(52,92),(56,85)],
 'far_hindleg':[(81,82),(91,81),(96,88),(92,96),(92,100),(97,103),(95,109),(87,110),(81,106),(78,99),(80,92)]}
bones={
 'near_foreleg':{'shoulder':[109,79],'elbow':[111,94],'paw':[129,106]},
 'far_foreleg':{'shoulder':[139,81],'elbow':[145,95],'paw':[158,105]},
 'near_hindleg':{'hip':[70,82],'knee':[60,91],'hock':[58,99],'paw':[66,104]},
 'far_hindleg':{'hip':[87,84],'knee':[87,94],'paw':[89,105]}}
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
