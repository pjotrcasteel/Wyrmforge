"""Pack only actually rendered facings; fail closed on missing/clipped/duplicate rows.

python tools/animation/export_atlases.py artifacts/animation-v2 --out <asset-directory>
Source-lit PNGs are REVIEW only. GPU production readiness requires aligned
albedo/normal/depth/material passes and actual Hunt renderer validation.
"""
from pathlib import Path
import argparse,json,hashlib,math
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--out',required=True);p.add_argument('--full-cells',action='store_true');a=p.parse_args()
source=Path(a.source);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
m=json.loads((source/'source-manifest.json').read_text());directions=m['directions'];scale=93/1.55
clips={};row_hashes={}
for name,clip in m['clips'].items():
    count=clip['frames'];grid=clip.get('poseGrid');crop=(16,12,80,84) if grid and not a.full_cells else (0,0,96,96);columns=min(count,32);rows=math.ceil(count/columns);width,height=crop[2]-crop[0],crop[3]-crop[1]
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
    if name.startswith('pivot'):result['facingStep']=-round((c['samples'][-1].get('authoredYawRadians',0)-c['samples'][0].get('authoredYawRadians',0))/(math.pi/4))
    if c.get('poseGrid'):result['poseGrid']={**c['poseGrid'],'travel':'facing-projection','stanceVelocity':{'x':-c['strideMetres']*scale,'y':0}}
    if m.get('projectionByDirection'):
        pixel_scale=93/96;projected={}
        def ground_point(point,projection):
            x,y,z=point
            return [(projection[0]*x+projection[1]*y+projection[2]*z+projection[3]-48)*pixel_scale,
                    (projection[4]*x+projection[5]*y+projection[6]*z+projection[7]-72)*pixel_scale]
        for direction,projection in m['projectionByDirection'].items():
            views=[]
            for sample in c['samples']:
                angle=sample.get('authoredYawRadians',0);co,si=math.cos(angle),math.sin(angle)
                contacts=[]
                for q in sample['contacts']:
                    xy=ground_point((q['x']*co-q['y']*si,q['x']*si+q['y']*co,q['z']),projection)
                    contacts.append({'id':q['id'],'x':xy[0],'y':xy[1]})
                cx,cy=sample['com'];com=ground_point((cx*co-cy*si,cx*si+cy*co,-.5),projection)
                views.append({'contacts':contacts,'com':com,'balance':sample['balance'],'supportMarginMetres':sample['supportMargin']})
            projected[direction]=views
        result['facingSamples']=projected;result['samples']=projected['E'];result['contactSpace']='projected-world-offset'
        if c['strideMetres']>0:
            result['strideByDirection']={d:math.hypot(p[1],p[5])*c['strideMetres']*pixel_scale for d,p in m['projectionByDirection'].items()}
        if name=='walk':
            result['phaseSampling']='nearest'
            result['stanceVelocityByDirection']={d:{'x':p[1]*c['strideMetres']*pixel_scale,'y':p[5]*c['strideMetres']*pixel_scale} for d,p in m['projectionByDirection'].items()}
        if c.get('poseGrid'):
            result['poseGrid']['stanceVelocityByDirection']={d:{'x':p[1]*c['strideMetres']*pixel_scale,'y':p[5]*c['strideMetres']*pixel_scale} for d,p in m['projectionByDirection'].items()}
    return result
profile={'schemaVersion':2,'coordinateSpace':'actor-xy-ground-z-up','unitsPerPixel':93/96,'maxRootOffset':93/96,
 'rig':{'signature':m['skeletonSignature'],'sourceSpace':{'coordinateSpace':'blender-armature-xyz-metres','toActor':[0,-scale,0,0,scale,0,0,0,0,0,scale,.5*scale,0,0,0,1]},'bodyPlan':'biped','bones':m['skeleton'],'semantics':{'root':'root','pelvis':'pelvis','spine':'spine','head':'head'},'absentBones':[],
 'contacts':[{'id':'foot-'+side,'bone':'foot.'+side,'surface':'foot',**({'chain':next(c for c in m['contactChains'] if c['id']=='foot-'+side)} if m.get('contactChains') else {})} for side in ['L','R']],
 'sockets':{'head':{'bone':'head'},'mouth':{'bone':'head'},'wound':{'bone':'chest'}}},
 'facing':{'directions':['E','SE','S','SW','W','NW','N','NE']},
 'locomotion':{**runtime_clip('walk'),'stride':m['clips']['walk']['strideMetres']*scale},
 'actions':{'attack':{**runtime_clip('attack'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':8,'visualTimingOnly':True}},
 'pivot':runtime_clip('pivot')}
if 'pivot-negative' in m['clips']:
    profile['pivot']=runtime_clip('pivot-negative')
    profile['pivots']={'positive':runtime_clip('pivot-negative'),'negative':runtime_clip('pivot')}
if 'attack-travel' in m['clips']:
    profile['actions']['attack']={**runtime_clip('attack-travel'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':(m['clips']['attack-travel']['poseGrid']['actionFrames']//2)*m['clips']['attack-travel']['poseGrid']['phaseFrames'],'visualTimingOnly':True}
    clips.pop('attack',None)
    row_hashes.pop('attack',None)
(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n')
manifest={'schemaVersion':2,'profileSha256':hashlib.sha256((out/'profile.json').read_bytes()).hexdigest(),'candidateNotApproved':True,'productionReady':False,'reviewLightingOnly':True,'runtimeIntegrated':False,'directions':directions,'clips':clips,'sourceSignature':m['skeletonSignature'],'rowSha256':row_hashes,'sourceQC':m['clips'],'materialGate':'aligned unlit albedo/normal/depth/emissive export and actual Hunt GPU acceptance open'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'atlasBytes':sum((out/v['image']).stat().st_size for v in clips.values()),'eightDistinctRows':list(row_hashes),'gpuProductionReady':False}))
