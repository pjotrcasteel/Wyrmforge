"""Extract the card's existing front turnaround locally; never redraw the card."""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[2]
card=root/'user_handover_files/concepts/Fire/02-ashlings.png'
out=root/'art/source/enemies/ashling/references'
out.mkdir(parents=True,exist_ok=True)
box=(24,878,154,1100)
source=Image.open(card).convert('RGB').crop(box)
source.save(out/'card-front-crop.png')
rgb=np.array(source)
mask=np.zeros(rgb.shape[:2],np.uint8)
cv2.grabCut(rgb,mask,(5,3,rgb.shape[1]-10,rgb.shape[0]-7),None,None,8,cv2.GC_INIT_WITH_RECT)
# The dark thin legs and horn tips need explicit foreground seeds; an automatic
# rectangle otherwise drops them into the nearly black turnaround background.
strokes=[[(43,13),(37,27),(43,41),(51,49)],[(97,13),(102,28),(96,41),(83,51)],
         [(44,137),(39,155),(38,171),(32,187),(25,201),(14,206)],
         [(82,137),(88,152),(86,172),(93,190),(98,201),(111,206)]]
for stroke in strokes:cv2.polylines(mask,[np.array(stroke,np.int32)],False,cv2.GC_FGD,2)
cv2.grabCut(rgb,mask,None,None,None,8,cv2.GC_INIT_WITH_MASK)
alpha=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
coverage=float((alpha>0).mean())
assert .08<coverage<.8,coverage
rgba=Image.fromarray(np.dstack([rgb,alpha]))
rgba.save(out/'card-front-cutout.png')
rgba=rgba.resize((round(rgba.width*448/rgba.height),448),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512));canvas.alpha_composite(rgba,((512-rgba.width)//2,(512-rgba.height)//2))
canvas.save(out/'ashling-front-reference.png')
(out/'extraction.json').write_text(json.dumps(dict(source=str(card.relative_to(root)),sourceSha256=hashlib.sha256(card.read_bytes()).hexdigest(),crop=list(box),method='local OpenCV GrabCut, original card pixels',coverage=coverage,ownerAccepted=False),indent=2)+'\n')
print('Original card front extracted; coverage',coverage)
