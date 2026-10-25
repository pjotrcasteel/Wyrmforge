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

## Continuing milestone — injury weight-transfer v2 and functional-arm attack previews

### Left-leg injury: physical weight transfer (NEW, still under visual review)

The first damage pack was intentionally accepted only as a **visual direction**.
The original damaged left foot changed knee recovery and ankle trajectory,
but upper body weight transfer remained almost identical to the standard
sprint. This follow-up introduces a separate, non-destructive source asset:

`rigged-hollow-trauma-broken-leg-weight-transfer-v2/hollow-rigged.blend`.

Source: `tools/sprite-lab/refine-hollow-broken-leg-weight-transfer.py`.
Rather than independent sinusoidal torso oscillation, the original left and
right *measured CMU ankle heights* determine stance/clearance. During healthy
right-foot support, the torso shifts toward the right, while injured
left-foot loading produces a brief compression. The spine counter-leans with
the same contact signal, around its anatomical joint, and **both lower-body
ankle targets are re-solved using original two-bone lengths to prevent foot
sliding**. No cape or artificial wrist/ankle keyframes are added.

- Verified maximum lateral shift ~0.037 Blender units; compensatory thoracic
  lean up to 5.5 degrees; source knee/ankle kinematics retained, and all 17
  contact frames/UVs/triangles checked.
- [CI completed successfully](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40101861953);
  128 source-posed native 96px frames and 32 full-cycle GIFs inspected.
- [Side 4× A/B animation](evidence/hollowed-trauma-v2/broken-leg-left/compare-e-zoom-4x.gif)
  and [back-facing side 4×](evidence/hollowed-trauma-v2/broken-leg-left/compare-w-zoom-4x.gif).
  All eight directions and native 96px comparisons:
  [v2 review evidence](evidence/hollowed-trauma-v2/broken-leg-left/).

**Visual assessment:** pelvis/shoulder mass response is more coherent and
foot contact is protected; however, the distinction still reads subtly on a
phone-scale 96px actor. The gait should be evaluated in actual movement
through an in-Hunt scene, not certified by a centered looping GIF alone.
v1 is preserved as a separate comparison source; v2 is not approved as
production art.

### Disabled-arm attack previews — actual authored 16-frame source transferred

The old Hollowed `rigged-attack-v2/hollow-attack.blend` contains an authored
right-claw attack: anticipation frames 0–5, strike 6–8, and recovery 9–15,
12fps; original gameplay contact frames remain 7–8. Its **original 3D bone
poses** have been transferred onto the cape-free, short-claw source rig
without copying old cape geometry. Three source-preserved attack candidates
are editable in Blender:

| Preview | Functional striking arm | Source model | Real 96px review GIF |
| --- | --- | --- | --- |
| Cape-free standard | Right | `rigged-hollow-no-cape-attack-standard-preview` | [Standard East](evidence/hollowed-trauma-attack-v1/standard/e-attack.gif) |
| Broken right arm | **Left** (3D reflected existing right-claw source trajectory) | `rigged-hollow-no-cape-attack-broken-arm-right-preview` | [Old/new East 4×](evidence/hollowed-trauma-attack-v1/broken-arm-right/compare-e-attack-4x.gif) |
| Left arm unusable | **Right** (existing trajectory retained, left constrained) | `rigged-hollow-no-cape-attack-one-arm-left-preview` | [Old/new West 4×](evidence/hollowed-trauma-attack-v1/one-arm-left/compare-w-attack-4x.gif) |

The original rig action is retargeted from the existing artist-authored
attack, not recreated with generic procedural arm swipes. Each preview has
an eight-direction 128-frame review atlas, 12fps GIFs at 96px/4×, and a
source-SHA256/attack-arm provenance record. The disabled arm remains
guarded/hanging and does **not** swing to hit.

- Builder: `tools/sprite-lab/build-hollow-no-cape-injury-attacks.py`.
- Reviewer: `tools/sprite-lab/render-hollow-no-cape-injury-attacks.py`.
- [CI completed successfully](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40102270258).
- [All true rendered GIF directions](evidence/hollowed-trauma-attack-v1/).

