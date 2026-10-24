"""Render the editable unapproved Hollowed feral candidate at real 96px pixels.

Preview-only CPU Cycles frames. Does not replace approved 8-direction atlases.
"""
from pathlib import Path
import json
import bpy
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-feral-v1-candidate"
OUTPUT = ROOT / "artifacts/hollow-feral-review"
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / "hollow-rigged.blend"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.render.resolution_x = 96
scene.render.resolution_y = 96
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
frames = []
for index in range(16):
    scene.frame_set(index + 1)
    file = OUTPUT / f"feral-{index:02d}.png"
    scene.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)
    frame = Image.open(file).convert("RGBA")
    assert frame.size == (96, 96), frame.size
    frames.append(frame)
boards = []
for i, frame in enumerate(frames):
    board = Image.new("RGBA", (144, 122), (22, 23, 28, 255))
    board.alpha_composite(frame, (24, 12))
    ImageDraw.Draw(board).text((6, 2), f"HOLLOWED FERAL / {i:02d}", fill=(220, 191, 165))
    boards.append(board.convert("RGB").resize((576, 488), Image.Resampling.NEAREST))
boards[0].save(OUTPUT / "feral-movement-review.gif", save_all=True, append_images=boards[1:] + [boards[-1]] * 3,
               duration=65, loop=0)
contact = Image.new("RGBA", (384, 384), (22, 23, 28, 255))
for i, frame in enumerate(frames):
    contact.alpha_composite(frame, ((i % 4) * 96, (i // 4) * 96))
contact.resize((768, 768), Image.Resampling.NEAREST).save(OUTPUT / "16-poses-contact.png")
(OUTPUT / "candidate-review.json").write_text(json.dumps({
    "subject": "Hollowed",
    "clip": "feral movement (unapproved)",
    "source": str((SOURCE / "hollow-rigged.blend").relative_to(ROOT)),
    "renderedFrames": 16, "cell": 96, "status": "visual reference ONLY, not production art",
}, indent=2) + "\n")
print("Saved 16 original-rig Cycles preview frames; requires owner visual review")
