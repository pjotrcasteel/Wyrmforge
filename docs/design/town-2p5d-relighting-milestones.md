# WyrmForge — Town 2.5D relighting milestones (T0–T6)

**Decision:** 26 October 2026 — This document supersedes [the full-3D Town plan](town-3d-rebuild-milestones.md). There is **no requirement to produce a full 3D Town**. Preserve the approved 2D Town paintings and build faithful neutral-albedo, material, height/depth, foreground, and occluder derivatives suitable for the *existing universal GPU lighting engine*. Never invent replacement buildings or remodel the Town.

**Status:** G4/T0 inventory and T1 renderer-neutral contract in progress. No finished relightable Town art or owner-approved playable GPU Town is claimed.
**Authority:** [Town canon](../canon/town-and-ux.md), [art canon](../canon/art-and-animation.md), [scene-wide GPU contract](arena-real-geometry-light-engine.md), [G0–G5 roadmap](../canon/roadmap.md).
**Implementation branch:** `feat/town-2p5d-relightable-g4`.

## Non-negotiables

- Keep the 1672×941, three-district canonical composition, default centre, Gothic pixel-art palette, World Gate, central well and noticeboard, and all four approved buildings unchanged in silhouette, scale and placement.
- Keep independent active/vacant progression for Arcane Nexus, Blacksmith, Codex and Hall of Fame; all six Nexus school variants, mastery-dependent source intensity, day/night/auto, hotspots, swiping and persistent save logic.
- Keep current C# gameplay and NPC foot/navigation authority, routes, collisions, exits, 14-NPC stress cases and masks around well, both board posts, roofs and bushes. Light occluders are **not** gameplay colliders.
- Preserve original approved PNG/WebP artwork and art source files bit-for-bit. New *derived* material channels must be separately reviewable and trace back to approved source crops.
- Never apply CSS/filter/black gradient to an already-lit panorama and call it dynamic lighting. Painted highlights and shadows must be neutralized in new **albedo** layers; the original panorama is visual reference/fallback, not the final GPU color map.
- One shared G1–G3 engine, `LightingSnapshot`, C# emission lifecycle, linear color response, and GPU material/caster registration. No Town-only light shader; no hardcoded player/NPC/fullbright exceptions.
- Zero ambient/local/emission must yield black **world** art, with screen-space HUD still readable. Normal maps bend surface light but do not cast architectural shadows; lightweight authored proxy occluders, cutout alpha and depth masks do.
- Stage behind opt-in preview; retain production Town and source art until owner's screenshot approval. Browser is a test deployment: optimize for iOS/Android.

## Existing baseline and reuse

| Existing production dependency | Migration |
| --- | --- |
| `Features/Forge/CanonicalTownView.razor`, `art/town/night-active.webp` | Keep live; reference imagery only for GPU migration |
| `night-vacant-{ArcaneNexus,Blacksmith,Codex,HallOfFame}.png` | Approved vacant states retained; produce derivative material layers per state |
| `art/town/nexus-approved/<school>.webp` | Retain six variants; register emission and actual light intensity from C# mastery |
| `RefugeTownActors`, `refuge-foreground-cutouts.js` | Keep original feet-depth order, alpha foreground silhouettes |
| `night-navigation.json`, `town-v2-nexus.js` | Reconcile two current NPC systems without replacing pathing authority |
| `js/lighting/engine.js`, `lighting/registry.js`, `lighting/town-fixture.js` | Reuse existing renderer, validation, budget, day/night and fixture descriptors |
| `js/town-relightable-scene.js` | Non-live T1 adapter for pixel UVs and C#-owned state to GPU snapshots |

The adapter's `artBounds` is purely visual indexing; it **does not** auto-create real normal/depth, art, shadows or camera alignment. GPU `position/rotation/scale` and `occluderGeometry` must be independently authored and verified.

## Milestones

### T0 — Preserve and record baseline (**in progress**)
- Confirm exact original art filenames and source hashes; list each district, building active/vacant, Nexus school and progression state.
- Save real *in-game* 320px, 390px and desktop reference PNGs for day/night, all districts and critical NPC occlusion; include UI, hotspots and swipe geometry.
- Identify art-space anchors for well, board, paving, lanterns, walls, roofs and active/vacant buildings without moving anything.
- Baseline frame timing on phones; inventory existing GPU bypasses.
- **Exit:** complete reproducible reference matrix, hash manifest and running interaction test suite. *Not yet achieved.*

