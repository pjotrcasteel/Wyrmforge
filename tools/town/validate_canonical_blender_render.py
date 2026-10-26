"""Compare the actual CPU-Blender rendered 3D Town against canonical art.

A valid glTF or .blend is necessary, but not sufficient: this perceptual color
gate fails if the 3D camera silently zooms, drifts, changes tone, or loses the
approved Gothic center composition. Uses exactly the T1 canonical camera.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town"
EVIDENCE = ROOT / "artifacts/town-t1-t2"
PREVIEW = ASSETS / "geometry/t2-canonical-projected-3d.png"
SOURCE = ASSETS / "night-active.webp"
MAE_THRESHOLD = 20.0

def check() -> float:
    approved = Image.open(SOURCE).convert("RGB")
    rendered = Image.open(PREVIEW).convert("RGB")
    assert approved.size == (1672, 941), f"Unexpected approved source frame: {approved.size}"
    assert rendered.size == (390, 844), f"Unexpected Blender approval frame: {rendered.size}"
    width, height = rendered.size
    visible_source_width = approved.height * width / height
    left = (approved.width - visible_source_width) / 2
    expected = approved.transform(
        (width, height), Image.Transform.EXTENT,
        (left, 0, left + visible_source_width, approved.height),
        resample=Image.Resampling.BILINEAR
    )
    diff = ImageChops.difference(rendered, expected)
    mae = sum(ImageStat.Stat(diff).mean) / 3
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    comparison = Image.new("RGB", (width * 3, height + 24), "#0b111b")
    for index, (label, image) in enumerate((
        ("Approved Town", expected),
        ("Blender 3D Town", rendered),
        ("3x pixel difference", diff.point(lambda px: min(255, px * 3)))
    )):
        x = index * width
        comparison.paste(image, (x, 24))
        ImageDraw.Draw(comparison).text((x + 8, 5), label, fill="white")
    output = EVIDENCE / "canonical-vs-blender.png"
    comparison.save(output)
    print(f"Blender vs approved Town: MAE={mae:.3f}/255, limit={MAE_THRESHOLD}; review={output}")
    assert mae < MAE_THRESHOLD, (
        f"The Blender 3D camera/materials diverge from the approved Gothic Town: "
        f"MAE {mae:.2f} >= {MAE_THRESHOLD}"
    )
    return mae

if __name__ == "__main__":
    check()
