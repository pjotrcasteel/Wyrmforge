"""Exercise the real exporter with saved source metadata and synthetic atlas cells.

Cells are labelled test markers, never character art or a visual acceptance proof.
Checks projected stance derivatives against independently authored contact samples.
"""
import argparse,json,math,subprocess,sys,tempfile
from pathlib import Path
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('sources',nargs='+',type=Path);a=p.parse_args()
root=Path(__file__).resolve().parents[2]
for source in a.sources:
 m=json.loads((source/'source-manifest.json').read_text())
 with tempfile.TemporaryDirectory(prefix='directional-export-',dir=root/'artifacts') as temp:
  folder=Path(temp);(folder/'source-manifest.json').write_text(json.dumps(m))
  for name,clip in m['clips'].items():
   for row,direction in enumerate(m['directions']):
    frames=folder/'frames'/name/direction;frames.mkdir(parents=True)
    for frame in range(clip['frames']):
     image=Image.new('RGBA',(96,96));image.paste((row*30+1,frame%255,100,255),(45,45,51,51));image.save(frames/f'{frame:02d}.png')
  out=folder/'pack'
  subprocess.run([sys.executable,str(root/'tools/animation/export_atlases.py'),str(folder),'--out',str(out),'--tight-crop'],check=True,capture_output=True,text=True)
  profile=json.loads((out/'profile.json').read_text())
  manifest=json.loads((out/'manifest.json').read_text())
  for name,clip in manifest['clips'].items():
   assert clip['crop']==[44,44,52,52],clip['crop']
   with Image.open(out/clip['image']) as atlas:
    assert atlas.size==(8*min(32,clip['frames']),8*8*math.ceil(clip['frames']/32))
    for row in range(8):
     assert atlas.getpixel((1,row*math.ceil(clip['frames']/32)*8+1))==(row*30+1,0,100,255),'Lossless crop changed source pixels'
  # Two consecutive planted source contacts measure the stance derivative
  # independently of the root vector used by export calibration.
  for direction in m['directions']:
   for clip in [profile['locomotion'],*profile['locomotion'].get('motionVariants',[]),*profile['actions'].values()]:
    first,second=clip['facingSamples'][direction][:2]
    first={c['id']:c for c in first['contacts']};second={c['id']:c for c in second['contacts']}
    phase_count=clip.get('poseGrid',{}).get('phaseFrames',clip['frames'])
    velocity=clip.get('poseGrid',clip)['stanceVelocityByDirection'][direction]
    common=first.keys()&second.keys();assert common,'No independent stance samples'
    for id in common:
     measured={axis:(second[id][axis]-first[id][axis])*phase_count for axis in ['x','y']}
     assert math.hypot(measured['x']-velocity['x'],measured['y']-velocity['y'])<1e-3,(source,direction,measured,velocity)
    assert abs(clip['strideByDirection'][direction]-math.hypot(velocity['x'],velocity['y']))<1e-9
  # Feed exported data through the existing public runtime validator.
  module=(root/'src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js').as_uri()
  code=f"import fs from 'node:fs'; import {{validateCreatureRigProfile}} from {json.dumps(module)}; validateCreatureRigProfile(JSON.parse(fs.readFileSync(process.argv[1],'utf8')));"
  subprocess.run(['node','--input-type=module','-e',code,str(out/'profile.json')],check=True,capture_output=True,text=True)
 print('DIRECTIONAL_EXPORT_PASS',source,'eight views, all declared motion/actions, lossless crop, real runtime schema; synthetic test cells only')
