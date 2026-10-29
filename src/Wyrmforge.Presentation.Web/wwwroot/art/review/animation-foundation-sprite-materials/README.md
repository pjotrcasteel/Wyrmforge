# Source-evaluated baked sprite materials — review only

The original export's missing Cycles camera-Z conversion is corrected here.
Normal-basis version 2 passes six independent analytic plane/camera checks.
Actual 320/390px shared-GPU framebuffers pass albedo/normal diagnostics, true
zero-light blackness and exact paused restoration. The rejected initial maps
remain in Git history; they are not accepted lighting evidence.

One complete sixteen-frame walk in eight genuine views. Editable source:
`art/source/animation-foundation/baked-compact-stride-20261029/`.
The primary image is unlit albedo; matching evaluated geometry normals and
emission have identical source alpha and frame/view/crop coordinates. Source
hashes and the Blender material-export receipt are preserved. All three RGBA
maps together decode to 6,094,848 bytes; the review-lit duplicate is excluded.

This is a bounded shared-GPU integration proof, not accepted art or AN5 closure.
It intentionally has no motion-heading variants or new claw; existing attack,
injury, death and Canvas fallback remain. Grounded turn/contact, actual Hunt
lighting, sprite-plane caster limitations, 320/390px and physical-phone gates
remain open. `productionReady` is false.

Reproduce `render_material_passes.py --clips walk` from the preserved source,
`export_atlases.py --tight-crop --clips walk`, then `pack_sprite_materials.py`.
The capture tool can route this pack using `AN_ASSET_ROOT`,
`AN_FOUNDATION_MODE=sprite-walk` and `AN_SPRITE_GPU=1`.
