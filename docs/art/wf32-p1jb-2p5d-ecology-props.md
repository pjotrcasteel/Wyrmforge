# WF32-P1j-B2 — 2.5D ecology object source correction (30 Oct 2026)

**Technical asset checkpoint only; awaiting owner approval and live-Hunt proof.**
The previous P1j-B assets were flat upright sprites with foot anchors and material maps. That alone did **not** prove a real 2.5D volume, occlusion or shared-G shadow response. Preserve the owner-approved P1i blending and existing C# geography/physics and G renderer.

## Implemented

- `terrain-ecology-props-25d.mjs`: original source-authored volumes for small rock, rock cluster, medium and tall grass in three variants each. No 3D model or mandatory runtime mesh.
- Each candidate has the same foot anchor and 32px-compatible pixel scale as its previous source, plus **separate ground footprint / rear / foreground layers**. Rocks have visible authored oblique top/side faces. Grass has rear and foreground crossing leaves rooted at distinct positions.
- Every layer has matching **albedo / tangent-space normal / roughness / caster-alpha** atlases, aligned by exact frame rectangles. The footprint layer never casts a shadow; visual caster alpha is distinct from C# solid collision.
- World-height and ground-radius authoring metadata use the existing shared sprite-unit convention. The shadow and volume descriptors are **potential** shared `LitRenderable` inputs only; they are not yet registered in the GPU engine. Do not independently elevate already-projected sprite art and accidentally double-project its height.
- `ecology25DSceneCandidates` reuses the existing deterministic, boundary-safe placement candidates. Grass remains nonblocking. Rock collision is only a C# candidate, subject to navigation and solid-prop approval.
- `build-ecology-25d-review.mjs` generates original sprite gallery, world-grounded static composition and layering study. **This is not an actual game capture.**

## Existing engine contracts audited

- Shared G: `src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/contracts.d.ts` defines `LitRenderable` position/geometry/material, optional independent `occluderGeometry`, frame offsets and shadow/lighting response; `lit-sprite.js` establishes foot-anchored sprite planes.
- C# gameplay physics: `ArenaEnvironmentState.IsBlocked`, authoritative barriers and approved `HuntArenaGenerator.Prop` objects. No parallel JS collision, 3D runtime physics, per-prop renderer or fake gameplay obstacle added.
- Canon pixel-first 2.5D: art remains sprites/surfaces, original authored depth, native pixel readability. No default 3D mesh/GLTF pipeline.

## Verification and gates

```sh
node --test tests/javascript/terrain-ecology-props.test.mjs tests/javascript/terrain-ecology-props-25d.test.mjs
node tools/art/prototypes/build-ecology-25d-review.mjs docs/art/previews/wf32-ecology-2p5d
```

- **12/12 focused local tests pass** (6 existing + 6 new) including depth layers, distinct stone top/front geometry, grass occlusion layers, matching albedo/normal/roughness/caster frames, deterministic collision-safe placement and immutable P1i ground.
- Before production adoption: render the authored layers using shared G lighting with correct atlas registration, camera projection, alpha depth sort, actual cast/receive and occlusion in the **real** Hunt at 320/390px, then measure mobile performance. Do not claim these proof gates from a static compositing preview.
- Visual acceptance still with owner. The first source shapes deliberately prioritize structural art correctness and require eventual art refinement (rock volume, irregular natural silhouettes, more organic grass clumps).

**Scope boundary:** no physics, gameplay, C# world generation, AN/AI, or GPU engine implementation changes. This adds authoring/data source only to existing draft PR #429.

## P1j-B3 — thinner grass without thorn-like branches (30 October 2026)

**Owner feedback:** grass transitions into terrain are visually successful, but the medium/tall 2.5D prop blades were too thick and looked like thorns. Preserve all previous layering and blend constraints; refine foliage silhouette only.

