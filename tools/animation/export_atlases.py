"""Pack only actually rendered facings; fail closed on missing/clipped/duplicate rows.

python tools/animation/export_atlases.py artifacts/animation-v2 --out <asset-directory>
Source-lit PNGs are REVIEW only. GPU production readiness requires aligned
albedo/normal/depth/material passes and actual Hunt renderer validation.
"""
from pathlib import Path
import argparse,json,hashlib,math
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--out',required=True);p.add_argument('--full-cells',action='store_true');p.add_argument('--tight-crop',action='store_true',help='Lossless common alpha union with one native pixel of guard; no rescaling.');p.add_argument('--clips',help='Explicit complete clip subset for a bounded source proof; walk is required.');p.add_argument('--experimental-half-pivots',action='store_true',help='Native source-frame study: sample 8 of 16 true pivot poses without resampling images; unapproved.');a=p.parse_args()
if a.full_cells and a.tight_crop:p.error('Choose full cells or measured crop')
source=Path(a.source);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
m=json.loads((source/'source-manifest.json').read_text());directions=m['directions'];scale=93/1.55
if a.clips:
    selected=a.clips.split(',')
    if 'walk' not in selected or len(set(selected))!=len(selected) or any(name not in m['clips'] for name in selected):p.error('A unique existing clip subset including walk is required')
    m={**m,'clips':{name:m['clips'][name] for name in selected}}
# Preserve the original independently validated source evidence. The reduced
# playback candidate is explicitly a new unapproved sampling experiment.
original_source_qc=json.loads(json.dumps(m['clips']))
indices={name:list(range(clip['frames'])) for name,clip in m['clips'].items()}
if a.experimental_half_pivots:
    if not {'pivot','pivot-negative'}<=set(m['clips']):p.error('Both 16-frame authored pivots required for experimental sub-sampling')
    for name in ['pivot','pivot-negative']:
        clip=m['clips'][name]
        if clip['frames']!=16 or clip['fps']!=12 or len(clip['samples'])!=16 or clip.get('poseGrid'):
            p.error('Half-pivot study requires actual complete 16-frame/12fps non-grid source')
        indices[name]=list(range(0,16,2))
        m['clips'][name]={**clip,'frames':8,'fps':6,'samples':[clip['samples'][i] for i in indices[name]],
                          'experimentalSourceFrameIndices':indices[name]}
common_crop=None
if a.tight_crop:
    boxes=[]
    for name,clip in m['clips'].items():
        for direction in directions:
            for frame in indices[name]:
                with Image.open(source/'frames'/name/direction/f'{frame:02d}.png') as image:
                    assert image.size==(96,96),'Unexpected native source cell'
                    box=image.convert('RGBA').getchannel('A').getbbox()
                    assert box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<96,'Clipped source frame'
                    boxes.append(box)
    common_crop=(min(b[0] for b in boxes)-1,min(b[1] for b in boxes)-1,max(b[2] for b in boxes)+1,max(b[3] for b in boxes)+1)
clips={};row_hashes={}
for name,clip in m['clips'].items():
    count=clip['frames'];grid=clip.get('poseGrid');crop=common_crop or ((16,12,80,84) if grid and not a.full_cells else (0,0,96,96));columns=min(count,32);rows=math.ceil(count/columns);width,height=crop[2]-crop[0],crop[3]-crop[1]
    atlas=Image.new('RGBA',(width*columns,height*rows*8));hashes=[]
    for row,direction in enumerate(directions):
        frames=[]
        for frame,source_frame in enumerate(indices[name]):
            file=source/'frames'/name/direction/f'{source_frame:02d}.png'
            with Image.open(file) as image:
                image=image.convert('RGBA');assert image.size==(96,96),(file,image.size)
                box=image.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<96 and box[3]<96,('clipped atlas',file,box)
                assert crop[0]<=box[0] and crop[1]<=box[1] and crop[2]>=box[2] and crop[3]>=box[3],('crop would clip source',file,box,crop)
                cropped=image.crop(crop);frames.append(image.copy());atlas.alpha_composite(cropped,((frame%columns)*width,(row*rows+frame//columns)*height))
        hashes.append(hashlib.sha256(b''.join(i.tobytes() for i in frames)).hexdigest())
    assert len(set(hashes))==8,('identical labelled facings',name,hashes)
    filename=name+'.png';atlas.save(out/filename)
    clips[name]={'image':filename,'sha256':hashlib.sha256((out/filename).read_bytes()).hexdigest(),'frames':count,'cell':96,'columns':columns,'crop':list(crop),'anchor':[48,72],'worldSize':93,'reviewLightingOnly':True}
    if a.experimental_half_pivots and name in ('pivot','pivot-negative'):
        clips[name]['experimentalSourceFrameIndices']=indices[name]
    row_hashes[name]=hashes

from runtime_profile import build_runtime_profile
profile=build_runtime_profile(m)
if 'attack-travel' in m['clips']:
    clips.pop('attack',None)
    row_hashes.pop('attack',None)
(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n',newline='\n')
manifest={'schemaVersion':2,'profileSha256':hashlib.sha256((out/'profile.json').read_bytes()).hexdigest(),'candidateNotApproved':True,'productionReady':False,'reviewLightingOnly':True,'runtimeIntegrated':False,'directions':directions,'clips':clips,'sourceSignature':m['skeletonSignature'],'rowSha256':row_hashes,'sourceQC':original_source_qc,'materialGate':'aligned unlit albedo/normal/depth/emissive export and actual Hunt GPU acceptance open'}
manifest['representation']='baked-full-body-sprites'
if a.experimental_half_pivots:manifest['experimentalHalfPivotFrames']=True
if (source/'hollow-foundation.blend').exists():manifest['sourceBlendSha256']=hashlib.sha256((source/'hollow-foundation.blend').read_bytes()).hexdigest()
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',newline='\n')
print(json.dumps({'atlasBytes':sum((out/v['image']).stat().st_size for v in clips.values()),'eightDistinctRows':list(row_hashes),'gpuProductionReady':False}))
