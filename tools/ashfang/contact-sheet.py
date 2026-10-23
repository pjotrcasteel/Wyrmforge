"""Build a labeled QA contact sheet from completed review renders, not sprites."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

p=argparse.ArgumentParser()
p.add_argument('--review',required=True)
p.add_argument('--output',required=True)
a=p.parse_args()
source=Path(a.review)
out=Path(a.output)
if out.exists(): raise SystemExit('Refusing to replace review evidence')
files=sorted(source.glob('*.png'))
if not files: raise SystemExit('No review renders')
cell=300
board=Image.new('RGBA',(cell*5,((len(files)+4)//5)*(cell+24)),(40,39,39,255))
draw=ImageDraw.Draw(board)
for i,file in enumerate(files):
    im=Image.open(file).convert('RGBA')
    im.thumbnail((cell,cell),Image.Resampling.LANCZOS)
    x=(i%5)*cell;y=(i//5)*(cell+24)
    draw.text((x+8,y+5),file.stem,fill=(230,224,214))
    board.alpha_composite(im,(x+(cell-im.width)//2,y+24+(cell-im.height)//2))
out.parent.mkdir(parents=True,exist_ok=True)
board.save(out)
print(out)
