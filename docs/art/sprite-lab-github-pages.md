# WyrmForge Sprite Lab — public animation QA app

**Live path:** https://pjotrcasteel.github.io/Wyrmforge/sprite-lab/

This is an independent browser-only tool; it does not modify the game simulation or its asset loaders. Source code is in `src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/`, published by the existing `.github/workflows/pages.yml` (the full `wwwroot` output is deployed).

## Usage
1. Load the included Hollow reference or choose/drag a new PNG/WebP/JPEG.
2. Preview eight directions; five-row concept sheets use mirrored W/SW/NW directions.
3. Play/pause, step frames, adjust FPS, inspect movement and chase a player target.
4. Validate dimensions, clipping, alpha/transparency and frame coverage.
5. Export the normalized eight-row PNG, manifest and QA report.

**The included Hollow art is a non-production concept reference** (opaque background, only five authored viewpoints). It is deliberately NOT READY. Export does not invent new poses or remove opaque pixels.

## Production contract
- Eight unique rows: N, NE, E, SE, S, SW, W, NW.
- Eight motion frames per row, consistent contact pivot/scale, real alternating leg movement.
- Transparent RGBA PNG, no captions/borders/backgrounds.
- Review every frame at native/game scale; validate against the mage's existing art style.
- Treat successful checks as necessary, not sufficient for artistic approval.

The self-contained offline HTML and full source ZIP from the original prototype remain available as conversation artifacts. Keep authored originals when making future sprite atlases.
