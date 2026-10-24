# Ground Materials Lab — restore blending and replace destructive Fine Detail (22 October 2026)

## Owner rejection
Two iPhone Safari screenshots at 12:04 (Fine Detail **On**, different natural-ground seeds) show hard rectangular paint remnants, artificial colour patches and disturbed grass/mud/marsh transitions. The previously merged PR #270 passed browser pixel-difference tests but is **not visually accepted**. Those tests mistakenly incentivized large pixel changes rather than protecting original material boundaries.

## Root cause in current code
`buildGroundQuiltAtlas` baked 27 large wear patches plus 48 tiny source-copy marks **per material** whenever Fine Detail was enabled. Some were sampled from entirely different approved material swatches; partial transparent canvas masks and image resizing made rectangular regions/colours visible over existing paint. The normal `drawGroundMaterialTransitions` then blended these damaged atlas images. This can pass a checksum test while failing physically coherent terrain.

## Corrective implementation
- Remove `groundMaterialWearPlan`, `groundMaterialFineDetailPlan`, their masks, extra texture copying and associated rendering paths, not merely lower their opacity.
- Fine Detail **Off** preserves the exact existing approved six-material quilt, tone accents and existing natural boundary composition. Do not change material selection, terrain cell mapping or transitions.
- Fine Detail **On** now runs one deterministic, bounded *within-surface luminance high-pass* over each existing completed 672×672 material panel. Each channel changes by no more than 14/255, alpha and surface coverage are copied unchanged; same-material neighbors wrap at quilt edges. This does not create any new ground material patches, textures, masks, decals, scattering, lighting or collision.
- The render path is unchanged: world-aligned sampling through `drawReferenceGroundBoard` followed by `drawGroundMaterialTransitions`. One bake only when image, seed or toggle changes; no per-frame filter.
- It is presentation-only and remains portable to a future iOS/Android native renderer without depending on a new gameplay authority or browser-only terrain data.

## Verification
- JavaScript tests: input/alpha preservation, bounded channel differences, deterministic periodic neighbor handling, panel-bounded bake, equal number of source sampling operations and gradients between On/Off.
- Mobile browser tests: exact Off restoration, visible *local* differences, per-channel delta less than 19/255 on the final canvas for both six-material sampler and All grass. The previous >2% change at >=16/channel rule is no longer an acceptable objective.
- Also inspect real iPhone screenshots at natural ground and All grass: **no rectangular discolorations, foreign water patches, new seams or lost material edges**. Web/CI tests are not visual approval.

## Future
When further surface realism is needed, change the ground recipe and transition system together and author genuinely cohesive material detail (grass blades, gravel, cracks) as approved source art. Do **not** retry arbitrary overlays or randomly stamp crops of other materials.
