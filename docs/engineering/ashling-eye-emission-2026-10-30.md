# Ashling eye emission — 30 October 2026

## Source of the fault

The approved `ashling-rigged` walk, attack and death atlases contain orange/yellow eye pixels, but the shared GPU proof registered the Ashling with `emissionIntensity: 0` and no emissive map. The live Hunt also uses a transitional Canvas Gothic night veil, which darkens ordinary sprite colors.

## Implemented contract path

- The sprite's runtime manifest declares the *exact* five colors written by `add-ashling-ember-eyes.py` in its authored eye pass. Source atlases and animation metadata are unchanged.
- `lighting/sprite-emission.js` extracts only matching nontransparent RGBA pixels to a frame-aligned mask once when the GPU proof loads an atlas. The renderer treats the mask as a normal `LitMaterial.emissiveMap` with emission intensity. This is a reusable asset property; there is no Ashling-specific GPU shader.
- The C# simulation projects a maximum of two nearby, living Ashling eye glow sources through the existing `LightingSceneComposer` and `GpuLightingFrameProjection`. They have stable owner IDs, world XYZ head height, no shadow maps and automatically disappear when a creature dies/despawns. This local fill is separate from material self-emission.
- The legacy Canvas Hunt consumes the same actor-emitter descriptors via its transitional lighting adapter (head height projected to screen Y); it does not create its own gameplay light simulation.
- The GPU proof can compare material emission on/off without changing light positions, and regression tests verify emissive pixel masking and C# light lifecycle/budget.

## Validation status / remaining gate

The browser GPU proof workflow must confirm actual night/zero-light pixels at 320 and 390 px and capture emission on/off evidence. The live Canvas Hunt uses bounded local eye fill; **it does not yet support GPU emissive sprite maps in the final game render path**. Full material-pixel self-illumination, frame/direction alignment across walk/attack/death, occlusion behind foreground geometry and phone frame pacing must be reviewed in the G5 shared-GPU Hunt cutover before declaring the visual acceptance gate complete. Do not substitute a generated mockup for live captures or claim physical-device validation from desktop Chromium.
