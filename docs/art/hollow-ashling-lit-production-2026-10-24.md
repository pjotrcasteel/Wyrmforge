# Hollowed and Ashling — source-derived actor material production (24 October 2026)

**Status: draft, not visually accepted and not yet a production-renderer cutover.**
Dependency: [universal lighting PR #332](https://github.com/pjotrcasteel/Wyrmforge/pull/332).
Work: [actor-material child PR #333](https://github.com/pjotrcasteel/Wyrmforge/pull/333).

Canonical authority: [art-and-animation](../canon/art-and-animation.md), [scene lighting](../design/arena-real-geometry-light-engine.md), and the [G0–G1 boundary](../engineering/universal-lighting-g0-g1.md).
This PR does not touch the lighting engine, C# simulation, temporary/new wizard or Town.

## Exact source material coverage

| Actor | Clip | Frames × directions | Authoritative sampled rig poses | Albedo atlas | Geometry minimum silhouette agreement |
| --- | --- | ---: | --- | --- | ---: |
| Hollowed | walk | 16 × 8 | `rigged-pixel-v3/sampled-walk.npz` | existing `walk.png` | 98.57% |
| Hollowed | attack | 16 × 8 | `rigged-attack-v2/sampled-attack.npz` | existing `attack.png` | 98.75% |
| Hollowed | death | 24 × 8 | `rigged-death-v5/sampled-death.npz` | existing `death.png` | 98.42% |
| Ashling | walk | 16 × 8 | `rigged-block-v4a/sampled-walk.npz` | existing `walk.png` | 98.53% |
| Ashling | attack | 22 × 8 | `rigged-attack-launch-v3/attack-samples.npz` | existing `attack.png` | 96.81% |
| Ashling | death | 28 × 8 | `rigged-death-v3/death-samples.npz` | existing `death.png` | 98.51% |

The two existing 128-frame **walking normal maps from #332 are byte-preserved**, not re-derived. All other image passes come from geometry positions, triangle normals, depth, the authored eye-vertex weights and the authored fire-mesh source. None of the RGB colors of the approved albedo is overwritten. Ashling's intended separate flame/effect pixels are *not* treated as phantom 3D body geometry.

Every clip uses one `lit-materials.json` contract next to the original `manifest.json` and `animation-profile.json`:

- Approved albedo and sourced normal atlas with **exact same alpha/pivot/cell**.
- Pose-derived 16-bit camera-depth PNG. Zero means no body geometry; source camera NDC z is quantized linearly to 16-bit unsigned. The G1 renderer **does not yet consume this depth map for inter-sprite ordering**.
- Pose-derived caster mask and generic optional run-length planar shadow geometry binding. These cast actual light-space shadows **of a flattened character shape only**. This is not internal 3D self-shadowing, nor is a normal map secretly being used as shadow geometry.
- Ashling eye and claw emission masks independently originate from the original posed vertex eye region and fire geometry. These are **data available for use by the shared renderer**; the G1 `MeshPhysicalMaterial` adapter currently lacks a separately bound `emissiveMap`, so full production emission is **not yet wired**.
- Material roughness/specular and independent cast/receive flags are data. No added character-specific light sources or engine branches.

The 976 frames cover **current required walk/attack/death clips only**. Idle currently holds the resting locomotion pose; hit reactions currently use a tint/flash, **not** a separate genuine authored hurt animation. Neither is falsely labelled a finished rigged animation. Before those additional clips can ship, author them from real rigs, verify the game has appropriate authoritative signals, and repeat the same eight-direction export and mobile review. We have not invented hit events in JS.

## Reproducibility and review

The script `tools/art/export-lit-actor-materials.py` verifies source checksums and alpha atlases before writing derived PNGs. Execute:

```sh
python -m pip install numpy Pillow numba
python tools/art/export-lit-actor-materials.py
python tools/art/validate-lit-actor-materials.py
node --test tests/javascript/actor-lit-assets.test.mjs tests/javascript/actor-shadow-mask.test.mjs
```

The [actor-material export workflow](../../.github/workflows/actor-lit-materials.yml) performs this in CI and saves/commits approved-source-derived art. The [separate actor review workflow](../../.github/workflows/actor-lit-review.yml) runs the actual **shared G1 GPU engine** in an isolated `/actor-lit-review/` web route. It captures walking, attacks, death and black-world for **320×568 and 390×844** browser viewports. This is a controlled mobile-size Chromium comparison, not physical iOS/Android acceptance or the actual Hunt engine cutover.

The actor-review adapter takes `litActorSample` from `lighting/actor-asset-contract.js`; it reuses #332's unchanged `LightingEngine`, not a creature-specific shader. Alpha masks are converted to planar geometry by `actor-shadow-mask.js`, avoiding shadow-casting transparent bounding rectangles. Future actor/wizard adoption requires the same atlas/clip/pivot/UV contract. Note that G1 still owns final emission mask sampling, authored depth usage and scene-wide integration.

## Hollowed creative movement candidate — **not approved**

The existing Hollowed shuffle does not convey the intended relentless feral infected. The **separate** source script `tools/sprite-lab/build-hollow-feral-candidate.py` takes the existing weighted mesh and authors a stronger stooped, head-led stride with running legs and controlled arms-back pressure. The original `rigged-pixel-v3` source and all current runtime atlases remain untouched. Its new `.blend`, skinned samples, 16-pose contact sheet and original-rig animated GIF are review evidence, not production. The source script's companion renderer and [CI review workflow](../../.github/workflows/hollow-feral-source-review.yml) preserve and reproduce these.

**Creative movement research:** production discussions of [World War Z's motion capture and keyframing](https://www.postmagazine.com/publications/2013/july-1-2013/vfx-creating-a-zombie-apocalypse-for-world-war-z/) and [infected silhouette/arms-back physicality](https://www.fxguide.com/fxfeatured/zombie-warfare-world-war-z/) inform the *motion principles*, not copying characters, images or animation.

Owner must inspect the GIF and corresponding native pixel/gameplay-speed motion before adoption. The proposed gait's foot contact, full eight directions and action-to-locomotion compatibility must be individually verified with production pixels. This artistic change is intentionally segregated so Ashling remains untouched.

## Final acceptance blockers

1. Shared G1 renderer must bind the sourced emissive mask and height/depth when those capabilities land **in #332**, then prove synchronized source changes on **attack and death**, not just walk.
2. Inspect actual clips and masks, no drift/teleport or animation timing discontinuity, plus 320/390 review pictures, zero-world and moving source/shadow with accepted pixel scale.
3. Review Hollowed feral candidate (and its eight-direction full render) before *any* substitution. Existing owner-approved silhouettes and colours remain the baseline.
4. Verify real Hunt integration, real device sampling, shadows/occlusion under the full scene, and accessibility of attack telegraphs. G1 lab tests alone are not final production proof.
5. Review whether authored idle/hurt clips become necessary under confirmed gameplay animation signals. Current contract has no fake idle or hurt.

Do **not** merge as production art until the required acceptance gates are complete.
