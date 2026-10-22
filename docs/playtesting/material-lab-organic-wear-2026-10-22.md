# Ground Materials Lab — organic wear contours · 22 October 2026

## Observed iPhone feedback
The owner shared four screenshots at approximately 11:19–11:20 (all-grass On/Off and Natural ground On/Off). The stronger Fine Detail switch now has a visible effect, but On creates distinctive **round tan and bluish smudges**, particularly on all-grass. These read like repeated stamps rather than Gothic, worn forest ground.

## Scoped change
- Keep **Off** pixel-identical with the previously approved six ground paintings.
- The **On** wear clusters now use elongated, meandering **irregular ridge outlines**, blurred softly at the contour (rather than an elliptical radial-gradient stamp). Each outline has independent, seeded top/bottom irregularities.
- Within each cluster, smaller satellites overlap along an irregular slope, so wear reads as a connected scar rather than detached polka-dots. Fewer clusters are placed unevenly across the 672px tile; at least one remains in each horizontal material band.
- In the grass panel, wear samples the approved earthy material instead of the marsh art responsible for conspicuous blue dots.
- All artwork still comes from the six existing approved material panels. No new image assets, scenery, props, materials, game collision or live arena authority.
- Performance: the atlas is baked only when loading, rerolling, or toggling Fine Detail. No change to per-frame rendering or painting.

## Acceptance
1. Run `node --test tests/javascript/arena-materials.test.mjs`, general CI, and browser pixel On/Off test.
2. Inspect On and Off on actual iPhone at all-grass and Natural ground. The main visual criterion is **absence of repeated circles, disconnected teal dots and regular splat patterns**, while retaining readable soil/weathering at phone scale.
3. Do not promote as an approved style until the owner visually accepts it. In case of regressions retain the verified Off baseline.
