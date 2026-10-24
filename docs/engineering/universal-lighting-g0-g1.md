# Universal lighting G0–G1 implementation record

Baseline: `5a4933f83a5c55c9c736ee2da948e8940d5e0e88` (main, 24 October 2026).
Authority: [design and acceptance matrix](../design/arena-real-geometry-light-engine.md),
[art](../canon/art-and-animation.md), [architecture](../canon/architecture-and-quality.md),
[town](../canon/town-and-ux.md), [roadmap](../canon/roadmap.md).

## Source reconciliation

PR #307 remains open at `8c963f8351a758b0fb468fd1340088ff7b904abf`.
Its editable oak source generator and Blender artifacts are the required tree source;
no old forest substitutes are approved. PR #327 remains a separate open Canvas
normal/alpha projection experiment, not a GPU backend. Neither is merged here.
Concurrent Town coverage (#312) and Ashfang (#299) work stays separate.

## Actual renderer inventory and cutover seams

All paths below are relative to `src/Wyrmforge.Presentation.Web`.
**None of these production world paths has migrated.** The isolated proof is not
universal adoption. G5 must close every row, including secondary dispatch paths.

| Path / owner | Current draw path | Required conversion |
| --- | --- | --- |
| `Features/Arena/ArenaView.razor`, `wwwroot/js/arena.js` | Main Canvas compositor and sorted actor/elevation layers | Consume one scene snapshot; retain C# state/input |
| `arena-environment.js`, `arena-territory-art.js`, `arena-territory-walls.js`, `arena-cloister-art.js` | Ground, walls, exits, elevations, painted reflections | Material geometry, authored height and occluders; exit indicators classified explicitly |
| `arena-wet-forest-{art,dressing,sites,vegetation}.js` | Existing biome-specific Canvas geometry/art | Inventory all draws at cutover; never reintroduce rejected assets into new arena |
| `arena-materials.js`, `arena-ground-{foundation,trails}.js`, `arena-approved-ground-preview.js` | Approved six-material quilt/blending and trail recipe | Preserve paintings/recipe; upload composed albedo; eventual native adapter |
| `arena-mage.js`, `arena-mage-frames.js` | Temporary procedural/sprite actor | Replace art using shared rigged LitSprite binding; do not polish temporary art |
| `hollow-sprites.js`, `ashling-sprites.js`, `rigged-sprites.js`, `sprite-animation.js`, `sprite-layer-compositor.js` | Existing atlas/frame/anchor/animation; Canvas filter effects | Same animation samples; matching per-pose normal/depth/caster exports needed |
| `painted-enemies.js`, `arena-enemy-art.js`, `art-atlas.js` | Other creatures, Wyrms and corpses with fallbacks | All fallback and death paths must become lit renderables |
| `arena-spell-vfx.js`, `arena-fire-pixels.js`, `arena-lightning-vfx.js`, `arena-frost-vfx.js` | Projectiles, impacts, trails, spell particles | Explicit emissive/lit materials and emitter lifecycle, no full-bright bypass |
| `arena-{elite,reliquary,bellwarden,winterbell,glass-reliquary}-vfx.js`, `arena-enemy-telegraphs.js` | Mixed bodies, ground FX and warnings | Separate world surfaces from declared screen-space threat/readability channels |
| `player-danger.js`, `arena-recovery.js`, inline draws in `arena.js` | Player cues, aim, wards, shards, breath, hazards, floating text | Classify each draw; world loot/breath lit; actionable warnings/HUD explicitly exempt |
| `arena-{night,spell,scene}-lighting.js`, `arena-l3-material-atmosphere.js` | Canvas masks, source sampling and overlays | Retire only at scene cutover; never stack on GPU output |
| `Features/Forge/CanonicalTownView.razor`, `wwwroot/css/town-canonical.css` | Pre-lit panorama, vacancy plates, school/mastery plates, cutouts | New approved neutral layers and depth; preserve original paintings and hotspots |
| `Features/Forge/RefugeTownActors.razor`, `refuge-town.js`, `town-v2-nexus.js`, `refuge-foreground-cutouts.js` | DOM/SVG/Canvas NPCs, foreground and masks | Shared LitSprite; preserve foot navigation and exact well/board masking |
| `town-lighting.js` | Device-local day/night settings | Map preference to shared environment; no panorama swap in future renderer |
| `hunt-map.js`, `Features/Map/WyrmrealmMapView.razor` | Illustrated navigation chart | Screen-space map UI, not a traversable world scene; review decorative effects explicitly |
| `spellcraft-circle.js`, `bestiary-portraits.js`, Forge cards, HUD/menus | UI illustrations/canvases | Explicit screen-space exemption; never reused as full-bright world art |
| `arena-lab.js`, `arena-lighting-lab.js`, sprite/building labs | Isolated historical review tools | Label as legacy; not gameplay adoption evidence |
| Future interiors/biomes | No implemented shared scene adapter | Require same contracts from introduction |

## Backend and portable contracts

Use pinned Three.js 0.186.1 WebGL2 for the isolated `/arena-light-engine` route.
Vendor its unmodified ES modules and MIT license for offline runtime; no CDN.
This is a replaceable adapter, not a decision about the native iOS/Android engine.

Scene descriptors contain stable IDs, owner IDs, world transforms, material and
geometry resource IDs, separate light/shadow receipt and casting, explicit
emission, authoritative snapshot time and expiry. Complete snapshots replace
registry membership atomically: absence removes, disabled/expired sources emit
nothing. Priority then stable ID determines bounded shadow allocation, never
entity kind. Point shadows cost six views; spot/directional one.

Coordinates: right-handed X right, Y ground depth, Z up; one unit = one metre in
this proof. Feet lie at Z=0. Orthographic fixed camera; sprites are vertical
planes, no camera-facing rotation per frame. Existing game pixel coordinates
need an explicit G2 conversion (not a change to C# collision). Demo sprites use
manifest anchor and worldSize/48. Color inputs are sRGB hex/textures, non-color
normal/roughness maps remain linear data; Three accumulates linear radiance and
performs one neutral tone map and sRGB output. Local intensity is candela with
inverse-square falloff and finite cutoff; directional intensity uses backend
illuminance units. Fixed internal pixel grid uses nearest upscaling, no CSS
brightness/night filter or bloom. Emission does not implicitly register light.

Materials share MeshPhysicalMaterial for diffuse/normal/roughness/specular.
Initial reflection tier is **direct-light BRDF specular**, not a scene capture
or a reflected actor. OFF removes specular response while preserving diffuse.
Planar/probe reflection is G3. No albedo-derived fake normals are acceptable.
`receivesLight=false` means emission-only black base, not unshaded full-bright.
Occluders are render geometry, independent from collision. Alpha cutoff is shared
by beauty and shadow passes. Current atlas color can prove silhouettes, but
**missing authored normals/depth cannot be described as complete actor lighting**.

Research: [Three color management](https://threejs.org/manual/pages/color-management.html)
for input/working/output separation; [physical material](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
for specular/roughness; [Godot lights/shadows](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html)
for the separation of normals from occluders and pixel-grid sampling. These are
engineering principles, not copied art or a choice of native runtime.

## Separate Town relightable rebuild

G4 first archives 320/390/desktop reference matrices: all four active/vacant pairs,
six Nexus schools/mastery, day/night, NPC behind well/both posts, routes and gate.
Preserve original eight paintings, panorama, source navigation, three districts,
default centre, unlock predicates, hotspots/swipes, saves and collision.
Author new neutral paving/walls/roof/windows/gate/well/board/vegetation layers,
independent material/depth/caster data and fixtures. Never infer geometry from
flattened RGB. Owner approves derivatives before production cutover. Fixture
membership derives from existing unlocks; school/mastery alters real emitters.
G5 compares identical camera/state across day/night/zero, interaction and route
regressions and physical devices. No production Town asset is changed in G0–G1.

## Validation status

Implementation and evidence are tracked below as work progresses. G1 remains
incomplete until original oak leaf-on-leaf shadows, authored actor material
passes and every required diagnostic/mobile comparison have passed. Physical
iOS/Android profiling and artistic approval cannot be inferred from CI or
software-rendered Chromium screenshots.

### G1 first geometry/material checkpoint

Original #307 oak geometry now has six material groups and a preserved editable
.blend. Leaf polygons cast real depth shadows, not ground silhouette projections.
The source uses bent geometric leaves; alpha-card foliage remains an additional
acceptance test. Procedural bark colors currently use authored ramp midpoints.

Both actors have 128 walking normal frames exported from exact hash-checked
original sampled poses. Original color/alpha remain immutable. Normal silhouettes
match with minimum IoU 0.9857 Hollowed / 0.9853 Ashling; edge disagreements use
neutral normals and the exact original alpha. Their shared alpha-clipped casters
follow the same frame as albedo/normals, but are not volumetric body meshes.
Attack/death material exports remain pending. Opt-in animation uses the existing
shared `sprite-animation.js` sampler, not a new actor-specific renderer.

Water has rippled geometric normals and shared direct-light specular. This is
not a scene reflection capture. Town corner is diagnostic wall/roof/post plus
an existing actor proxy, not replacement Town art. No production scene migrated.

Prior checkpoint: Validate Wyrmforge and Browser smoke passed on 0ad9a5ed.
Local JavaScript suite: 384 passing tests. The initial GPU framebuffer check
was black; full-frame 320/390px checks and published-app CI are added here.
Physical iOS/Android profiling, full diagnostic views and G1 artistic acceptance
remain pending. This PR must remain draft until its remaining gates are met.

### Recovery and GPU verification — 24 October 2026

Recovery `4f2fc024670a57e8b01cf3ed8c92a43d6df3609a` attaches all four binary
blobs, scene and CI to PR #332; remote hashes verified. All 384 JavaScript tests
passed. Validate, Browser smoke, Arcane WebKit and the dedicated
[GPU CI](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40060280997) passed.
The published Blazor route passed full-frame exact-zero RGB and frozen restoration
at 320×568 and 390×844, plus source removal, shadow and specular toggles.
Downloaded CI screenshots were visually inspected; these are viewport captures,
not physical-phone profiling or production-wide visibility verification.

Inspection found an opaque Fireball core enclosing its point source and casting
shadows in every direction. Fix `0bdbd87292874569957b6b290a817db203ad1965`
declares Fireball/lantern luminous cores non-casting through descriptors. Ordinary
solids still cast. The environment was replaced again after that inspection;
recovered assets were already remote and did not require regeneration.

Added explicit albedo, mapped view-space normals, wireframe and first shadowed
point-light visibility inspection. The latter shows actual depth comparison,
white visible/black blocked; without a point shadow it is white. Zero profile
always forces lit output, so inspection colors cannot violate the black-world
check. The prior local GPU run verified all four shaders and restoration after
fixing the luminous-core occlusion; the restored changes require fresh CI.
Browser tests reject blank diagnostics and shader/page errors.

G1 remains incomplete: close-up per-object evidence, light-space depth/bounds,
independent cast/receive controls, alpha-card foliage, attack/death normal/depth,
Town fixture/school scenarios and physical-device/artistic acceptance remain.
The current oak crowds the right edge and actor readability needs close-up
assessment. Water is direct BRDF specular only. Town is diagnostic geometry with
an actor proxy. All production rendering paths and approved artwork are unchanged.


### Focused inspection controls (pending fresh GPU CI)

Fixed overview/actor/oak/Town/water camera presets now share the same scene and
renderer. Selected renderables expose independent cast, shadow receipt and light
receipt controls. Authored-normal A/B retains original albedo/alpha. The route
shows the actual selected emitter registry, priorities' resulting shadow budgets,
framebuffer size and renderer counters. Browser CI records focused comparisons
and checks the entire framebuffer black in each camera, including when normals
inspection was selected before zero. These controls are diagnostic-only.

The replacement execution environment blocks local Chromium sockets; new captures
must come from the dedicated published-app CI, not from a claim of a local run.
Light-space depth/bounds and deeper object-specific acceptance remain pending.


### Diagnostic checkpoint and control-driven evidence

`1c438ca` passed the dedicated published-app GPU workflow
[40086634050](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40086634050).
Its downloaded normal and shadow-visibility screenshots were inspected. They show
real wall/actor/post/foliage occlusion after the emitter-core fix; this overview
alone does not establish detailed leaf-on-leaf artistic acceptance.

`daa61c7` checkpoints close-up cameras and independent receiver controls.
Added a depth-atlas view of the first budgeted shadow light's actual GPU texture
and bounds helpers using actual point ranges/spot cones/directional direction.
Depth values are raw normalized shadow depth, not a shaded scene or a distance
in metres. No allocated shadow map gives a blank diagnostic. These inspection
resources are disposed with the renderer and never used for production visibility.
Browser comparisons now drive the visible Blazor controls and await the actual
applied options, preventing screenshot controls from contradicting their scene.
Fresh CI is required for these additions.


The first UI-driven run (`62f4a2f`, workflow 40086956550) failed before changing
the environment: wrapped select labels included option text, so exact accessible
name lookup could not find “Environment”. All controls now have explicit matching
accessible names; test synchronization sends primitive values to Playwright.
The failure does not validate the new depth/bounds views; rerun remains required.


`124c325` reached the new depth view through the real controls, then correctly
failed its nonblank assertion. Root cause: pinned Three 0.186.1 PCF shadows use
native `CubeDepthTexture`/`DepthTexture` comparison samplers, not an RGBA color
atlas. The inspector now reads the actual depth texture with matching cube/2D
comparison samplers. Six point faces are arranged in a 3×2 diagnostic, and a
16-step comparison search reconstructs depth without changing live sampler state.
Perspective values display light-camera axis distance divided by far distance;
directional values remain normalized orthographic depth. This is inspection
precision, not production lighting, and needs the next GPU run for validation.


Evidence capture now writes a JSON sidecar for each screenshot: actual framebuffer
dimensions, RGB channel count, maximum RGB, number of nonblack pixels, hash,
applied options and selected-emitter diagnostics. Pose-only and light-only
comparisons are separate, so a single changing hash no longer conflates them.
The local replacement checkout initially lacked fixtures for the full JS suite;
that incomplete run is not treated as a renderer regression or a passing run.
The focused lighting registry/sprite tests pass; full assets are being restored.


### Verified evidence checkpoint — 2026-10-24

Code/test checkpoint `f894fd0e9e447af47bb06aa7f99c559de2e7cc98` passed
[published-app GPU workflow 40108114018](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40108114018).
Artifact `12565566800` contains 56 screenshots and 56 JSON metric sidecars
(expiring 2026-11-23). These are Chromium CI mobile viewport captures, not physical
phone profiling. All 384 local JavaScript tests passed after restoring sparse
checkout fixtures.

All ten zero captures (overview, actors, oak, Town and water at both viewport
sizes) have `maxRgb=0`, `nonzeroPixels=0` and an empty applied light registry.
The 320×568 viewport renders a 296×409 framebuffer (363,192 RGB channels);
390×844 renders 366×608 (667,584 RGB channels). Every channel was checked;
viewport dimensions are not framebuffer dimensions. UI remains readable.
Frozen restoration, source lifecycle, separate pose-only/source-position-only
changes and diagnostic nonblank assertions passed.

Downloaded screenshots were inspected: depth inspection displays native cube
faces; oak point visibility contains foliage occlusion and cast ground shadows;
Town wall receives illumination and the actor-proxy silhouette; water has a
direct-light highlight. These demonstrate mechanisms, not final artistic
acceptance. Night actors/oak remain too dark and difficult to read. Detailed
leaf-on-leaf quality, per-actor normal orientation and moving-water highlight
comparisons still require acceptance-focused evidence. Alpha-card foliage,
attack/death material exports, completed Town decomposition and physical-device
budgets remain open. No production rendering path has migrated.

Validate Wyrmforge (40108114036) and Arcane WebKit (40108114019) passed this
checkpoint. Browser smoke (40108113997) was still running when recorded.
The preceding `48dc4dd` Validate failure was in unchanged
`ContextualSpellTests.Crowd_IsShovedOutward_AndThePulseSpendsThePrimaryCast`
(actual 113.333 versus required >140); the same application suite passed on
`f894fd0`. No gameplay code was changed to mask this intermittent failure.
PR #332 remains draft and G1 remains incomplete.


### Camera-aligned actors and receiver-isolated comparisons — candidate

The shared sprite plane now uses camera right/up/toward with its authored foot
anchor at the world origin. Previously a vertical X/Z card projected an already
projected sprite again, compressing/skewing its silhouette under the oblique
camera. A projection regression verifies square cell aspect, horizontal atlas
rows, foot registration and neutral tangent orientation. Original color/normal
atlases remain unchanged; this does not supply volumetric actor depth.

An explicit neutral inspection key and receiver-mask diagnostic separate material
response from the warm scene rig. The key is a regular point descriptor, listed
in diagnostics and disabled by zero-light mode. The mask retains actual depth
and alpha clipping, so browser A/B tests measure only visible receiver pixels.
Expanded tests cover each actor's normal response; wall/roof/post/NPC and oak
receipt; and water-only specular contribution at two source positions. This is
pending GPU CI/visual inspection, not a passed G1 gate or a new night art baseline.


`2f801f7` passed published-app GPU workflow 40109174573, Validate and WebKit.
Artifact 12566291304 was downloaded and inspected. All eight receiver checks,
both actors' normal A/B checks, water-only specular A/B and moving-highlight
centroid assertions passed at both viewport sizes. Neutral-key screenshots show
clearer actor proportions and material detail; original night composition is
still not artistically accepted. The key-lit oak visibly contains leaf shadows,
but neither a synthetic mask nor a passing pixel difference grants art approval.

Browser smoke failed the unchanged roaming-world test at initial height 600.
The simulation starts with an 800x600 snapshot before its first tick; the test
previously waited only for non-null world/player. It now waits for measured
simulation activity before asserting world size, preserving all existing size,
movement and page-scroll assertions. No production gameplay code changed.

Next evidence slice adds durable receiver changed-pixel counts and water highlight
centroids, plus a pose-shadow comparison restricted to the intersection of visible
ground in both poses. Moving actor silhouettes cannot themselves satisfy that
shadow check. These added checks require their own published-app CI run.


### Alpha-card fixture — isolated diagnostic, pending GPU evidence

An optional two-layer binary-alpha leaf fixture now exercises the path that the
original geometric oak does not use. Its tiny code-authored mask is diagnostic
geometry, not a tree asset, new forest art or a replacement for the original oak.
The same material/alpha-cutoff path casts and receives on both layers. Browser
checks compare upper casting on/off on visible lower-layer pixels, then alpha
holes versus an opaque upper quad while excluding pixels the quad newly covers.
Zero-light includes both layers. Engine shader dispatch has no foliage branch.


`a0d379e` passed published-app GPU run 40132704223 (artifact 12575093934).
The visible-ground intersection test now verifies pose-aware cast-shadow changes.
At the 390 viewport, authored-normal A/B changes 2,108 Hollowed pixels and 1,185
Ashling pixels; receipt changes 13,237 wall, 31,512 roof and 1,650 post pixels.
These are measurements of material response, not artistic-approval scores.
The water evidence exposed a weak second sample: only 10 specular-changed pixels
remained at light position 0.8 (8 at the smaller viewport). Although the earlier
centroid assertion passed, that near-off-puddle comparison is insufficient for a
strong moving-highlight claim. The next run uses positions 0.15/0.4 and requires
more than 100 affected water pixels at each, while retaining source-centroid
movement and the specular-off control. Pose/cutout changed-pixel metrics are also
preserved as JSON rather than only assertions.


The next receiver-isolated shadow check also uses the original oak itself:
mask visible leaves in group `oak-2`, then toggle only `oak-1` casting. Both groups
have the same root, so the inspection source stays stationary. Only changed
shadow visibility on the other leaf group's pixels counts; ground shadows and
surface-color differences cannot satisfy the assertion. This is pending CI.
