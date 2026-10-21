"""Own-source comparison plus optional private local Hunt screenshot composite."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
base=Path('art/source/enemies/ashfang/model/local-appearance-001')
old=base/'rigged-block-v37/silhouette-review-v1';new=base/'rigged-block-v41-stance/silhouette-review-v1'
board=Image.new('RGB',(880,470),(38,39,43));draw=ImageDraw.Draw(board)
for col,(title,folder) in enumerate([('Rejected V37',old),('V41 anatomy WIP',new)]):
    draw.text((col*440+14,12),title+' / same camera and density',fill=(225,210,185))
    for row,mode in enumerate((1,2)):
        image=Image.open(folder/f'game-{mode}.png').convert('RGBA')
        # Shared crop and exact 2x nearest view, explicitly labelled inspection.
        cut=image.crop((65,45,205,195)).resize((280,300),Image.Resampling.NEAREST)
        if row==0:board.paste(cut,(col*440+10,40),cut)
        else:board.paste(image,(col*440+190,165),image)
    draw.text((col*440+16,350),'Clay: 2x inspection',fill=(200,190,175))
    draw.text((col*440+202,425),'Texture: native pixels',fill=(200,190,175))
board.save(new/'before-after.png')
reference=Path('art/source/enemies/ashfang/references/current-hunt-viewport-2026-10-21.png')
if reference.exists():
    private=base/'rigged-block-v41-stance/hunt-fit-review-v1';private.mkdir(exist_ok=False)
    background=Image.open(reference).convert('RGBA').crop((40,4,480,959))
    original=background.copy();sprite=Image.open(new/'game-2.png').convert('RGBA')
    background.alpha_composite(sprite,(22,248));background.convert('RGB').save(private/'native-player-fit.png')
    assert background.crop((200,436,243,502)).tobytes()==original.crop((200,436,243,502)).tobytes()
    (private/'review.json').write_text(json.dumps(dict(referenceOnly=True,liveGameplay=False,playerPixelsUnchanged=True,sourcePasteXY=[22,248],spriteRescaled=False,viewport=[440,955]),indent=2)+'\n')
print(new/'before-after.png')
