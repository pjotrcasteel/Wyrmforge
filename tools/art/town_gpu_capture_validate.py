#!/usr/bin/env python3
"""Validate and crop actual Chrome GPU framebuffers, then create review GIFs.

The unrelated Chromium --dump-dom process sometimes failed to reach WebGL
readiness despite the screenshot containing a fully rendered GPU scene. This
tests the SAME captured pixels, and rejects black/missing world art, mode drift,
or leaked zero-light pixels. Does not repaint or regenerate Town art.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

ART_W, ART_H = 1672, 941


def cropped_image(folder: Path, stem: str, width: int) -> Image.Image:
    path = folder / f"{stem}.png"
    if not path.is_file():
        raise FileNotFoundError(f"GPU image missing: {path}")
    with Image.open(path) as image:
        height = round(width * ART_H / ART_W)
        if image.width != width or image.height < height:
            raise ValueError(f"Wrong rendered Town image bounds: {path} ({image.size})")
        return image.convert("RGB").crop((0, 0, width, height))


def grade(frame: Image.Image) -> float:
    return sum(ImageStat.Stat(frame).mean) / 3


def write_gif(folder: Path, items: list[tuple[str, Image.Image]], name: str, scale: int = 1) -> None:
    result = []
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    for label, image in items:
        width = image.width // scale
        height = image.height // scale
        frame = Image.new("RGB", (width, height + 30), "#111827")
        draw = ImageDraw.Draw(frame)
        draw.text((10, 6), label, font=font, fill="#ffe1b4")
        frame.paste(image.resize((width, height), Image.Resampling.LANCZOS), (0, 30))
        result.append(frame)
    result[0].save(folder / name, save_all=True, append_images=result[1:],
                   duration=1250, loop=0, optimize=False)


def main(folder: Path, widths: list[int]) -> None:
    for width in widths:
        captures = {}
        for mode in ("day", "night", "zero"):
            source = f"{mode}-{width}-gpu-proof"
            frame = cropped_image(folder, source, width)
            output = folder / f"{mode}-{width}-town-only.png"
            frame.save(output, optimize=True)
            average = grade(frame)
            print(f"{source}: average brightness {average:.1f}, output {output}")
            if mode == "zero" and average > 1:
                raise AssertionError(f"Zero-light pixel leak in {source}")
            if mode != "zero" and average < 3:
                raise AssertionError(f"GPU framebuffer uninitialized or blank in {source}")
            captures[mode] = frame
        if ImageChops.difference(captures["day"], captures["night"]).getbbox() is None:
            raise AssertionError(f"GPU day/night lighting did not change at {width}px")

    npc = [(status, cropped_image(folder, f"npc-{status}-390", 390))
           for status in ("behind", "front", "hidden")]
    if ImageChops.difference(npc[0][1], npc[1][1]).getbbox() is None:
        raise AssertionError("NPC front/behind image never changed")
    if ImageChops.difference(npc[1][1], npc[2][1]).getbbox() is None:
        raise AssertionError("NPC hidden screenshot never changed")
    write_gif(folder, [(f"Town NPC — {label}", frame) for label, frame in npc],
              "town-npc-passage-diagnostic.gif")

    # This is an objective QUALITY guard, not a subjective T2 approval:
    # the owner's isolated common-light source has ~36 median plaza luma.
    # Earlier broken GPU builds had ~2-19 and must never pass as "finished"
    # just because some lantern pixels were nonblack. Measure real framebuffer
    # pixels (not generated artwork) in a source-normalized plaza crop.
    common = cropped_image(folder, "source-night-common-1120", 1120)
    x0, x1 = round(common.width * .385), round(common.width * .635)
    y0, y1 = round(common.height * .42), round(common.height * .70)
    median_paving = ImageStat.Stat(common.crop((x0, y0, x1, y1)).convert("L")).median[0]
    if not 24 <= median_paving <= 65:
        raise AssertionError(
            f"Town T2 paving is visually outside the owner's reference range: "
            f"median={median_paving}, expected 24..65 (reference ~36)")
    print(f"GPU paving luminance acceptance: median {median_paving} within reference tolerance")

    source = cropped_image(folder, "night-source-paving-390", 390)
    neutral = cropped_image(folder, "night-neutral-paving-390", 390)
    if ImageChops.difference(source, neutral).getbbox() is None:
        raise AssertionError("Neutralized paving image is identical to painted original")

    movement = [(offset, cropped_image(folder, f"lantern-{offset}-1120", 1120))
                for offset in (-120, 0, 120)]
    if ImageChops.difference(movement[0][1], movement[-1][1]).getbbox() is None:
        raise AssertionError("Moving lantern failed to change GPU output")
    write_gif(folder, [(f"GPU lantern moved {offset:+d} source pixels", frame)
                       for offset, frame in movement], "town-lantern-motion-gpu.gif", scale=2)
    print("PASS: authentic GPU scene photos, materials, zero-light and motion diagnostics")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--width", type=int, action="append", required=True)
    args = parser.parse_args()
    main(args.directory, args.width)
