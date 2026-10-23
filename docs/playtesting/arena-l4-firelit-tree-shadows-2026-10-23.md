# L4: source-alpha tree occlusion and directional Fireball lighting

23 October 2026. Built on merged [Gothic night + L3 Fireball PR #326](https://github.com/pjotrcasteel/Wyrmforge/pull/326)
and [L2 grounded root/pivot PR #324](https://github.com/pjotrcasteel/Wyrmforge/pull/324).

## What the screenshot review showed

Original Step-3 Blender oak and elm candidate sprites appeared **flat** despite L3 lighting:
there was no convincing tree silhouette cast shadow. Root contact was a small
ellipse, and previous broad projected shading came from a faint ellipse that
did **not** follow the actual tree's canopy, branches, alpha or moving Fireball.
The L3 renderer painted trees first, then applied a light-glow over the whole
scene; uniform post-brightening cannot demonstrate proper occlusion or separate
the firelit face of a tree from its unlit face.

## L4 technical slice

- **Source silhouette**: cache each *original* locally supplied RGBA tree once
  at its review scale and make a black mask using its exact alpha. Do not invent
  a generic canopy circle, fake scenery, normal map or collision geometry.
- **Dynamic cast**: derive a bounded perspective projection using the actual
  source world position, light altitude, tree foot pivot and 2.5D tree height.
  An airborne Fireball to the left projects the shadow right, then flips when
  the Fireball passes to the other side. Projection opacity and blur are bounded
  to keep mobile scene readability.
- **Correct order**: approved ground and world-space Gothic night illumination →
  restrained material highlights → projected true-alpha shadow and tight contact
  AO on the **already illuminated ground** → original sprite with fire-facing
  shading and a dark opposing side → subtle source-local mist → emissive flame
  core and optional technical root-pivot overlay.
- **Self-shading**: reuse a small, tree-sized compositing buffer. Darken the
  original tree's *opaque pixels* in night, then apply bounded directional warm
  gradients masked by original alpha. This preserves original tree detail and
  transparency; it approximates relief but cannot infer true 3D bark normals
  from a 2D PNG.
- **Acceptance controls**: `Ground + cast shadows` toggles both shadows while
  leaving the light and tree textures unchanged. Pause the Fireball and move
  its progress to 15%, 50%, 85%. Compare shadow silhouette directions at both
  320×568 and 390×844, including L4 screenshots with shadows off.
- Keep all approved 6 ground materials and transitions unchanged; original
  candidate tree files remain review-only and unapproved. No changes to
  canonical C# simulation/collision, original tree .blend files, or live Hunt
  terrain/forest renderer.

## Genuine 3D surface-normal pass (source pipeline)

The original Blender Step-3 [PR #307](https://github.com/pjotrcasteel/Wyrmforge/pull/307)
has been extended to export **camera-space normals from its real 3D mesh**
at the exact same 768×768 orthographic projection and original transparency.
This export is generated using an unsaved, temporary Blender material override
(`tools/art/render_tree_camera_normals.py`) and **never overwrites the editable
original .blend** or bakes scenery into the albedo.

The normals are contained in the successful
[Blender workflow 40022049054](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40022049054).
In `/arena-lighting`, select the original PNG for each tree, then optionally its
`*-camera-normals.png`. The lighting layer decodes per-pixel surface orientation
and recalculates fire-facing diffuse highlights dynamically as the Fireball
moves. Original pixel alpha and geometry remain unchanged. The source candidates
are still **unapproved** and are not default production artwork.

The 2D gradient fallback remains only for the older artifact without normal maps.
Real 3D normal maps are the preferred technical review baseline; judge them separately
from the silhouette shadow. Normal-based diffuse lighting is still not true
self-shadowed geometry, volumetric scattering, or gameplay occlusion.

## Explicit limitations / next gate

A source-alpha 2.5D billboard projection is **not real 3D self-shadowing**,
branch-on-branch dynamic shadow mapping, shadow volumes or normal-mapped bark.
The light-facing gradient adds contrast and remains a *temporary art review
adapter*. If L4 still looks like a flat cardboard cutout, the fix is an
authored sprite with proper directional light/normal-map passes from Blender
(or a true 3D rendered asset), **not stacking filters and more radial glows**.

The source PNG review is a technical gate; final visual acceptance is up to the
owner. Future native iOS/Android renderers need a performant local shadow/normal
representation and profiling before game-wide deployment.