**Required follow-through:** the left-leg variant still needs a
contact-correct *attack* pose with injured stance. Damage-capable arm metadata
is for illustration only: the C# simulation has not been changed, collision
and weapon contact are not reverified for the reflected attack, and the
approved old attack atlas is not replaced. The new attack albedo and derived
normal/depth/caster/emission must be generated from accepted exact geometry
in lockstep before adoption. No changes in PR #332.

## V3 — Stretched zombie running arms and stronger left-leg injury (24 October, user-requested)

**Implementation: complete original-editable review pass, NOT shipped.** Existing draft PR
#333 and its lighting-engine parent #332 remain intact. The source rig is
the cape-free CMU 09_01-derived actor. The preceding standard, injured arm,
and injured leg candidate .blend files remain available unchanged.

User-facing correction: previously half-flexed, boxer-like arms should be
**stretched forward like a reaching zombie**, with exactly **one stretched
healthy arm when the other arm is broken**; the previous injured-leg limp was
too weak at mobile pixel scale.

The new `tools/sprite-lab/build-hollow-zombie-reach-v3.py` exports four
source-editable no-cape rigs:

| Candidate | Art action | Native GIF / zoom comparison |
| --- | --- | --- |
| `rigged-hollow-zombie-reach-v3-standard` | Both healthy arms in a reaching posture; original CMU shoulder motion survives; elbows have ~160–165° interior angles | [E native](evidence/hollowed-zombie-reach-v3/standard/compare-e-native-96px.gif) / [E zoom](evidence/hollowed-zombie-reach-v3/standard/compare-e-zoom-4x.gif) |
| `rigged-hollow-zombie-reach-v3-broken-arm-right` | Healthy LEFT arm fully reaching; injured right remains constrained in its original damaged rig | [E zoom](evidence/hollowed-zombie-reach-v3/broken-arm-right/compare-e-zoom-4x.gif) / [W zoom](evidence/hollowed-zombie-reach-v3/broken-arm-right/compare-w-zoom-4x.gif) |
| `rigged-hollow-zombie-reach-v3-one-arm-left` | Healthy RIGHT arm reaching; unusable left hangs as authored | [W zoom](evidence/hollowed-zombie-reach-v3/one-arm-left/compare-w-zoom-4x.gif) / [E native](evidence/hollowed-zombie-reach-v3/one-arm-left/compare-e-native-96px.gif) |
| `rigged-hollow-zombie-reach-v3-broken-leg-left` | Both arms stretching, injured left foot swings ~0.10 Blender units lower and travels ~0.21 less forward at maximum swing, added ~0.015 injured-stance hip compression and torso counter-lean, length-preserving knee IK | [E zoom](evidence/hollowed-zombie-reach-v3/broken-leg-left/compare-e-zoom-4x.gif) / [SE zoom](evidence/hollowed-zombie-reach-v3/broken-leg-left/compare-se-zoom-4x.gif) |

The actual Blender rigs keep the same geometry/UV/cape-free Hollowed source
and 17 keys for 16 looping frames. Real 25fps 96px 128-frame eight-direction
render atlases and **32 animated GIFs per variant** were built in
`tools/sprite-lab/render-hollow-zombie-reach-v3.py`. GIFs pair previous
candidate LEFT and new V3 RIGHT, in native 96px and 4× nearest-neighbour.
They are located under `docs/art/evidence/hollowed-zombie-reach-v3/<variant>/`.

[Full 4-variant Blender and GIF CI run passed](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40108661540)
after correction of joint-angle interpretation and tolerance-sensitive 3D
Blender contact comparisons. Four parallel builds/render validation jobs and
the final source-preservation job all passed. Original CMU data, base rig,
previous candidates, Ashling, Town, wizard, C# combat behavior and GPU engine
are unchanged.

