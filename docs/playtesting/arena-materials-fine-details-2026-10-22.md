# WyrmForge Material Lab: fine-ground material study (22 October 2026)

Canonical references: [Art and animation](../canon/art-and-animation.md), [Hunts and world](../canon/hunts-and-world.md).

## Owner acceptance and intent
The six existing Gothic ground materials, their large texture quilts, natural-ground preview and blended transitions are an accepted visual foundation. Do **not** replace them. The next iteration explores natural small-scale variation **inside existing textures**, with no added scenery.

## Slice
- A **Fine detail Off / On** comparison control in the original `/arena-materials` lab. Off is deliberately the unchanged accepted default.
- When enabled, six deterministic local clusters of eight tiny, feathery marks are baked per surface into the existing quilt. Their pixels are taken only from the six approved ground illustrations. Most marks sample the same material; a limited minority use the already-approved related-material pair (moss/soil wear, wetness).
- Marks are clustered rather than random confetti. Wrap across the 672px tile edge *within* each material panel. Sampling remains world-aligned between neighboring painted cells.
- This is a one-time image-load/toggle bake; there is **no** per-frame procedural geometry. The optional study does not modify the seeded material board, player collision, enemy systems, roads, props, lighting or ordinary Hunts.
- The independent continuous-stroke fix in [PR #259](https://github.com/pjotrcasteel/Wyrmforge/pull/259) is a prerequisite. The fine-detail branch builds on that fix; its PR temporarily targets main to enable the standard CI and browser-preview workflows.

## Validation and acceptance
Run `node --test tests/javascript/arena-materials.test.mjs`. New tests cover deterministic count and bounds, variation by seed, sampling exclusively from approved material swatches, and actual optional drawing only when enabled. Existing visual and gesture regressions must remain green.

The implementation is **not** considered visually approved until iPhone comparison of Fine detail Off/On on uniform grass, soil, paving and the seeded Natural ground preview. Check for clustered natural wear (not polka dots, pattern repetition or an overly busy floor) and that gestures/undo remain fluid. Keep Off as default until accepted.

## Future
Only after the material fidelity is accepted should the isolated Lab's surfaces become a candidate for physically consistent ground recipes in C#-driven arenas. Never splice the separate JavaScript preview generator into gameplay authority.
