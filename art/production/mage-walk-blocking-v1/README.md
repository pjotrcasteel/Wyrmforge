# Mage walk sprite blocking

Eight directions, 32 frames per direction, and three visual injury states. These are transparent analytical motion sprites derived from one reconstructed skeleton, not the final painted pixel art. The slate-blue hood/cloak, pale collar, charcoal clothing, brown boots and right-hand wooden staff follow the established mage references.

## Use and reproduce

Serve this repository over HTTP and open this folder's `index.html`. It loads the exported PNG atlases and crops the actual cells; it does not redraw independent poses. `direction-review.gif` compares healthy and critical in all eight directions. `atlas.json` contains dimensions, direction rows, common pivot, timing and filenames.

Run `node export.mjs`, `node check_export.mjs`, then `node render_review.mjs /path/to/scratch-frames`. Encode review frames with FFmpeg at 30 fps. Export uses `@napi-rs/canvas`; playback uses browser Canvas only.

Every sheet is 4096×1024, with 128×128 cells: columns are frames 0–31, rows are S, SE, E, NE, N, NW, W, SW. The common ground pivot is (64,107.52). The cell includes staff space; the body is roughly 75–85 pixels high. Direction labels describe projected travel. No image is mirrored, preserving staff hand and injured side. Hood openings disappear in rear views. Each sprite has at least nine pixels of transparent padding in the current export.

The stride remains 1.0667 seconds at 30 fps in every injury state. Root and leg coordinates, stride distance and contacts match exactly. `playback.mjs` resolves screen movement to atlas rows and time to animation frame; it takes no health modifier for timing. `check_export.mjs` reloads all PNGs, checks 768 nonempty cells, transparent borders, all direction mappings and the cycle boundary.

## Scope

The sheets establish consistent directions, cell crops and a reusable animation contract. Final painted textures, cloth movement, cast atlases, stationary poses and game integration remain pending. Do not replace the live mage with these motion sprites as final artwork. Smooth injury transitions are tested in the joint-based viewer under `art/motion/walk-reference-v1`; snapping between baked atlases is not equivalent to that pose blend.