**Personal visual inspection of full eight-direction sprite atlases and
E/W/SE animated 4× comparisons:** v3 has a distinctly clearer outstretched
zombie silhouette than the half-flexed boxer/sprinter arm. Broken-arm
variants visibly retain one functioning extended arm. Broken-leg drag is
stronger and hip movement more asymmetric, but should still be validated
at *actual Hunt travel speed on mobile*, not pronounced production-ready on
a loop alone. The reaching arms may need a final subtle secondary action
pass if they appear too rigid during live movement.

**Do not merge/cut over yet.** No new normal/depth/caster/emissive material
passes have been generated for these exact posed meshes; never reuse
the previous walk atlas passes. 96px in-Hunt screenshots, gameplay travel
speed/contact, attacks/deaths matching the new reach and approved relightable
source geometry remain separate acceptance gates.

## V7 — Unequal painful contact timing, source-faithful (24 October)

The owner found the V3–V6 broken-left-leg motion still insufficiently
injured-looking at original 96px mobile game scale. The visually examined
V6 source genuinely moved the trailing ankle posteriorly and outwards,
with a crooked knee and painful hip collapse, but played its healthy and
damaged contact/recovery phases at near-identical cadence.

**V7 is a wholly separate, editable cape-free candidate** stored in
`rigged-hollow-broken-leg-asymmetric-v7/`. It retimes the **complete
original V6 full-body source action at fractional Blender frames**. Its
painful injured-left contact now occupies approximately **9 of 16
sampled frames with damaged support over 50%**, versus **6 of 16** in
the measured V6 source. Healthy-right stride accelerates after the
painful contact; the source-mocap injured foot drag and visible buckling
survive intact. This is a hand-authored time map using measured poses,
**not procedural limb jitter or independent sine/cosine wrists**.

A full 16-frame/25fps authentic skinned Blender cycle, eight directions
(128 separate original 96px poses), 32 animated original-and-4× GIFs, a
new editable original-provenance `.blend`, 34 contact samples, and two
**synthetic native-scale traveling-field preview GIFs** are exported by
`tools/sprite-lab/retime-hollow-broken-leg-gait-v7.py` and
`tools/sprite-lab/render-hollow-broken-leg-asymmetric-v7.py`.

Review V6 on left / V7 on right:
- [East 96px GIF](evidence/hollowed-broken-leg-asymmetric-v7/compare-e-native-96px.gif)
  and [East 4× GIF](evidence/hollowed-broken-leg-asymmetric-v7/compare-e-zoom-4x.gif)
- [Southeast 4× GIF](evidence/hollowed-broken-leg-asymmetric-v7/compare-se-zoom-4x.gif)
- [Northwest 4× GIF](evidence/hollowed-broken-leg-asymmetric-v7/compare-nw-zoom-4x.gif)
- [Moving field at TRUE 96px: East](evidence/hollowed-broken-leg-asymmetric-v7/moving-field-e-native.gif)
  and [Southeast](evidence/hollowed-broken-leg-asymmetric-v7/moving-field-se-native.gif)
- [All eight directions, 128-frame atlas, tests](evidence/hollowed-broken-leg-asymmetric-v7/)

**Passed Blender/CI**: [V7 captured whole-body retiming, geometry,
16-key closure, 17 sampled frame source provenance and 96px GIF validation](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40118350903).

**Art judgment:** actual 128-frame atlas, four enlarged GIF sets and native
96px travel/compare previews were reviewed. V7 is a better test of *cadence*
rather than yet another arbitrarily extreme pose. It keeps the user's
approved-direction outstretched zombie arms and recognizable no-cape
silhouette while creating an uneven painful-contact rhythm. It is still
**NOT approved production animation**. The moving field is a synthetic,
controlled preview (two lanes with the same average travel distance);
it is NOT a live Hunt capture. Actual in-Hunt speed/footslide,
owner inspection on iPhone/Android, corresponding source-derived normals,
depth, shadow-caster and emissive passes, and attack/death transitions
remain gates before the PR can be considered merge-ready.

V1–V6 originals, Ashling, material atlases, shared PR #332 GPU lighting,
and runtime combat/movement remain unchanged. No cutover or merge.
