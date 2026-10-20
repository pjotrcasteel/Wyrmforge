"""Original Ashfang card pixels with explicitly authored silhouette masks."""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];card=root/'user_handover_files/concepts/Fire/10-ashfang-the-cinder-wyrm.png';out=root/'art/source/enemies/ashfang/references';out.mkdir(parents=True,exist_ok=True)
im=Image.open(card).convert('RGB');records=[]
specs=[('front',(17,885,245,1078),[(0,48),(19,36),(36,20),(55,14),(61,3),(61,19),(45,39),(65,59),(77,53),(81,26),(89,58),(100,45),(101,20),(109,54),(121,34),(126,56),(137,40),(142,58),(160,39),(142,24),(135,15),(129,3),(145,15),(162,20),(183,28),(196,34),(209,48),(220,71),(227,100),(226,127),(218,107),(212,86),(201,73),(200,100),(192,93),(185,100),(178,92),(171,109),(168,138),(183,153),(186,174),(204,175),(213,187),(183,190),(158,187),(137,188),(125,179),(134,164),(144,157),(130,146),(115,150),(103,147),(91,158),(89,177),(100,188),(67,191),(43,187),(22,190),(10,186),(20,176),(29,160),(43,147),(51,134),(50,111),(40,100),(32,107),(26,95),(20,100),(17,86),(9,96),(5,112),(0,131)]),
('side',(247,886,533,1078),[(0,78),(11,58),(26,35),(21,55),(42,36),(60,27),(79,7),(101,1),(146,1),(204,2),(248,9),(269,17),(238,12),(218,18),(217,32),(225,42),(209,39),(199,42),(199,57),(211,69),(187,62),(171,72),(169,86),(183,101),(162,92),(151,101),(165,114),(186,104),(173,119),(192,121),(207,139),(226,136),(222,148),(247,149),(262,153),(281,166),(283,178),(273,185),(245,187),(216,184),(203,178),(166,181),(143,186),(123,185),(125,171),(119,160),(104,154),(96,159),(93,178),(77,184),(46,181),(46,174),(57,166),(61,152),(52,144),(43,144),(35,162),(27,175),(14,179),(1,177),(6,165),(17,161),(31,137),(44,111),(32,93),(19,90),(13,105),(7,96),(3,113),(0,101)])]
for name,box,outline in specs:
    crop=im.crop(box);mask=Image.new('L',crop.size);draw=ImageDraw.Draw(mask);draw.polygon(outline,fill=255)
    # Genuine space between paired forelegs is not part of the body.
    if name=='front':draw.polygon([(98,152),(115,155),(132,151),(127,165),(124,177),(108,182),(99,175)],fill=0)
    if name=='side':
        draw.polygon([(45,152),(52,150),(54,158),(47,172),(34,174)],fill=0)
        draw.polygon([(96,166),(104,163),(112,168),(117,180),(99,179)],fill=0)
    rgba=crop.convert('RGBA');rgba.putalpha(mask);rgba.save(out/f'ashfang-{name}-reference.png');crop.save(out/f'{name}-card-crop.png');mask.save(out/f'{name}-silhouette-mask.png')
    records.append(dict(name=name,crop=box,reference=f'ashfang-{name}-reference.png',method='original card pixels and authored silhouette alpha; no redraw or resampling'))
(out/'extraction.json').write_text(json.dumps(dict(source=str(card.relative_to(root)),sha256=hashlib.sha256(card.read_bytes()).hexdigest(),views=records),indent=2)+'\n');print('Saved original front/side source cutouts; inspect before inference')
