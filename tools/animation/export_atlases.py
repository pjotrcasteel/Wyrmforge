"""Pack only actually rendered facings; fail closed on missing/clipped/duplicate rows.

python tools/animation/export_atlases.py artifacts/animation-v2 --out <asset-directory>
Source-lit PNGs are REVIEW only. GPU production readiness requires aligned
albedo/normal/depth/material passes and actual Hunt renderer validation.
"""
from pathlib import Path
import argparse,json,hashlib,math
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--out',required=True);a=p.parse_args()
source=Path(a.source);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
m=json.loads((source/'source-manifest.json').read_text());directions=m['directions'];scale=93/1.55
clips={};row_hashes={}
for name,clip in m['clips'].items():
    atlas=Image.new('RGBA',(96*16,96*8));hashes=[]
    for row,direction in enumerate(directions):
        frames=[]
        for frame in range(16):
            file=source/'frames'/name/direction/f'{frame:02d}.png'
            with Image.open(file) as image:
                image=image.convert('RGBA');assert image.size==(96,96),(file,image.size)
                box=image.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<96,('clipped atlas',file,box)
                frames.append(image.copy());atlas.alpha_composite(image,(frame*96,row*96))
        hashes.append(hashlib.sha256(b''.join(i.tobytes() for i in frames)).hexdigest())
    assert len(set(hashes))==8,('identical labelled facings',name,hashes)
    filename=name+'.png';atlas.save(out/filename)
    clips[name]={'image':filename,'sha256':hashlib.sha256((out/filename).read_bytes()).hexdigest(),'frames':16,'cell':96,'anchor':[48,72],'worldSize':93,'reviewLightingOnly':True}
    row_hashes[name]=hashes

def runtime_clip(name):
    c=m['clips'][name];samples=[]
    for s in c['samples']:
        angle=s.get('authoredYawRadians',0);cos,sin=math.cos(angle),math.sin(angle)
        contacts=[]
        for q in s['contacts']:
            x=q['x']*cos-q['y']*sin;y=q['x']*sin+q['y']*cos
            contacts.append({'id':q['id'],'x':-y*scale,'y':x*scale})
        samples.append({'contacts':contacts,'balance':s['balance'],'com':s['com'],'supportMarginMetres':s['supportMargin']})
    return {'clip':name,'frames':16,'fps':12,'samples':samples}
profile={'schemaVersion':2,'coordinateSpace':'actor-xy-ground-z-up','unitsPerPixel':93/96,'maxRootOffset':93/96,
 'rig':{'bodyPlan':'biped','bones':m['skeleton'],'semantics':{'root':'root','pelvis':'pelvis','spine':'spine','head':'head'},'absentBones':[],
 'contacts':[{'id':'foot-'+side,'bone':'foot.'+side,'surface':'foot'} for side in ['L','R']],
 'sockets':{'head':{'bone':'head'},'mouth':{'bone':'head'},'wound':{'bone':'chest'}}},
 'facing':{'directions':['E','SE','S','SW','W','NW','N','NE']},
 'locomotion':{**runtime_clip('walk'),'stride':m['clips']['walk']['strideMetres']*scale},
 'actions':{'attack':{**runtime_clip('attack'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':8,'visualTimingOnly':True}},
 'pivot':runtime_clip('pivot')}
(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n')
manifest={'schemaVersion':2,'candidateNotApproved':True,'productionReady':False,'reviewLightingOnly':True,'runtimeIntegrated':False,'directions':directions,'clips':clips,'sourceSignature':m['skeletonSignature'],'rowSha256':row_hashes,'sourceQC':m['clips'],'materialGate':'aligned unlit albedo/normal/depth/emissive export and actual Hunt GPU acceptance open'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'atlasBytes':sum((out/v['image']).stat().st_size for v in clips.values()),'eightDistinctRows':list(row_hashes),'gpuProductionReady':False}))
