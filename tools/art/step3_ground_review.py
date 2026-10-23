"""Composite Step-3 candidates against existing approved Wet Forest ground artwork.

This is an *art-review-only* scale check, never a gameplay renderer,
material authoring stage, native pipeline or approved sprite export.
The source .blend and RGBA candidate files are not touched.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ATLAS_TILE = 112
MATERIALS = {"grass": 0, "mud": 1, "dirt": 3}
CASES = ((390, 844, "grass"), (320, 568, "mud"))


def repeat_approved_material(atlas, size, material_index):
    """Blend samples only from an approved swatch for a temporary scale mockup.

    The 112px source was not designed to tile without the Arena Materials Lab
    blend renderer. Do not show its checkerboard repetition as representative
    ground. These randomized feathered samples are ART REVIEW ONLY; real Hunts
    keep using the unchanged material system.
    """
    import random
    from PIL import ImageStat

    tile = atlas.crop((material_index * ATLAS_TILE, 0,
                       (material_index + 1) * ATLAS_TILE, ATLAS_TILE)).convert("RGB")
    mean = tuple(round(n) for n in ImageStat.Stat(tile).mean)
    image = Image.new("RGB", size, mean)
    rng = random.Random(271828 + material_index)
    patch_size, spacing, fade = 132, 70, 23
    alpha = Image.new("L", (patch_size, patch_size))
    pixels = alpha.load()
    for y in range(patch_size):
        for x in range(patch_size):
            inset = min(x, y, patch_size - 1 - x, patch_size - 1 - y)
            pixels[x, y] = max(0, min(255, round(inset / fade * 255)))

    patch = tile.resize((patch_size, patch_size), Image.Resampling.LANCZOS)
    for row in range(-2, size[1] // spacing + 2):
        for col in range(-2, size[0] // spacing + 2):
            x = col * spacing + rng.randint(-28, 28)
            y = row * spacing + rng.randint(-28, 28)
            fragment = patch
            if rng.random() < .5:
                fragment = fragment.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if rng.random() < .5:
                fragment = fragment.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            fragment = fragment.rotate(rng.choice((0, 90, 180, 270)))
            image.paste(fragment, (x, y), alpha)
    return image

def render_review(sprite, atlas, width, height, ground, asset):
    image = repeat_approved_material(atlas, (width, height), MATERIALS[ground]).convert("RGBA")
    bounds = sprite.getchannel("A").getbbox()
    if not bounds:
        raise ValueError(f"Empty transparent sprite {asset}")
    cropped = sprite.crop(bounds)
    # Use exactly the candidate source art. Scale is deliberately explicit:
    # these are mobile-size diagnostics, NOT asset data fed to the game.
    target_height = round(height * .34)
    target_width = round(cropped.width * target_height / cropped.height)
    tree = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
    root_y = round(height * .73)
    placement = ((width - tree.width) // 2, root_y - tree.height)
    image.alpha_composite(tree, placement)

    # UI annotation is OUTSIDE the transparent sprite, on the review frame.
    text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)
    draw.rectangle((0, 0, width, 65), fill=(8, 16, 15, 236))
    draw.text((12, 10), f"STEP 3 / {asset.replace('_', ' ').upper()}", fill="white")
    draw.text((12, 31), f"{width}x{height} | approved {ground} ground", fill="#b6c9b4")
    draw.rectangle((0, height - 54, width, height), fill=(8, 16, 15, 235))
    draw.text((12, height - 44), "REVIEW ONLY / not a Hunt render", fill="#ededdf")
    draw.text((12, height - 25), "Tree collider = trunk only, not canopy", fill="#abbeb0")
    return Image.alpha_composite(image, text_layer).convert("RGB")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--renders", type=Path, required=True)
    parser.add_argument("--atlas", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    with Image.open(args.atlas) as raw:
        atlas = raw.convert("RGB")
    assert atlas.width == ATLAS_TILE * 6 and atlas.height == ATLAS_TILE, (
        f"Expected accepted six-swatch atlas, got {atlas.size}")
    args.out.mkdir(parents=True, exist_ok=True)
    for name in ("ancient_oak", "dead_elm"):
        source = args.renders / name / f"{name}-candidate.png"
        with Image.open(source) as data:
            sprite = data.convert("RGBA")
        for width, height, ground in CASES:
            frame = render_review(sprite, atlas, width, height, ground, name)
            target = args.out / f"{name}-{width}x{height}-{ground}.png"
            frame.save(target, optimize=True)
            assert Image.open(target).size == (width, height)
            print(f"Mobile source-art scale preview: {target}")


if __name__ == "__main__":
    main()
