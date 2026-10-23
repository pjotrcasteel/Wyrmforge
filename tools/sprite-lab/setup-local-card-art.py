"""Download only public SDXL fp16 files from ModelScope for local card-guided art."""
from pathlib import Path
import json,hashlib,sys,time
from modelscope.hub.api import HubApi
from modelscope.hub.file_download import model_file_download

destination=Path('/opt/wyrmforge-models/SDXL-card-art');destination.mkdir(parents=True,exist_ok=True)
receipt=Path('art/source/enemies/ashfang/restart-2026-10-21/local-art-dependency.json')
model='AI-ModelScope/stable-diffusion-xl-base-1.0'
allowed={'LICENSE.md','model_index.json','scheduler/scheduler_config.json','text_encoder/config.json','text_encoder/model.fp16.safetensors','text_encoder_2/config.json','text_encoder_2/model.fp16.safetensors','unet/config.json','unet/diffusion_pytorch_model.fp16.safetensors','vae/config.json','vae/diffusion_pytorch_model.fp16.safetensors'}
allowed|={f'{folder}/{name}' for folder in ('tokenizer','tokenizer_2') for name in ('merges.txt','special_tokens_map.json','tokenizer_config.json','vocab.json')}
files={f['Path']:f['Size'] for f in HubApi().get_model_files(model,revision='master',recursive=True) if f.get('Path') in allowed}
assert set(files)==allowed,(set(allowed)-set(files))
record=dict(model=model,source='https://www.modelscope.cn/models/AI-ModelScope/stable-diffusion-xl-base-1.0',localPath=str(destination),status='downloading-free-local-dependency',totalBytes=sum(files.values()),files={},hostedInference=False,huggingFaceDownloads=False)
receipt.write_text(json.dumps(record,indent=2)+'\n');print('Local art weights:',round(record['totalBytes']/1e9,2),'GB',flush=True)
for name,size in sorted(files.items(),key=lambda x:x[1]):
    print('Downloading',name,size,flush=True)
    path=Path(model_file_download(model,name,revision='master',local_dir=str(destination)))
    assert path.stat().st_size==size,(name,path.stat().st_size,size)
    digest=hashlib.sha256()
    with path.open('rb') as handle:
        while chunk:=handle.read(8*1024*1024):digest.update(chunk)
    record['files'][name]=dict(bytes=size,sha256=digest.hexdigest());receipt.write_text(json.dumps(record,indent=2)+'\n')
record['status']='downloaded-and-size-checked';receipt.write_text(json.dumps(record,indent=2)+'\n');print('Local SDXL weights ready',flush=True)
