# AR4-A — WF32 terrain material binding after AR3 acceptance (31 October 2026)

Status: **authorized for implementation, not implemented or owner-art-approved by this document**.
Start from merged GitHub `main` at/after [AR3 PR #458](https://github.com/pjotrcasteel/Wyrmforge/pull/458). Preserve the independent original source-art [WF32 draft PR #429](https://github.com/pjotrcasteel/Wyrmforge/pull/429) and all active [shared G4/G5 work](https://github.com/pjotrcasteel/Wyrmforge/pull/381).

## Ownership and nonnegotiable boundaries

- **C# geography and physics are authoritative.** `WorldSiteElevationField.Sample(WorldSiteGeography, HuntPoint)` exposes `WorldSiteElevationSample`: physical `HeightMeters`, `Grade`, typed `Material`, seven normalized `SoilWeight`/`GrassWeight`/`RoadWeight`/`MudWeight`/`RockWeight`/`WaterWeight`/`IceWeight`, `Moisture`, and `Walkable`. `WorldSiteElevationPreview` carries `Columns`, `Rows` and samples for opt-in display. Never calculate or override C# height, collision, paths, barriers, routes, ecology authority or loot from bitmap color.
- **Existing presentation adapter only.** `src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js` already defines `semanticSiteModeEnabled()`, `drawWorldSiteElevation()`, `drawWorldSiteTopography()` and `drawArenaEnvironment()`. Build a bounded opt-in **neutral material/albedo** review atop the same arena geography and camera, with unchanged solid-color A/B and untouched normal Hunts. No competing renderer, independent JS terrain generator, per-frame texture authoring or Canvas-lighting replacement.
- **Original art source.** WF32 #429 supplies world-anchored source texture grammar, native 32px material transitions, 12 owner-approved grass/rock appearances and H4 deterministic native source package (six hard pairs × five maps and original stone-ID masks). The owner approved P1i transition *appearance* and P1j grass/rock source variants, **not** H3 wear extremes or full 2.5D scene. Preserve them. Resolve how source files reach the integration branch without merging unapproved art or overwriting existing `wwwroot` assets; do not duplicate source painters in a new engine.
- **Only shared G owns light and shadow.** AR4-A may show albedo in the existing Hunt presentation layer while G4/G5 is under repair. AR4-C must later register matching albedo/normal/roughness and *actual C#-aligned geometry/occluder inputs* with the shared G registry. Source grayscale height/alpha does not automatically cast a shadow. Never add fake dark cast-shadow paint or a second shader/lighting solution.

## Implementation slices

1. **AR4-A1 — stable data seam (begin here).** Verify current merged AR3 samples, actual arena/world pixel transform and existing asset registry. Define an explicit presentation mapping for `Soil`, `Grass`, `Road`, `Mud`, `Rock`, `ShallowWater`, `GlacialIce` to available approved/authored source families and documented fallbacks. These are cosmetic selectors, never gameplay material IDs. Retain the same C# weights, screen/site origin and cache identity across camera movement and replay. Verify field weights sum to one; handle missing/malformed source gracefully.
2. **AR4-A2 — native albedo assets and bounded caching.** Prepare original source material tiles/atlases at the *actual* game-pixel/world scale, with stable source seed, valid 32px phase, padding/sampling and no mirrored 252px stamped repeat. Bind to the existing opt-in world-first view; reuse asset/cache lifecycle and avoid CPU regeneration every frame. No G shader edits.
3. **AR4-A3 — in-Hunt technical review.** Show the *same C# site/seed* in flat material IDs and neutral albedo, with moving camera and genuine playable Town→Chart→Hunt path at 320px and 390px widths. Forest fork, mountain pass and monastery must retain destinations, 1–3m blocking cliffs and C# traversal, even when art is absent. Keep normal Hunt fallback unchanged.
4. **AR4-B — owner material look gate.** Inspect original blending, medium/tall grass and rock scale as separate objects, soil/mud/road distributions and original stone silhouettes in genuine in-Hunt screenshots, not mockups. Include mage/Ashling/Hollowed at the correct *review* scale; Hollowed's intended ~2× Ashling height is not automatically approved. Stop for owner approval before AR5 production dressing.
5. **AR4-C — deferred shared G lighting acceptance.** Only when G4/G5 is stable, test actual dynamic Fireball/torch occlusion, surface height/caster registrations, lit normals/roughness, zero-light, proper shadow direction and physical iOS/Android performance. AR4-A/B cannot close these gates.

## Required verification

- Deterministic seed/replay and sample-to-source mapping; no camera-relative texel drift or seams across adjacent 32px world windows. Preserve owner-approved P1i and P1j source fingerprints.
- Explicit controls comparing AR3 semantic and AR4 neutral material previews for the same world seed and site. No change to C# gameplay collision, navigation, movement grade, rewards or extraction.
- Tests for missing source assets, zero/invalid normalized weights and all seven semantic surface classes. Performance checks ensure bounded asset count and no frame-loop rebuilds.
- Normal Hunts, painted 2D Town and active G4/G5, AN and FXP branches untouched.
- Genuine mobile-sized **running-game** screenshots/video and link to the exact tested deployment before requesting human acceptance; distinguish source-only reviews and live captures clearly.

**Stop rule:** Only AR4-A technical implementation is unblocked by AR3. AR4-B requires an owner material review; AR4-C and final AR4 approval require shared G lighting and shadow acceptance. Keep PR draft and do not merge unapproved art or invent sign-off.
