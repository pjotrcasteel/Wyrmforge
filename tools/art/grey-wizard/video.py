"""Encode authored source frames as GIF/MP4; no image generation or pose editing."""
import argparse
import json
import pathlib
import subprocess
import tempfile
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[3]
source = root / 'art/source/characters/grey-wizard/native-south-v001'
out = source / 'review'
out.mkdir(exist_ok=True)
frames = []
for i in range(16):
    sprite = Image.open(source / f'frames/walk-{i:02}.png').convert('RGBA')
    board = Image.new('RGB', (512, 400), '#30333b')
    draw = ImageDraw.Draw(board)
    draw.text((16, 12), 'SOUTH WALK SOURCE STUDY - NOT GAMEPLAY / NOT APPROVED', fill='#d8d8cf')
    draw.text((16, 32), 'Native x1 | inspection x4 | 16 authored frames / 12 fps', fill='#b6b8bf')
    draw.line((0, 342, 511, 342), fill='#777b84')
    board.paste(sprite, (82, 272), sprite)
    big = sprite.resize((256, 320), Image.Resampling.NEAREST)
    board.paste(big, (236, 62), big)
    draw.text((16, 368), f'Frame {i:02} / 15 - feet, cloak, hand/staff source review', fill='#d8d8cf')
    frames.append(board)
# GIF units are 10ms; 80/80/90 produces the exact average 12fps cadence.
frames[0].save(out / 'south-walk.gif', save_all=True, append_images=frames[1:],
               duration=[80, 80, 90] * 5 + [80], loop=0, disposal=2)
with tempfile.TemporaryDirectory(prefix='wizard-walk-') as tmp:
    folder = pathlib.Path(tmp)
    for i, frame in enumerate(frames):
        frame.save(folder / f'{i:02}.png')
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
                    '-framerate', '12', '-i', str(folder / '%02d.png'),
                    '-vf', 'loop=loop=3:size=16:start=0', '-frames:v', '64',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
                    str(out / 'south-walk.mp4')], check=True)
(out / 'video-report.json').write_text(json.dumps({
    'sourceFrames': 16, 'fps': 12, 'mp4Frames': 64, 'display': ['1x', '4x-nearest'],
    'scope': 'authored source cycle only, not real Hunt footage or artistic acceptance',
    'encoding': 'Pillow GIF, FFmpeg libx264 MP4',
}, indent=2) + '\n')
print(out)
