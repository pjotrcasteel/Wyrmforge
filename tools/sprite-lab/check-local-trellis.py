"""Check actual GPU kernels and imports; never certifies character quality."""
import importlib
import json
import os
import platform
import subprocess
import sys
from pathlib import Path

os.environ.setdefault('ATTN_BACKEND', 'xformers')
sys.path.insert(0, '/opt/wyrmforge-src/TRELLIS.2')
report = dict(python=platform.python_version(), checks={})


def check(name, operation):
    try:
        report['checks'][name] = dict(passed=True, result=operation())
    except Exception as error:
        report['checks'][name] = dict(passed=False, error=f'{type(error).__name__}: {error}')


def gpu():
    import torch
    x = torch.randn(512, 512, device='cuda')
    assert (x @ x).isfinite().all().item()
    return dict(torch=torch.__version__, cuda=torch.version.cuda,
                gpu=torch.cuda.get_device_name(), capability=torch.cuda.get_device_capability())


def attention():
    import torch
    from xformers.ops import memory_efficient_attention
    from xformers.ops.fmha.dispatch import _set_use_fa3
    # xFormers 0.0.32 defaults to a Hopper-only FA3 kernel on this Blackwell.
    _set_use_fa3(False)
    q = torch.randn(1, 256, 8, 64, dtype=torch.float16, device='cuda')
    assert memory_efficient_attention(q, q, q).isfinite().all().item()
    return 'finite fp16 CUDA attention output'


check('gpu-matmul', gpu)
check('gpu-attention', attention)
for module in ['flex_gemm', 'cumesh', 'nvdiffrast.torch', 'nvdiffrec_render.renderutils', 'o_voxel']:
    check(module, lambda module=module: str(importlib.import_module(module).__file__))
check('trellis-pipeline-class', lambda: str(getattr(importlib.import_module('trellis2.pipelines'), 'Trellis2ImageTo3DPipeline')))
check('blender', lambda: subprocess.check_output(['blender', '--background', '--version'], text=True).splitlines()[0])
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
sys.exit(0 if all(value['passed'] for value in report['checks'].values()) else 1)
