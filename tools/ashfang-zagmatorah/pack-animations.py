"""Pack true directional Blender frames into lossless masters and 256px runtime candidates."""
import argparse,hashlib,json,math,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--input',nargs='+',required=True);p.add_argument('--motions',required=True);p.add_argument('--output',required=True);p.add_argument('--partial',action='store_true');p.add_argument('--verify',action='store_true');a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);specs=json.loads(Path(a.motions).read_text());sources={};header=None
for folder in a.input:
 root=Path(folder);path=root/'render-manifest.json'
 if not path.exists():continue
 m=json.loads(path.read_text());header=header or m
 for k in ('sourceSha256','cell','fps','modelScale','directions'):
  assert m[k]==header[k],('Mismatched render profiles',k)
 assert m.get('cameraCenter',[3.8,0,2.4])==header.get('cameraCenter',[3.8,0,2.4]),'Mismatched camera aim'
 for name,clip in m['clips'].items():assert name not in sources; sources[name]=(root,clip)
assert header and header['cell']==512
expected_dirs=['E','SE','S','SW','W','NW','N','NE'];assert header['directions']==expected_dirs
if not a.partial:assert set(sources)==set(specs['clips']),('Missing clips',set(specs['clips'])-set(sources))
manifest={'schema':'wyrmforge-directional-atlas/1','name':'Ashfang Tier I — animation foundation','creatureId':'ashfang','performanceRevision':specs.get('performanceRevision',1),'rigFamily':'zagmatorah-112/v1','sourceSha256':header['sourceSha256'],'sourceForward':'-X','up':'+Z','directions':expected_dirs,'directionAngles':header['directionAngles'],'fps':12,'sourceFps':24,'cell':256,'masterCell':512,'orthoScaleModelUnits':22,'cameraCenter':header.get('cameraCenter',[3.8,0,2.4]),'cameraElevation':header.get('cameraElevation',35.26438968),'modelScale':header['modelScale'],'complete':not a.partial and len(sources)==len(specs['clips']),'ownerAcceptedMotion':False,'runtimeIntegrated':False,'clips':{}}
if specs.get('performanceRevision',1)>1:manifest['name']='Ashfang | skyward flight and cooling 003' if specs.get('performanceRevision',1)>2 else 'Ashfang | aggressive performance 002'
qa={'sourceHash':header['sourceSha256'],'expectedClips':len(specs['clips']),'clips':{},'files':{},'frames':0,'clippedFrames':[],'emptyFrames':[],'masterPixelChecks':0}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def vector(v,factor):return [round(x*factor,5) for x in v]
for name in specs['clips']:
 if name not in sources:continue
 root,c=sources[name];spec=specs['clips'][name];expected=spec['intervals']//2+(0 if spec['loop'] else 1);assert c['frameCount']==expected,(name,c['frameCount'],expected);assert list(c['directions'])==expected_dirs
 clip={k:c[k] for k in ('fps','loop','duration','travelPerCycle','events','headingChangeDegrees')};clip.update(frames=expected,holdLast=not c['loop'],facings={});clip.update({k:c[k] for k in ('reusedFromSource','reuseProof') if k in c});clip['markers']=[{'name':event,'phase':phase,'seconds':phase*c['duration']} for event,times in c['events'].items() for phase in (times if isinstance(times,list) else [times]) if isinstance(phase,(int,float))];clip['effectWindows']=[{'socket':'mouth','effect':'fire-breath','start':0,'end':1}] if name=='breath_loop' else [{'socket':'mouth','effect':'fire-breath','start':c['events']['vfx_start'],'end':c['events']['vfx_stop']}] if 'vfx_start' in c['events'] else [];clipqa={'directions':{},'frames':expected}
 for direction,records in c['directions'].items():
  assert len(records)==expected;columns=min(8,expected);rows=math.ceil(expected/columns);master_path=out/'master-512'/name/(direction+'.png');runtime_path=out/'runtime-256'/name/(direction+'.png');master_path.parent.mkdir(parents=True,exist_ok=True);runtime_path.parent.mkdir(parents=True,exist_ok=True);master=Image.new('RGBA',(columns*512,rows*512));runtime=Image.new('RGBA',(columns*256,rows*256));frames=[];hashes=[];bounds=[]
  for i,r in enumerate(records):
   path=root/r['path'];im=Image.open(path).convert('RGBA');assert im.size==(512,512);bbox=im.getchannel('A').getbbox();h=hashlib.sha256(im.tobytes()).hexdigest();hashes.append(h);bounds.append(bbox);qa['frames']+=1
   if bbox is None:qa['emptyFrames'].append(str(path));continue
   if min(bbox[:2])<=1 or max(bbox[2:])>=511:qa['clippedFrames'].append(str(path))
   x=(i%columns)*512;y=(i//columns)*512;master.paste(im,(x,y));small=im.resize((256,256),Image.Resampling.LANCZOS);runtime.paste(small,(x//2,y//2));direction2d=r['mouthDirection2D'];length=math.hypot(*direction2d)
   frames.append({'index':i,'sourceFrame':r['sourceFrame'],'time':round((r['sourceFrame']-1)/24,6),'rect':[x//2,y//2,256,256],'masterRect':[x,y,512,512],'pivot':vector(r['pivot'],.5),'attachments':{key:vector(value,.5) for key,value in r['attachments'].items()},'mouthDirection2D':vector(direction2d,1/length if length else 0),'rootMotion':r['rootMotion'],'rootHeight':r['rootHeight'],'magmaLife':r.get('magmaLife',1),'footContacts':r['footContacts'],'masterPixelSha256':h})
  master.save(master_path,compress_level=3);runtime.save(runtime_path,compress_level=3)
  if a.verify:
   saved=Image.open(master_path).convert('RGBA')
   for f in frames:
    x,y,w,h=f['masterRect'];assert hashlib.sha256(saved.crop((x,y,x+w,y+h)).tobytes()).hexdigest()==f['masterPixelSha256'],(name,direction,f['index']);qa['masterPixelChecks']+=1
  clip['facings'][direction]={'image':runtime_path.relative_to(out).as_posix(),'masterImage':master_path.relative_to(out).as_posix(),'columns':columns,'rows':rows,'width':runtime.width,'height':runtime.height,'decodedBytes':runtime.width*runtime.height*4,'frames':frames}
  for path in (master_path,runtime_path):qa['files'][path.relative_to(out).as_posix()]={'sha256':sha(path),'bytes':path.stat().st_size}
  clipqa['directions'][direction]={'uniquePixels':len(set(hashes)),'boundsUnion':[min(v[0] for v in bounds),min(v[1] for v in bounds),max(v[2] for v in bounds),max(v[3] for v in bounds)]};assert len(set(hashes))>1,(name,direction,'static clip')
 manifest['clips'][name]=clip;qa['clips'][name]=clipqa;print('PACKED',name,expected*8,flush=True)
qa['pass']=not qa['clippedFrames'] and not qa['emptyFrames'] and len(qa['clips'])==len(sources) and (a.partial or (len(sources)==41 and qa['frames']==sum((c['intervals']//2+(0 if c['loop'] else 1))*8 for c in specs['clips'].values()))) and (not a.verify or qa['masterPixelChecks']==qa['frames']);assert qa['pass'],qa
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8');(out/'atlas-validation.json').write_text(json.dumps(qa,indent=2),encoding='utf-8')
source_root=Path('art/source/bosses/ashfang');shutil.copyfile(source_root/'ATTRIBUTION.txt',out/'ATTRIBUTION.txt')
profile={'schema':'wyrmforge-animation-foundation/1','rigFamily':manifest['rigFamily'],'units':'source model units; multiply travel and socket offsets by tier/model-to-game scale','locomotion':{name:{'clip':name,'frames':c['frames'],'duration':c['duration'],'stride':c['travelPerCycle'],'phaseSource':'authoritative displacement'} for name,c in manifest['clips'].items() if name in ('walk','stalk','run')},'actions':{name:{'clip':name,'frames':c['frames'],'duration':c['duration'],'fps':12,'sampleFps':12,'mode':'fullBody','loop':c['loop'],'hold':name.startswith('death'),'priority':100 if name.startswith('death') else 80 if name.startswith('hit') or name=='stagger' else 50,'events':c['events'],'markers':c.get('markers',[]),'effectWindows':c.get('effectWindows',[]),'headingChangeDegrees':c['headingChangeDegrees']} for name,c in manifest['clips'].items()},'transitions':[['idle','walk_start','walk','walk_stop','idle'],['idle','run_start','run','run_stop','idle'],['idle','alert_start','alert','alert_end','idle'],['idle','breath_start','breath_loop','breath_end','idle'],['idle','takeoff','fly','land','idle']],'loopHandoffPhase':0,'effects':'Fire, smoke and impacts are separate game VFX. Mouth direction and socket positions are per-frame.','authority':'C# owns movement, damage, ability timing and interruptions. Sprite event markers do not cause gameplay results.','runtimeIntegrated':False}
(out/'animation-profile.json').write_text(json.dumps(profile,indent=2),encoding='utf-8')
template=Path('tools/ashfang-zagmatorah/animation-review.html')
if template.exists():(out/'index.html').write_text(template.read_text(encoding='utf-8').replace('__MANIFEST__',json.dumps(manifest,separators=(',',':'))),encoding='utf-8')
print('ATLAS_PASS',qa['pass'],'clips',len(sources),'frames',qa['frames'],'complete',manifest['complete'],flush=True)
