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
    count=clip['frames'];grid=clip.get('poseGrid');crop=(16,12,80,84) if grid else (0,0,96,96);columns=min(count,32);rows=math.ceil(count/columns);width,height=crop[2]-crop[0],crop[3]-crop[1]
    atlas=Image.new('RGBA',(width*columns,height*rows*8));hashes=[]
    for row,direction in enumerate(directions):
        frames=[]
        for frame in range(count):
            file=source/'frames'/name/direction/f'{frame:02d}.png'
            with Image.open(file) as image:
                image=image.convert('RGBA');assert image.size==(96,96),(file,image.size)
                box=image.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<96,('clipped atlas',file,box)
                assert crop[0]<=box[0] and crop[1]<=box[1] and crop[2]>=box[2] and crop[3]>=box[3],('crop would clip source',file,box,crop)
                cropped=image.crop(crop);frames.append(image.copy());atlas.alpha_composite(cropped,((frame%columns)*width,(row*rows+frame//columns)*height))
        hashes.append(hashlib.sha256(b''.join(i.tobytes() for i in frames)).hexdigest())
    assert len(set(hashes))==8,('identical labelled facings',name,hashes)
    filename=name+'.png';atlas.save(out/filename)
    clips[name]={'image':filename,'sha256':hashlib.sha256((out/filename).read_bytes()).hexdigest(),'frames':count,'cell':96,'columns':columns,'crop':list(crop),'anchor':[48,72],'worldSize':93,'reviewLightingOnly':True}
    row_hashes[name]=hashes

def runtime_clip(name):
    c=m['clips'][name];samples=[]
    for s in c['samples']:
        angle=s.get('authoredYawRadians',0);cos,sin=math.cos(angle),math.sin(angle)
        contacts=[]
        for q in s['contacts']:
            x=q['x']*cos-q['y']*sin;y=q['x']*sin+q['y']*cos
            contacts.append({'id':q['id'],'x':-y*scale,'y':x*scale})
        cx,cy=s['com'];com=[-(cx*sin+cy*cos)*scale,(cx*cos-cy*sin)*scale]
        samples.append({'contacts':contacts,'balance':s['balance'],'com':com,'supportMarginMetres':s['supportMargin']})
    result={'clip':name,'frames':c['frames'],'fps':c['fps'],'samples':samples}
    if c.get('poseGrid'):result['poseGrid']={**c['poseGrid'],'travel':'facing-projection','stanceVelocity':{'x':-c['strideMetres']*scale,'y':0}}
    return result
profile={'schemaVersion':2,'coordinateSpace':'actor-xy-ground-z-up','unitsPerPixel':93/96,'maxRootOffset':93/96,
 'rig':{'sourceSpace':{'coordinateSpace':'blender-armature-xyz-metres','toActor':[0,-scale,0,0,scale,0,0,0,0,0,scale,.5*scale,0,0,0,1]},'bodyPlan':'biped','bones':m['skeleton'],'semantics':{'root':'root','pelvis':'pelvis','spine':'spine','head':'head'},'absentBones':[],
 'contacts':[{'id':'foot-'+side,'bone':'foot.'+side,'surface':'foot',**({'chain':next(c for c in m['contactChains'] if c['id']=='foot-'+side)} if m.get('contactChains') else {})} for side in ['L','R']],
 'sockets':{'head':{'bone':'head'},'mouth':{'bone':'head'},'wound':{'bone':'chest'}}},
 'facing':{'directions':['E','SE','S','SW','W','NW','N','NE']},
 'locomotion':{**runtime_clip('walk'),'stride':m['clips']['walk']['strideMetres']*scale},
 'actions':{'attack':{**runtime_clip('attack'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':8,'visualTimingOnly':True}},
 'pivot':runtime_clip('pivot')}
if 'pivot-negative' in m['clips']:
    profile['pivots']={'positive':runtime_clip('pivot'),'negative':runtime_clip('pivot-negative')}
if 'attack-travel' in m['clips']:
    profile['actions']['attack']={**runtime_clip('attack-travel'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':128,'visualTimingOnly':True}
    clips.pop('attack',None)
    row_hashes.pop('attack',None)
(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n')
manifest={'schemaVersion':2,'candidateNotApproved':True,'productionReady':False,'reviewLightingOnly':True,'runtimeIntegrated':False,'directions':directions,'clips':clips,'sourceSignature':m['skeletonSignature'],'rowSha256':row_hashes,'sourceQC':m['clips'],'materialGate':'aligned unlit albedo/normal/depth/emissive export and actual Hunt GPU acceptance open'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'atlasBytes':sum((out/v['image']).stat().st_size for v in clips.values()),'eightDistinctRows':list(row_hashes),'gpuProductionReady':False}))
