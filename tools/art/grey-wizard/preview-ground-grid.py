"""Honest moving-ground review of a source walk/run at its actual game speed.

This is a diagnostic animation, NEVER a captured WyrmForge Hunt or proof of
artistic acceptance. Player root stays camera-centred; world grid scrolls by
the exact source-pixel equivalent of C# world distance per frame.
"""
import argparse
import json
import pathlib
import subprocess
import tempfile
from PIL import Image, ImageDraw

parser=argparse.ArgumentParser()
parser.add_argument('--source',required=True)
parser.add_argument('--ffmpeg',default='ffmpeg')
parser.add_argument('--cycles',type=int,default=4)
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[3]
source=root/args.source
project=json.loads((source/'project.json').read_text())
profile=json.loads((source/'animation-profile.json').read_text())
manifest=json.loads((source/'manifest.json').read_text())
clip=project.get('clipName','walk')
fps=project['fps']
world_size=manifest['clips'][clip]['worldSize']
cell=manifest['clips'][clip]['cell']
root_speed=project.get('previewBaseSpeed')
if not root_speed:
    raise ValueError('A real C# base speed is mandatory for a moving-ground review')
pixels_per_world=cell/world_size
native_pixels_per_frame=root_speed/fps*pixels_per_world
distance_per_cycle=profile['locomotion']['stride']
frame_count=manifest['clips'][clip]['frames']
assert frame_count==16
assert abs(root_speed*frame_count/fps-distance_per_cycle)<.001

width,height=720,620
scale=3
anchor_x,anchor_y=manifest['clips'][clip]['anchor']
sprite_left=width//2-anchor_x*scale
sprite_top=height-70-anchor_y*scale
grid_spacing=10*pixels_per_world*scale
frames=[]
for i in range(frame_count*args.cycles):
    frame=i%frame_count
    background=Image.new('RGB',(width,height),'#262a31')
    draw=ImageDraw.Draw(background)
    scroll=native_pixels_per_frame*scale*i
    step_y=scroll%grid_spacing
    for k in range(-2,int(height/grid_spacing)+3):
        y=int(round(k*grid_spacing+step_y))
        draw.line((0,y,width-1,y),fill='#43494f',width=1)
    for x in range(0,width,72):
        draw.line((x,0,x,height-1),fill='#353b43',width=1)
    draw.text((15,13),'NORTH RUN | ACTUAL ROOT-SPEED GRID TEST | SOURCE ART ONLY',fill='#f2e9d2')
    draw.text((15,34),f'C# speed: {root_speed:.0f} world/s   |   pose: {frame:02}/15   |   {fps} fps / {fps/frame_count:.2f} cycles/s',fill='#d7ddd4')
    source_contact='source stance verified' if project.get('sourceContactVerified') else 'source stance unverified'
    draw.text((15,55),f'Ground: {native_pixels_per_frame:.2f} native px/frame | {source_contact}',fill='#efb785')
    sprite=Image.open(source/f'frames/{clip}-{frame:02}.png').convert('RGBA')
    big=sprite.resize((cell*scale,cell*scale),Image.Resampling.NEAREST)
    background.paste(big,(sprite_left,sprite_top),big)
    baseline=sprite_top+anchor_y*scale
    draw.line((0,baseline,width-1,baseline),fill='#8c9a9d',width=1)
    draw.text((15,height-44),'Sprite anchor stays in camera space. Grid slides under feet.',fill='#d7ddd4')
    draw.text((15,height-25),'NOT Hunt footage. Gameplay contact/visual approval is OPEN.',fill='#efb785')
    frames.append(background)

review=source/'review'
review.mkdir(exist_ok=True)
name=f'{project["direction"].lower()}-{clip}-ground-grid'
durations=[max(10,(round((i+1)*100/fps)-round(i*100/fps))*10) for i in range(len(frames))]
frames[0].save(review/f'{name}.gif',save_all=True,append_images=frames[1:],
               duration=durations,loop=0,disposal=2)
with tempfile.TemporaryDirectory(prefix='wizard-ground-grid-') as folder:
    folder=pathlib.Path(folder)
    for i,frame in enumerate(frames):frame.save(folder/f'{i:03}.png')
    subprocess.run([args.ffmpeg,'-hide_banner','-loglevel','error','-y',
                    '-framerate',str(fps),'-i',str(folder/'%03d.png'),
                    '-c:v','libx264','-pix_fmt','yuv420p','-crf','18',
                    str(review/f'{name}.mp4')],check=True)
report=dict(scope='camera-follow source grid diagnostic; not Hunt footage or artistic acceptance',
            fps=fps,frames=len(frames),cycles=args.cycles,basePlayerSpeed=root_speed,
            worldStridePerCycle=distance_per_cycle,nativeGroundTravelPerFrame=native_pixels_per_frame,
            sourceContactAccepted=bool(project.get('sourceContactVerified',False)),
            gameplayContactApproved=False,
            gif=f'{name}.gif',mp4=f'{name}.mp4')
(review/'ground-grid-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
