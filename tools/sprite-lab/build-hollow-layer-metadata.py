"""Rasterize semantic ownership only, then encode it as JSON clipping runs.

Color pixels always come from the existing approved PNG sheets unchanged.
"""
from pathlib import Path
import json, math, hashlib
import numpy as np
import torch
import nvdiffrast.torch as dr
from PIL import Image

root=Path(__file__).resolve().parents[2]
model=root/'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
raw=model/'layer-metadata-v1'
landmarks=json.loads((raw/'landmarks.json').read_text())
tensor=lambda x,dtype=torch.float32:torch.tensor(x,dtype=dtype,device='cuda').contiguous()
ownership=tensor(np.load(raw/'body-ownership.npz')['upper'][:,None])
context=dr.RasterizeCudaContext()
directions=['N','NE','E','SE','S','SW','W','NW']
result=dict(schemaVersion=1,canvasSize=128,anchor=[64,88],directions=directions,clips={},sourceHashes={})
def runs(mask):
    encoded=[]
    for y,row in enumerate(mask):
        edges=np.diff(np.pad(row.astype(np.int8),(1,1)))
        encoded.extend([[y,int(a),int(b-a)] for a,b in zip(np.where(edges==1)[0],np.where(edges==-1)[0])])
    return encoded
for clip,folder in [('walk','rigged-pixel-v3'),('attack','rigged-attack-v2')]:
    source=np.load(model/folder/f'sampled-{clip}.npz')
    cell=96 if clip=='walk' else 128
    padding=(128-cell)//2
    export='movement-eight-directions-v1' if clip=='walk' else 'attack-eight-directions-v2'
    png_name='hollow-movement.png' if clip=='walk' else 'hollow-attack.png'
    sheet_path=root/'art/source/enemies/hollow/rigged-poc/exports'/export/png_name
    sheet=np.asarray(Image.open(sheet_path).convert('RGBA'))
    result['sourceHashes'][clip]=hashlib.sha256(sheet_path.read_bytes()).hexdigest()
    faces=tensor(source['faces'],torch.int32);mvp=tensor(source['mvp'])
    result['clips'][clip]={}
    for row,direction in enumerate(directions):
        angle=math.radians(math.degrees(math.atan2(-3.2,2.2))+270-row*45)
        rotation=tensor([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
        frames=[]
        for index,position in enumerate(source['positions'][:16]):
            vertices=tensor(position)@rotation.T
            projected=torch.cat([vertices,torch.ones_like(vertices[:,:1])],dim=1)@mvp.T
            raster,_=dr.rasterize(context,projected[None],faces,[cell,cell])
            weight=dr.interpolate(ownership[None],raster,faces)[0][0,:,:,0].flip(0).cpu().numpy()
            alpha=sheet[row*cell:(row+1)*cell,index*cell:(index+1)*cell,3]>0
            # A narrow semantic overlap at the pelvis closes the joint while
            # hands remain in the action region even below pelvis height.
            regions={'support':alpha&(weight<=.65),'action':alpha&(weight>=.35)}
            masks={name:runs(np.pad(mask,padding)) for name,mask in regions.items()}
            attachment=tensor(landmarks[clip][index]['attachment'])@rotation.T
            p=mvp@torch.cat([attachment,tensor([1])])
            attachment_px=[round(float((p[0]/p[3]+1)*cell/2+padding),3),round(float((1-p[1]/p[3])*cell/2+padding),3)]
            frames.append(dict(attachment=attachment_px,regions=masks))
        result['clips'][clip][direction]=frames
    print(clip,'semantic metadata complete',flush=True)
target=root/'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/layers.json'
target.write_text(json.dumps(result,separators=(',',':'))+'\n')
(raw/'README.md').write_text('Existing rig ownership and attachment metadata only. No color sprites or animation poses generated. Reproduce with extract-hollow-layer-landmarks.py then build-hollow-layer-metadata.py.\n')
print('JSON bytes',target.stat().st_size,'GPU',torch.cuda.get_device_name(),'color sprite writes: 0',flush=True)
