"""Attach source-verified regional metadata/materials to an existing review pack.

Never declares runtime/art acceptance. Refuses mismatched rigs, missing rows,
misaligned alpha, clipped source cells, and the runtime's metadata/texture budget.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image

p=argparse.ArgumentParser()
p.add_argument('pack',type=Path)
p.add_argument('--regions',type=Path,required=True,help='Parent containing <clip>/contact-regions.json')
p.add_argument('--materials',type=Path)
p.add_argument('--crop',action='store_true',help='Losslessly remove common transparent padding from original cells')
a=p.parse_args()
manifest=json.loads((a.pack/'manifest.json').read_text())
profile=json.loads((a.pack/'profile.json').read_text())
metadata=None
for clip,spec in manifest['clips'].items():
    item=json.loads((a.regions/clip/'contact-regions.json').read_text())
    if item['sourceSignature']!=manifest['sourceSignature'] or item['directions']!=manifest['directions']:
        raise ValueError('Source region rig/facing mismatch: '+clip)
    if not item.get('colorAlphaValidated'):
        raise ValueError('Source region ownership lacks actual color-alpha validation: '+clip)
    if item.get('colorAtlasSha256',{}).get(clip)!=spec['sha256']:
        raise ValueError('Source region color-atlas provenance mismatch: '+clip)
    views=item['clips'][clip]
    if set(views)!=set(manifest['directions']):raise ValueError('Incomplete source region directions: '+clip)
    if metadata is None:metadata={k:v for k,v in item.items() if k!='clips'};metadata['clips']={};metadata['colorAtlasSha256']={}
    if metadata['sourceBlendSha256']!=item['sourceBlendSha256']:raise ValueError('Mixed source action files')
    metadata['colorAtlasSha256'].update(item['colorAtlasSha256'])
    for direction,frames in views.items():
        if len(frames)!=spec['frames']:raise ValueError('Source region frame mismatch: '+clip)
        for frame in frames:
            if any(type(c.get('planted')) is not bool for c in frame['sourceContacts'].values()):raise ValueError('Missing authored stance')
            # These independent review outputs are not consumed by runtime.
            frame.pop('projectedBones',None)
            for bone in frame['sourceBones'].values():bone.pop('matrix',None)
            if frame['ownershipCoverage']!=1:raise ValueError('Incomplete actual alpha ownership')
    metadata['clips'][clip]=views
    if a.materials:
        from PIL import ImageChops
        with Image.open(a.pack/spec['image']) as src:alpha=src.convert('RGBA').getchannel('A')
        for mode in ['albedo','normal','emissive']:
            atlas=Image.new('RGBA',(spec['cell']*spec['frames'],spec['cell']*8))
            for row,direction in enumerate(manifest['directions']):
                for index in range(spec['frames']):
                    with Image.open(a.materials/mode/clip/direction/f'{index:02d}.png') as image:
                        if image.size!=(spec['cell'],spec['cell']):raise ValueError('Material cell dimensions mismatch')
                        atlas.paste(image.convert('RGBA'),(index*spec['cell'],row*spec['cell']))
            if ImageChops.difference(alpha,atlas.getchannel('A')).getbbox():raise ValueError('Material/source alpha mismatch: '+clip+'/'+mode)
            if mode=='normal':
                # Supersampling averages real evaluated geometry normals.
                # Normalize that vector representation; never infer it from art.
                import numpy as np
                pixels=np.array(atlas);mask=pixels[:,:,3]>0
                vectors=pixels[:,:,:3][mask].astype(float)/127.5-1
                lengths=np.linalg.norm(vectors,axis=1)
                if np.any(lengths<=3**.5/255):raise ValueError('Geometry normal direction is below 8-bit quantization precision')
                pixels[:,:,:3][mask]=np.rint((vectors/lengths[:,None]+1)*127.5).clip(0,255).astype(np.uint8)
                atlas=Image.fromarray(pixels)
                spec['sourceNormalPreNormalizationLengthRange']=[float(lengths.min()),float(lengths.max())]
            filename=clip+'-'+mode+'.png';atlas.save(a.pack/filename)
            spec.setdefault('materials',{})[mode]={'image':filename,'sha256':hashlib.sha256((a.pack/filename).read_bytes()).hexdigest(),'basis':'camera-right/up/toward' if mode=='normal' else 'source-evaluated'}
    if a.crop:
        if spec.get('crop',[0,0,spec['cell'],spec['cell']])!=[0,0,spec['cell'],spec['cell']]:raise ValueError('Crop requires a fresh full-cell export')
        cell=spec['cell'];boxes=[]
        with Image.open(a.pack/spec['image']) as src:
            for row in range(8):
                for index in range(spec['frames']):
                    box=src.crop((index*cell,row*cell,(index+1)*cell,(row+1)*cell)).getbbox()
                    if box:boxes.append(box)
        if not boxes:raise ValueError('Empty source clip')
        crop=[max(0,min(b[0] for b in boxes)-1),max(0,min(b[1] for b in boxes)-1),min(cell,max(b[2] for b in boxes)+1),min(cell,max(b[3] for b in boxes)+1)]
        width,height=crop[2]-crop[0],crop[3]-crop[1]
        metadata.setdefault('uncroppedColorAtlasSha256',{})[clip]=spec['sha256']
        for image_spec in [spec,*spec.get('materials',{}).values()]:
            with Image.open(a.pack/image_spec['image']) as src:
                cropped=Image.new('RGBA',(width*spec['frames'],height*8))
                for row in range(8):
                    for index in range(spec['frames']):
                        cropped.paste(src.crop((index*cell+crop[0],row*cell+crop[1],index*cell+crop[2],row*cell+crop[3])),(index*width,row*height))
            cropped.save(a.pack/image_spec['image'])
            image_spec['sha256']=hashlib.sha256((a.pack/image_spec['image']).read_bytes()).hexdigest()
        spec['crop']=crop;spec['columns']=spec['frames']
        metadata['colorAtlasSha256'][clip]=spec['sha256']

payload=(json.dumps(metadata,separators=(',',':'))+'\n').encode()
if len(payload)>4*1024*1024:raise ValueError('Source region metadata budget exceeded')
decoded=sum((c.get('crop',[0,0,c['cell'],c['cell']])[2]-c.get('crop',[0,0,c['cell'],c['cell']])[0])*(c.get('crop',[0,0,c['cell'],c['cell']])[3]-c.get('crop',[0,0,c['cell'],c['cell']])[1])*c['frames']*8*4*(1+len(c.get('materials',{}))) for c in manifest['clips'].values())
if decoded+128**2*4>64*1024*1024:raise ValueError('No room for a regional tile in the texture budget')
manifest['regions']={'metadata':'contact-regions.json','sha256':hashlib.sha256(payload).hexdigest(),
    'maxCorrectionMetres':next(iter(manifest['sourceQC'].values())).get('unitsPerPixel',1.55/96),
    'maxRootCorrectionMetres':0,'acceptance':'candidate; source/Hunt continuity and material deformation remain open'}
# Source rig metres per native source pixel, derived from the explicit rig scale.
matrix=profile['rig']['sourceSpace']['toActor']
metres_to_world=sum(v*v for v in matrix[:3])**.5
manifest['regions']['maxCorrectionMetres']=profile['unitsPerPixel']/metres_to_world
manifest['runtimeIntegrated']=False;manifest['productionReady']=False
if a.materials:manifest['materialGate']='Source-aligned albedo/normal/emissive alpha verified; regional deformation, depth/casters and actual GPU Hunt acceptance remain open'
(a.pack/'contact-regions.json').write_bytes(payload)
(a.pack/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'metadataBytes':len(payload),'decodedTextureBytes':decoded,'sourceSignature':manifest['sourceSignature'],'runtimeAccepted':False}))
