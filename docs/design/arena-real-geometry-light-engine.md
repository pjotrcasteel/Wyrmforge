# Arena V2 — real-geometry lighting-engine implementation plan

> **Implementation plan, 23 October 2026.** Canonical decisions live in
> [Art & animation](../canon/art-and-animation.md#arena-rebuild-v2--shared-lighting-before-further-forest-asset-production-locked-23-october-2026),
> [Architecture & quality](../canon/architecture-and-quality.md) and the
> [P5 Wet Forest dependency roadmap](../canon/roadmap.md#arena-v2-art-specific-sequence--23-october-2026-locked).
> This document is a task and acceptance guide, not a competing product specification or proof of delivery.

## Mandate: stop making a flat tree look lit

A glossy tint, whole-scene radial glow, tree normal map, and an alpha-silhouette
ground projection **do not provide occlusion between leaves, branches and the trunk**.
Our prior experiments generated visible ground casts, but did not prove that
foliage *blocks* light on other foliage. This is now the decisive technical gate.

**Goal:** one original ancient oak, original approved Wet Forest ground, one
movable Fireball and a fixed orthographic 2.5D camera; believable
**leaf-on-leaf, leaf-on-branch, branch-on-trunk and ground shadows** with
visible reversal as the light moves. A dead elm is the follow-on verification
tree; further trees and props are blocked until the single-tree proof passes.

**Locked look:** ALL arenas occur at night. Near-black unlit areas, strongly
localized warm fire and distinct readable characters/telegraphs; no global
orange screen filter or permanent artificial torch in live Hunts.

## Why the current method is incomplete

| Technique | What it contributes | What it cannot prove |
| --- | --- | --- |
| Gothic-night canvas mask (merged #326) | Near-black ambient and localized fire intensity across the scene | Which tree surface blocks which other tree surface |
| Alpha tree silhouette projection (experimental #327) | Outline shadow on illuminated ground | Internal canopy/branch visibility |
| Per-pixel Blender camera normals (experimental #327, source #307) | Bark/leaf faces respond to light direction | Occlusion between separate pieces of geometry |
| Baked AO | Stable darkness within dense canopy | Accurate moving Fireball shadow direction |
| **GPU depth/shadow map from actual geometry (NEXT)** | Light-space occlusion at each shadow-receiving surface | Fully spectral transport or free unlimited dynamic lights |

Correct rendering is approximately **diffuse/specular surface response × shadow visibility**,
plus appropriate ambient/AO and restrained leaf transmission. Normals describe
surface orientation; shadow maps determine whether *another surface blocks the light*.
This means the material must BOTH **cast and receive** shadows, including
alpha-cutout leaf cards. A branch's shadow must visibly land on leaves below it,
not only on the floor.

## Architectural decision: prototype GPU shadows before choosing a native engine

- **Proof renderer:** isolated WebGL2/Three.js scene (or an equivalent proven
  WebGL GPU renderer, with the choice recorded) inside a new, opt-in
  `/arena-light-engine` route. Keep `/arena-lighting` as a comparison baseline,
  not the architecture to keep patching. Browser availability and input should
  fail with a clear message when GPU/WebGL2 is unavailable.
- **Geometry:** render a *simplified original* 3D ancient oak from the
  source-only Step-3 Blender asset foundry (#307), including real trunk and
  branch meshes and alpha-clipped foliage. Use one canonical fixed orthographic
  camera matching WyrmForge's 2.5D framing, anchored at the original trunk/root
  pivot; **do not substitute a flat billboard** for the near test subject.
  Export a versioned glTF/GLB preview with verified rights, dimensions, units,
  normals, material alpha-cutoff, and camera/foot conventions. Preserve all
  original `.blend` files and generated PNGs. The current Blender artifact
  is a *source-only, unapproved candidate*; do not ship it into live Hunts.
- **Shadows:** enable depth shadow maps, mesh.castShadow, mesh.receiveShadow
  and leaf material MASK/alphaTest in both color and shadow/depth passes.
  Backface/two-sided foliage needs consistent material and shadow-side policy.
  Start with one bounded **shadow-casting spotlight** at Fireball position
  (valid for proving occlusion without six cube-map faces per point light);
  explicitly document its approximation. Compare with a real point light or
  physically plausible solution only after the single-tree gate. Tune map
  resolution, bias/normalBias and shadow frustum to avoid floating shadows,
  peter-panning and acne.
- **Materials:** normal + roughness + optional baked AO for bark, leaf cards
  with appropriate two-sided diffuse/transmission approximation and physically
  plausible low specular. Do not treat foliage as shiny plastic. Baked AO
  supports still depths; animated shadow visibility must come from geometry.
- **World contract:** C# owns emitter positions, height, intensity, color,
  lifetime, spell identity and deterministic snapshots; renderer owns GPU
  buffers, shadows, exposure, color and presentation only. Prototype controls
  may be simulated but clearly labeled test-only; never create game state
  from JavaScript VFX. Keep camera projection, world units and light coordinates
  explicit; no double projection or stale sprite anchors.
- **Mobile/native:** browser GPU prototype is a *disposable validation harness*,
  **not** a decision to keep a browser game. Measure on physical iOS and Android
  before choosing a native adapter/runtime (e.g., URP or another suitable 3D
  renderer). Do not port .NET 10 domain code into a different runtime blindly.
  Preserve a platform-neutral snapshot contract so no gameplay rewrite is
  required when the presentation backend changes.

## First Work-session slice: exactly one tree, one moving Fireball

1. **Inspect before writing:** current `main`, #307 and #327, CI, exact
   Blender model generation, current `/arena-lighting`, approved source six
   ground paintings and Step-2 trails, and current browser/mobile pipeline.
   Record what's already merged vs only in a PR. Do not independently
   rebuild/repaint tree models or resurrect rejected trees, roads or props.
2. **Reuse original geometry:** obtain the `.blend` source from the known
   Step-3 render artifact; add a reproducible geometry export to that source
   workflow (glTF/GLB or documented equivalent), without overwriting
   `.blend` and without promoting source art to production.
   Verify mesh/leaf alpha clipping and original foot/root placement.
3. **GPU proof scene:** create one isolated route and renderer module. Show
   the **actual approved ground compositor** (or a faithful GPU surface
   backed by its exact generated approved board and textures), the original
   ancient oak geometry and one frozen/movable warm Fireball at true world
   height. No C# simulation changes. No CSS filters or fake dark polygons.
4. **Make foliage cast AND receive:** trunk, branches and at least two
   separate visible leaf layers cast onto one another, onto the trunk and
   onto the original ground. Implement genuine light-space visibility and
   matching alpha-cutout shadow casting. Preserve root contact and dark
   unlit faces. Add optional restrained baked AO and leaf transmission
   **after** self-shadowing itself is proven.
5. **Expose debug modes:** final lit / unlit ground / normals / geometry
   and depth / shadow visibility / light camera / shadow ON/OFF, and
   Fireball LEFT / RIGHT / BEHIND / OFF presets. Display current shadow
   resolution and GPU frame time where supported, with honest unavailability
   fallback. Frozen inputs, fixed seeds and fixed camera for screenshots.
6. **Review evidence and fix** rather than stopping when CI is green:
   capture 320×568 and 390×844, inspect left/right self-occlusion and
   correct source tree perspective and bark/canopy depth. Include side-by-side
   shadow-map/visibility debug, not only pretty composites. Repeat on actual
   mobile GPUs before declaring readiness. Art approval remains with owner.

### Mandatory visual acceptance matrix

| Preset | Required visible result |
| --- | --- |
| A — Fireball LEFT | Left-facing leaf/branch surfaces warm; near leaves cast onto leaves and trunk behind them; ground cast projects away |
| B — Fireball RIGHT | Internal canopy and trunk visibility **reverses**, not merely a gradient sliding over the entire billboard; ground cast follows |
| C — Fireball BEHIND | Foreground leaves occlude background branches appropriately; optional thin-leaf transmitted backlight is subtle, not uniform brightening |
| D — Fireball OFF | Near-black canopy/ground with restrained ambient/AO; no residual emissive highlight or phantom dynamic cast |
| E — SHADOWS OFF (same light) | Internal branch/leaf shadows disappear while the **same materials, light and camera** remain; screenshot comparison proves geometry-based occlusion |
| F — debug depth/visibility | Occluder silhouette and depth ordering correlate spatially with the affected leaves/trunk; no shadows painted from a static RGBA cut-out |

**Hard fail:** tree looks like a cardboard cutout, only casts on ground,
foliage isn't casting onto *other foliage*, source is distorted, masks
cause transparent square planes, light/shadow orientation does not track
the Fireball, or dark combat cues become unreadable.

## Deliverable sequence after the proof

| Gate | Scope | Required evidence |
| --- | --- | --- |
| **G0 — inventory** | Reconcile open PRs/assets, confirm approved camera, board, seed, world units; record renderer choice and constraints | Link exact source, artifact and current SHA; no production changes |
| **G1 — one-tree self-shadowing (NEXT)** | Geometry + alpha-clipped leaves, one shadow-casting moving fire, dynamic leaf↔leaf↔trunk + ground shadows | A–F above, 320/390 captures and actual shadow/depth debug with owner review |
| **G2 — common light contract** | Typed C# `LightEmitter` snapshot mapping, no independent JS state, actors/terrain/foliage receiving consistently | Replay/determinism tests; moved/extinguished lights update correctly; no combat rule changes |
| **G3 — foliage/material depth** | AO, restrained leaf transmission, bark roughness, wet approved ground response, mist respecting depth | A/B per material, no glow blanket or neon foliage |
| **G4 — mobile budgets and LOD** | Near geometry / mid simplified occluders / far baked sprites, caster culling, update scheduling, adaptive shadow map | Actual iOS + Android profiling, 60 FPS modern target / stable 30 FPS fallback (targets, not measured results), memory/thermal notes |
| **G5 — live Hunt integration** | Tested rendering adapter driven by C# snapshots; no tree/biome art mass conversion before owner approval | Real Fireball/Ashfang, foes, pickups, projectiles and hazards remain legible; CI and device evidence |

**Stop at G1 until the tree genuinely self-shadows.** A passing format/unit
test or an attractive ground shadow does not release this gate.

## Engineering boundaries

- No wholesale game engine rewrite, no gameplay redesign, no new collisions,
  no save migrations, no changes to Fireball damage/timing/cast behavior.
  Fire sources in the proof are test-only.
- Preserve all six approved original materials, material blends and Step-2
  connected trails; current Source-only Blender trees and their
  `.blend` files remain intact and unapproved.
- Keep code in isolated, reviewable PRs. Do not merge unfinished #327 just
  because its ground cast improved; it is comparison evidence/experimental
  fallback until the geometry proof is accepted.
- Favor single bounded shadow-casting key light during proof; avoid multiple
  expensive cubemap shadows on phones until profiled. Reduce shadow-caster
  scope rather than weakening correctness or painting fake shadows.
- Keep a fallback readable render when GPU features are unavailable; it is a
  **fallback**, not proof that billboard lighting passes G1.

## Technology references (principles, not third-party assets)

- [Three.js shadows manual](https://threejs.org/manual/pages/shadows.html):
  shadow maps render caster geometry from the light viewpoint, with real
  per-light rendering cost.
- [Three.js Material reference](https://threejs.org/docs/pages/Material.html):
  alphaTest/masked leaves versus blended transparent materials.
- [Three.js LightShadow reference](https://threejs.org/docs/pages/LightShadow.html):
  shadow-camera/map resolution and depth visibility.
- [Khronos glTF Blender exporter](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst):
  glTF alpha MASK cut-outs and double-sided materials.
- [Unity URP material documentation](https://docs.unity.com/en-us/engine/6000.7/manual/materials-and-shaders/built-in/shaders-in-universalrp/prebuilt-shader-graphs-urp/unlit):
  explicit alpha clipping and cast-shadows features if native URP is later selected.

**Current evidence as of authoring (23 Oct 2026):** #324 and #326 merged;
#307 Blender source/real normal artifact remains open; #327 L4 Canvas
billboard experiments remain open. The new geometry GPU shadow proof is
**not implemented**, and physical mobile FPS/thermal acceptance is not yet
available. Verify HEAD/CI before a new session, as these states will change.
