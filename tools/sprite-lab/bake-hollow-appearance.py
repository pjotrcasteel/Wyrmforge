"""Bake local Gaussian observations onto a UV-mapped mesh using CUDA visibility.

No invented texture detail: observations come from the shared TRELLIS latent.
"""
from pathlib import Path
import sys
import json
import numpy as np
import torch
import torch.nn.functional as F
import nvdiffrast.torch as dr
from cumesh import CuMesh
from scipy.spatial import cKDTree
from scipy.ndimage import distance_transform_edt
import trimesh
from PIL import Image

folder = Path(sys.argv[1])
source = np.load(folder / 'raw-mesh.npz')
observations = np.load(folder / (sys.argv[2] if len(sys.argv)>2 else 'appearance-views-rgb-v2') / 'observations.npz')
out = folder / (sys.argv[3] if len(sys.argv)>3 else 'textured-rgb-v2')
out.mkdir(exist_ok=False)
tensor = lambda a, dtype=torch.float32: torch.tensor(a, dtype=dtype, device='cuda').contiguous()
mesh = CuMesh()
mesh.init(tensor(source['vertices']), tensor(source['faces'], torch.int32))
mesh.remove_degenerate_faces()
mesh.simplify(80000, verbose=True)
vertices, faces, uv = mesh.uv_unwrap(verbose=True)
v, f, texcoord = tensor(vertices.numpy()), tensor(faces.numpy(), torch.int32), tensor(uv.numpy())
surface = trimesh.Trimesh(vertices.numpy(), faces.numpy(), process=False)
normals = tensor(surface.vertex_normals.copy())
near_index = cKDTree(source['vertices']).query(vertices.numpy())[1]
fallback = tensor(source['colors'][near_index, :3])
ctx = dr.RasterizeCudaContext()
size = 1024
uvclip = torch.cat([texcoord * 2 - 1, torch.zeros_like(texcoord[:, :1]), torch.ones_like(texcoord[:, :1])], dim=1)
rast, _ = dr.rasterize(ctx, uvclip[None], f, [size, size])
positions = dr.interpolate(v[None], rast, f)[0][0]
normal_map = F.normalize(dr.interpolate(normals[None], rast, f)[0][0], dim=-1)
fallback_map = dr.interpolate(fallback[None], rast, f)[0][0]
valid = rast[0, :, :, 3] > 0
color_sum = torch.zeros_like(positions)
weight_sum = torch.zeros_like(positions[:, :, :1])
homogeneous = torch.cat([positions, torch.ones_like(positions[:, :, :1])], dim=-1)
ones = torch.ones((len(v), 1), device='cuda')
for index, (view_np, k_np, rgb_np, mask_np) in enumerate(zip(observations['views'], observations['intrinsics'], observations['rgb'], observations['masks'])):
    view, k = tensor(view_np), tensor(k_np)
    h, w = rgb_np.shape[:2]
    cam = torch.cat([v, ones], dim=1) @ view.T
    near, far = 0.1, 10.0
    clip = torch.stack([2*k[0,0]/w*cam[:,0], -2*k[1,1]/h*cam[:,1],
                        (far+near)/(far-near)*cam[:,2]-2*far*near/(far-near), cam[:,2]], dim=-1)
    screen_rast, _ = dr.rasterize(ctx, clip[None], f, [h, w])
    depth = dr.interpolate(cam[None, :, 2:3].contiguous(), screen_rast, f)[0].flip(1).permute(0,3,1,2)
    projected = homogeneous @ view.T
    u = projected[:, :, 0] / projected[:, :, 2] * k[0,0] + k[0,2]
    y = projected[:, :, 1] / projected[:, :, 2] * k[1,1] + k[1,2]
    grid = torch.stack([2*u/(w-1)-1, 2*y/(h-1)-1], dim=-1)[None]
    observed = F.grid_sample(tensor(rgb_np/255)[None].permute(0,3,1,2), grid, align_corners=True)[0].permute(1,2,0)
    observed_depth = F.grid_sample(depth, grid, align_corners=True)[0,0]
    observed_mask = F.grid_sample(tensor(mask_np.astype(np.float32))[None,None], grid, align_corners=True)[0,0]
    eye = -view[:3,:3].T @ view[:3,3]
    to_eye = F.normalize(eye - positions, dim=-1)
    facing = (normal_map * to_eye).sum(-1).clamp_min(0)
    visible = (observed_depth - projected[:,:,2]).abs() < 0.012
    weight = (facing ** 4 * visible * (observed_mask > 0.8) * valid)[:,:,None]
    color_sum += observed * weight
    weight_sum += weight
    print('baked observation', index, flush=True)
painted = weight_sum[:,:,0] > 0.001
texture = torch.where(painted[:,:,None], color_sum/weight_sum.clamp_min(1e-6), fallback_map)
texture = (texture.flip(0).clamp(0,1).cpu().numpy()*255).astype(np.uint8)
uvvalid = valid.flip(0).cpu().numpy()
indices = distance_transform_edt(~uvvalid, return_distances=False, return_indices=True)
texture[~uvvalid] = texture[indices[0][~uvvalid], indices[1][~uvvalid]]
Image.fromarray(texture).save(out / 'hollow-albedo.png')
np.savez_compressed(out / 'textured-mesh.npz', vertices=vertices.numpy(), faces=faces.numpy(), uv=uv.numpy())
surface.visual = trimesh.visual.texture.TextureVisuals(uv=uv.numpy(), image=Image.fromarray(texture))
surface.export(out / 'hollow-textured.glb')
report = dict(vertices=len(vertices), faces=len(faces), textureSize=size,
              visibleTexels=int(valid.sum()), observationTexels=int((painted & valid).sum()),
              source='shared-latent Gaussian observations; vertex-color fallback on unseen texels',
              ownerAccepted=False, runtimeIntegrated=False)
(out / 'bake-report.json').write_text(json.dumps(report, indent=2)+'\n')
print(report, flush=True)
