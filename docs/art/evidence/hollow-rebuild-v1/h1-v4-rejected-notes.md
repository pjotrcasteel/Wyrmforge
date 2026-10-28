# H1 v4 — anatomical source experiment (rejected, not an approval request)

**Date:** 28 October 2026  
**State:** Real 3D volume sculpt generated and visually inspected, **rejected on art quality**. No production cutover or animation work.

## Source and preservation

A new locally authored SDF procedural anatomical study was built from the isolated H1 v3 helper code. The user-facing checkpoint package retains the v4 authoring script, actual GLB mesh, deterministic VTK render source, 4-view clay/silhouette/material previews, 96px reductions, a 24-angle real-geometry turntable, a preflight report and README. This exact v4 binary/source package is **not yet committed to GitHub**. The H1 v3 source and the independent QC runner **are** committed to this PR. Never claim the v4 GLB is remotely preserved until it actually is; a local packaged artifact does not change PR file contents.

## Technical verified results

- Primary tissue mesh: **1 connected component**, **watertight**, 46,346 triangles.
- Total 3D mesh: **13 objects**, **47,796 triangles**, valid finite source bounds.
- Approximate foot contact: minimum Z **0.0197 m**; geometry study height **3.37 m** (arbitrary sculpt units, **not** game-approved scale).
- Eleven numerical micro-islands (each around 8–20 faces) were explicitly classified and filtered rather than kept as floating claw-pixel fragments.
- The independently run read-only `qc_h1_geometry.py` passed all available mesh-preflight checks.
- Captures are **genuine VTK renders from 3D GLB**, not Blender captures, not actual WyrmForge game captures and not animated character actions.

## Artistic verdict (still FAIL)

The narrow skull and wounded chest are more asymmetric than the previous study, and the isolated forearm rods/eye-ring decorations were removed. But the head still reads as an over-simple bone mask; limbs are too rounded and the figure remains unconvincingly mannequin-like. Do not add ember glow, produce animated atlases or request owner approval. Next work must materially re-author anatomical form, especially the skull, lower face, shoulder/ribcage silhouette, hands and planted weight.

## Non-negotiable scope

Animation engine **completely untouched**: PR #387 remains read-only. No in-game assets, gameplay, Ashling, shader engine or current runtime files modified. Owner approval is reserved until a genuinely finished multi-angle model is visible directly in chat; passing technical QC does not open that gate.
