import argparse,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args();root=Path(a.input);out=Path(a.output);out.mkdir(parents=True,exist_ok=True);m=json.loads((root/'render-manifest.json').read_text());qa={}
for name,clip in m['clips'].items():
 direction=next(iter(clip['directions']));records=clip['directions'][direction];images=[];bounds=[]
 for record in records:
  im=Image.open(root/record['path']).convert('RGBA');bounds.append(im.getbbox());bg=Image.new('RGBA',im.size,(38,44,52,255));bg.alpha_composite(im);ImageDraw.Draw(bg).text((12,12),f'{name} - {direction} - {record["frame"]+1}/{len(records)}',fill='white');images.append(bg.convert('RGB'))
 images[0].save(out/(name+'.gif'),save_all=True,append_images=images[1:],duration=round(1000/12),loop=0,disposal=2)
 # Full frames preserve a common scale; crops below are labeled detail inspection only.
 tile=256;cols=6;sheet=Image.new('RGB',(cols*tile,math.ceil(len(images)/cols)*tile),(38,44,52))
 union=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds));margin=8;crop=(max(0,union[0]-margin),max(0,union[1]-margin),min(m['cell'],union[2]+margin),min(m['cell'],union[3]+margin))
 for i,im in enumerate(images):
  detail=im.crop(crop);detail.thumbnail((tile,tile-20));x=(i%cols)*tile;y=(i//cols)*tile;sheet.paste(detail,(x+(tile-detail.width)//2,y+20));ImageDraw.Draw(sheet).text((x+6,y+3),str(i),fill='white')
 sheet.save(out/(name+'-contact.jpg'));qa[name]={'frames':len(images),'uniqueFrames':len({Image.open(root/r['path']).tobytes() for r in records}),'bounds':bounds,'clipped':any(b[0]<=1 or b[1]<=1 or b[2]>=m['cell']-1 or b[3]>=m['cell']-1 for b in bounds)}
(out/'preview-qa.json').write_text(json.dumps(qa,indent=2));print(qa)
