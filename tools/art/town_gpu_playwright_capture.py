#!/usr/bin/env python3
"""Capture real shared-WebGL Town frames after render readiness, never a race against Chromium startup.

Runs on GitHub Actions with Playwright, Chromium and Pillow. Preserves the same
T2 screenshot names and source-pixel acceptance validators as the previous job.
The existing universal engine is exercised through town-relighting-preview.html.
"""
import argparse
import asyncio
import io
from pathlib import Path
from urllib.parse import urlencode

from PIL import Image, ImageStat
from playwright.async_api import async_playwright


def captures():
    for width, height in [(320, 760), (390, 844), (1120, 870)]:
        for mode in ("day", "night", "zero"):
            yield f"{mode}-{width}-gpu-proof", (width, height), dict(mode=mode)
    for domain in ("common", "nexus", "blacksmith", "codex", "hall", "combined", "off"):
        name = "zero-domain-off-390" if domain == "off" else f"domain-{domain}-390"
        yield name, (390, 844), dict(mode="night", domains=1, domain=domain, npc="off")
    for width in (320, 1120):
        for domain in ("common", "blacksmith"):
            yield f"domain-{domain}-{width}", (width, 870), dict(
                mode="night", domains=1, domain=domain, npc="off")
    # Explicit material diagnosis: same GPU lights with (a) doubly dark night
    # painted albedo versus (b) a brighter, still UNAPPROVED daytime candidate.
    for source in ("night", "day-candidate"):
        for domain in ("common", "combined"):
            yield f"source-{source}-{domain}-1120", (1120, 870), dict(
                mode="night", domains=1, domain=domain, source=source, npc="off")
    for name, school, white in (
        ("domain-nexus-neutral-390", "none", 1),
        ("domain-nexus-fire-390", "fire", 0),
        ("domain-nexus-frost-390", "frost", 0),
    ):
        yield name, (390, 844), dict(
            mode="night", domains=1, domain="nexus", school=school, white=white, npc="off")
    for passage, options in [
        ("behind", dict(mode="night", npcProgress=0)),
        ("front", dict(mode="night", npcProgress=1)),
        ("hidden", dict(mode="night", npc="off")),
    ]:
        yield f"npc-{passage}-390", (390, 844), options
    for paving in ("source", "neutral"):
        yield f"night-{paving}-paving-390", (390, 844), dict(mode="night", paving=paving, npc="off")
    for inspection in ("shadow-visibility", "normals", "albedo"):
        for passage, progress in (("behind", 0), ("front", 1)):
            yield f"{inspection}-npc-{passage}-390", (390, 844), dict(
                mode="night", paving="neutral", view=inspection, npcProgress=progress)
    for offset in (-120, 0, 120):
        yield f"lantern-{offset}-1120", (1120, 870), dict(mode="night", offset=offset)
    for mode in ("day", "night"):
        yield f"stage4-{mode}-1120", (1120, 870), dict(wellV4=1, mode=mode, npc="off")
    yield "zero-stage4-1120", (1120, 870), dict(wellV4=1, mode="zero", npc="off")
    for offset in (-100, 100):
        yield f"stage4-lantern-{offset}-1120", (1120, 870), dict(
            wellV4=1, mode="night", offset=offset, npc="off")


def acceptable(png, name):
    with Image.open(io.BytesIO(png)) as source:
        rgb = source.convert("RGB")
        if rgb.width <= 0 or rgb.height <= 0:
            return False, 0
        # Compare only the actual Town canvas; the rest of mobile screenshot is black.
        rgb = rgb.crop((0, 0, rgb.width, min(rgb.height, round(rgb.width * 941 / 1672))))
        mean = sum(ImageStat.Stat(rgb).mean) / 3
    if name.startswith("zero-"):
        return mean <= 1, mean
    return mean >= (0.6 if name.startswith("domain-") else 3), mean


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--base", default="http://127.0.0.1:4179/town-relighting-preview.html")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=args.chrome, headless=True,
            args=[
                "--no-sandbox", "--disable-dev-shm-usage",
                "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
                "--force-device-scale-factor=1", "--hide-scrollbars",
            ],
        )
        try:
            for name, (width, height), params in captures():
                url = args.base + "?capture=1&" + urlencode(params)
                success = False
                last_error = ""
                for attempt in range(1, 5):
                    page = await browser.new_page(viewport={"width": width, "height": height},
                                                  device_scale_factor=1)
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                        await page.wait_for_function(
                            "() => document.querySelector('#town-gpu')?.dataset.ready === 'true'",
                            timeout=35000)
                        await page.wait_for_timeout(200)
                        png = await page.screenshot(animations="disabled")
                        valid, mean = acceptable(png, name)
                        print(f"{name}: GPU mean={mean:.3f}, acceptable={valid}, attempt={attempt}", flush=True)
                        if valid:
                            (args.output / (name + ".png")).write_bytes(png)
                            success = True
                            break
                        last_error = "Canvas remained black or failed pixel validity check"
                    except Exception as error:
                        last_error = str(error)
                    finally:
                        await page.close()
                if not success:
                    raise RuntimeError(f"Real GPU capture failed for {name}: {last_error}")
        finally:
            await browser.close()
    print("PASS: all T2 screenshots taken after shared WebGL readiness, with pixel validation.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