- `ECOLOGY_25D_VERSION` is now `wf32-ecology-props-2p5d.v1.1`.
- Medium/tall grass uses individual gently bowed pixel blades, with three-pixel root clusters, primarily two-pixel lower-mid leaves and one-pixel upper tips. The old triangular 5–7 pixel side shoots are gone.
- Leaf count is slightly reduced to reveal ground and rear silhouettes; foot contact remains covered by short, non-casting crown pixels. Each blade still writes the same albedo, normal, roughness and shadow-alpha channels into the existing rear or front layer.
- The original rock-small and rock-cluster variants are **bit-for-bit unchanged** across all channels and layers (regression SHA-256 locked); P1i blended ground, placement and C# collision policy unchanged.
- Focused offline Node tests: **14/14 passing locally** (the prior 12 plus upper-blade density / width and unchanged rock texture checks). Full CI status must be checked separately.
- Before/after crop and static composition are offline source art, not gameplay capture. **Owner aesthetic approval and real Hunt G/camera/occlusion/mobile acceptance remain pending.**

No physics-engine changes or new rendering pipeline. Future lighting and depth work belongs to existing AR3 and shared G owners.


## P1j-B4 — authentic Hollowed / Ashling scale reference (30 October 2026)

**Owner feedback:** grass/rock size is difficult to judge without the actual enemies alongside it. The required reference is production game art at production sprite scale—not a drawn proxy, a stretched atlas frame, or an AI-generated illustration.

- Added tools/art/prototypes/build-ecology-character-scale-review.mjs, producing character-scale-native.png (384×256), character-scale-3x.png (1152×768 nearest-neighbour), and character-scale-manifest.json.
- The Hollowed is the **cape-free production standard** hollow-rigged/arms/standard-walk.png, frame 0, south direction; the Ashling is the **actual fiery-eye production** ashling-rigged/walk.png, frame 0, south direction. Both are read directly from the checked-in runtime PNGs and their manifests.
- The drawing operation reproduces Canvas pixel-art sampling and source foot anchors at reference enemy radius 11: Hollowed 93px cell with [48,72] source anchor, Ashling 81.6px with [48,70]. No guessed resizing or silhouette replacement. Characters and props share an explicit 1× pixel coordinate system.
- Medium grass (28px projected height), tall grass (45px), small stone (12px) and stone cluster (17px) sit at the same ground baseline. A terrain-backed rear → actors → foreground compositing pass makes true overlaps visible, with an exact 3× review for zooming in.
- Separate JavaScript regression tests ensure authentic PNG/manifest provenance, stable world-scale dimensions, native pixel canvas size, actual actor pixels rendered and non-mutating approved ground composition.
- Reproduce without a browser session: run the commands below.

    node tools/art/prototypes/build-ecology-character-scale-review.mjs docs/art/previews/wf32-character-scale
    node --test tests/javascript/terrain-ecology-character-scale.test.mjs tests/javascript/terrain-ecology-props-25d.test.mjs tests/javascript/terrain-ecology-props.test.mjs

**Evidence limits:** This is an *offline composition of actual checked-in sprites*, not a screenshot of a running Hunt. It proves relative authored pixel scale and layered compositing only; real scene registration, dynamic G illumination, engine-driven depth, shadow casting, physical collision and 320/390px device acceptance remain separately gated under their existing owners. The reference does not change the approved P1i blending, actor sprite assets, game engine, physics or AR3 geography.

**Visual gate:** owner to inspect the generated reference before we lock the grass/rock proportions. Grass may need additional soft irregularity after that review, but do not enlarge or simplify it based on a stand-in character.


## P1j-B5 — correct C# enemy radii and owner 2× Hollowed scale direction (30 October 2026)

**Owner correction:** the earlier B4 image falsely treated both actors as radius 11, inflating the Ashling. The Hollowed is meant to read as **twice the Ashling's visible height**, while the approved Ashling appearance remains unchanged. This is new art direction, not authorization to alter the character/animation renderer.