### T1 — Non-destructive 2.5D scene and material contract (**in progress**)
- Keep painting-to-UV coordinate conversion exact at 1672×941; separately calibrate GPU orthographic/oblique presentation to screenshots, including three-district swipe.
- Author explicit and versioned layers: resource IDs, texture provenance, art-space bounds, world transform, roughness/normal/height/emission/depth/caster responsibilities.
- Route fixtures and active/vacant state through C# snapshots and shared GPU source registry. Zero-light mode must not accidentally retain a fixture.
- Add tests for coordinate round trip, state predicates, zero-light and *no navigation polygon treated as a shadow caster*.
- **Exit:** tested asset schema + integrated GPU staging sandbox with **no live changes** and calibrated pixel-to-world screenshot overlays. Contract initial commit exists; authored material assets and calibration remain open.

### T2 — Owner-approved central square relighting vertical slice (**next visual milestone**)
- Make new neutral 2D ground/paving albedo from **approved Town pixels**, then author its roughness/normal/wetness and same-origin atlas UVs; no unrelated or generated replacement texture.
- Produce separate well and noticeboard relief and alpha-accurate silhouettes; give lantern(s) independently controlled emission and actual shadow casting.
- Include at least one existing NPC receiving light, casting onto paving and correctly passing behind well and both noticeboard supports.
- Show unlit, day, night and moving lantern lighting using the **existing** GPU engine; no baked light doubled as dynamic light.
- **Exit:** real playable gated in-game comparison PNGs at 320px/390px and desktop, recording of NPC occlusion/moving light, owner approval of side-by-side visual fidelity. Do not start T3 until approved.

### T3 — Foreground, depth and NPC reconciliation
- Finish separated garden/roof/gate/foliage cutouts; author their independent occluder profiles and visible layer order.
- Reconcile both NPC navigation paths with foreground art without modifying C# movement, contact radii, accessibility or entrances.
- 14-NPC crowded scene tested with masks, routes, front/back and zero-light; keep dark actors genuinely dark.
- **Exit:** real game screenshots/recordings, collision and route regression suite, no ghost covers.

### T4 — Four original buildings and Nexus
- Author exact-source relightable layer variants for each approved active/vacant building; do not create new structures.
- Active windows, forge, lanterns and Nexus emit physical light; inactive versions fully disable sources; emission respects zero-light.
- All six Nexus school colors and mastery intensity use the shared source descriptors; compare the unchanged facade silhouettes.
- **Exit:** owner-approved building screenshots in both modes with independent progress states, matching original art.

### T5 — Full Town districts and scene interaction
- Extend 2.5D materials across left, centre and right without visible seams or palette mismatches.
- Keep same world state/save/hotspots, gestures, day/night/auto settings, paths and NPC activity; map lighting via renderer-owned environment profile.
- Publish semantic anchors for future unified AI without implementing AI decisions or behavior here.
- **Exit:** documented full-Town opt-in preview and gameplay/visual parity matrix.

### T6 — Mobile QA, G5 cutover readiness
- Profile WebGL draw calls, atlas memory and stable nearest-pixel sampling, light/shadow quality tiers and GPU frame time on mobile.
- Automated and observed day/night/zero-light, emissions, NPC placement, school/mastery, unlock, swipe, accessibility, reload and navigation validations.
- Only cut over production Town with explicit owner visual approval and rollback retained; G5 owns final universe-wide renderer cutover.
- **Exit:** CI plus **real** 320px/390px and physical phone evidence; no declaration of universal lighting while other world paths bypass it.

## Workstream boundaries / evidence

This is a Town art/material/renderer integration project only. Do not touch the wizard implementation, enemy AI milestones, Hunt behavior or competing TownV2 PRs. All changes must include implementation/test hashes and reviewable game screenshots where visuals change. Passing JS/unit tests proves the contract, **not** the visual match.
