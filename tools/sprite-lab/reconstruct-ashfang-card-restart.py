"""Offline RTX5090 reconstruction conditioned on the actual card's 2.5D pixels."""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',ATTN_BACKEND='xformers',SPCONV_ALGO='native')
from pathlib import Path
import sys,json,hashlib,traceback,argparse
parser=argparse.ArgumentParser();parser.add_argument('--seed',type=int,required=True);parser.add_argument('--mode',choices=['idle','multi'],required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[2];base=root/'art/source/enemies/ashfang/restart-2026-10-21';out=base/f'{args.mode}-seed-{args.seed}';out.mkdir(exist_ok=False)
record=dict(status='starting',method='Existing offline TRELLIS 1 / DINOv2; card-pixel conditioning; no procedural anatomy replacement',seed=args.seed,mode=args.mode,ownerAccepted=False,rigged=False,runtimeIntegrated=False)
def save(status,**fields):
 record.update(status=status,**fields);(out/'provenance.json').write_text(json.dumps(record,indent=2)+'\n');print(status,flush=True)
try:
 sys.path.insert(0,'/opt/wyrmforge-src/TRELLIS')
 import torch,numpy as np,trimesh
 from PIL import Image
 from xformers.ops.fmha.dispatch import _set_use_fa3
 _set_use_fa3(False)
 from trellis.pipelines import TrellisImageTo3DPipeline
 torch.cuda.set_per_process_memory_fraction(.85)
 weights=Path('/opt/wyrmforge-models/TRELLIS-image-large');config=json.loads((weights/'pipeline.json').read_text());config['args']['models']={k:str(weights/v) for k,v in config['args']['models'].items() if k!='slat_decoder_rf'};(out/'pipeline.json').write_text(json.dumps(config,indent=2)+'\n')
 save('loading-installed-local-weights',gpu=torch.cuda.get_device_name(),torch=torch.__version__)
 pipeline=TrellisImageTo3DPipeline.from_pretrained(str(out));pipeline.cuda()
 names=['pixel-idle-reference.png'] if args.mode=='idle' else ['pixel-idle-reference.png','pixel-idle-reference.png','ashfang-front-reference.png','ashfang-side-reference.png']
 images=[];hashes=[]
 for i,name in enumerate(names):
  path=base/'references'/name;image=Image.open(path);assert image.mode=='RGBA' and image.getchannel('A').getextrema()[0]<255,'No online background-removal fallback permitted'
  prepared=pipeline.preprocess_image(image);prepared.save(out/f'conditioning-{i}.png');images.append(prepared);hashes.append(hashlib.sha256(path.read_bytes()).hexdigest())
 cond=pipeline.get_cond(images);cond['neg_cond']=cond['neg_cond'][:1];torch.manual_seed(args.seed);params=dict(steps=40)
 save('sampling-card-conditioned-shape',references=names,referenceHashes=hashes,samplingSteps=40)
 if args.mode=='multi':
  with pipeline.inject_sampler_multi_image('sparse_structure_sampler',len(images),40,mode='stochastic'):coords=pipeline.sample_sparse_structure(cond,1,params)
  with pipeline.inject_sampler_multi_image('slat_sampler',len(images),40,mode='stochastic'):slat=pipeline.sample_slat(cond,coords,params)
 else:
  coords=pipeline.sample_sparse_structure(cond,1,params);slat=pipeline.sample_slat(cond,coords,params)
 np.savez_compressed(out/'shared-latent.npz',feats=slat.feats.cpu().numpy(),coords=slat.coords.cpu().numpy())
 decoded=pipeline.decode_slat(slat,['mesh','gaussian']);mesh=decoded['mesh'][0];g=decoded['gaussian'][0]
 vertices=mesh.vertices.detach().cpu().numpy();faces=mesh.faces.detach().cpu().numpy();colors=mesh.vertex_attrs.detach().cpu().numpy()
 np.savez_compressed(out/'raw-mesh.npz',vertices=vertices,faces=faces,colors=colors)
 np.savez_compressed(out/'gaussian-appearance.npz',means=g.get_xyz.detach().cpu().numpy(),quats=g.get_rotation.detach().cpu().numpy(),scales=g.get_scaling.detach().cpu().numpy(),opacities=g.get_opacity.detach().cpu().numpy(),sh=g.get_features.detach().cpu().numpy())
 surface=trimesh.Trimesh(vertices=vertices,faces=faces,process=False);surface.visual.vertex_colors=(colors[:,:3].clip(0,1)*255).astype('uint8');surface.export(out/'card-conditioned-source.glb')
 save('candidate-awaiting-large-and-native-visual-review',vertices=len(vertices),faces=len(faces),peakAllocatedMiB=torch.cuda.max_memory_allocated()/1024**2)
except Exception as e:
 save('failed',error=str(e));(out/'failure.txt').write_text(traceback.format_exc());raise
