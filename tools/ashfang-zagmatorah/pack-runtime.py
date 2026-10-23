"""Crop native fine pixels into bounded runtime atlases; never resample artwork."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil
root=Path('art/source/bosses/ashfang');out=root/'exports/runtime-001';out.mkdir(parents=True,exist_ok=True)
proof=json.loads((root/'exports/pixel-proof-002/manifest.json').read_text());render=Path('artifacts/ashfang/runtime-001');m=json.loads((render/'render-manifest.json').read_text());palette={tuple(bytes.fromhex(c)) for c in proof['palette']};manifest={'schema':'ashfang-runtime/1','worldCell':json.loads((root/'tier-I-scale-baseline.json').read_text())['worldCell'],'cell':512,'tierIRadius':60,'directions':list(proof['variants']['fine']['clips']['idle']['facings']),'fps':12,'clips':{},'source':'pixel-style-002 / motion-library-018','palette':proof['palette']};qa={'frames':0,'binaryAlpha':True,'palette':True,'unclipped':True,'files':{}}
clips={k:(v,'proof') for k,v in proof['variants']['fine']['clips'].items()};clips.update({k:(v,'render') for k,v in m['clips'].items()})
for name,(c,origin) in clips.items():
 spec={'duration':c['duration'],'loop':c['loop'],'facings':{}}
 directions=c['facings'] if origin=='proof' else c['directions']
 for direction,data in directions.items():
  frames=data['frames'] if origin=='proof' else data;images=[];records=[];source=Image.open(root/'exports/pixel-proof-002'/data['image']).convert('RGBA') if origin=='proof' else None
  for f in frames:
   if origin=='proof':
    x,y,w,h=f['rect'];im=source.crop((x,y,x+w,y+h))
   else:im=Image.open(render/f['path']).convert('RGBA')
   assert im.size==(512,512);assert set(im.getchannel('A').getdata())<={0,255};assert {p[:3] for p in im.getdata() if p[3]}<=palette
   bb=im.getbbox();assert bb and min(bb[:2])>0 and max(bb[2:])<512,(name,direction,bb)
   crop=im.crop(bb);images.append(crop);records.append({'pivot':[round(f['pivot'][0]-bb[0],4),round(f['pivot'][1]-bb[1],4)],'mouth':[round(f['attachments']['mouth'][0]-bb[0],4),round(f['attachments']['mouth'][1]-bb[1],4)],'sourceFrame':f['sourceFrame'],'sha256':hashlib.sha256(crop.tobytes()).hexdigest()});qa['frames']+=1
  placements=[];x=y=row=0
  for im in images:
   if x+im.width>2048:x=0;y+=row;row=0
   placements.append([x,y,im.width,im.height]);x+=im.width;row=max(row,im.height)
  atlas=Image.new('RGBA',(min(2048,max(x+w for x,y,w,h in placements)),y+row))
  assert atlas.height<=8192
  for im,rect,f in zip(images,placements,records):atlas.paste(im,rect[:2]);f['rect']=rect
  path=out/name/(direction+'.png');path.parent.mkdir(parents=True,exist_ok=True);atlas.save(path,optimize=True)
  check=Image.open(path).convert('RGBA')
  for f in records:
   x,y,w,h=f['rect'];assert hashlib.sha256(check.crop((x,y,x+w,y+h)).tobytes()).hexdigest()==f['sha256']
  digest=hashlib.sha256(path.read_bytes()).hexdigest();qa['files'][path.relative_to(out).as_posix()]=digest;spec['facings'][direction]={'image':path.relative_to(out).as_posix(),'hash':digest,'width':atlas.width,'height':atlas.height,'frames':records}
 manifest['clips'][name]=spec
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')));qa['pass']=True;(out/'validation.json').write_text(json.dumps(qa,indent=2));shutil.copyfile(root/'ATTRIBUTION.txt',out/'ATTRIBUTION.txt')
web=Path('src/Wyrmforge.Presentation.Web/wwwroot/art/ashfang/runtime-001');shutil.copytree(out,web,dirs_exist_ok=True)
print('RUNTIME_PACK_PASS',qa['frames'],len(qa['files']))
