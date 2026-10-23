# WyrmForge — reusable 2.5D lighting engine: implementation plan

> **Implementation plan, updated 23 October 2026 after owner clarification.**
> Binding requirements: [Art & animation](../canon/art-and-animation.md#proper-lighting-engine-and-foliage-self-shadowing--locked-23-october-2026),
> [Architecture & quality](../canon/architecture-and-quality.md) and
> [P5 roadmap](../canon/roadmap.md#arena-v2-art-specific-sequence--23-october-2026-locked).
> This is a Work-session guide, **not** a claim that an engine has shipped.

## Mission: a LIGHTING SYSTEM for the entire game, not a tree effect

Build a **generic, reusable, object-agnostic lighting engine** analogous in
*capability and separation of concerns* (not scale, fidelity or feature count)
to Unreal/Unity scene lighting, tailored to WyrmForge's Gothic 2.5D pixel-art
visuals and eventual native iOS/Android targets.

**Owner requirement:** Any new existing/future object — a torch, wall lamp,
Fireball, Wyrm breath, burning tree, glowing crystal or magical effect — can
declare *that it emits light* and specify its characteristics, **without**
requiring a new renderer-specific `if (object.type === ...)` light implementation.
Every eligible nearby **receiver** (approved ground, wall, rock, tree foliage,
mage, enemy, Wyrm, props) responds through the same material/occlusion engine.
Objects can be **emitters, receivers, occluders, or any combination**. They are
not all required to emit light.

The previous **one-tree-first architecture was too narrow**. A tree is a
stress-test for shadow correctness, not the foundation of the system.
**Engine contracts and multi-object behavior come first.**

All Hunts remain Gothic night. Shadows approach black away from light;
actual warm fire, elemental spells and grounded practical light sources
reveal nearby geometry. No global orange tint, fake ambient daylight or
unbounded bloom. Essential combat UI/telegraphs must remain legible.

## System boundary: three reusable contracts, no per-asset renderer rules

### 1. Light emitter (declarative component)

A light-emitting object registers or updates a typed `LightEmitter` descriptor
(in the eventual authoritative C# render snapshot for gameplay, or test-only
data in the isolated proof). **Fields below are conceptual and MUST be reconciled
with existing code before adding new C# types.** Keep rendering and simulation
decoupled.

| Property | Purpose |
| --- | --- |
| `Id`, `OwnerId`, `Enabled` | Stable source identity; create/update/remove without leaked or duplicate lights |
| `Type` | Point (omnidirectional), Spot (cone), Directional (distant source); Area-like soft sources as later optional approximation, not a promised real-time area-shadow system |
| `Position (X,Y,Z)`, `Direction` | World-space origin/height, orientation; not a canvas pixel, arbitrary screen coordinate or 2D-only radius |
| `Color`, `Intensity`, `Range`, `Falloff` | Emitted radiance/brightness and attenuation; choose/document consistent engine units and color space rather than ambiguous arbitrary numbers |
| `ConeAngle`, `Penumbra` where applicable | Spot-only shape; validate ranges |
| `ShadowMode`, `Priority` | May cast real shadows, request quality or remain illumination-only under mobile budget; no assumptions that every light can afford a shadow map |
| `Lifetime` / active-state transitions | Spawn, attach, move, flicker when appropriate, expire/extinguish; timeline comes from authoritative state, not frame-time client guessing |
| Optional `LayerMask` / profile | Intentionally limit influence (e.g. VFX-only) without hard-coding object kinds into shader/renderer |

**Important:** "glowing sprite" / emissive material makes the *source itself*
appear luminous. It **does not automatically illuminate other objects** unless
a light-emitter descriptor is also present. Conversely, an invisible test light
can illuminate surfaces without a rendered torch mesh.

### 2. Lit renderable / receiver + occluder (declarative components)

Any renderer-visible object describes **what it is made of**, not which spells
it knows: world transform, mesh or depth-capable 2.5D geometry, albedo,
normals, roughness, optional AO and emissive map, `ReceivesLight`,
`CastsShadow`, shadow participation/quality, optional alpha-cutoff for leaves
and appropriate double-sided behavior. Sprites may use authored height/depth
and normal data *when sufficient*, but genuinely overlapping foliage needs
real multi-layer geometry to cast dynamic leaf-on-leaf shadows.

- **Same render path** for bark, wet stone, mud, rock, armour, enemies,
  characters, cutout foliage and other props, with material parameters
  controlling their response. No hand-authored special-case `drawFireballOnTree`
  / `drawTorchOnRock` logic.
- Shadow receivers and occluders are independent of C# physical collision;
  a tree canopy shadow shape is **not** a collision volume.
- Real occlusion is resolved using caster depth/light-space visibility, not
  only `N·L` normal illumination or a 2D silhouette painted onto ground.
  Alpha-clipped leaves must use the same cutoff in normal and shadow passes.

### 3. Scene lighting system / renderer adapter

A central lighting subsystem consumes a registry/immutable render snapshot of
emitters, renderables, and environmental settings (ambient/sky fill, exposure,
optional moon/directional key). It performs transforms, culling, attenuation,
shadow caster selection, shadow maps, material response, occlusion,
composition and diagnostics. It is **one engine** shared by all assets,
not a second renderer attached to every character or biome.

Suggested conceptual flow:

```text
Authoritative C# RunSimulation / scene state
  -> versioned LightingSnapshot (emitters + transforms + lifetimes)
  -> renderer adapter (WebGL GPU proof now; native adapter later)
  -> central LightRegistry / visible-light & caster selection
  -> geometry/depth/alpha-cutout shadow passes
  -> shared material shaders (ground / foliage / rock / actor)
  -> physically coherent near-black scene + emissive VFX + readable UI
```

Static authored world lamps/torches register like moving spell emitters;
the authority/lifecycle depends on existing scene state. The demo may add
test-only emitters, **clearly labeled**, without inventing production gameplay.

### Light types and rollout

| Light | Expected game examples | Initial support |
| --- | --- | --- |
| **Point** | Fireball, torch, burning vegetation, crystal | G1 illumination + shadows in a bounded test; optimize costly omnidirectional shadows on mobile |
| **Spot** | Directional magical beam, cone-shaped fire, lantern | G1 registry/material compatibility + proper directional/cone shadows |
| **Directional + ambient** | Moonlight / minimum night visibility | G1 scene-wide support, restrained and **not fake daylight** |
| **Emissive surfaces** | Lava vein / spell core / rune | G1 source appearance; adds real scene illumination only if configured as an emitter |
| **Area/extended sources** | Large furnace/open flame | G3+ quality extension or documented cluster/approximation; do not claim real soft area shadows before testing |

The interface should be **extensible** without promising every form of
global illumination, reflections or Unreal-style real-time GI on phone hardware.
Multiple lights illuminate concurrently; dynamic **shadow casting is separately
budgeted**. Do not turn all extra lights into fake painted shadows.

## Why tree-only normal maps failed

Gothic-night Canvas mask (merged #326) gives local contrast; alpha-projected
ground casts and camera-space normal passes from experimental #327 give useful
comparisons. **None of these tells the renderer which leaf blocks another**.
A normal describes surface orientation, while depth from the light tells us
visibility. The new GPU engine requires actual caster/receiver geometry.

The original **ancient oak** and **dead elm** from source-only Blender
[PR #307](https://github.com/pjotrcasteel/Wyrmforge/pull/307)
remain valuable complex stress-test assets with editable `.blend` files.
Export real trunk/branch and alpha-clipped leaf geometry to a fixed-camera
2.5D GPU scene; preserve original source and provenance. Do not replace
approved original art, regenerate trees unnecessarily or integrate these
unapproved candidates into production.

## Rendering architecture and mobile performance

- Build an **isolated `/arena-light-engine` GPU proof** (WebGL2/Three.js or
  another proven backend, with choice recorded), not a permanent browser
  platform commitment. Keep `/arena-lighting` and Hunts untouched initially.
- Preserve WyrmForge's established fixed orthographic 2.5D view, sprite-inspired
  aesthetics and six owner-approved ground materials/transitions and Step-2
  trails. Render original terrain rather than a new generic grey test plane
  for final art acceptance; a simple debug plane is allowed for early correctness.
- For foliage self-occlusion: alpha-cutout leaf geometry casts **and receives**
  real shadows from a moving point/spot source; branches shade trunk and
  adjacent leaves; the ground and nearby rock/actor are lit and occluded by the
  exact same light.
- Keep strict budgets: choose shadow-casting lights by explicit quality/priority,
  visibility and relevance, not arbitrary object-type special casing. A
  point-light cube shadow commonly requires six depth views. Start with a
  bounded number of active shadow casters, with graceful stable fallbacks for
  non-shadowed light. Avoid flickering caster choices between frames. Add
  near/mid/far geometry/LOD, shadow-update caching and dynamic scaling *after*
  correctness. Measure GPU/frame time, thermal, battery, overdraw and memory
  on real iOS/Android devices; target 60 FPS modern and stable 30 FPS fallback
  (goals, not claims).
- Source values/physics/damage/timing are authoritative C#; shaders are
  visual-only. Snapshot shape should be portable. Do not copy/paste gameplay
  into JavaScript or port .NET 10 into a new native runtime casually.

## First Work session: G0 → G1, prove a GENERIC ENGINE, not a specific tree

1. **G0 inspect & reconcile:** repository `main`, #307 original Blender
   asset/source pass, #327 experimental lighting, current C# snapshots and
   render modules, dependency rules, approved terrain and existing CI.
   Write a small architecture decision explaining the chosen GPU backend,
   light/renderable/scene contracts, unit/color conventions and mobile limits.
2. **Build the common registry and surface path first.** A minimal,
   reusable light descriptor + renderable/material descriptor + scene
   compositor must allow objects to **register/update/remove themselves
   through data**, not new renderer conditionals. Show visible light and
   shadow-registry/debug state. Keep demo data separate from gameplay.
3. **Prove several different emitters:** moving Fireball (Point),
   fixed torch (Point), directed lantern/beam (Spot), restrained
   ambient/moon direction. They can independently spawn, move,
   change intensity/color/range, be disabled, and expire. **Two active
   overlapping local lights** must combine consistently; no ghost light
   after removal.
4. **Prove several different receivers and occluders:** actual approved
   wet ground; a solid rock/wall; *original 3D* ancient oak trunk/branches
   with cutout leaf layers. Prefer an existing mage/enemy receiver as an
   optional next small test if it is cheap to include. The same Fireball
   lights all of them, rock/tree cast onto ground, leaves cast onto
   leaves/branches/trunk. Materials vary naturally without custom emitter code.
5. **Prove add-an-object without engine edits:** add a new sample
   "glowing rune"/"lit crystal" using only descriptors/assets. It should
   light rock, ground, tree and any other eligible object in range.
   The generic lighting-renderer source must **not change** to add this
   object. Demonstrate removal and toggling `CastsShadow`/
   `ReceivesLight` separately.
6. **Debug/test:** frozen seed/camera at 320×568 and 390×844.
   Views: lit, albedo, normals, actual geometry, light-space depth,
   shadow visibility, light bounds, per-object emitter registry.
   Presets: Fireball left/right/behind/off, torch only, overlapping
   Fireball+torch, moving Spot, no emitters, shadows off, new rune.
   Report pixel/frame metrics without claiming final physical QA.
7. **Review & refine:** visually inspect the *actual* screenshots,
   especially internal leaf self-shadow and light changes on non-tree
   objects, before calling G1 done. Preserve original .blend files and
   accepted materials. CI passing doesn't equal visual sign-off.

### G1 acceptance matrix: generic behavior and real shadows

| Case | Must be observable |
| --- | --- |
| **New emitter added** | Light appears on ALL in-range eligible objects via config/registration, **zero object-specific renderer code** |
| **Move, disable, remove** | Light and appropriate dynamic shadows move/disappear immediately; IDs stable, no leaks/phantom glows |
| **Fireball + torch overlap** | Both affect shared terrain, tree and rock; intensities combine without global daylight or blown-out artifacts |
| **Point, Spot and directional** | Distinct defined shapes/directions/ranges respected; future unsupported area lights degrade explicitly, never silently masquerade |
| **Different materials** | Wet ground, rock, bark, leaves react appropriately under the SAME light, not one uniform paint overlay |
| **Occlusion** | Rock casts on ground, tree casts ground shadows, real leaves cast on other leaves, branches and trunk with Fireball direction reversal |
| **Shadows OFF** | Illumination persists but visibility/occlusion differences disappear; no hidden fixed shadow masks |
| **No emitters / budget fallback** | Near-black readable night; caster budget may reduce shadow quality but must not invent lights, change gameplay or break combat visibility |
| **New object uses engine** | Sample rune/second prop emits without modifying engine shaders/dispatch; casts/receives flags work independently |

**G1 fails** if only tree shadow works, a new object requires its own
light renderer, one-off `switch (kind)` cases are required for each source,
leaves shade only the ground, sprites become flat cardboard, mobile light
overlap makes night daylight, or the underlying approved ground changes.

## Gates after G1

| Gate | Deliverable | Evidence |
| --- | --- | --- |
| **G0 — inventory + contract** | Inspect existing repo; define reusable light/renderable/scene descriptors, units and backend | Actual source SHA, integration seams, written renderer-neutral contract |
| **G1 — working generic GPU lighting (NEXT)** | Light registry, point/spot/directional, multiple emitters, varied receivers, real occlusion with at least one complex alpha-cutout tree and a rock/wall | Acceptance matrix + 320/390px screenshots; independently add/remove a new emitter without renderer edits |
| **G2 — authoritative C# bridge** | Typed snapshot source mapping, stable lifecycle and environment settings; adapter boundary for browser/native | Deterministic replay, movement, extinction and no gameplay mutation/regressions |
| **G3 — advanced material/light response** | AO, two-sided leaf transmission, roughness, wet materials, localized fog, emissive effects, optional area-source approximations | Material-specific A/B, night preserved, no neon/plastic/filter stack |
| **G4 — mobile and scale** | LOD, caster selection, caching/adaptive shadow quality, renderer-native choice | Real iOS/Android FPS, thermal/battery, memory and combat readability |
| **G5 — live Hunt adoption** | One proven engine backend integrated across existing objects, biomes and effects with canonical authority | Combat, Wyrm, spell, save, collision, UI tests and owner/device review |

Build G0/G1 in vertical, reviewable commits/PRs. Stop at the first
generic light + receiver + actual shadow proof until it works; **do
not expand scenery or ship mass art** to compensate for missing engine
behavior.

## Non-goals and invariants

- **Not** implementing Unreal Engine, Lumen, global illumination, fully
  physical path tracing, unlimited overlapping shadowed lights, or a
  general-purpose editor for every platform in the first slice.
- **Not** rewriting .NET gameplay, adding collision, changing Fireball
  balance or saves, or mandating Three.js/Unity/Godot as the final engine.
- **No** large-scale tree/biome conversions before owner approval; no
  resurrection of rejected old art. #327 remains experimental reference
  unless explicitly reconciled, not a second production light engine.

## Reference specifications / provenance

- [Three.js light categories](https://threejs.org/manual/pages/lights.html)
  and [shadow maps](https://threejs.org/manual/pages/shadows.html):
  directional/point/spot behavior and light-space depth rendering cost.
- [Three.js PointLight](https://threejs.org/docs/pages/PointLight.html):
  omnidirectional point attenuation and shadows.
- [Unity URP light components](https://docs.unity.cn/6000.0/Documentation/Manual/urp/light-component.html):
  typed light properties as inspiration for **component-driven design**,
  not a decision to adopt Unity.
- [Khronos glTF 2.0 materials specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc):
  `MASK` foliage alpha-cutoff, depth and double-sided behavior.

**Status at writing (23 October 2026):** #324 and #326 are merged;
the original editable tree source #307 and Canvas L4 normal/shadow PR #327
were open at the latest inspection. Verify them before implementing.
The **generic GPU light engine is not implemented yet**; updating its
design documentation does not deliver renderer code or native performance.
