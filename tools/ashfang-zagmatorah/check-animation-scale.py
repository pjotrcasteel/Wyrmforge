from pathlib import Path
import json,numpy as np,argparse
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--scaled',nargs='+');parser.add_argument('--base',nargs='+');parser.add_argument('--motions',default='art/source/bosses/ashfang/archive/motion-library-008/motions.json');parser.add_argument('--output',default='art/source/bosses/ashfang/reviews/motion-library-008/scale-two-proof.json');args=parser.parse_args();m2={'clips':{},'source':''};roots2={}
for folder in args.scaled or ['artifacts/ashfang/model-scale-2-proof','artifacts/ashfang/model-scale-2-walk-proof']:
 p=Path(folder)/'render-manifest.json'
 if p.exists():
  data=json.loads(p.read_text());m2['source']=data['source'];m2['clips'].update(data['clips']);roots2.update({n:p.parent for n in data['clips']})
source_motions=json.loads(Path(args.motions).read_text());base={}
for folder in args.base or ['artifacts/ashfang/motion-library-008/full-render','artifacts/ashfang/motion-library-008/full-render-b']:
 p=Path(folder)/'render-manifest.json'
 if p.exists():
  for name,c in json.loads(p.read_text())['clips'].items():base[name]=(p.parent,c)
report={'modelScale':2,'source':m2['source'],'clips':{},'allExpectedClipsAvailable':all(n in base for n in m2['clips'])}
for name,c2 in m2['clips'].items():
 if name not in base:continue
 root,c1=base[name];lookup={r['sourceFrame']:r for r in c1['directions']['SE']};checks=[]
 for r2 in c2['directions']['SE']:
  frame=r2['sourceFrame'];r1=lookup.get(frame,lookup[1]);im1=np.array(Image.open(root/r1['path']).convert('RGBA')).astype(float);im2=np.array(Image.open(roots2[name]/r2['path']).convert('RGBA')).astype(float)
  error=float(np.abs(im2-im1).mean());pixel=max(abs(r2['pivot'][i]-r1['pivot'][i]) for i in range(2));attach=max(abs(r2['attachments'][k][i]-r1['attachments'][k][i]) for k in r1['attachments'] for i in range(2));checks.append({'sourceFrame':frame,'meanPixelChannelDifference':error,'pivotPixelError':pixel,'attachmentPixelError':attach,'rootTravelError':abs(r2['rootMotion']-source_motions['clips'][name]['rootMotion'][frame-1]*2)})
 report['clips'][name]=checks
report['pass']=report['allExpectedClipsAvailable'] and set(report['clips'])=={'idle','walk','fly'} and all(v['meanPixelChannelDifference']<.5 and v['pivotPixelError']<.002 and v['attachmentPixelError']<.002 and v['rootTravelError']<.0001 for c in report['clips'].values() for v in c)
Path(args.output).write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
