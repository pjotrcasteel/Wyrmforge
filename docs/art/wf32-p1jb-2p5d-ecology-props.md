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
