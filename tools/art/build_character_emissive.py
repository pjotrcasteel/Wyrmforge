"""Builds the emissive strip of every glowing authored character from its own animation strips.

The owner's draft emissive maps in the handover Archive use the old source layouts and are not registered to the new animation atlases
(START-HERE-CLAUDE.md says not to bind them), so the glow is taken from the new frames themselves: hot, saturated orange to yellow pixels
(cracks, veins, eyes, lanterns, the gold core). A strip is built from the same pixels it lights, so it is registered by construction.
Replace this with the owner's registered maps if they are supplied; the loader only needs `<set>/emissive/<action>.png` of the same size.

    python tools/art/build_character_emissive.py
"""
import colorsys
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "src" / "Wyrmforge.Presentation.Web" / "wwwroot" / "art" / "characters"
# Only the three fire bosses get a glow strip: their glow is what the light, and the second form, is about. The small enemies glow only in their\n# eyes (already lit by C# eye lights), and one texture upload per actor per frame would cost more than it shows.
GLOWING = ["Ashfang-normal", "Ashfang-enraged", "Bell-Warden-normal", "Bell-Warden-molten", "Reliquary-normal", "Reliquary-awakened",
           "Ashling", "Ash-Slinger", "Ash-Priest", "Wizard"]
VALUE, SATURATION = 0.60, 0.55


def is_hot(pixel):
    r, g, b, a = pixel
    if a < 200:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return v >= VALUE and s >= SATURATION and (h <= 0.15 or h >= 0.96)


def build(name):
    folder = ROOT / name
    manifest_path = folder / "manifest.json"
    raw = manifest_path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    manifest = json.loads(raw.decode("utf-8"))
    out = folder / "emissive"
    out.mkdir(exist_ok=True)
    written = {}
    for action, spec in manifest["actions"].items():
        strip = Image.open(folder / spec["image"].split("/")[-1]).convert("RGBA")
        mask = Image.new("RGBA", strip.size, (0, 0, 0, 0))
        source, target, count = strip.load(), mask.load(), 0
        for y in range(strip.height):
            for x in range(strip.width):
                if is_hot(source[x, y]):
                    target[x, y] = source[x, y][:3] + (255,)
                    count += 1
        path = out / f"{action}.png"
        if count:
            mask.save(path, optimize=True)
            written[action] = count
        elif path.exists():
            path.unlink()
    manifest["emissive"] = sorted(written)
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    manifest_path.write_bytes(text.replace("\n", newline).encode("utf-8"))
    return written


if __name__ == "__main__":
    for name in GLOWING:
        if not (ROOT / name / "manifest.json").exists():
            print(f"{name}: missing", file=sys.stderr)
            continue
        written = build(name)
        print(f"{name}: {len(written)} strips, {sum(written.values())} emissive pixels")
