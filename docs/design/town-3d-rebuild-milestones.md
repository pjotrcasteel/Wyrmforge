# WyrmForge — Full 3D Town Rebuild Milestones (T0–T6)

**Status:** T0 evidence and T1–T3 isolated implementations IN PROGRESS; no visual cutover authorized.
**Workstream:** [Town PR #349](https://github.com/pjotrcasteel/Wyrmforge/pull/349), separate from PAUSED G4 PR #346 and AI milestones owned by Work.
**Rendering:** Existing universal GPU lighting engine (G1–G3), not a second Town renderer.
**Sources of truth:** [Universal lighting contract](arena-real-geometry-light-engine.md), canonical art/gameplay documentation, and the existing production Town runtime.

## Implementation snapshot (2026-10-25; acceptance gates remain enforced)

- **T0:** nine real runtime district screenshots and six school palettes/two mastery references inspected. Active/vacant, NPC masking and performance capture tests now exist but need CI artifacts; owner approval outstanding.
- **T1:** metric coordinate/camera mapping, validated scene hierarchy, real mesh with well, gate, noticeboard, lamp and foliage, Blender .blend/glTF/PNG export pipeline and independent Node/Python tests. An early Blender run produced an editable .blend but glTF failed due to missing NumPy; workflow dependency repaired, current export unverified.
- **T2 (preview only):** `wwwroot/town3d-review.html` imports real OBJ mesh groups using the EXISTING universal GPU LightingEngine. Night/day/zero lighting, shadow-casting geometry and occlusion probe with manual collider-gated movement implemented. Independent GitHub workflow captures Chromium screenshots at 320/390; **no actual GPU screenshot or owner-approved visual comparison for this preview has been obtained yet**.
- **T3 (contracts only):** renderer-independent 3D collider-shell extraction, separated gate-post footprints, no-corner-cut pathfinding, clearance queries, dynamic blockers and 14 independent route probes implemented. **Does not implement AI decisions** or replace Town's production NPC pathing.
- **T4–T6:** not started. **G4 stays paused until T0–T6 complete and accepted**.

The snapshot is not a milestone completion statement. Keep production art/camera/interaction behavior unchanged until T6 controlled cutover.

## Locked scope and principles

Rebuild the approved three-district Town as **real 3D geometry presented as Gothic pixel art**. Preserve the default central view, approved composition, World Gate, well, noticeboard, four canonical buildings (Arcane Nexus, Codex, Hall of Fame, Blacksmith), their active/vacant progression, six Nexus school appearances and mastery response, hotspots, NPC routes and foreground depth behavior. **Do not overwrite or replace the canonical painted art without owner visual approval.**

Use editable Blender `.blend` source, exported optimized game meshes and materials, a calibrated fixed 3D camera, and the **same GPU lighting system** used by Hunts. No baked light pretending to be dynamic illumination, no CSS darkness overlay as the lighting solution, no full-bright ordinary world assets. UI is exempt from zero-light world blackness.

The scene is a **shared spatial source of truth**, with independent adapters for rendering, gameplay and AI consumers. This workstream implements **spatial contracts only**: geometry, colliders, semantic anchors, navigation data and scene-state events. **Agent perception, decisions, scheduling, combat tactics and learning belong exclusively to [AI milestones](unified-agent-ai-milestones.md).** Existing Town NPC behavior remains operational during migration.

### Existing runtime compatibility (do not skip)

- `CanonicalTownView.razor` currently composites `night-active.webp`, vacancy layers, Nexus variants and NPC overlays.
- `refuge-foreground-cutouts.js` contains separately authored well/noticeboard masking.
- `town-v2-nexus.js` uses a rasterized walk mask rather than `night-navigation.json`. Reconcile these sources against *actual runtime behavior* before declaring a new navigation authority.
- Existing building unlock and click callbacks, actor collision/feet depth, school selection, Town day/night preference and preview/debug paths must not regress.
- `town-relightable-contract.js` is an early migration adapter, **not** proof that the Town is already a relightable 3D scene.

## Technical architecture

- **Geometry:** modular 3D meshes for ground, paving, stairs, buildings, roofs, foliage, props and occluders; separate receiver/caster/emissive material roles.
- **Coordinates:** explicit conversion between canonical 1672×941 painting coordinates and world X/Z ground plane with Y height; versioned mapping and round-trip tests.
- **Camera:** fixed calibrated orthographic/oblique projection matching approved silhouettes, camera bounds and three-district horizontal travel.
- **Rendering:** one shared GPU lighting pipeline, controlled internal pixel resolution, palette-preserving sampling and quality tiers for mobile.
- **NPC spatial data:** navigation mesh derived from *authored collision geometry*, supplemented by reviewed walkable links, entrances, occupancy slots, activity anchors, semantic place IDs and dynamic obstacles. Do not derive physical shadow casters from legacy navigation polygons.
- **Ownership:** deterministic C# gameplay/progression state owns unlocks and interactions; the 3D scene consumes that state and exposes spatial queries. Avoid competing state stores.
- **Delivery:** gated preview route/feature flag with the original Town as rollback. Mobile iOS/Android constraints apply even while browser is the preview platform.

## Milestones and exit gates

### T0 — Freeze canonical Town and establish baseline
- Inventory all production art, masks, camera, hotspot, navigation, NPC and gameplay dependencies.
- Capture *real* screenshots at 320px, 390px and desktop for all three districts, four building states, six Nexus schools/mastery, day/night and NPC masking cases.
- Record navigation/collision and interaction behavior, plus current performance baseline.
- **Exit:** reference matrix, canonical source inventory, reproducible behavioral checks and owner-approved visual target.

### T1 — Authoritative 3D scene schema and camera
- Define stable object IDs, transform hierarchy, material IDs, mesh/occluder/collider roles, semantic tags, entrance/interaction anchors and event contracts.
- Calibrate world-space units, elevation, camera and legacy-coordinate mapping.
- Reconcile raster navigation, `night-navigation.json` and foreground cutouts without changing production NPC behavior.
- **Exit:** schema, sample exported Blender mesh, tested coordinate round-trips and no gameplay/navigation regression.

### T2 — Central square playable vertical slice
- Model and export real paving, well, noticeboard, World Gate section, foliage and lanterns.
- Render them using the existing GPU engine; demonstrate actual material response, geometric shadows, emissive fixtures and zero-light world blackness.
- Integrate **one existing NPC** through the spatial adapter and verify behind-well/noticeboard depth behavior.
- **Exit:** playable flagged preview, actual 320px/390px screenshots and short in-game capture; owner approves visual match before expansion.

### T3 — Navigation and semantic world infrastructure
- Produce collision-derived navmesh, narrow-passage links, dynamic obstacle support, entrances, destinations, interaction positions and occupancy slots.
- Verify correct foot clearance, foreground sorting, crowd passage, well and both noticeboard posts; test 14 existing NPCs without adding new AI behaviors.
- Provide renderer-independent spatial query and scene-change interfaces to future AI agents.
- **Exit:** reproducible route/occlusion tests, crowd playback, stable semantic IDs and measured simulation costs.

### T4 — Four canonical 3D buildings and districts
- Model Blacksmith, Codex, Hall of Fame and Arcane Nexus; expand to all three districts while preserving the approved composition and camera.
- Implement true active/vacant visual states and fixture emitters; no ghost lighting from inactive buildings.
- Support six Nexus schools and mastery-dependent color/intensity through the universal emitter registry.
- **Exit:** owner-approved side-by-side comparisons for building states, school variants and districts; click/unlock regression tests.

### T5 — Town interaction infrastructure (NOT agent AI)
- Supply workstations, visitor slots, social gathering anchors, queues, occupancy reservations and building entrances as **data contracts**.
- Publish stable scene state/events (unlock, vacancy, day/night, occupancy) to the future AI workstream; keep existing NPC behaviors intact.
- Support shared day/night environment light profiles without switching pre-lit panoramas as the lighting method.
- **Exit:** semantic and interaction contract tests; demonstrable existing NPC navigation and scene-state updates. **No utility AI, schedules, combat AI or LLM work in T5.**

### T6 — Mobile optimization, acceptance and cutover
- Optimize mesh/texture budgets, draw calls, shadows, reflections, culling, LOD and NPC spatial-query costs across quality tiers.
- Test mobile WebKit/browser preview, GPU diagnostics, zero-light, interaction, collision, camera, school variants and NPC masking; validate on physical iOS/Android when available.
- Compare final captures to T0 and keep original production Town behind rollback until approved.
- **Exit:** measured performance, automated tests, complete screenshots/video evidence, explicit owner visual approval and controlled production cutover.

## Mandatory evidence for every visual milestone

1. Blender editable source and exported game assets committed in reviewable slices.
2. Real **in-game** PNGs at 320px and 390px plus gameplay recording when movement/occlusion changes.
3. Before/after comparison with canonical Town at identical camera/state.
4. Automated geometry/navigation, interaction and GPU-lighting checks, plus observed mobile performance.
5. Clear milestone status and remaining blockers. CI success alone is **not** visual approval.

## Explicit non-goals

No replacement of the universal renderer, no new enemy/mage art workstream, no gameplay progression redesign, no AI decision engine, no NPC dialogue generation, no boss/combat AI, and no irreversible deletion of approved Town source assets.
