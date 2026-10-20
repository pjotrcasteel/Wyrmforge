"""Local ungated TRELLIS/DINOv2 mesh candidate; never a finished animation.

Weights are downloaded separately from ModelScope. DINOv2 uses Meta's direct
distribution through torch.hub. Hugging Face access is disabled for this process.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['ATTN_BACKEND'] = 'xformers'
os.environ['SPCONV_ALGO'] = 'native'

parser = argparse.ArgumentParser(__doc__)
parser.add_argument('--attempt', required=True)
parser.add_argument('--appearance', action='store_true', help='Preserve the higher-detail Gaussian appearance decoder and shared latent')
args = parser.parse_args()
if not args.attempt.replace('-', '').isalnum():
    parser.error('attempt must be alphanumeric with optional hyphens')
root = Path(__file__).resolve().parents[2]
asset = root / 'art/source/enemies/hollow/rigged-poc'
reference = asset / 'references/hollow-neutral-reference.png'
output = asset / 'model' / args.attempt
output.mkdir(parents=True, exist_ok=False)
checkout = Path('/opt/wyrmforge-src/TRELLIS')
weights = Path('/opt/wyrmforge-models/TRELLIS-image-large')
record = dict(status='starting', seed=1729, method='local TRELLIS 1 / DINOv2',
              weightsSource='ModelScope AI-ModelScope/TRELLIS-image-large',
              ownerAccepted=False, rigged=False, runtimeIntegrated=False)


def save(status, **fields):
    record.update(status=status, **fields)
    (output / 'provenance.json').write_text(json.dumps(record, indent=2) + '\n')
    print(status, flush=True)


try:
    sys.path.insert(0, str(checkout))
    import torch
    import trimesh
    import numpy as np
    from PIL import Image
    from xformers.ops.fmha.dispatch import _set_use_fa3
    _set_use_fa3(False)
    from trellis.pipelines import TrellisImageTo3DPipeline
    assert torch.cuda.is_available()
    torch.cuda.set_per_process_memory_fraction(0.85)
    record.update(torch=torch.__version__, gpu=torch.cuda.get_device_name(),
                  sourceRevision=subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip(),
                  referenceSha256=hashlib.sha256(reference.read_bytes()).hexdigest())
    config = json.loads((weights / 'pipeline.json').read_text())
    config['args']['models'] = {
        key: str(weights / value) for key, value in config['args']['models'].items()
        if key != 'slat_decoder_rf' and (args.appearance or key != 'slat_decoder_gs')}
    (output / 'pipeline.json').write_text(json.dumps(config, indent=2) + '\n')
    save('loading-local-model-and-meta-dinov2')
    pipeline = TrellisImageTo3DPipeline.from_pretrained(str(output))
    pipeline.cuda()
    save('reconstructing-on-local-rtx5090')
    if args.appearance:
        prepared = pipeline.preprocess_image(Image.open(reference))
        conditioning = pipeline.get_cond([prepared])
        torch.manual_seed(1729)
        coords = pipeline.sample_sparse_structure(conditioning, 1, {})
        slat = pipeline.sample_slat(conditioning, coords, {})
        np.savez_compressed(output / 'shared-latent.npz', feats=slat.feats.cpu().numpy(), coords=slat.coords.cpu().numpy())
        decoded = pipeline.decode_slat(slat, ['mesh', 'gaussian'])
        mesh = decoded['mesh'][0]
        gaussian = decoded['gaussian'][0]
        np.savez_compressed(output / 'gaussian-appearance.npz',
                            means=gaussian.get_xyz.cpu().numpy(),
                            quats=gaussian.get_rotation.cpu().numpy(),
                            scales=gaussian.get_scaling.cpu().numpy(),
                            opacities=gaussian.get_opacity.cpu().numpy(),
                            sh=gaussian.get_features.cpu().numpy())
    else:
        mesh = pipeline.run(Image.open(reference), seed=1729, formats=['mesh'])["mesh"][0]
    vertices = mesh.vertices.detach().cpu().numpy()
    faces = mesh.faces.detach().cpu().numpy()
    colors = mesh.vertex_attrs.detach().cpu().numpy() if mesh.vertex_attrs is not None else None
    np.savez_compressed(output / 'raw-mesh.npz', vertices=vertices, faces=faces,
                        colors=colors if colors is not None else np.empty((0, 3)))
    candidate = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    if colors is not None:
        candidate.visual.vertex_colors = (np.clip(colors[:, :3], 0, 1) * 255).astype(np.uint8)
    candidate.export(output / 'hollow-initial.glb')
    save('colored-mesh-candidate-needs-visual-and-topology-review',
         vertices=len(vertices), faces=len(faces), vertexColor=colors is not None,
         sha256=hashlib.sha256((output / 'hollow-initial.glb').read_bytes()).hexdigest(),
         peakAllocatedMiB=torch.cuda.max_memory_allocated() / 1024**2)
except Exception as error:
    save('failed', error=f'{type(error).__name__}: {error}')
    (output / 'failure.txt').write_text(traceback.format_exc())
    raise
