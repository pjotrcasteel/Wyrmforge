"""Locally paint only occluded shoulder/hip overlap for original-card limbs."""
import os
os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1')
from pathlib import Path
import json
import numpy as np,torch
from PIL import Image,ImageDraw
from diffusers import StableDiffusionXLInpaintPipeline
base=Path('art/source/enemies/ashfang/restart-2026-10-21')
folder=base/'articulated-layers-002';out=folder/'hidden-overlap-001';out.mkdir(exist_ok=False)
ref=Image.open(base/'references-v5/pixel-idle-reference.png').convert('RGBA')
canvas=Image.new('RGB',(1024,576),(45,44,47));canvas.paste(ref.resize((924,460),Image.Resampling.NEAREST),(50,58),ref.resize((924,460),Image.Resampling.NEAREST))
mask=Image.new('L',ref.size);draw=ImageDraw.Draw(mask)
# These patches are occluded by original limbs at rest. Only proximal attachment
# regions receive paint; gaps below the body must remain transparent.
polys=[[(103,61),(120,61),(121,76),(109,86),(96,86),(93,79)],[(131,63),(146,63),(150,76),(140,84),(126,83)],[(67,70),(83,70),(85,84),(76,94),(59,94),(58,85)],[(83,73),(97,74),(98,86),(90,94),(79,94),(78,85)]]
for p in polys:draw.polygon(p,fill=255)
mask=Image.fromarray(np.minimum(np.asarray(mask),np.asarray(ref.getchannel('A'))))
bigmask=Image.new('L',(1024,576));bigmask.paste(mask.resize((924,460),Image.Resampling.NEAREST),(50,58));bigmask.save(out/'paint-mask.png');canvas.save(out/'input.png')
pipe=StableDiffusionXLInpaintPipeline.from_pretrained('/opt/wyrmforge-models/SDXL-card-art',torch_dtype=torch.float16,variant='fp16',use_safetensors=True,local_files_only=True,add_watermarker=False).to('cuda')
prompt='isometric pixel art, black obsidian dragon body, overlapping jagged charcoal armor plates, warm red orange molten cracks, muscular shoulder and hip attachments, same crouching dragon, detailed game sprite'
im=pipe(prompt=prompt,negative_prompt='extra limbs, extra heads, text, blur, smooth plastic, photographic, scenery',image=canvas,mask_image=bigmask,strength=.55,num_inference_steps=40,guidance_scale=5,generator=torch.Generator(device='cuda').manual_seed(6207)).images[0]
im.save(out/'raw-local-paint.png')
patch=im.crop((50,58,974,518)).resize(ref.size,Image.Resampling.LANCZOS).convert('RGBA');patch.putalpha(mask)
patch.save(out/'hidden-attachment-paint.png')
body=Image.open(folder/'torso-needs-hidden-overlap.png').convert('RGBA')
# New pixels only fill holes under attachments; all original visible torso RGB stays.
body=Image.alpha_composite(patch,body);body.save(out/'torso-with-overlap.png')
rest=body.copy()
for name in ['far_hindleg','near_hindleg','far_foreleg','near_foreleg']:rest.alpha_composite(Image.open(folder/(name+'.png')).convert('RGBA'))
rest.save(out/'assembled-rest.png')
(out/'provenance.json').write_text(json.dumps(dict(method='local offline SDXL masked hidden attachment painting',seed=6207,strength=.55,steps=40,prompt=prompt,gpu=torch.cuda.get_device_name(),model='/opt/wyrmforge-models/SDXL-card-art',hostedInference=False,polygons=polys,ownerAccepted=False,status='hidden overlap candidate requiring rest and pose review'),indent=2)+'\n')
print('Hidden attachment paint saved; inspect before gait.')
