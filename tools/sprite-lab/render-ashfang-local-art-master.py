"""Reference-guided 2D art master on local RTX5090, never a hosted image API."""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1')
from pathlib import Path
import sys,json,hashlib,argparse
import numpy as np,torch
from PIL import Image,ImageDraw
from diffusers import StableDiffusionXLImg2ImgPipeline
import diffusers

parser=argparse.ArgumentParser();parser.add_argument('--attempt',required=True);args=parser.parse_args()
base=Path('art/source/enemies/ashfang/restart-2026-10-21');out=base/args.attempt;out.mkdir(exist_ok=False)
reference=Image.open(base/'references-v4/pixel-idle-reference.png').convert('RGBA')
# Preserve the actual source pose, complete silhouette and pixel structure.
canvas=Image.new('RGB',(1024,576),(45,44,47));large=reference.resize((924,460),Image.Resampling.NEAREST);canvas.paste(large,(50,58),large);canvas.save(out/'reference-conditioning.png')
record=dict(method='Local SDXL image-to-image; existing card RGB pose is conditioning',referenceSha256=hashlib.sha256((base/'references-v4/pixel-idle-reference.png').read_bytes()).hexdigest(),gpu=torch.cuda.get_device_name(),model='/opt/wyrmforge-models/SDXL-card-art',modelOffline=True,hostedInference=False,ownerAccepted=False,rigged=False,runtimeIntegrated=False,images=[])
(out/'provenance.json').write_text(json.dumps(record,indent=2)+'\n')
torch.cuda.set_per_process_memory_fraction(.85)
pipe=StableDiffusionXLImg2ImgPipeline.from_pretrained(record['model'],torch_dtype=torch.float16,variant='fp16',use_safetensors=True,local_files_only=True,add_watermarker=False).to('cuda')
prompt='isometric 2.5D pixel art game sprite, complete full body of the same terrifying low crouching fire dragon, four muscular walking legs and separate broad bat wings, long curved tail, long angular horned muzzle, jagged overlapping black obsidian armour plates, concentrated orange molten chest and throat fissures, ragged dark red wing membranes, black and crimson palette, clear chunky pixel clusters, painted directional highlights, grounded Gothic dark fantasy, exact same pose and anatomy as the input image, isolated on plain neutral dark grey background, no scenery'
negative='text, letters, logo, watermark, floor, scenery, buildings, cartoon, cute, smooth plastic, shiny toy, photographic, blurry, flat red silhouette, thin stick legs, extra legs, extra heads, missing claws, cropped wings, cropped tail, worm, snake, glowing outline'
record.update(prompt=prompt,negativePrompt=negative,torchVersion=torch.__version__,diffusersVersion=diffusers.__version__,conditioningResize='4x nearest original card pixels over RGB 45/44/47; pose preserved',workingResolution=[1024,576]);(out/'provenance.json').write_text(json.dumps(record,indent=2)+'\n')
for seed,strength in [(2801,.18),(2802,.28),(2803,.36)]:
    print('Local card art',seed,'strength',strength,flush=True)
    image=pipe(prompt=prompt,negative_prompt=negative,image=canvas,strength=strength,num_inference_steps=50,guidance_scale=5.5,generator=torch.Generator(device='cuda').manual_seed(seed)).images[0]
    name=f'card-art-{seed}.png';image.save(out/name);native=image.resize((128,72),Image.Resampling.LANCZOS);palette=reference.convert('RGB').quantize(colors=64);native=native.quantize(palette=palette,dither=Image.Dither.NONE).convert('RGB');native.save(out/f'native-{seed}.png')
    record['images'].append(dict(file=name,seed=seed,strength=strength,steps=50,guidanceScale=5.5));(out/'provenance.json').write_text(json.dumps(record,indent=2)+'\n')
record['peakAllocatedMiB']=torch.cuda.max_memory_allocated()/1024**2;record['status']='art-candidates-awaiting-card-fidelity-review';(out/'provenance.json').write_text(json.dumps(record,indent=2)+'\n')
