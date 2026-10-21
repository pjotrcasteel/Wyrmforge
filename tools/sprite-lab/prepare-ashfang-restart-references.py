"""Original-card pixels and editable silhouette masks for the 2.5D restart."""
from pathlib import Path
import json,hashlib,shutil
import numpy as np
from PIL import Image,ImageDraw

root=Path('art/source/enemies/ashfang');out=root/'restart-2026-10-21/references';out.mkdir(parents=True,exist_ok=False)
source=root/'references/pixel-idle.png';image=Image.open(source).convert('RGBA')
outline=[(4,55),(12,36),(29,25),(47,18),(64,12),(75,12),(81,22),(80,31),(90,41),(104,38),(115,35),(113,25),(122,30),(126,20),(142,20),(160,20),(180,27),(199,41),(211,62),(201,60),(191,48),(179,43),(164,43),(154,47),(151,55),(161,64),(171,79),(174,91),(163,93),(162,98),(168,104),(160,109),(141,108),(129,105),(117,108),(105,109),(96,105),(84,110),(71,107),(64,103),(48,103),(31,105),(17,100),(7,95),(5,84),(12,75),(25,73),(39,79),(53,78),(64,68),(71,58),(64,49),(49,52),(38,65),(26,65),(29,52),(19,53),(13,63),(14,50)]
mask=Image.new('L',image.size);ImageDraw.Draw(mask).polygon(outline,fill=255)
image.putalpha(mask);image.save(out/'pixel-idle-reference.png');mask.save(out/'pixel-idle-silhouette-mask.png')
for name in ['ashfang-front-reference.png','ashfang-side-reference.png']:
    shutil.copy2(root/'references'/name,out/name)
board=Image.new('RGB',(1024,460),(35,34,37));d=ImageDraw.Draw(board)
for col,(title,im) in enumerate([('EXACT CARD PIXELS / IDLE',Image.open(source)),('CARD PIXELS / EDITABLE ALPHA',image)]):
    enlarged=im.resize((462,230),Image.Resampling.NEAREST);board.paste(enlarged,(col*512+20,60),enlarged if enlarged.mode=='RGBA' else None);d.text((col*512+20,24),title,fill=(235,210,180))
d.text((20,330),'INPUT REVIEW ONLY / 2x nearest display; no invented pixels, no new dragon render',fill=(230,205,175));d.text((20,352),'The 1024px working reviews will be checked against this pose and the native mobile view.',fill=(210,195,180));board.save(out/'reference-input-review.png')
(out/'references.json').write_text(json.dumps(dict(primary='Original Ashfang card / Pixel Art Concept (Isometric / 2.5D Style) idle pose',source=str(source),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),maskMethod='Authored coarse silhouette; original RGB unchanged; editable polygon',outline=outline,inputs=['pixel-idle-reference.png','ashfang-front-reference.png','ashfang-side-reference.png'],notGeneratedArtwork=True),indent=2)+'\n')
print(out)
