# G5 — Lighting Engine 0.1 opt-in composition contract

**Scope:** the single shared `LightingEngine`/`HuntGpuWorld` GPU backend for 2.5D
world scenes. This is a composition API for future AR4/AR5/WF32 assets, not a new
lighting engine, a default GPU cutover, a Town repaint, or Lighting 1.0.

## Use in the actual Wet Forest Hunt

Open `/?arenaGpu=1&lighting01=1&g4PaintedGround=1`. Both flags are required:
the normal Canvas Hunt and the existing `?arenaGpu=1` G4 review stay unchanged.
Optional `gpuQuality=mobile` selects the existing shared mobile renderer tier.

The normal C# generator authors a stable torch ID/position in the Wet Forest
recipe. Only an explicitly opted-in run adds its point emitter to the same
`LightingSceneComposer` snapshot containing moonlight, moving Fireballs, spell
impacts, actors, and the other existing C# sources. Full snapshots remove old
sources on scene change/expiry. GPU composition renders the fixed 16×24-pixel
torch cutout at the **exact** site coordinate only when its matching C# emitter
is present and enabled; JS is not allowed to invent a light. Its provisional
sprite is a diagnostic pixel cutout, **not final WF32 artwork**. The torch
uses the explicitly reduced, non-shadowing fixture tier; other C# sources keep
the existing single-engine shadow budget.

## Asset adapter for AR4, AR5 and WF32

1. Register authored `THREE.Texture` resources once through
   `HuntGpuWorld.registerAssetTexture(id, texture, colorData)`. Non-color maps
   such as normal, roughness and emissive must set `colorData=false`.
2. Register optional native 2.5D geometry with
   `HuntGpuWorld.registerAssetGeometry(id, geometry)`. This is an authoring
   resource, not runtime 3D mesh generation or gameplay geometry.
3. After `HuntGpuWorld.begin(...)`, submit an array of
   `{renderable, material}` through `submitLighting01Surfaces(world, surfaces)`
   from `lighting/g5-world-composition.js`. Resource/material IDs must match.
   `LitMaterial` supports albedo, normal, roughness, emissive and optional
   physical channels; `LitRenderable` supports source-pixel atlas frames,
   `castsShadow`, `receivesShadow`, `receivesLight`, foot/pose transforms and
   an independent authored occluder. The existing
   `lighting/contracts.d.ts` remains the wire contract.
4. Render with `HuntGpuWorld.render(ctx, authoritativeFrame)`; it uses the
   existing `LightingEngine.apply` implementation. Static assets stay on the
   GPU; legacy Canvas capture is still available as an explicit migration
   adapter, not an independent shading engine.
5. The C# simulation owns physical effects, collision, world topology,
   source lifecycle/expiry and spell identity. JS owns pixel presentation only.

## Verification and what 0.1 does *not* mean

Automated JS tests cover opt-in gating, source identity and world-coordinate
agreement, reduced fixture shadows and generic surface submission. The C#
projection test verifies fixed torch plus moving Fireball source coexistence,
including projectile expiry. A real-Hunt Chromium test at 320×568 and 390×844
requires one authored fixture and a moving C# Fireball in a running Hunt, with
nonfailed GPU presentation and screenshots. G4's separately owner-approved
impact-shadow preview stays pinned and serves as regression reference.

Known G5 limitations:

- The G4 legacy Canvas-capture migration remains for enemy/terrain art; full
  per-pose native 32px materials and sprite/atlas parity remain G7/G9 work.
- Provisional torch art lacks a dedicated emissive mask; WF32 will replace it
  with authored pixel albedo/emissive/normal/roughness channels.
- Decorative fixture shadows are deliberately disabled to avoid a giant
  inaccurate wedge. Full height-aware terrain and caster accuracy are G6/G7.
- Accurate scenery reflections, physically coherent wetness and final mobile
  memory/thermal budgets are G8/G9. iOS/Android hardware proof and production
  default GPU adoption remain G10.
- Browser CI proves composition, not visual owner approval. G5 is an opt-in
  baseline until the real-Hunt capture is reviewed.
