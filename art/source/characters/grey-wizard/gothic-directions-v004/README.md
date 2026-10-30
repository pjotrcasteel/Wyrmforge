# Gothic wizard directional idle source study

Not a finished animation or runtime replacement. Eight generated neutral views,
sampled to the existing v003 96-colour palette, binary alpha, 160px padded cells.
Contact-sheet order: S, SW, W, NW / N, NE, E, SE. Atlas order is the same.

The corrected high-resolution source and exact built-in ImageGen prompts are
preserved in the parent directory. Initial study remains for traceability.
No third-party reference-pack artwork was supplied to the image model.

Rebuild: `node tools/art/grey-wizard/prepare-directions.mjs`; verify deterministic
outputs with `--check`. Sampling registers silhouette height to128 native pixels,
not anatomical crown/sole landmarks. Anchor [80,141] is a source study guide;
worldSize72.944643 is retained as a guide, not proven parity for these new views.
Do not replace the existing south walk or published lab assets with this sheet.

Open art issues: NW is too close to N, back three-quarter perspective needs work,
costume/staff details drift, and 2.5D projection/foot registration need refinement.
No authored directional movement, cast/hurt/death, source layers, relightable
materials, actual Hunt capture or phone acceptance is supplied by these images.
Eleven deterministic sampled files pass; that verifies export reproducibility,
not artistic acceptance. Source alpha is genuine; preview RGB gradients are hidden
by its alpha, and native output uses a128 cutoff to preserve hard sprite edges.
