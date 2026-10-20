"""Local TRELLIS initial mesh acquisition, not a rig or spritesheet generator.

Run inside the configured Linux environment with --trellis-root pointing to the
complete official checkout. Each attempt has its own directory and provenance.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback


def sha256(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('--trellis-root', type=Path, required=True)
    parser.add_argument('--attempt', required=True)
    parser.add_argument('--pipeline', choices=['512', '1024', '1024_cascade'], default='1024_cascade')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    source = root / 'art/source/enemies/hollow/rigged-poc'
    reference = source / 'references/hollow-neutral-reference.png'
    if not args.attempt.replace('-', '').replace('_', '').isalnum():
        parser.error('attempt must be an alphanumeric label')
    output = source / 'model' / args.attempt
    output.mkdir(parents=True, exist_ok=False)
    record = dict(status='starting', seed=1729, pipeline=args.pipeline,
                  inputSha256=sha256(reference), provider='local Microsoft TRELLIS.2',
                  ownerAccepted=False, rigged=False, runtimeIntegrated=False)

    def save(status, **fields):
        record.update(status=status, **fields)
        (output / 'provenance.json').write_text(json.dumps(record, indent=2) + '\n')
        print(status, flush=True)

    try:
        record['trellisRevision'] = subprocess.check_output(
            ['git', '-C', str(args.trellis_root), 'rev-parse', 'HEAD'], text=True).strip()
        sys.path.insert(0, str(args.trellis_root.resolve()))
        os.environ.setdefault('OPENCV_IO_ENABLE_OPENEXR', '1')
        os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')
        import torch
        from PIL import Image
        import o_voxel
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
        assert torch.cuda.is_available(), 'CUDA unavailable'
        record.update(torch=torch.__version__, cuda=torch.version.cuda,
                      gpu=torch.cuda.get_device_name(), python=sys.version)
        save('loading-model-weights')
        pipeline = Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')
        pipeline.low_vram = True
        pipeline.cuda()
        save('reconstructing')
        mesh = pipeline.run(Image.open(reference), seed=1729, pipeline_type=args.pipeline)[0]
        # Preserve generated geometry before potentially expensive UV/texture export.
        torch.save(dict(vertices=mesh.vertices.cpu(), faces=mesh.faces.cpu(),
                        attrs=mesh.attrs.cpu(), coords=mesh.coords.cpu(),
                        layout=mesh.layout, voxel_size=mesh.voxel_size), output / 'raw-mesh.pt')
        save('exporting', vertices=len(mesh.vertices), faces=len(mesh.faces))
        mesh.simplify(16777216)
        glb = o_voxel.postprocess.to_glb(
            vertices=mesh.vertices, faces=mesh.faces, attr_volume=mesh.attrs,
            coords=mesh.coords, attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
            aabb=[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
            decimation_target=100000, texture_size=2048,
            remesh=True, remesh_band=1, remesh_project=0, verbose=True)
        target = output / 'hollow-initial.glb'
        glb.export(str(target), extension_webp=False)
        save('initial-mesh-exported-needs-identity-and-topology-review', sha256=sha256(target))
    except Exception as error:
        save('failed', error=f'{type(error).__name__}: {error}')
        (output / 'failure.txt').write_text(traceback.format_exc())
        raise


if __name__ == '__main__':
    main()
