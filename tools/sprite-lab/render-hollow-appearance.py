"""Local Apache-2.0 gsplat appearance observations, never animation frames."""
from pathlib import Path
import math
import sys
import numpy as np
import torch
from PIL import Image
from gsplat import rasterization

folder = Path(sys.argv[1])
data = np.load(folder / 'gaussian-appearance.npz')
tensor = lambda value: torch.tensor(value, dtype=torch.float32, device='cuda')
means, quats, scales = [tensor(data[key]) for key in ['means', 'quats', 'scales']]
opacity = tensor(data['opacities']).flatten()
colors = (tensor(data['sh'])[:, :, 0] * 0.28209479177387814 + 0.5).clamp_min(0)
destination = folder / 'appearance-views'
destination.mkdir(exist_ok=True)
views, observations, masks, intrinsics = [], [], [], []
width, height = 512, 640
for degrees in range(0, 360, 45):
    angle = math.radians(degrees)
    eye = np.array([2 * math.sin(angle), -2 * math.cos(angle), 0.18], dtype=np.float32)
    forward = -eye / np.linalg.norm(eye)
    right = np.cross(forward, np.array([0, 0, 1], dtype=np.float32))
    right /= np.linalg.norm(right)
    down = np.cross(forward, right)
    view = np.eye(4, dtype=np.float32)
    view[:3, :3] = np.stack([right, down, forward])
    view[:3, 3] = -view[:3, :3] @ eye
    k = np.array([[1050, 0, width / 2], [0, 1050, height / 2], [0, 0, 1]], dtype=np.float32)
    with torch.no_grad():
        rgb, alpha, _ = rasterization(means, quats, scales, opacity, colors,
                                      tensor(view)[None], tensor(k)[None], width, height,
                                      near_plane=0.1, far_plane=10, packed=True)
    a = alpha[0].cpu().numpy()
    straight = (rgb[0].cpu().numpy() / np.maximum(a, 1e-6)).clip(0, 1)
    rgba = (np.concatenate([straight, a], axis=-1) * 255).astype(np.uint8)
    Image.fromarray(rgba).save(destination / f'view-{degrees:03d}.png')
    views.append(view)
    intrinsics.append(k)
    observations.append((straight * 255).astype(np.uint8))
    masks.append(a[..., 0] > 0.8)
    print('rendered', degrees, flush=True)
np.savez_compressed(destination / 'observations.npz', views=views, intrinsics=intrinsics,
                    rgb=observations, masks=masks)
