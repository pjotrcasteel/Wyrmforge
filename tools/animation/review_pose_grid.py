"""Render a two-clock source grid study, never scan packed rows as a movie.
Outputs H.264/yuv420p/faststart for inspection, not Hunt/transition acceptance.
"""
import argparse,json,math,subprocess,tempfile
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--gait-hz',type=float,default=1);a=p.parse_args()
m=json.loads((a.source/'source-manifest.json').read_text());clip=m['clips']['attack-travel'];grid=clip['poseGrid'];fps=30;duration=grid['actionFrames']/clip['fps'];a.out.parent.mkdir(parents=True,exist_ok=True)
indices=[]
with tempfile.TemporaryDirectory() as temp:
 for tick in range(math.ceil(duration*fps)):
  t=tick/fps;progress=min(1,t/duration);phase=t*a.gait_hz%1
  index=min(grid['actionFrames']-1,round(progress*(grid['actionFrames']-1)))*grid['phaseFrames']+round(phase*grid['phaseFrames'])%grid['phaseFrames'];indices.append(index)
  canvas=Image.new('RGB',(768,480),(20,23,29));d=ImageDraw.Draw(canvas)
  d.text((20,16),'WHOLE-BODY MOVING CLAW / SOURCE GRID STUDY',fill='white')
  d.text((20,36),'Not Hunt, arbitrary-direction grounding, transitions or final art acceptance',fill=(205,205,205))
  for col,direction in enumerate(['S','E']):
   with Image.open(a.source/'frames'/'attack-travel'/direction/f'{index:02d}.png') as im:
    im=im.convert('RGBA');large=im.resize((288,288),Image.Resampling.NEAREST);canvas.paste(large,(col*384+48,80),large);canvas.paste(im,(col*384+144,370),im)
   d.text((col*384+20,62),f'{direction} / phase {phase:.3f} / action {progress:.3f}',fill=(215,180,100))
  canvas.save(Path(temp)/f'{tick:04d}.png')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(fps),'-i',str(Path(temp)/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(a.out)],check=True)
a.out.with_suffix('.json').write_text(json.dumps({'sourceStudyOnly':True,'runtimeAccepted':False,'gaitHz':a.gait_hz,'fps':fps,'durationSeconds':duration,'sourceIndices':indices,'sourceSignature':m['skeletonSignature']},indent=2)+'\n')
