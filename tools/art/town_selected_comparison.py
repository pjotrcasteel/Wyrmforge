"""Compare exact owner references with genuine browser GPU frames; no generated imagery."""
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
SELECTED=ROOT/'src/Wyrmforge.Presentation.Web/wwwroot/art/town/selected/2026-10-27'

def build(folder,output):
 manifest=json.loads((SELECTED/'manifest.json').read_text())
 width=640; height=360; header=53
 domains=['common','nexus','blacksmith','codex','hall']
 board=Image.new('RGB',(width*2,(height+header)*len(domains)),(10,10,12));draw=ImageDraw.Draw(board)
 record={'description':'Exact selected reference LEFT; genuine shared-WebGL screenshot RIGHT. Display-scaled, not pixel-registered.', 'visualApproval':False,'rows':[]}
 for i,domain in enumerate(domains):
  source=next(x for x in manifest['images'] if x['role']==domain)
  raw=folder/f'domain-{domain}-1120.png'
  diagnostic=json.loads(raw.with_suffix('.json').read_text())
  y=i*(height+header)
  draw.text((10,y+7),f'OWNER {domain} | {source["file"]}',fill='white')
  draw.text((10,y+25),'SHA256 '+source['sha256'][:24]+'... | 1536x864 JPEG',fill=(180,180,180))
  draw.text((width+10,y+7),f'GPU {domain} | 1672x941 framebuffer / 1120px viewport',fill='white')
  draw.text((width+10,y+25),'SwiftShader; actual LightingEngine | NOT visual sign-off',fill=(230,180,120))
  with Image.open(SELECTED/source['file']) as image: board.paste(image.convert('RGB').resize((width,height),Image.Resampling.LANCZOS),(0,y+header))
  with Image.open(raw) as image:
   crop=image.convert('RGB').crop((0,0,image.width,round(image.width*941/1672)))
   board.paste(crop.resize((width,height),Image.Resampling.LANCZOS),(width,y+header))
  record['rows'].append({'domain':domain,'reference':source,'gpu':diagnostic,'png':str(raw.resolve().relative_to(ROOT))})
 output.parent.mkdir(parents=True,exist_ok=True)
 board.save(output,quality=90)
 # Phone-friendly T2 review: reference above, real GPU below, identical aspect.
 # This only labels/crops a browser screenshot; it never recolors rendered pixels.
 font=ImageFont.truetype('DejaVuSans.ttf',18)
 common=record['rows'][0]; stack=Image.new('RGB',(960,1160),(10,10,12)); labels=ImageDraw.Draw(stack)
 labels.text((14,8),'YOUR SELECTED COMMON REFERENCE',font=font,fill='white')
 with Image.open(SELECTED/common['reference']['file']) as frame:
  stack.paste(frame.convert('RGB').resize((960,540),Image.Resampling.LANCZOS),(0,35))
 labels.text((14,585),'ACTUAL SHARED GPU | public lights only | chimney OFF',font=font,fill='white')
 with Image.open(folder/'domain-common-1120.png') as frame:
  stack.paste(frame.convert('RGB').crop((0,0,1120,630)).resize((960,540),Image.Resampling.LANCZOS),(0,620))
 stack.save(output.with_name('town-selected-common-soft-pools-2026-10-27.jpg'),quality=92)
 output.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n')
 print(output)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('folder',type=Path);p.add_argument('output',type=Path);a=p.parse_args();build(a.folder,a.output)
