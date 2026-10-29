"""Reuse only motions proven equal against the previous native source."""
from pathlib import Path
import argparse,json,shutil,copy
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--previous',nargs='+',required=True);p.add_argument('--motions',required=True);p.add_argument('--proof',required=True);p.add_argument('--output',required=True);a=p.parse_args();proof=json.loads(Path(a.proof).read_text());assert proof['pass'] and len(proof['clips'])==30;specs=json.loads(Path(a.motions).read_text());out=Path(a.output);out.mkdir(parents=True,exist_ok=True);manifest=None
for folder in a.previous:
 root=Path(folder);m=json.loads((root/'render-manifest.json').read_text())
 if manifest is None:manifest=copy.deepcopy(m);manifest['clips']={};manifest['sourceSha256']=specs['sha256'];manifest['source']=str(Path(a.motions).parent/'ashfang-animations.blend');manifest['reuseProof']=a.proof
 for name,c in m['clips'].items():
  if name not in proof['clips']:continue
  assert proof['previousSha256']==m['sourceSha256'];assert proof['clips'][name]['maximumVertexComponentError']==0 and proof['clips'][name]['maximumBoneMatrixComponentError']==0
  c=copy.deepcopy(c);c['reusedFromSource']=m['sourceSha256'];c['reuseProof']=a.proof
  for records in c['directions'].values():
   for r in records:
    src=root/r['path'];dst=out/r['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst);r['magmaLife']=1.
  manifest['clips'][name]=c
assert set(manifest['clips'])==set(proof['clips']);(out/'render-manifest.json').write_text(json.dumps(manifest,indent=2));print('REUSED',len(manifest['clips']),'clips with exact evaluated-pose proof')
