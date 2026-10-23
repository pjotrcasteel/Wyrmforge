"""Local colour segmentation inside authored masks; original RGB remains unchanged."""
from pathlib import Path
import json,hashlib,sys
import numpy as np,cv2
from PIL import Image,ImageDraw

base=Path('art/source/enemies/ashfang/restart-2026-10-21');source=base/'references';grow='--grow' in sys.argv;ground='--exclude-ground' in sys.argv;out=base/('references-v4' if ground else 'references-v3' if grow else 'references-v2');out.mkdir(exist_ok=False)
board=Image.new('RGB',(1024,660),(38,38,41));draw=ImageDraw.Draw(board);report=[]
for row,name in enumerate(['pixel-idle-reference.png','ashfang-front-reference.png','ashfang-side-reference.png']):
    im=Image.open(source/name).convert('RGBA');a=np.asarray(im);rgb=a[:,:,:3];coarse=a[:,:,3]>0;r,g,b=[rgb[:,:,i].astype(float) for i in range(3)]
    allowed=cv2.dilate(coarse.astype(np.uint8),np.ones((35,35),np.uint8))>0 if grow else coarse
    if grow and name.startswith('pixel-idle'):allowed[:15,95:158]=False
    mask=np.full(coarse.shape,cv2.GC_BGD,np.uint8);mask[allowed]=cv2.GC_PR_BGD
    warm=allowed&(r>g*1.08)&(r>b*1.08)&(r>15);mask[warm]=cv2.GC_PR_FGD
    hot=allowed&(r>65)&(r>g*1.35);mask[hot]=cv2.GC_FGD
    bg=np.zeros((1,65),np.float64);fg=bg.copy();cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,bg,fg,8,cv2.GC_INIT_WITH_MASK)
    selected=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype(np.uint8)
    # Close one-pixel sampling cracks, but retain meaningful leg/wing gaps.
    selected=cv2.morphologyEx(selected,cv2.MORPH_CLOSE,np.ones((2,2),np.uint8));selected&=allowed
    if grow:
        count,components,stats,_=cv2.connectedComponentsWithStats(selected,8);largest=1+stats[1:,cv2.CC_STAT_AREA].argmax();core=components==largest;near=cv2.dilate(core.astype(np.uint8),np.ones((7,7),np.uint8))>0
        selected=core.copy()
        for component in range(1,count):
            if stats[component,cv2.CC_STAT_AREA]>=3 and np.any((components==component)&near):selected|=components==component
        selected=selected.astype(np.uint8)
    if ground:
        start,finish,zones=(100,109,[(68,117),(127,172)]) if name.startswith('pixel-idle') else (166,182,[(24,83),(133,205)]) if 'front' in name else (169,183,[(8,61),(101,155),(155,210),(218,284)])
        allowed_bottom=np.zeros_like(selected)
        for left,right_edge in zones:allowed_bottom[start:finish,left:right_edge]=1
        selected[start:]&=allowed_bottom[start:]
    result=Image.fromarray(rgb).convert('RGBA');result.putalpha(Image.fromarray(selected*255));result.save(out/name);Image.fromarray(selected*255).save(out/(Path(name).stem+'-mask.png'))
    for col,picture in enumerate([im,result]):
        scale=min(470/picture.width,175/picture.height);preview=picture.resize((round(picture.width*scale),round(picture.height*scale)),Image.Resampling.NEAREST);board.paste(preview,(col*512+15,row*220+28),preview)
    draw.text((15,row*220+8),name+' / coarse input',fill=(230,200,170));draw.text((527,row*220+8),('v4 ground excluded' if ground else 'v3 restored outline' if grow else 'v2 alpha')+' / RGB unchanged',fill=(230,200,170))
    report.append(dict(name=name,originalRgbSha256=hashlib.sha256(rgb.tobytes()).hexdigest(),coarsePixels=int(coarse.sum()),selectedPixels=int(selected.sum()),rgbUnchanged=True))
board.save(out/'mask-review.png');(out/'references.json').write_text(json.dumps(dict(method='Local GrabCut inside authored silhouette; no downloads, no new RGB pixels',images=report),indent=2)+'\n')
