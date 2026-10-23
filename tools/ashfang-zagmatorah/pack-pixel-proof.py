"""Pack native pixel renders without resampling; validate every source pixel and color."""
from pathlib import Path
import json,argparse,hashlib,shutil,math
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);base=Path('artifacts/ashfang/pixel-style-001');style=json.loads(Path('art/source/bosses/ashfang/archive/pixel-style-001/style.json').read_text());allowed={tuple(bytes.fromhex(c)) for c in style['palette']};manifest={'status':'bounded-style-proof','ownerAccepted':False,'runtimeIntegrated':False,'worldCell':256,'fps':12,'source':'foundation003 / motion-library-018','variants':{},'palette':style['palette']};qa={'pass':False,'frames':0,'masterPixelChecks':0,'nativeColors':set(),'binaryAlpha':True,'clippedFrames':[],'files':{}}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for variant,folder in [('bold','full'),('fine','fine')]:
 root=base/folder;m=json.loads((root/'render-manifest.json').read_text());v={'cell':m['cell'],'clips':{}}
 for name,c in m['clips'].items():
  spec={'frames':c['frameCount'],'duration':c['duration'],'loop':c['loop'],'facings':{}}
  for d,records in c['directions'].items():
   n=m['cell'];columns=8;atlas=Image.new('RGBA',(columns*n,math.ceil(len(records)/columns)*n));frames=[]
   for i,r in enumerate(records):
    im=Image.open(root/r['path']).convert('RGBA');assert im.size==(n,n);alpha=set(im.getchannel('A').getdata());assert alpha<={0,255};colors={rgb[:3] for rgb in im.getdata() if rgb[3]};assert colors<=allowed,(variant,name,d,colors-allowed);qa['nativeColors'].update(colors);bb=im.getbbox();assert bb
    if min(bb[:2])<1 or max(bb[2:])>n-1:qa['clippedFrames'].append([variant,name,d,i])
    x=i%columns*n;y=i//columns*n;atlas.paste(im,(x,y));frames.append({'rect':[x,y,n,n],'pivot':r['pivot'],'sourceFrame':r['sourceFrame'],'alphaBounds':list(bb),'rootHeight':r['rootHeight'],'attachments':r['attachments'],'sha256':hashlib.sha256(im.tobytes()).hexdigest()});qa['frames']+=1
   path=out/variant/name/(d+'.png');path.parent.mkdir(parents=True,exist_ok=True);atlas.save(path);saved=Image.open(path).convert('RGBA')
   for f in frames:
    x,y,w,h=f['rect'];assert hashlib.sha256(saved.crop((x,y,x+w,y+h)).tobytes()).hexdigest()==f['sha256'];qa['masterPixelChecks']+=1
   qa['files'][path.relative_to(out).as_posix()]=sha(path);spec['facings'][d]={'image':path.relative_to(out).as_posix(),'frames':frames}
  v['clips'][name]=spec
 assert set(v['clips'])=={'idle','claw_right','fly','roar'};manifest['variants'][variant]=v
old=Path('art/source/bosses/ashfang/exports/motion-foundation-003');m=json.loads((old/'manifest.json').read_text());v={'cell':256,'clips':{}}
for name in ('idle','claw_right','fly','roar'):
 c=m['clips'][name];spec={'frames':c['frames'],'duration':c['duration'],'loop':c['loop'],'facings':{}}
 for d,f in c['facings'].items():
  path=out/'source'/name/(d+'.png');path.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(old/f['image'],path);qa['files'][path.relative_to(out).as_posix()]=sha(path);spec['facings'][d]={'image':path.relative_to(out).as_posix(),'frames':[{**r,'rect':r['rect']} for r in f['frames']]}
 v['clips'][name]=spec
manifest['variants']['source']=v;qa['nativeColors']=[list(c) for c in sorted(qa['nativeColors'])];qa['pass']=not qa['clippedFrames'] and qa['frames']==1632 and qa['masterPixelChecks']==1632;assert qa['pass'];(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8');(out/'validation.json').write_text(json.dumps(qa,indent=2),encoding='utf-8');shutil.copyfile('art/source/bosses/ashfang/ATTRIBUTION.txt',out/'ATTRIBUTION.txt');print('PIXEL_PROOF_PASS',qa['frames'],'frames',len(qa['nativeColors']),'colors')
