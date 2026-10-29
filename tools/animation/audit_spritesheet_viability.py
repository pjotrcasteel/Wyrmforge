"""Measure existing full-frame sheets and bound proposed baked-pose libraries.

Read-only evidence: this does not certify unrendered poses, contacts or lighting.
PNG playback remains discrete; no pixel warp or alpha pose blending is assumed.
"""
import argparse, hashlib, json, math
from pathlib import Path
from PIL import Image

p=argparse.ArgumentParser()
p.add_argument('pack',type=Path)
p.add_argument('--out',type=Path,required=True)
a=p.parse_args()
manifest=json.loads((a.pack/'manifest.json').read_text(encoding='utf-8'))
views=len(manifest['directions']);measurements=[];existing_bytes=0
for name,clip in manifest['clips'].items():
    cell=clip['cell'];columns=clip.get('columns',clip['frames']);rows=math.ceil(clip['frames']/columns)
    crop=clip.get('crop',[0,0,cell,cell]);w,h=crop[2]-crop[0],crop[3]-crop[1]
    with Image.open(a.pack/clip['image']) as image:
        image=image.convert('RGBA')
        if image.size!=(columns*w,rows*views*h):raise ValueError('Atlas layout mismatch: '+name)
        boxes=[]
        for direction in range(views):
            for frame in range(clip['frames']):
                x=frame%columns*w;y=(direction*rows+frame//columns)*h
                box=image.crop((x,y,x+w,y+h)).getbbox()
                if box is None:raise ValueError('Empty full-body pose: '+name)
                boxes.append((box[0]+crop[0],box[1]+crop[1],box[2]+crop[0],box[3]+crop[1]))
    bound=[min(v[0] for v in boxes),min(v[1] for v in boxes),max(v[2] for v in boxes),max(v[3] for v in boxes)]
    decoded=columns*w*rows*views*h*4*(1+len(clip.get('materials',{})));existing_bytes+=decoded
    measurements.append({'clip':name,'framesPerFacing':clip['frames'],'facings':views,'actualAlphaBoundsInSourceCell':bound,'loadedRgbaBytesIncludingReviewColor':decoded,'availableMaterialPasses':list(clip.get('materials',{}))})
bound=[min(m['actualAlphaBoundsInSourceCell'][0] for m in measurements),min(m['actualAlphaBoundsInSourceCell'][1] for m in measurements),max(m['actualAlphaBoundsInSourceCell'][2] for m in measurements),max(m['actualAlphaBoundsInSourceCell'][3] for m in measurements)]
width,height=bound[2]-bound[0]+2,bound[3]-bound[1]+2 # one native pixel around measured alpha
def plan(name,counts,channels=3):
    layouts=[];total=0
    for clip,frames in counts.items():
        columns=min(frames,32);rows=math.ceil(frames/columns)*views
        size=columns*width,rows*height;cost=size[0]*size[1]*4*channels;total+=cost
        layouts.append({'clip':clip,'framesPerFacing':frames,'textureSize':list(size),'rgbaChannels':channels,'decodedBytes':cost})
    return {'name':name,'decodedRgbaBytes':total,'under64MiB':total<=64*1024*1024,'under4096TextureDimension':all(max(v['textureSize'])<=4096 for v in layouts),'layouts':layouts,'assumption':'Unrendered poses must independently fit this measured crop; no acceptance implied.'}
result={'sourceManifestSha256':hashlib.sha256((a.pack/'manifest.json').read_bytes()).hexdigest(),'measuredExistingPack':measurements,'existingLoadedRgbaBytes':existing_bytes,'measuredCommonAlphaBounds':bound,'planningCropSizeWithOnePixelGuard':[width,height],
 'channelAssumption':'Production albedo, geometry-derived normal and emission; do not also retain the redundant review-lit color sheet.',
 'plans':[plan('ordinary full-body clips',{'walk':16,'claw':16,'turn-left':16,'turn-right':16}),plan('16 gait x 8 action moving-claw grid plus walk',{'walk':16,'moving-claw':128}),plan('same moving grid plus authored turn pair',{'walk':16,'moving-claw':128,'turn-left':16,'turn-right':16}),plan('same library with a fourth RGBA depth pass',{'walk':16,'moving-claw':128,'turn-left':16,'turn-right':16},4)],
 'spritesheetsAreDiscrete':True,'runtimeAcceptance':False,'remainingGates':['New full-body pose bounds and material alignment','Actual C# movement/contact and bounded transitions','Shared GPU receiver/depth/caster acceptance','Measured device memory/performance and owner visual approval']}
a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:result[k] for k in ['existingLoadedRgbaBytes','measuredCommonAlphaBounds','planningCropSizeWithOnePixelGuard','plans']},indent=2))
