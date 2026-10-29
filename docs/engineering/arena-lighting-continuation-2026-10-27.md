# Arena-first shared lighting continuation

Town relighting is paused by owner instruction; retain the current painted 2D Town.
Continue PR #381, not a competing renderer.

## Implemented

- Normalize generic emitter directions after the Hunt coordinate transform.
- Cull finite point/spot ranges against the actual Hunt view before applying the
  shared light budget. Offscreen emitters with spill into the view remain eligible;
  directional sources are retained. Authoritative snapshots are never mutated.
- Regression with twelve distant sources proves a visible explosion is no longer
  starved by ID ordering; moving the camera changes eligibility without source renumbering.

## Still required before G4/G5 completion

The real Hunt still draws airborne spell/death/impact VFX after GPU composition.
Those paths need explicit shared material/emission adoption and black-world validation;
there must be no claim that all world VFX are already GPU-lit. Ground and actor captures
still upload Canvas textures every frame; stable atlas/material adoption and measured
upload budgets remain. Authored normals, reliable actor/foliage shadows, genuine
320/390px live-Hunt recordings and physical iOS/Android performance are outstanding.
No production cutover or final milestone completion is claimed by these changes.

Local validation: 18 focused adapter/shared-engine tests pass. .NET SDK is not installed
in this execution environment; CI must provide C# and real-game browser validation.

## Engine-first asset contract (29 October 2026)

Owner rule: the shared GPU lighting engine **must not depend on individual assets**
or their game-specific names. Asset/adapters provide renderable descriptors; the
renderer owns light selection, illumination, shadow maps, occlusion, color-space,
surface BRDF/normal/roughness response, reflections and mobile render budgets.
This matches the material/render-pipeline separation used by Unreal Engine,
Unity URP and Godot RenderingServer.

- An asset may provide geometry and shadow-occluder geometry, albedo/normal/
  roughness/height textures, physically meaningful surface parameters,
  world transform, alpha cutout and cast/receive flags. No invented geometry
  shadows from normal textures alone.
- A C# scene/simulation snapshot decides which things exist and which light
  sources are active. The shared engine renders those facts using data-driven
  materials. No per-creature/per-spell/per-biome lighting implementations.
- The Hunt adapter now accepts optional generic surface/geometry/material
  descriptors alongside the existing Canvas texture capture, including a
  source-free solid-color material path. Asset identity does not change
  the shading implementation. Existing callers retain their previous defaults.
- This is a **contract migration slice**, not proof that runtime Hunts already
  supply source-authored normals or avoid per-frame Canvas uploads. Subsequent
  slices must register actual authored textures, reduce uploads, integrate all
  eligible world VFX and validate live pixel/occlusion/device evidence.

Primary industry references:
- Unreal materials: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-materials
- Unreal material instances: https://dev.epicgames.com/documentation/unreal-engine/instanced-materials-in-unreal-engine
- Unity 2D URP: https://docs.unity.com/en-us/engine/7000.0/manual/unity2d/2d-urp
- Godot RenderingServer: https://docs.godotengine.org/en/stable/classes/class_renderingserver.html
- Godot 2D lighting/occluders: https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html
