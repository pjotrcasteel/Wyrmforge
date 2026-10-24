"""Acquire an initial textured mesh; it still requires identity/deformation review.

Uses the official public TRELLIS.2 Space once; never retries quota failures.
This script is not a spritesheet generator. Run from the repository root.
"""
import json
import os
import shutil
import time
from pathlib import Path

from gradio_client import Client, handle_file

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'art/source/enemies/hollow/rigged-poc'
OUT = ASSET / 'model'
OUT.mkdir(exist_ok=True)
LOG = ASSET / 'reconstruction-log.json'
record = {'provider': 'microsoft/TRELLIS.2', 'seed': 1729,
          'resolution': '1024', 'textureSize': 2048,
          'decimationTarget': 100000, 'status': 'connecting'}


def save(status, **data):
    record.update(status=status, **data)
    LOG.write_text(json.dumps(record, indent=2) + '\n')
    print(status, flush=True)


def finish(job, stage):
    previous = ''
    while not job.done():
        status = str(job.status())
        if status != previous:
            print(stage, status, flush=True)
            previous = status
        time.sleep(5)
    return job.result()


try:
    client = Client('https://microsoft-trellis-2.hf.space',
                    token=os.environ.get('HF_TOKEN') or None,
                    download_files=str(OUT / 'downloads'),
                    httpx_kwargs={'timeout': 60}, verbose=False)
    save('preprocessing')
    prepared = client.predict(
        input=handle_file(str(ASSET / 'references/hollow-neutral-reference.png')),
        api_name='/preprocess_image')
    save('generating')
    preview = finish(client.submit(image=handle_file(prepared), seed=1729,
                                   resolution='1024', api_name='/image_to_3d'),
                     'reconstruction')
    (OUT / 'provider-preview.html').write_text(str(preview))
    save('extracting')
    exported = finish(client.submit(decimation_target=100000, texture_size=2048,
                                   api_name='/extract_glb'), 'extract')
    glb = exported[0] if isinstance(exported, (list, tuple)) else exported
    if isinstance(glb, dict):
        glb = glb['path']
    shutil.copy2(glb, OUT / 'hollow-initial.glb')
    save('initial-mesh-downloaded-not-reviewed', file='model/hollow-initial.glb')
except Exception as exc:
    save('blocked', error=f'{type(exc).__name__}: {exc}')
    raise
