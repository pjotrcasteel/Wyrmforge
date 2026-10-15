"""Measure alpha bounds and write atlas metadata; never alter the source images."""
import json
from pathlib import Path
from statistics import median
from PIL import Image

ROOT = Path(__file__).resolve().parent


def atlas(filename, columns, rows, names, regions=None, category="actor", world_height=80):
    image = Image.open(ROOT / filename).convert("RGBA")
    alpha = image.getchannel("A")
    if regions is None:
        regions = [(round(c * image.width / columns), round(r * image.height / rows),
                    round((c + 1) * image.width / columns), round((r + 1) * image.height / rows))
                   for r in range(rows) for c in range(columns)]
    frames = []
    for name, region in zip(names, regions, strict=True):
        mask = alpha.crop(region).point(lambda a: 255 if a >= 32 else 0)
        bounds = mask.getbbox()
        if bounds is None:
            raise ValueError(f"Empty frame {filename}: {name}")
        x0, y0, x1, y1 = bounds
        x, y = region[0] + x0, region[1] + y0
        width, height = x1 - x0, y1 - y0
        # Actor pivot follows the hood/torso center rather than a trailing cloak.
        if category == "mage":
            import numpy as np
            pixels = np.asarray(alpha)[y + int(height * .18):y + int(height * .35), x:x + width]
            _, columns_with_alpha = np.where(pixels >= 160)
            anchor_x = float(median(columns_with_alpha.tolist())) if len(columns_with_alpha) else width / 2
        else:
            anchor_x = width / 2
        frames.append({"name": name, "source": [x, y, width, height], "pivot": [round(anchor_x, 1), height]})
    scale = world_height / median(f["source"][3] for f in frames)
    return {"file": filename, "size": list(image.size), "scale": scale, "frames": frames,
            "status": "prototype-review", "alpha": list(alpha.getextrema())}


manifest = {
    "version": 1,
    "status": "Art prototypes; not integrated into the live game.",
    "camera": "Elevated three-quarter orthographic study; validate against gameplay before acceptance.",
    "mage": atlas("mage-idle-directions-v1.png", 4, 2, ["S", "SW", "W", "NW", "N", "NE", "E", "SE"], category="mage"),
    "scavenger": atlas("scavenger-walk-se-v1.png", 4, 2, [str(i) for i in range(8)], world_height=42),
    "props": atlas("forest-props-v1.png", 3, 2, ["fir", "wall-ne", "wall-nw", "doorway", "fence", "rubble"],
                   regions=[(0, 0, 445, 558), (445, 0, 1035, 555), (1035, 0, 1536, 555),
                            (0, 558, 445, 1024), (445, 558, 1040, 1024), (1040, 558, 1536, 1024)], world_height=120),
    "terrain": {"file": "forest-mud-v1.png", "status": "repeat-study; exact edge continuity not guaranteed"},
    "reviewOnly": [{"file": "review/mage-cast-se-keyposes-v1.png", "reason": "Check handedness, costume continuity, pivot and frame boundaries before animation."}],
    "rejected": ["Mage walk attempts repeat the same leading leg and must not be used as a walking loop."]
}
(ROOT / "atlas.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({k: len(manifest[k]["frames"]) for k in ["mage", "scavenger", "props"]}))
