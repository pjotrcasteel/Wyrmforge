"""Read hardware/tool/card facts; write only a new explicit report path."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess

p = argparse.ArgumentParser()
p.add_argument('--output', required=True)
a = p.parse_args()
out = Path(a.output)
if out.exists():
    raise SystemExit('Refusing to overwrite preflight receipt')
root = Path(__file__).resolve().parents[2]

class Memory(ctypes.Structure):
    _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [
        (n, ctypes.c_ulonglong) for n in ('totalPhysical', 'availablePhysical',
        'totalPage', 'availablePage', 'totalVirtual', 'availableVirtual', 'availableExtended')]

ram = None
if os.name == 'nt':
    m = Memory()
    m.length = ctypes.sizeof(m)
    if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):
        ram = {'totalBytes': m.totalPhysical, 'availableBytes': m.availablePhysical}

def run(command):
    try:
        r = subprocess.run(command, capture_output=True, text=True, timeout=25)
        return {'exitCode': r.returncode, 'stdout': r.stdout.strip(), 'stderr': r.stderr.strip()}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {'unavailable': str(error)}

card = root / 'user_handover_files/concepts/Fire/10-ashfang-the-cinder-wyrm.png'
report = {'platform': platform.platform(), 'python': platform.python_version(),
          'cpu': platform.processor(), 'ram': ram, 'diskFreeBytes': shutil.disk_usage(root).free,
          'toolsOnPath': {t: shutil.which(t) for t in ('blender', 'krita', 'ffmpeg', 'git')},
          'gpu': run(['nvidia-smi', '--query-gpu=name,driver_version,memory.total,temperature.gpu', '--format=csv']),
          'sourceCardSha256': hashlib.sha256(card.read_bytes()).hexdigest(),
          'git': run(['git', '-C', str(root), 'rev-parse', 'HEAD']),
          'lfs': run(['git', 'lfs', 'version']),
          'lfsQuotaVerified': False, 'paidOverageAuthorized': False}
out.parent.mkdir(parents=True, exist_ok=True)
with out.open('x', encoding='utf-8') as f:
    json.dump(report, f, indent=2)
print(out)
