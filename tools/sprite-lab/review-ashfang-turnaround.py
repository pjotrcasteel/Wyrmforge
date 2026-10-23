"""Eight actual camera views of the same skinned source; no mirrored pixels."""
from pathlib import Path
import json, math, sys
import numpy as np
import torch
import nvdiffrast.torch as dr
from ashfang_surface_uv import uv_triangles
from ashfang_body_fire import composite_fire
from PIL import Image, ImageDraw
from ashfang_preview_lighting import shade, palette_for, LIGHTING

rig = Path(sys.argv[1])
out = rig / 'turnaround-review-v1'
out.mkdir(exist_ok=False)
source = np.load(rig / 'walk-samples.npz')
cell = 192
def tensor(value, dtype=torch.float32):
    return torch.tensor(np.asarray(value), device='cuda', dtype=dtype).contiguous()

ctx = dr.RasterizeCudaContext()
vertices = tensor(source['positions'][0])
vertices = torch.cat([vertices, torch.ones_like(vertices[:, :1])], 1)
faces = tensor(source['faces'], torch.int32)
uv = tensor(source['uv'])
albedo = Image.open(rig / 'ashfang-albedo.png').convert('RGB')
palette = palette_for(albedo)
texture = tensor(np.asarray(albedo) / 255).flip(0)[None]
board = Image.new('RGB', (cell*4, (cell+20)*2), (30, 29, 31))
draw = ImageDraw.Draw(board)
observations = []
for view in range(8):
    angle = view * math.pi / 4
    eye = np.array([math.sin(angle)*3, -math.cos(angle)*3, 2.2])
    forward = -eye / np.linalg.norm(eye)
    right = np.cross(forward, [0, 0, 1]); right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    matrix = np.eye(4, dtype=np.float32)
    matrix[0, :3] = right / 1.2
    matrix[1, :3] = up / 1.2
    matrix[2, :3] = forward * .2
    matrix[1, 3] = -.1
    raster, _ = dr.rasterize(ctx, (vertices @ tensor(matrix).T)[None], faces, [cell, cell])
    texcoords = dr.interpolate(uv[None], raster, uv_triangles(source,faces))[0]
    color = dr.texture(texture, texcoords, filter_mode='nearest')[0].clamp(0, 1)
    color = shade(color, vertices[:, :3], faces, raster)
    alpha = (raster[0, :, :, 3] > 0).float()
    color,alpha=composite_fire(rig,'walk',0,ctx,tensor(matrix),raster,color,alpha)
    rgba = (torch.cat([color, alpha[:, :, None]], -1).flip(0).cpu().numpy()*255).astype('uint8')
    original = Image.fromarray(rgba)
    image = original.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
    image.putalpha(original.getchannel('A'))
    image.save(out / f'view-{view}.png')
    x, y = (view % 4)*cell, (view // 4)*(cell+20)
    board.paste(image, (x, y), image)
    draw.text((x+8, y+cell), f'{view*45} degrees / actual source', fill=(220, 190, 145))
    bounds = image.getbbox()
    observations.append(dict(angleDegrees=view*45, bounds=bounds, width=bounds[2]-bounds[0]))
board.save(out / 'turnaround.png')
(out / 'review.json').write_text(json.dumps(dict(gpu=torch.cuda.get_device_name(), views=observations, lighting=LIGHTING, ownerAccepted=False), indent=2)+'\n')
print('Eight real views saved:', out, flush=True)
