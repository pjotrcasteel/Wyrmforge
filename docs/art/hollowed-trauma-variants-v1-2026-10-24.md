# Hollowed — four cape-free injury locomotion variants (24 October 2026)

**Status: implemented as original-editable Blender review candidates in draft PR #333; NOT approved or used in Hunts.**

Source: original 120Hz CMU 09_01 run, existing Hollowed cape-free 16-frame source rig with fixed anatomical hand follow-through. No new lighting renderer or independently oscillating limbs. Ashling and all production runtime animation/materials are protected.

## Four authored variants

| Variant | Actual source | Damage / what differs | Usable arms |
| --- | --- | --- | --- |
| Standard feral | `rigged-mocap-no-cape-captured-hands-candidate` | Existing reference runner | Left and right |
| Broken left leg | `rigged-hollow-trauma-broken-leg-left` | Left foot has captured-swing-dependent reduced clearance and reach; reconstructed knee hinge from original upper/lower bone lengths. Planted left foot and entire right leg preserve original source | Left and right |
| Broken right arm | `rigged-hollow-trauma-broken-arm-right` | Measured right humerus and forearm constrained closer to ribs; limited follow-through instead of free sprint arm | Left only |
| One arm (left unusable) | `rigged-hollow-trauma-one-arm-left` | Left upper/lower arm hangs, with bounded residual response to captured motion rather than independently dangling; right continues active sprint | Right only |

All three new variant .blend files preserve the original cape-free weighted mesh, UVs and topology; each has its own 17 keys (16-frame cycle + exact closure). All are source-derived; no random wrist, ankle or arm sine/cosine controllers.

The damaged-arm status is **source metadata only**. The game does NOT yet switch attack behaviour by arm; that requires separately authorized attack artwork and integration later. Likewise the broken leg has **no C# movement-speed or pathing modification**. Do not claim these candidate animations are shipped.

## Real 96px full-cycle GIF review (8 directions for EACH variant)

The 32-frame review set per injured variant consists of:
- 8 complete direction GIFs at true 96px, 25fps
- 8 full-cycle 4× zoom direction GIFs
- 8 side-by-side standard-versus-injury comparisons at native 96px
- 8 side-by-side 4× comparisons; original versus variant timing is synchronized

| Variant | East A/B animated | West A/B animated | Eight directions |
| --- | --- | --- | --- |
| Standard | [Source east](evidence/hollowed-trauma-v1/standard/e-animation.gif) | [Source west](evidence/hollowed-trauma-v1/standard/w-animation.gif) | [Standard GIFs](evidence/hollowed-trauma-v1/standard/) |
| Broken left leg | [East 4× comparison](evidence/hollowed-trauma-v1/broken-leg-left/compare-e-zoom-4x.gif) | [West 4× comparison](evidence/hollowed-trauma-v1/broken-leg-left/compare-w-zoom-4x.gif) | [All eight and native comparisons](evidence/hollowed-trauma-v1/broken-leg-left/) |
| Broken right arm | [East 4× comparison](evidence/hollowed-trauma-v1/broken-arm-right/compare-e-zoom-4x.gif) | [West 4× comparison](evidence/hollowed-trauma-v1/broken-arm-right/compare-w-zoom-4x.gif) | [All eight and native comparisons](evidence/hollowed-trauma-v1/broken-arm-right/) |
| One arm, left unusable | [East 4× comparison](evidence/hollowed-trauma-v1/one-arm-left/compare-e-zoom-4x.gif) | [West 4× comparison](evidence/hollowed-trauma-v1/one-arm-left/compare-w-zoom-4x.gif) | [All eight and native comparisons](evidence/hollowed-trauma-v1/one-arm-left/) |

Every new variant has a 128-frame original-surface atlas and its corresponding 256-frame comparison sheet `standard-vs-trauma-128-frames.png`.

## Implementation and reproducibility

- `tools/sprite-lab/build-hollow-trauma-variant.py --variant <name>`: reuses canonical Blender source, creates a NEW editable .blend (never overwrites originals), applies joint-chain adaptation with measured source phase, verifies frame closure, source provenance and unchanged limbs.
- `tools/sprite-lab/sample-hollow-rig.py -- <variant-model-folder>`: samples the same 3D posed topology and 34 real foot contact markers.
- `tools/sprite-lab/render-hollow-trauma-variant.py --variant <name>`: renders 128 original-size skinned poses and all full-cycle review GIFs at 25fps, plus paired 96px and 4× review.
- `.github/workflows/hollow-trauma-variants-v1.yml`: renders 3 injuries in parallel, tests source geometry/UVs, foot contacts, pose closure, and all review GIF frame counts; preserves all candidates and art review results on the existing PR branch.
- `art/source/enemies/hollow/rigged-poc/trauma-variant-pack-v1.json`: machine-readable review-only variation catalogue and intended functional-arm distinctions.

[GitHub Actions four-variant render results](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40100484434): **three Blender build/render jobs and final preservation job passed**.

## Actual visual evaluation

Inspected both full-cycle atlases and East/West/South-East native/enlarged comparisons. The broken right arm and unusable left arm change distinguishable arm silhouettes; the damage does not introduce disjoint wrist oscillators. The shortened/damaged left-leg swing is physically measurable (at full swing about 0.08 Blender units lower and knee flexion ~15–24° different), but visually **too subtle** at 96px in several directions. Further authorial weighting and weight-transfer/reflex adjustment are needed before any art approval. The original base sprint itself is still not production-quality at real Hunt travel speed. Passing CI confirms technical reproducibility, **not** final anatomical acceptance.

**Do not merge or substitute production actor animation.** Before runtime adoption, owner must accept all eight directions including actual moving Hunt-size and 320/390px device captures. Approved variant poses and cape-free mesh must be reused for new walk/attack/death albedo, normal/depth/caster/emissive exports; never pair existing G1 normals with newly posed atlas frames. Keep material and engine ownership in #332, no modification here. Never claim only one functional arm is enforced by combat until that gameplay integration is actually done.
