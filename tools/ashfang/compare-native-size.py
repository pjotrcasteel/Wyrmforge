"""Review-only footprint/silhouette boards using the unchanged runtime mage.

Not spritesheets, live gameplay evidence, or pixel-art acceptance.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--review',required=True)
p.add_argument('--output',required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[2]
review=Path(a.review)
out=Path(a.output)
if out.exists(): raise SystemExit('Use a new immutable output directory')
out.mkdir(parents=True)
manifest=json.loads((root/'src/Wyrmforge.Presentation.Web/wwwroot/art/manifest.json').read_text())
actors=manifest['atlases']['actors']
frame=actors['frames']['mage.N.idle']
atlas=Image.open(root/'src/Wyrmforge.Presentation.Web/wwwroot/art'/actors['image']).convert('RGBA')
mage=atlas.crop((frame['x'],frame['y'],frame['x']+frame['w'],frame['y']+frame['h']))
mage_hash=hashlib.sha256(mage.tobytes()).hexdigest()
panels=[]
measurements=[]
for width in (320,390,440):
    height=400
    board=Image.new('RGBA',(width,height),(38,35,34,255))
    draw=ImageDraw.Draw(board)
    draw.text((10,8),f'{width}px review, 23% footprint; unchanged mage',(225,218,205))
    # Crop only transparent empty render margins. This is a scale study, not an
    # export/pivot rule. Final runtime pivot remains a later reviewed contract.
    raw=Image.open(review/'game-elevated.png').convert('RGBA')
    bounds=raw.getchannel('A').point(lambda x:255 if x>=16 else 0).getbbox()
    if not bounds: raise SystemExit('Empty source silhouette')
    crop=raw.crop(bounds)
    target=round(width*.23)
    size=(target,max(1,round(crop.height*target/crop.width)))
    small=crop.resize(size,Image.Resampling.LANCZOS)
    pos=(round(width*.32-target/2),120-size[1])
    board.alpha_composite(small,pos)
    mage_pos=(round(width*.68)-frame['ax'],120-frame['ay'])
    board.alpha_composite(mage,mage_pos)
    # Extracting the complete mage rectangle must be exactly pixel-identical.
    returned=board.crop((mage_pos[0],mage_pos[1],mage_pos[0]+mage.width,mage_pos[1]+mage.height))
    expected=Image.new('RGBA',mage.size,(38,35,34,255))
    expected.alpha_composite(mage)
    if returned.tobytes()!=expected.tobytes(): raise SystemExit('Mage altered/overlapped')
    mask=small.getchannel('A').point(lambda x:255 if x>=128 else 0)
    silhouette=Image.new('RGBA',small.size,(0,0,0,255))
    silhouette.putalpha(mask)
    # Light ground makes the black silhouette legible; labels remain review-only.
    draw.rectangle((0,155,width,245),fill=(175,172,162))
    board.alpha_composite(silhouette,(pos[0],185))
    draw.text((10,255),'Above: clay footprint. Below: binary silhouette.',(225,218,205))
    draw.text((10,275),'Not a live Hunt capture or final pixel sprite.',(225,218,205))
    # Enlarged comparison below the native rows supports inspection without
    # pretending that the actual gameplay sprite is larger.
    zoom=small.resize((small.width*2,small.height*2),Image.Resampling.NEAREST)
    if zoom.height<100: board.alpha_composite(zoom,(10,300))
    board.save(out/f'native-{width}.png')
    panels.append(board)
    measurements.append({'viewportWidth':width,'targetFootprintWidth':target,
        'viewportFraction':target/width,'mageFrameSize':list(mage.size),
        'mageOpaqueBounds':mage.getchannel('A').getbbox(),'mageScale':1,
        'mageCompositedPixelsUnchanged':True,'sourceRender':str(review/'game-elevated.png'),
        'silhouetteOccupiedPixels':int(np.count_nonzero(np.asarray(mask)))})
combined=Image.new('RGBA',(sum(i.width for i in panels),400),(38,35,34,255))
x=0
for panel in panels:
    combined.alpha_composite(panel,(x,0));x+=panel.width
combined.save(out/'native-comparison.png')
report={'purpose':'Static original clay scale and silhouette review only',
        'runtimeIntegrated':False,'liveGameplay':False,'pixelArtAccepted':False,
        'ownerAccepted':False,'mageRgbaSha256':mage_hash,'measurements':measurements}
(out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(out/'native-comparison.png')
