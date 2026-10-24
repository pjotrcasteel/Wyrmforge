# WyrmForge Sprite Lab — public animation QA app

**Live path:** https://pjotrcasteel.github.io/Wyrmforge/sprite-lab/

This is an independent browser-only tool; it does not modify the game simulation or its asset loaders. Source code is in `src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/`, published by the existing `.github/workflows/pages.yml` (the full `wwwroot` output is deployed).

## Usage
1. Inspect the default Hollow walking candidate, choose **Original concept**, or choose/drag a new PNG/WebP/JPEG.
2. Preview eight directions; five-row concept sheets use mirrored W/SW/NW directions.
3. Play/pause, step frames, adjust FPS, inspect movement and chase a player target.
4. Validate dimensions, clipping, alpha/transparency and frame coverage.
5. Export the normalized eight-row PNG, manifest and QA report.

**The original Hollow concept reference** has an opaque background and only five authored viewpoints. It is deliberately NOT READY. The new default [walking candidate](hollow-walk-production.md) has real alpha and eight authored rows, but remains subject to motion/style review. Export does not invent new poses or remove opaque pixels. A format pass never grants production/visual approval in exported metadata.

## Production contract

For the complete future authoring/export/review process, follow the
[card-to-spritesheet production algorithm](card-to-spritesheet-production.md).
The contract below describes the initial walking target, not a universal frame
count for every clip. The current lab does not implement attack/hurt/death lifecycle
or live skeletal blending. Both Hollow animation candidates have been rejected;
see the [current review status](hollow-walk-production.md).
- Eight unique rows: N, NE, E, SE, S, SW, W, NW.
- Select the motion sample count after source review; eight frames per row was the initial target. Preserve consistent ground pivot/scale and real alternating leg movement.
- Transparent RGBA PNG, no captions/borders/backgrounds.
- Review every frame at native/game scale; validate against the mage's existing art style.
- Treat successful checks as necessary, not sufficient for artistic approval.

The self-contained offline HTML and full source ZIP from the original prototype remain available as conversation artifacts. Keep authored originals when making future sprite atlases.