- The reference builder now reads authoritative body radii from src/Wyrmforge.Domain/Combat/Enemies/EnemyCatalog.cs (Hollow 11, Ashling 8), applying the actual shared Canvas clamp radius/11 before source-to-pixel rasterization. A true 1× image uses those values, not matching reference radii.
- The source frame's opaque alpha bounds (Hollow 49px high, Ashling 44px high for south walk frame 0) are measured from real runtime PNG bytes. Comparing only their full 96px *transparent* cells is incorrect.
- Current visible silhouette height ratio is approximately **1.75:1** at the nominal game radii. A separate target image computes the exact per-frame multiplier needed to make Hollowed **2.0:1** against unchanged Ashling; roughly +15% Hollowed appearance scale is sufficient. Never double Hollowed's already-larger sprite or alter its collision radius for this art study.
- Outputs include both current 1×/3× production-proportion comparisons and target-2× 1×/3× previews. Each is clearly recorded in the manifest; the target is not runtime implementation, acceptance, or a live Hunt screenshot.
- JavaScript tests pin the two C# radii, opaque sprite measurements, the target ratio, and unchanged Ashling/right-half composition. Approved P1i ground blending, P1j-B3 foliage, original rock pixels, scene candidates, animation, physics and G lighting stay intact.

**Gate:** Pjotr approves or revises the relative silhouette target visually. A production character-scale change must later go through the existing character presentation owner and normal tests; this art PR does not own that workstream.

## Owner visual-direction confirmation (30 October 2026)

Pjotr reviewed the corrected real-character scale composition showing medium/tall grass, a small rock and a rock cluster against the production Hollowed and Ashling sprites, and replied: **“Grass and stuff looks good!”** This accepts the **visual direction of the represented P1j-B3 grass and rock props**. Keep the current texture, layer and relative prop-size baseline while proceeding; do not reopen thorn-like grass variants without new feedback.

This sign-off is intentionally narrow. It is **not** approval of every unseen variant or biome placement, the separate Hollowed appearance/2× target, C# collision sites, real-Hunt lighting/occlusion, mobile performance, or merging this source-only art PR. The P1i blending approval remains independently preserved. The full prop gallery/mobile and AR3/G integration gates stay open.


## P1j-B6 — complete grass/rock variant gallery, native mobile-width review (30 October 2026)

The owner approved the visual direction of the *shown* P1j-B3 foliage and stones; the remaining variants still need a trustworthy review. No source sprite or terrain-painter changes are needed for this checkpoint.

- The existing character-scale review builder now exports native 320px and 390px wide galleries showing **all 4 prop families × 3 variants** against the real Hollowed and Ashling source frames on each row, using actual C# body radii and the approved world-ground source. A 3× nearest-neighbour enlargement is generated from the 390px source.
- Four labelled rows (small rock / rock cluster / medium grass / tall grass) and V0–V2 columns expose repeated forms and the real 2.5D footprint/rear/actor/front layering. Every reviewed prop is reconstructed from the same existing P1j-B3 authoring function; no art proxy or AI image is introduced.
- Source fingerprints across **all four aligned channels on all three depth slices** make each of the 12 original variants independently identifiable. Tests verify uniqueness and exact source identity across viewport widths; 320/390 are art-canvas dimensions, **not claims of real-device screenshots**.
- Reproduce: run the existing build-ecology-character-scale-review.mjs CLI and inspect all-variants-320-native.png, all-variants-390-native.png, all-variants-390-3x.png and their manifests.
- This is a **source-only quality checkpoint** on the same draft PR #429. Do not change grass or rocks that the owner already liked. Owner visually reviewed the complete 12-variant gallery on 30 October 2026 and replied **“Perfect.”** All three original variants of each of the four grass/rock families are therefore **accepted as the source-art appearance and proportion direction**. Retain these assets without further aesthetic changes unless the owner requests them. This is not approval of runtime placement, the separate Hollowed 2× target, AR3 integration, G dynamic shadow/occlusion, C# collision, phone performance or PR merge. C# AR3 placement, physics, G engine integration, live shadows/occlusion and device performance remain separate gates.
