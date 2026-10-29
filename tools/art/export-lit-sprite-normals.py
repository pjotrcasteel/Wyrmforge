"""Export walk normals from exact hash-checked sampled rigs, never infer normals from RGB.
Requires numpy, Pillow, numba. Original runtime albedo is immutable.
"""
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image
from numba import njit
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'src/Wyrmforge.Presentation.Web/wwwroot/art/lighting-proof'
@njit
def rasterize(screen, normals, faces, size):
    depth = np.full((size,size), 1e20)
    output = np.zeros((size,size,3))
    for face in faces:
        a,b,c = screen[face[0]],screen[face[1]],screen[face[2]]
        denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(denominator)<1e-12: continue
        xmin,xmax=max(0,int(math.floor(min(a[0],b[0],c[0])))),min(size-1,int(math.ceil(max(a[0],b[0],c[0]))))
        ymin,ymax=max(0,int(math.floor(min(a[1],b[1],c[1])))),min(size-1,int(math.ceil(max(a[1],b[1],c[1]))))
        for y in range(ymin,ymax+1):
            for x in range(xmin,xmax+1):
                u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/denominator
                v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/denominator
                w=1-u-v
                if min(u,v,w)<-1e-8: continue
                z=u*a[2]+v*b[2]+w*c[2]
                if z<depth[y,x]:
                    depth[y,x]=z
                    output[y,x]=u*normals[face[0]]+v*normals[face[1]]+w*normals[face[2]]
    return output,depth<1e19

def export(name, manifest_path, runtime_folder):
    manifest=json.loads((ROOT/manifest_path).read_text())
    poses=(ROOT/manifest['sourceRig']).parent/'sampled-walk.npz'
    assert hashlib.sha256(poses.read_bytes()).hexdigest()==manifest['sourcePoseSha256']
    data=np.load(poses)
    runtime=ROOT/'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies'/runtime_folder
    albedo=np.asarray(Image.open(runtime/'walk.png').convert('RGBA'))
    positions,faces,mvp=data['positions'][:16],data['faces'].astype(np.int64),data['mvp']
    cell=96; atlas=np.zeros_like(albedo)
    right,up=mvp[0,:3],mvp[1,:3]
    right=right/np.linalg.norm(right);up=up/np.linalg.norm(up)
    toward=np.cross(right,up);toward/=np.linalg.norm(toward)
    basis=np.stack([right,up,toward]);root=np.array(manifest.get('groundRoot',[0,0,0]));metrics=[]
    for row,orientation in enumerate(manifest['orientations']):
        angle=math.radians(orientation['rotationDegrees'])
        rotation=np.array([[math.cos(angle),-math.sin(angle),0],[math.sin(angle),math.cos(angle),0],[0,0,1]])
        for frame,pose in enumerate(positions):
            vertices=(pose-root)@rotation.T+root;tri=vertices[faces]
            face_normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
            face_normals/=np.maximum(np.linalg.norm(face_normals,axis=1,keepdims=True),1e-12)
            normals=np.zeros_like(vertices)
            for corner in range(3):np.add.at(normals,faces[:,corner],face_normals)
            normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
            normals=normals@basis.T
            clip=np.column_stack([vertices,np.ones(len(vertices))])@mvp.T;ndc=clip[:,:3]/clip[:,3:]
            screen=np.column_stack([(ndc[:,0]+1)*cell/2,(1-ndc[:,1])*cell/2,ndc[:,2]])
            values,mask=rasterize(screen,normals,faces,cell)
            alpha=albedo[row*cell:(row+1)*cell,frame*cell:(frame+1)*cell,3]>0
            iou=np.count_nonzero(mask&alpha)/max(1,np.count_nonzero(mask|alpha))
            if iou<.985:raise RuntimeError(f'Pose mismatch {name}/{row}/{frame}: {iou}')
            values[~mask]=[0,0,1] # neutral only at raster edge disagreement, no invented body geometry
            values/=np.maximum(np.linalg.norm(values,axis=2,keepdims=True),1e-12)
            rgba=np.zeros((cell,cell,4),dtype=np.uint8)
            rgba[:,:,:3]=np.rint((values*.5+.5)*255).astype(np.uint8);rgba[:,:,3]=alpha.astype(np.uint8)*255
            atlas[row*cell:(row+1)*cell,frame*cell:(frame+1)*cell]=rgba;metrics.append(iou)
        print(name,orientation['direction'],'normals exported',flush=True)
    OUT.mkdir(parents=True,exist_ok=True);Image.fromarray(atlas).save(OUT/f'{name}-walk-normal.png')
    return {'id':name,'sourceRig':manifest['sourceRig'],'sourcePoseSha256':manifest['sourcePoseSha256'],
        'albedoSha256':hashlib.sha256((runtime/'walk.png').read_bytes()).hexdigest(),
        'normalSpace':'sprite-tangent (authored camera right/up/toward)','frames':128,'minimumSilhouetteIoU':min(metrics),
        'caster':'pose-synchronous original alpha silhouette; not volumetric mesh',
        'scope':'walk only; attack/death remain pending; no production adoption'}
reports=[export('hollowed','art/source/enemies/hollow/rigged-poc/exports/movement-eight-directions-v1/hollow-movement.manifest.json','hollow-rigged'),
    export('ashling','art/source/enemies/ashling/exports/movement-fiery-eyes-v1/manifest.json','ashling-rigged')]
(OUT/'sprite-normal-provenance.json').write_text(json.dumps(reports,indent=2)+'\n')
