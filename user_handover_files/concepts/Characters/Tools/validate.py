"""Validate all delivered assets. Requires Pillow; --editor enables independent editor checks."""
from pathlib import Path
import argparse,json,struct,subprocess,hashlib,tempfile
from PIL import Image,ImageChops
from native_reader import read,composite
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--editor');args=parser.parse_args();index=json.loads((ROOT/'runtime-index.json').read_text());records=[];images=0;empty=[];edges=[]
 for p in ROOT.rglob('*.png'):
  with Image.open(p) as im:im.verify()
  images+=1
 masters={e['aseprite']:e for e in index['entities']}
 with tempfile.TemporaryDirectory() as td:
  for p in sorted(ROOT.rglob('*.aseprite')):
   rel=p.relative_to(ROOT).as_posix();raw=p.read_bytes();size,magic,n=struct.unpack_from('<IHH',raw);assert size==len(raw) and magic==0xA5E0,(rel,'header')
   record={'file':rel,'frames':n,'sha256':hashlib.sha256(raw).hexdigest(),'editorOpen':False}
   if args.editor:
    target=Path(td)/'editor.json';sheet=Path(td)/'editor.png';cmd=[args.editor,'-b',str(p),'--list-tags','--list-layers','--format','json-array','--data',str(target)]
    if rel in masters:cmd+=['--sheet-width',str(masters[rel]['canvas'][0]*18),'--sheet',str(sheet)]
    result=subprocess.run(cmd,capture_output=True,text=True,timeout=180);assert result.returncode==0,(rel,result.stderr)
    ed=json.loads(target.read_text());assert len(ed['frames'])==n;record['editorOpen']=True
   if rel in masters:
    entity=masters[rel];doc=read(p);record['tags']=len(doc['tags']);record['maxEditorRgbDelta']=0
    native=[composite(doc,f) for f in doc['frames']]
    if args.editor:export=Image.open(sheet).convert('RGBA')
    for i,im in enumerate(native):
     box=im.getbbox()
     if not box:empty.append([rel,i])
     elif box[0]==0 or box[1]==0 or box[2]==im.width or box[3]==im.height:edges.append([rel,i])
     if args.editor:
      ef=ed['frames'][i];r=ef['frame'];actual=export.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));assert actual.getchannel('A').tobytes()==im.getchannel('A').tobytes();diff=ImageChops.difference(actual,im);delta=max(v[1] for v in diff.getextrema());assert delta<=1,(rel,i,delta);record['maxEditorRgbDelta']=max(record['maxEditorRgbDelta'],delta);assert ef['duration']==doc['frames'][i]['duration']
    for action,clip in entity['actions'].items():
     atlas=Image.open(ROOT/clip['image']).convert('RGBA');w,h=entity['canvas'];assert atlas.size==(w*clip['framesPerDirection'],h*8)
     for row,direction in enumerate(index['directions']):
      c=clip['directions'][direction];assert 0<=c['fromFrame']<=c['toFrame']<len(native);assert len(c['durationsMs'])==clip['framesPerDirection']
      for col,fi in enumerate(range(c['fromFrame'],c['toFrame']+1)):
       assert atlas.crop((col*w,row*h,(col+1)*w,(row+1)*h)).tobytes()==native[fi].tobytes(),(rel,action,direction,col)
   records.append(record)
 assert not empty and not edges,(empty,edges)
 original=json.loads((ROOT/'Validation/original-source-hashes.json').read_text());assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in original.items())
 report={'structuralPass':True,'asepriteFiles':len(records),'primaryMasters':len(masters),'masterFrames':sum(r['frames'] for r in records if r['file'] in masters),'masterClips':sum(r.get('tags',0) for r in records),'pngFilesDecoded':images,'emptyFrames':empty,'edgeTouchFrames':edges,'originalSourceHashesVerified':len(original),'allEditorOpen':bool(args.editor) and all(r['editorOpen'] for r in records),'files':records,'limitations':['Not in-game validation','Does not automatically certify anatomical or directional drawing quality','Standalone browser launch unavailable in the execution environment; viewer data and image references were checked']}
 (ROOT/'Validation/final-sanitizer.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
if __name__=='__main__':main()
