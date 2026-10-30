"""Encode authored source frames as GIF/MP4; no image generation or pose editing."""
import argparse
import json
import pathlib
import subprocess
import tempfile
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
parser.add_argument('--source', default='art/source/characters/grey-wizard/native-south-v001')
parser.add_argument('--zoom', type=int, default=4)
parser.add_argument('--title', default='SOUTH WALK SOURCE STUDY')
parser.add_argument('--name', default='south-walk')
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[3]
source = root / args.source
out = source / 'review'
out.mkdir(exist_ok=True)
frames = []
manifest = json.loads((source / 'manifest.json').read_text())
anchor_y = manifest['clips']['walk']['anchor'][1]
for i in range(16):
    sprite = Image.open(source / f'frames/walk-{i:02}.png').convert('RGBA')
    zoom = args.zoom
    width = max(512, sprite.width * (1 + zoom) + 72)
    height = max(400, sprite.height * zoom + 110)
    width += width % 2
    height += height % 2
    board = Image.new('RGB', (width, height), '#30333b')
    draw = ImageDraw.Draw(board)
    draw.text((16, 12), args.title + ' - NOT GAMEPLAY / NOT APPROVED', fill='#d8d8cf')
    draw.text((16, 32), f'Native x1 | inspection x{zoom} | 16 authored frames / 12 fps', fill='#b6b8bf')
    baseline = 62 + anchor_y * zoom
    draw.line((0, baseline, width-1, baseline), fill='#777b84')
    board.paste(sprite, (24, baseline-anchor_y), sprite)
    big = sprite.resize((sprite.width*zoom, sprite.height*zoom), Image.Resampling.NEAREST)
    board.paste(big, (sprite.width+48, 62), big)
    draw.text((16, height-30), f'Frame {i:02} / 15 - feet, cloak, hand/staff source review', fill='#d8d8cf')
    frames.append(board)
# GIF units are 10ms; 80/80/90 produces the exact average 12fps cadence.
frames[0].save(out / (args.name + '.gif'), save_all=True, append_images=frames[1:],
               duration=[80, 80, 90] * 5 + [80], loop=0, disposal=2)
with tempfile.TemporaryDirectory(prefix='wizard-walk-') as tmp:
    folder = pathlib.Path(tmp)
    for i, frame in enumerate(frames):
        frame.save(folder / f'{i:02}.png')
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
                    '-framerate', '12', '-i', str(folder / '%02d.png'),
                    '-vf', 'loop=loop=3:size=16:start=0', '-frames:v', '64',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
                    str(out / (args.name + '.mp4'))], check=True)
(out / 'video-report.json').write_text(json.dumps({
    'sourceFrames': 16, 'fps': 12, 'mp4Frames': 64, 'display': ['1x', f'{args.zoom}x-nearest'],
    'scope': 'authored source cycle only, not real Hunt footage or artistic acceptance',
    'encoding': 'Pillow GIF, FFmpeg libx264 MP4',
}, indent=2) + '\n')
print(out)
