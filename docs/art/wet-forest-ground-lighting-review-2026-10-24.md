# Wet Forest V2 — Ground first, lit by the shared GPU engine

**Review milestone 1 (24 October 2026). Source material is approved baseline, not new art approval.**
Parent: [PR #332 — universal lighting G0–G1](https://github.com/pjotrcasteel/Wyrmforge/pull/332).
Authority: [approved ground reset](../playtesting/arena-ground-foundation-reset-2026-10-22.md),
[ground-only trail milestone](../playtesting/arena-step2-natural-terrain-and-trails-2026-10-22.md),
[universal visibility](../design/arena-real-geometry-light-engine.md),
[canonical art](../canon/art-and-animation.md).

## Why ground comes first

The owner explicitly stopped the previous forest environment and requested a coherent new Gothic art identity.
Do **not** revive the rejected oak, structures, colliders or painted forest props.
The recent forest/tree concept sheets are references, **not** runtime assets, and will be addressed only
after new ground and material transitions have passed the mobile review.

This slice reuses the six *previously approved* ground-source paintings in the existing Materials Lab
as the unmodified comparison baseline, rather than secretly declaring newly generated placeholder art approved.
It intentionally selects only **one** material per scene: moss/grass, wet mud, forest soil or marsh. No road,
paving, scorch, mixed material boundaries, props, actors, collision, fake normals or baked light.

## Implementation

- Visual inspection route: `/arena-ground-light-review` (isolated, not wired into normal Hunts).
- Renderer: **existing** `LightingEngine` from #332, untouched.
- Albedo: `arena-materials.js` source `wet-forest-materials-painted.webp`; same approved deterministic
  patch-quilt composition. Only its RGB is uploaded as a color texture (sRGB); the GPU provides ALL illumination.
- A single 8×8-metre review plane, its Z-up world pivot at ground zero and a uniform material board;
  no independent world generator or actual C# collision.
- Light profiles: moving Fireball as declared LightEmitter, moon-only directional source, explicit neutral
  inspection light, and all light/ambient/emission OFF. No CSS tints or renderer-specific fake shading.
- Provisional per-material roughness/specular values help inspection but are **not** finished mapped roughness,
  normals, bump, height or final source albedo.
- App route, module and two-viewport automated WebGL screenshots are only validation surfaces;
  no changes to `/arena-lab`, Town, player, Hollowed/Ashling or the ongoing PR #332.

## Visual acceptance gates and honest scope

1. Compare each of the four *existing* sources at 320×568 and 390×844 under fire, moon and neutral light.
2. Every zero-light RGB pixel must be **0**; only separate UI may remain visible.
3. No shape/prop/object count beyond the single ground plane.
4. Check pixel density, repetition, oversized detail, mushy values and mobile fighting-space legibility.
5. **Author or repaint the first genuinely new neutral grass/moss material** based on the Town/Nexus
   finish target and newer Wet Forest style sheets. Do not represent generated pre-lit concept sheets as texture sources.
6. Only after source approval: produce its real albedo and independent authored normal/roughness/height maps
   (if useful), test light response with the same GPU engine, and then address mud/dirt/marsh and transitions.
7. Trails, old paving, active fire corruption, vegetation, trees, props, Wyrm influence, C# world generation
   and gameplay migration remain separate future milestones.

Tests: `node --test tests/javascript/arena-ground-gpu-review.test.mjs` and the
`ArenaGroundLightReviewBrowserTests` browser matrix in the shared GPU workflow.
A passing visual pipeline is **not** owner approval of the art.

## Milestone 2 — One grounded route / guaranteed primary exit

The owner requires a **single visual path** in the current Wet Forest prototype: it may be straight or curving, but must always terminate at one explicit exit. Do not scatter disconnected roads, branches, cobblestone lanes or props. Rare/optional second exits belong to a later separately approved gameplay milestone.

- `wwwroot/js/arena-single-road.js` is a portable, deterministic recipe returning a `board` of material IDs, separate `roadMask`, per-row `spine`, a northern `entrance`, and exactly one southern `exit`. The mask rather than painting indicates the route. This is **not** C# authoritative game navigation yet.
- The route owns just two portal coordinates. Seed `1205` demonstrates straight; `1441`, `2803` and `4026` demonstrate different curves. Production can accept arbitrary integer seeds once its C# producer and scene camera are integrated; these four debug presets bound current texture/GPU memory.
- A **single albedo plane** is composed through `buildGroundQuiltAtlas` + `drawReferenceGroundBoard` + `drawGroundMaterialTransitions`, uploading the composed output as a standard texture to **the same G1 renderer**. No unlit UI decals, procedural fake light, separate Canvas overlay, shadow-pass shortcuts or geometry blockers.
- The review page `/arena-ground-light-review` opens in road mode and offers the 4 debug seeds plus fire/moon/neutral/zero profiles; grass/mud/dirt/marsh comparisons remain accessible. No old scenery.
- Deterministic tests compare seeded output and require flood-fill of **all** semantic road-mask cells from entry, then check the sole exit and permitted material indices (0/1/3/5). Browser CI captures both mobile viewports for every road seed.
- The visual route is not yet a navigable physical corridor, contains no character, and the south exit is **data**, not an interactive object. No actual C# Hunt exit rules were changed.

Upcoming: inspect actual 320/390px GPU capture quality; adapt ground color, tile frequency, route edge blending and material detail as needed. Then produce native-friendly authored material maps and a scene data contract for the future C# arena generator. Add a second exit only after the one-route gameplay loop is complete.
