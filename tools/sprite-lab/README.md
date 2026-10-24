# WyrmForge Sprite Lab (standalone side project)

A dependency-free, local/offline visual motion inspector. It previews **all eight walking directions** against a static target or in chase mode, shows individual frames, validates an atlas, and exports a normalized 8-direction PNG, manifest, and JSON QA report.

Version 0.3 opens The Hollow's rigged walking **candidate**: 16 frames,
192px cells, one three-quarter view. **Before** restores the rejected generated
eight-view animation; **Concept** restores the original reference.
Format pass never means artistic approval. See [review status](../../docs/art/hollow-walk-production.md).

**20 October correction:** the owner also rejected the rigid v2 walk. Its presence
in the lab is not acceptance. Future work follows the
[card-to-spritesheet production algorithm](../../docs/art/card-to-spritesheet-production.md).
The current inspector handles walking; multi-clip lifecycle playback and transition
review described in that procedure require a separate implementation.

## Open it

Open `index.html` in Chrome, Safari or Edge. The included Hollow reference is loaded automatically, including via `file://`. Alternatively, run:

```sh
python3 -m http.server 8000
# Open http://localhost:8000
```

No `npm install`, account, upload service, build step or network connection needed. All images are processed locally in your browser.

## Try it

1. Play the reference Hollow. Choose one of eight arrows to inspect each facing.
2. Select **Chase player**, then click/touch the arena to reposition the player target. The actor pursues and selects the appropriate eight-way walking view.
3. Change FPS or scale; click individual frames to pause; use the step button for frame-by-frame QA.
4. Drag another PNG into **Source sheet**. Set five or eight rows, frame size and offsets as needed.
5. Check the **Validation** panel. Red failures must be corrected for production use. Amber items indicate deviations or limitations.
6. Export an 8-way PNG atlas, the JSON manifest, and a QA report.

## Explicit limitations of the prototype reference

- The Hollow image made in chat is a *concept presentation sheet*, not yet a clean production asset. Its **painted background is opaque** and its frames are rendered rather than pixel-perfect. The lab correctly reports transparency failure.
- It has **eight walking frames across five authored directions** (S, SE, E, NE, N). The inspector derives SW, W and NW by flipping the matching eastward views. The generated 8-way export is **not** eight independently authored viewpoints.
- Exporting the atlas does **not** magically remove the painted background or add missing motions/poses. The sample proves the inspector, not final gameplay quality.
- No combat AI/game behavior or WyrmForge runtime was changed.

## Target contract for future enemies

See [the current production contract](../../docs/art/sprite-lab-github-pages.md). This side tool deliberately has no runtime integration; the live game currently uses other sprite formats and requires an explicit adapter before these new atlases can replace assets.

## Tests

From the repository root: `node --test tools/sprite-lab/tests/*.test.js` (Node only).
Rebuild the reviewed packing: `node tools/sprite-lab/build-hollow-walk.mjs`.
Rebuild the corrected rig: `node tools/sprite-lab/build-hollow-rig.mjs`.
Use **Stride test** to compare planted feet against world travel. Other views
are intentionally disabled for this asset until the gait has been accepted.

## Structure

- `assets/` — included Hollow concept atlas as test fixture
- `src/lab-core.js` — eight-way indexing, mirroring, direction quantization, validation, manifest
- `src/lab-app.js` — browser UI, animation renderer, PNG and JSON export
- `src/styles.css` — responsive offline layout
- `tests/` — pure logic regression tests
- `docs/` — new art contract for all future enemies

## GitHub Pages

The live app is published with the Wyrmforge Pages workflow at https://pjotrcasteel.github.io/Wyrmforge/sprite-lab/.
The editable website source is in `src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/` and is separate from game logic.
