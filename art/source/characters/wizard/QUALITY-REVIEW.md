# Wizard visual-quality assessment — October 24, 2026

Scope: wizard only. Hollowed/Ashling and the GPU-lighting PR #332 are independent.

The existing wizard uses primitive tapered meshes, polygon rasterization and largely flat vertex/face color. The small walk frames still look stiff and boxy. The source is not a proper Blender rig and does not yet have UV-authored material, skinned cloth or real limb/robe collision.

This narrow checkpoint adds genuine mesh detailing: an asymmetric weighted mantle, separate front coat panels, turned lapels/cuffs, a strapped field satchel, hat-brim geometry, sculptural brow/nose and beard locks. The existing school-colored staff, charging emission and shared contract are preserved.

All six schools share one body, motion source and material logic; no standalone renderer is added. The geometry review, finite XYZ, alpha/normal synchronization and zero-emission idle are checked by a new source-level test.

Artistic acceptance: NOT YET. Small improvements to a coarse shape cannot substitute for a real character-production pass. Final acceptance needs a Blender-authored textured character with original reference turnaround, sculpted face/cloth silhouette, editable rig and weighted garments, 16 truly distinctive South walk frames with foot plants, pose-preserving eight-view exports, cast/hurt/death, and 320/390px gameplay captures. Preserve .blend and textures. Do not call it production-ready or merge this draft just because CI is green.

Run source check: python tools/sprite-lab/tests/test_wizard_quality.py
