#!/usr/bin/env python3
"""Build six school appearances from one artist-drawn 64x80 Wizard foundation.

All variants are deterministic overlays of shared pixel frames. They are
review studies, not approved eight-way animations or runtime game assets.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
CELL = (64, 80)
FEET_ANCHOR = (32, 74)
EXPECTED_SCHOOLS = (
    "fire", "frost", "storm", "arcane", "necromancer", "summoner"
)
CLIPS = {
    "idle": ("idle-side-grey-4f-64x80.png", 4),
    "run": ("run-side-grey-6f-64x80.png", 6),
}
GREY_CLOTH = frozenset({
    (115, 112, 120), (75, 74, 82), (35, 36, 41), (52, 52, 60)
})
HAT_LIGHT = (240, 154, 83)
HAT_SHADOW = (128, 74, 30)


def parse_color(value: str) -> tuple[int, int, int]:
    if not isinstance(value, str) or re.fullmatch(r"#[0-9a-fA-F]{6}", value) is None:
        raise ValueError(f"Invalid school color: {value!r}")
    return tuple(bytes.fromhex(value[1:]))


def load_styles(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != "wyrmforge.wizard.school-overlays.v1":
        raise ValueError("Unsupported school overlay schema")
    if set(data.get("schools", {})) != set(EXPECTED_SCHOOLS):
        raise ValueError("Exactly the six canonical WyrmForge schools are required")
    if data.get("base", {}).get("cell") != list(CELL):
        raise ValueError("School visual profile must use the shared 64x80 cell")
    if data["base"].get("feetAnchor") != list(FEET_ANCHOR):
        raise ValueError("School visual profile changed the canonical feet anchor")
    for name, style in data["schools"].items():
        for key in ("accentLight", "accentDark"):
            parse_color(style.get(key))
        if not style.get("name"):
            raise ValueError(f"Missing school name: {name}")
    return data


def read_frames(path: Path, count: int) -> list[Image.Image]:
    atlas = Image.open(path).convert("RGBA")
    if atlas.size != (CELL[0] * count, CELL[1]):
        raise ValueError(f"Invalid foundation atlas dimensions: {path}: {atlas.size}")
    return [atlas.crop((index * CELL[0], 0, (index + 1) * CELL[0], CELL[1]))
            for index in range(count)]


def apply_school_overlay(
    frame: Image.Image, style: dict, clip: str
) -> Image.Image:
    """Color garment regions only; do not touch silhouette or animation.

    The source has a distinct two-row hat band and a grey robe silhouette.
    A bounded hat-band remap and a three-pixel hem-edge trim track existing
    opaque artist pixels; neither draws on transparent/background pixels.
    """
    if clip not in CLIPS:
        raise ValueError(f"Unsupported clip: {clip}")
    if frame.size != CELL or frame.mode != "RGBA":
        raise ValueError("Expected native 64x80 RGBA foundation frame")
    light = parse_color(style["accentLight"])
    dark = parse_color(style["accentDark"])
    result = frame.copy()
    pixels = result.load()

    band_start, band_end = (18, 22) if clip == "run" else (22, 26)
    for y in range(band_start, band_end):
        for x in range(CELL[0]):
            red, green, blue, alpha = pixels[x, y]
            if not alpha:
                continue
            rgb = (red, green, blue)
            if rgb == HAT_LIGHT:
                pixels[x, y] = (*light, alpha)
            elif rgb == HAT_SHADOW:
                pixels[x, y] = (*dark, alpha)

    for y in range(56, 74):
        garment_x = [
            x for x in range(CELL[0])
            if pixels[x, y][3] and pixels[x, y][:3] in GREY_CLOTH
        ]
        if not garment_x:
            continue
        right_edge = max(garment_x)
        for x in range(max(0, right_edge - 2), right_edge + 1):
            red, green, blue, alpha = pixels[x, y]
            if alpha and (red, green, blue) in GREY_CLOTH:
                pixels[x, y] = (*dark, alpha)

    if result.getchannel("A").tobytes() != frame.getchannel("A").tobytes():
        raise AssertionError("School overlay changed the source silhouette")
    return result



def extract_layer(frame: Image.Image, appearance: Image.Image) -> Image.Image:
    """Extract an editable opaque-pixel color layer without copying the body."""
    if frame.size != CELL or appearance.size != CELL:
        raise ValueError("Layer extraction expects shared native cells")
    if frame.mode != "RGBA" or appearance.mode != "RGBA":
        raise ValueError("Layer extraction expects RGBA")
    if frame.getchannel("A").tobytes() != appearance.getchannel("A").tobytes():
        raise ValueError("Appearance cannot change the shared silhouette")
    layer = Image.new("RGBA", CELL)
    for y in range(CELL[1]):
        for x in range(CELL[0]):
            before = frame.getpixel((x, y))
            after = appearance.getpixel((x, y))
            if before != after:
                if not before[3]:
                    raise ValueError("Cannot paint an invisible foundation pixel")
                layer.putpixel((x, y), (*after[:3], 255))
    return layer


def compose_layer(frame: Image.Image, layer: Image.Image) -> Image.Image:
    """Composite editable school color details while preserving source alpha."""
    if frame.size != CELL or layer.size != CELL:
        raise ValueError("School layer dimensions must be 64x80")
    if frame.mode != "RGBA" or layer.mode != "RGBA":
        raise ValueError("School layers must be RGBA")
    result = frame.copy()
    for y in range(CELL[1]):
        for x in range(CELL[0]):
            color = layer.getpixel((x, y))
            if not color[3]:
                continue
            source = frame.getpixel((x, y))
            if not source[3]:
                raise ValueError(f"School layer extends outside body: {(x, y)}")
            if color[3] != 255:
                raise ValueError(f"School layer requires full-alpha paint: {(x, y)}")
            result.putpixel((x, y), (*color[:3], source[3]))
    return result


def build_layered_frames(
    foundation: dict, styles: dict, layer_source: Path | None = None
) -> tuple[dict, dict]:
    """Return editable color layers plus their composites for all six schools.

    With layer_source, artists may repaint the exported transparent PNG atlases.
    The shared source is still never changed, and painting outside its opaque
    silhouette fails before any output file is created. Equipment is separate.
    """
    layers = {}
    variants = {}
    for school in EXPECTED_SCHOOLS:
        style = styles["schools"][school]
        layers[school] = {}
        variants[school] = {}
        for clip, base_frames in foundation.items():
            if layer_source is None:
                clip_layers = [
                    extract_layer(frame, apply_school_overlay(frame, style, clip))
                    for frame in base_frames
                ]
            else:
                layer_path = (
                    layer_source / school / "layers" / f"{clip}-side-64x80.png"
                )
                clip_layers = read_frames(layer_path, len(base_frames))
            layers[school][clip] = clip_layers
            variants[school][clip] = [
                compose_layer(frame, layer)
                for frame, layer in zip(base_frames, clip_layers, strict=True)
            ]
    return layers, variants

def atlas_from_frames(frames: list[Image.Image]) -> Image.Image:
    if not frames or any(frame.size != CELL for frame in frames):
        raise ValueError("Cannot pack incomplete or non-native frames")
    atlas = Image.new("RGBA", (CELL[0] * len(frames), CELL[1]))
    for index, frame in enumerate(frames):
        atlas.paste(frame, (CELL[0] * index, 0))
    return atlas


def _review_font():
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans.ttf",
        "arial.ttf",
    ):
        try:
            return ImageFont.truetype(name, 18)
        except OSError:
            continue
    return ImageFont.load_default()


def school_lineup(styles: dict, runs: dict, index: int) -> Image.Image:
    """3x2 preview grid; each pose comes from the SAME shared animation frame."""
    board = Image.new("RGB", (768, 700), (20, 21, 27))
    draw = ImageDraw.Draw(board)
    font = _review_font()
    for school_index, school in enumerate(EXPECTED_SCHOOLS):
        x0 = (school_index % 3) * 256
        y0 = (school_index // 3) * 350
        draw.rounded_rectangle(
            (x0 + 6, y0 + 5, x0 + 250, y0 + 345),
            radius=9, fill=(31, 32, 40)
        )
        draw.text((x0 + 20, y0 + 15),
                  styles["schools"][school]["name"].upper(),
                  fill=(230, 228, 224), font=font)
        image = runs[school][index].resize((256, 320), Image.Resampling.NEAREST)
        board.paste(image, (x0, y0 + 30), image)
    return board


def generate(
    base_dir: Path, style_path: Path, out_dir: Path,
    layer_source: Path | None = None
) -> dict:
    """Never rewrite source sheets or overwrite a previous visual-review run."""
    if out_dir.exists():
        raise FileExistsError(f"Refusing to overwrite school art: {out_dir}")
    styles = load_styles(style_path)
    foundation = {
        clip: read_frames(base_dir / filename, count)
        for clip, (filename, count) in CLIPS.items()
    }
    layers, variants = build_layered_frames(foundation, styles, layer_source)
    out_dir.mkdir(parents=True)
    for school in EXPECTED_SCHOOLS:
        school_dir = out_dir / school
        school_dir.mkdir()
        layer_dir = school_dir / "layers"
        layer_dir.mkdir()
        for clip in CLIPS:
            atlas_from_frames(layers[school][clip]).save(
                layer_dir / f"{clip}-side-64x80.png"
            )
            atlas_from_frames(variants[school][clip]).save(
                school_dir / f"{clip}-side-64x80.png"
            )

    first = school_lineup(styles, {s: variants[s]["run"] for s in EXPECTED_SCHOOLS}, 0)
    first.save(out_dir / "six-schools-first-pose.png")
    loop = [
        school_lineup(styles, {s: variants[s]["run"] for s in EXPECTED_SCHOOLS}, i)
        for i in range(CLIPS["run"][1])
    ]
    loop[0].save(
        out_dir / "six-schools-run-loop.gif",
        format="GIF", save_all=True, append_images=loop[1:],
        duration=125, loop=0, optimize=True
    )
    manifest = {
        "schema": styles["schema"],
        "schoolIds": list(EXPECTED_SCHOOLS),
        "baseRun": CLIPS["run"][0],
        "baseIdle": CLIPS["idle"][0],
        "cell": list(CELL),
        "feetAnchor": list(FEET_ANCHOR),
        "directionStatus": "side-facing candidate only; not an eight-way sheet",
        "renderedModifiers": ["school hat band", "robe front hem trim"],
        "editableSchoolLayers": "<school>/layers/<clip>-side-64x80.png",
        "layerSource": "manual" if layer_source is not None else "generated",
        "layerSafety": "opaque foundation pixels only; no silhouette edits",
        "reservedModifiers": ["staff object", "back symbol", "spell glow", "attachments"],
        "approvedForGame": False,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=HERE)
    parser.add_argument("--styles", type=Path, default=HERE / "school_styles.json")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument(
        "--layer-source", type=Path, default=None,
        help="Existing six-school output root with artist-edited layer PNGs"
    )
    args = parser.parse_args()
    generate(args.base, args.styles, args.out, args.layer_source)


if __name__ == "__main__":
    main()
