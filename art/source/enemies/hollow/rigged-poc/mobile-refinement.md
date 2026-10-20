# Mobile pixel proof refinement — 20 October 2026

Owner explicitly requests continued execution through a credible sheet, local
RTX 5090 generation, and mobile pixel-art fidelity. No owner approval is inferred.

Style references inspected: canonical Fire Hollow card, actual runtime Hollow
atlas, approved forest-monastery-encounter-v1, and enemy-lab Hollow/mage evidence.
Runtime painted manifest uses worldSize 60 for Hollow. Target proof: 96px cells,
roughly 56–64px actor height, crisp nearest-neighbor display, restrained warm
bone/brown ramp against dark ground. Inspect native size alongside the existing
slate-blue mage; enlarged model renders only diagnose anatomy/materials.

Next coherent slice: decode higher-detail Gaussian appearance from the same
TRELLIS latent and bake appearance onto the persistent deformable mesh. The first
proof discarded this appearance representation and retained only coarse vertex
RGB. We will test whether that omission explains the missing skull/rib detail.
No independently generated animation frames, rigid-cutout rig, paid service or
GPU settings change. Preserve actual geometry, texture sources, rig and motion.

Research:
- Official TRELLIS source: mesh and Gaussian decoders share a sampled latent.
- https://docs.gsplat.studio/main/ : CUDA Gaussian rasterization supports local
  appearance observations. Apache-2.0 renderer, not the upstream research-only
  Gaussian renderer. This is a toolchain choice, not a new character design.
- https://learn.toonboom.com/modules/walk-cycle-animation/topic/walk-analysis1 :
  preserve contact/loading/passing/rise and weight transfer in the authored shamble.
- https://docs.blender.org/manual/en/5.1/editors/nla/introduction.html : preserve
  editable motion actions; sprite playback is a derived export.
