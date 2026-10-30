"""Inspect packaged source/media and expose, rather than hide, cadence mismatch."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--source',required=True)
parser.add_argument('--ffmpeg',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[3]
source=root/args.source
project=json.loads((source/'project.json').read_text())
profile=json.loads((source/'animation-profile.json').read_text())
ora=source/('grey-wizard-fire-southeast.ora' if project['direction']=='SE' else 'grey-wizard-fire-south.ora')
with zipfile.ZipFile(ora) as z:
    assert z.read('mimetype')==b'image/openraster'
    tree=ET.fromstring(z.read('stack.xml'))
    layers=tree.findall('./stack/layer')
    assert len(layers)==12
    assert z.read('mergedimage.png')==(source/'source-master.png').read_bytes()
    for layer,expected in zip(layers,reversed(project['layers'])):
        assert layer.attrib['name']==expected['name']
        assert z.read(layer.attrib['src'])==(source/expected['file']).read_bytes()
name='southeast-walk' if project['direction']=='SE' else 'south-walk'
with Image.open(source/'review'/(name+'.gif')) as gif:
    assert gif.n_frames==16
    duration=0
    for i in range(16):
        gif.seek(i);duration+=gif.info['duration']
    assert duration==1330
subprocess.run([args.ffmpeg,'-hide_banner','-loglevel','error','-i',str(source/'review'/(name+'.mp4')),'-f','null','-'],check=True)
player_file=root/'src/Wyrmforge.Domain/Combat/Player/PlayerState.cs'
text=player_file.read_text()
base_speed=float(re.search(r'public double Speed \{ get; \} = ([\d.]+)',text).group(1))
stride=profile['locomotion']['stride']
report=dict(scope='source media/packaging and numeric cadence audit only',
            openRasterLayers=12,sourceLayerBytesExact=True,gifFrames=16,gifMilliseconds=duration,mp4Decode=True,
            sourceFps=project['fps'],sourceWorldStride=stride,
            sourceGuideSpeed=stride*project['fps']/16,
            csharpBaseSpeed=base_speed,csharpSpeedSource=str(player_file.relative_to(root)),
            csharpSpeedSourceSha256=hashlib.sha256(player_file.read_bytes()).hexdigest(),
            liveFramesPerSecondAtBaseSpeed=base_speed/stride*16,
            liveCyclesPerSecondAtBaseSpeed=base_speed/stride,
            sourceIsGameplayFit=False,
            limitation='Base speed excludes build/status modifiers. Native12fps source is NOT a walk/run fit at live speed. Do not cut over or alter gameplay speed to hide this mismatch.')
(source/'review'/'package-cadence-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
