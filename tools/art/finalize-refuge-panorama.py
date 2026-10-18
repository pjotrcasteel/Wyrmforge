"""Deterministic Refuge art correction: remove white seams and close the vacant forge."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

path = Path("src/Wyrmforge.Presentation.Web/wwwroot/art/refuge-town-panorama.png")
original = Image.open(path).convert("RGB")
if original.size != (2172, 724):
    raise ValueError(f"Unexpected Refuge art dimensions: {original.size}")
image = original.copy()

for center in (733, 1438):
    for x in range(center - 4, center + 5):
        blend = (x - (center - 5)) / 10
        for y in range(image.height):
            left = original.getpixel((center - 7, y))
            right = original.getpixel((center + 7, y))
            image.putpixel((x, y), tuple(round(left[c] * (1 - blend) + right[c] * blend) for c in range(3)))

mask = Image.new("L", image.size, 0)
brush = ImageDraw.Draw(mask)
brush.polygon([(0,341),(152,335),(335,303),(473,350),(562,430),(561,566),(452,636),(225,672),(0,638)], fill=208)
mask = mask.filter(ImageFilter.GaussianBlur(12))
image.paste(ImageEnhance.Brightness(image).enhance(.21), (0, 0), mask)
hearth = Image.new("L", image.size, 0)
brush = ImageDraw.Draw(hearth)
brush.ellipse((189,494,285,571), fill=180)
brush.polygon([(276,469),(381,453),(378,553),(280,569)], fill=125)
hearth = hearth.filter(ImageFilter.GaussianBlur(6))
image.paste(ImageEnhance.Brightness(image).enhance(.05), (0, 0), hearth)
image.save(path, optimize=True)
print(f"Updated {path}: {image.size}")