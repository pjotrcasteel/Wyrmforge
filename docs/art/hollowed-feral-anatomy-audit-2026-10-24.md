# Hollowed feral movement — corrective animation quality audit

**Review state: the new motion capture candidate is NOT approved or in production.**

## What failed in procedural versions 1–10

The first attempts drove the ankle and wrist positions with separate
sinusoidal functions. That produced short shuffling legs, high flapping arms,
locked shoulders, hooked elbows and oscillating hands.

Adding checks for elbow angles, segment lengths or "wrist below shoulder"
did **not** fix the visual movement. Even rigidly aligning hands with the
forearm just changed floppy arms to stiff arms. The owner correctly rejected
all these visuals. These failed trials are preserved in Git history through
commit `5ec8a40aac7cea61e8c8c002b8e20277a71c64dc`, not shipped.

## Change of method — original CMU measured running motion

Instead of further oscillation tuning, the retargeter reads original CMU
Graphics Lab Subject 09 Motion 01 at 120Hz. The license allows all uses.
A physical 88-frame source gait period is selected using actual
hip-relative marker-pose similarity and converted to a 16-frame cyclic
animation synchronized to Hollowed's real world movement speed.

Joint locations are transferred via original BVH forward kinematics.
Upper/forearms and hands retain original rigged segment lengths; arms
are driven by human-captured shoulder, elbow and wrist movements.
Knees follow actual physical stance and recovery rather than a manually
bounced ankle. No recolouring, pixel warping, replacing approved albedo,
new lighting renderer or C# combat changes are permitted.

Source: `art/source/enemies/hollow/reference/CMU-09_01-run.bvh`
Build: `tools/sprite-lab/build-hollow-mocap-run.py`
Rendered evidence: `docs/art/evidence/hollowed-mocap-run-v1-2026-10-24`.
The eight-direction 128-frame atlas and directional GIFs are **candidate
review only**, not original approved walk content.

## Evidence and acceptance gates

- Exact source BVH SHA256 and authoring Blender .blend are recorded in
  `retarget-provenance.json`. Both remain immutable.
- All 16+closure source poses retain identical original leg and arm segment
  lengths; no independent hand animation is added.
- Side/three-quarter/front/back 96px original-mesh captures were reviewed.
- Eight directions, 16 frames per direction, approved angles and 96px
  cell alpha borders passed automated validation.
- Original Hollowed walk, attack, death; Ashling; original sprite material
  atlases; and the shared GPU lighting engine remain intact.
- Approval **still requires** a full cycle viewed at the actual Hunt scale
  and gameplay speed, correct root/feet contact and attack interruptions,
  visual owner review, and original-geometry normal/depth/caster export for
  the new poses before adoption.
- A screenshot, correct joint angles or CI pass is **never enough** to
  declare artistic approval.

## Primary biomechanics references

- CMU Motion Capture Database, free for all uses:
  https://mocap.cs.cmu.edu/
- Macadam et al., *Role of Arm Mechanics During Sprint Running* (2018):
  https://doi.org/10.1519/ssc.0000000000000391
- *Straight arm walking, bent arm running: gait-specific elbow angles*:
  https://pubmed.ncbi.nlm.nih.gov/31289110/

## Continuation inspection: measured anatomy and separate feral candidate (24 October)

**Still NOT approved. Do not replace the shipping walk, albedo or matching G1 normals.**

### What we found by inspecting the real existing renders

- The originally captured run actually bends the knees roughly 0–116° / 2–108°, but the legs are often hidden by the long garment at native 96px scale. Correct knee values alone did not communicate a sprint.
- The first retarget kept each shoulder approximately fixed while the hands travelled ~0.25m vertically. This helped explain the owner's puppet/hand-bounce complaint. An independently editable [coupled biomechanics retarget](../../tools/sprite-lab/build-hollow-mocap-biomechanics.py) introduced source-recorded shoulder yaw/roll and hip counter-rotation, plus 120Hz *hips-relative* marker denoising. Its [comparison](evidence/hollowed-mocap-biomechanics-2026-10-24/baseline-vs-biomechanics-eight-directions.png) was personally inspected at 96px and **rejected as an insufficient artistic improvement**.
- A [Blender full-skinning audit](evidence/hollowed-mocap-biomechanics-2026-10-24/skin-and-rig-audit.json) measured 55,573 skinned vertices across 16 frames: zero unweighted vertices, zero significantly unnormalized vertex groups, and zero references to nonexistent bones. This does not prove good weight painting. It found large 0.110m hand bones on 0.167m forearms (preserve the approved monstrous claw design) and near-static 0.02m garment-hem motion alongside ~0.28m shin travel.
- The separate [feral-presentation modifier](../../tools/sprite-lab/refine-hollow-mocap-feral-presentation.py) **preserves the measured CMU stride and leg motion**; it transports the authored hand-rest angle through the captured forearm rotation instead of adding wrist oscillators. It also trails existing cloth bones behind the runner with small previous-frame thigh-dependent inertia, maintaining actual cloth-bone lengths. No approved mesh vertices/weights, original BVH, first two .blend candidates or production assets are overwritten.
- Candidate timing changes from 16 frames at 22fps (full stride 0.727s; ~165 steps/min) to 25fps (0.64s; ~188 steps/min), a deliberate **preview-only** sprint cadence; source biomechanics and production animation timing are not silently changed. See running-cadence research https://pmc.ncbi.nlm.nih.gov/articles/PMC12440572/ and cloth follow-through https://learn.toonboom.com/modules/animation-principles/topic/follow-through-principle .
- The [feral-presentation 8-way 128-frame atlas](evidence/hollowed-mocap-feral-2026-10-24/candidate-walk-eight-directions.png) and [side-by-side native-cell comparison](evidence/hollowed-mocap-feral-2026-10-24/biomechanics-vs-feral-eight-directions.png) were generated by passing CI: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40093916838 . Full GIFs for all eight directions and editable source .blend are in that workflow's artifact and the evidence/source folders.

### Artist gate after inspecting this evidence

The changes are measurable but the native-sized running silhouette is **still not convincing enough** to replace the Hollowed's movement. In particular the upper-body pumping and overall forward-drive readability need further expert animation direction; the garment correction is modest, not a redesigned costume or solved physics simulation. Do not describe this motion as production-quality simply because joints, material workflows and eight-direction renders pass.

Before any cutover: validate fast-infected locomotion in *real moving footage* at 25fps including shoulders/elbows/wrists, knees/foot planting and in-Hunt travel sync; test clips at actual mobile Hunt scale and attack interruption. Get owner acceptance of genuine visual movement. **Only then** regenerate exact matching normal/depth/caster passes from accepted final geometry, in the same atomic atlas/material change. Prior #332 walk normals must never be paired with either new candidate.

Shared GPU proof is independently failing on #332 head at https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40087228220 ; the child issue at https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40087880772 is a blank light-depth test at both phone viewports. The shared renderer remains owned by #332 (cross-PR report added). No lighting-engine modification was made here.

## Long cape removal — actual editable geometry (24 October, #333)

Owner direction: **remove the long cape from the Hollowed.** The cape was part of the source skinned mesh and hid leg recovery during running, so do not fake this with CSS overlays, alpha masks or material tinting.

- Produced a first independent editable cape-free CMU running candidate in `rigged-mocap-no-cape-candidate/`. Removed 11,505 cloth-dominant below-waist triangles, kept source `.blend`, original pose keys, UVs and vertex weights; CI [run 40094651125](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40094651125) passed the full 128-frame eight-direction source/alpha review.
- Actual visual inspection revealed leftover ragged rear fabric because the original 55,573-vertex textured mesh contains 1,244 disconnected mesh islands. Rather than indiscriminately deleting torso polygons, the subsequent [island-based source edit](../../tools/sprite-lab/build-hollow-no-cape-islands.py) removes **73 complete, rearward-hanging cape mesh islands (10,137 triangles)** with explicit protection for leg/torso-dominated geometry. Original authored rigs, CMU source and earlier no-cape candidate are all preserved.
- Full eight-direction 96px atlas and GIFs are in [new no-cape visual evidence](evidence/hollowed-no-cape-islands-2026-10-24/) with a [before/after comparison](evidence/hollowed-no-cape-islands-2026-10-24/partial-vs-complete-removal-eight-directions.png). [CI run 40095099076](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40095099076) passed, including source-derived geometry sampling and 128 frame alpha/anchor checks.
- This satisfies a **source-geometry review of long cape removal**, not production integration or approval of the overall run. A few short torn-cloth costume details may remain. Never use changed candidate poses with original normal/depth/caster atlases. After owner confirms visual direction, carry cape-free geometry through **walk, attack and death together** with exactly matching regenerated albedo, normals, depth, shadow-caster and manifests. Do not change Ashling or the shared #332 GPU engine.

## Cape-free continuation: rig and visual QA (24 October, later checkpoint)

**PR #333 remains DRAFT. No sprint candidate or hand-proportion variant is
artistically accepted. Do not replace runtime walk pixels or reuse old walk
normals/depth/caster passes with altered poses or topology.**

### Accepted technical groundwork, not an animation acceptance

The independently editable `rigged-mocap-no-cape-islands-candidate`
removed **73 rear cape mesh islands / 10,137 genuine source triangles**
without deleting the running legs, losing UVs or replacing Ashling assets.
This was rendered across eight facings at native 96px:
[no-cape 128 frames](evidence/hollowed-no-cape-islands-2026-10-24/candidate-walk-eight-directions.png),
[frame-by-frame comparisons](evidence/hollowed-no-cape-islands-2026-10-24/partial-vs-complete-removal-eight-directions.png).
GitHub Actions [passed](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40095099076).

### Why the next animation was NOT promoted

A new
[CMU shoulder-led source variant](../../tools/sprite-lab/refine-hollow-no-cape-sprint-anatomy.py)
restored anterior/posterior upper-arm motion and preserved all 16 source
pelvis/leg poses. The first actual skinned review exposed hands and forearms
lifted into a cartoonish boxing guard. The candidate is **rejected on visual
grounds**, regardless of automated joint checks:
[complete A/B eight-direction atlas](evidence/hollowed-no-cape-anatomy-2026-10-24/no-cape-before-vs-shoulder-run-eight-directions.png).

The
[constrained low-arm version](../../tools/sprite-lab/refine-hollow-no-cape-sprint-guarded.py)
passed Blender render and source-provenance checks
([CI run](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40096437419)).
Its hands sit lower, but side/three-quarter running GIFs still produce a
repeated forward **C-shaped claw/forearm silhouette**, not authoritative
professional sprinting anatomy. **Reject it too.** Avoid further arbitrary
wrist keyframes, bone-sine animations, or stiffening the hands to hide the defect.

The original model's hand control is 0.11006 units versus a 0.16680-unit
forearm, an exaggerated ratio. A
[separate mesh-weighted 23% distal geometry reduction](../../tools/sprite-lab/refine-hollow-no-cape-hand-proportions.py)
changed 3,373 left and 3,177 right hand-influenced source vertices
with maximum ~0.030 units displacement, keeping 48,950 vertices,
68,380 triangles and all authored UVs. The
[all-eight-directions GIF evidence](evidence/hollowed-short-claws-2026-10-24/)
shows only a modest native-pixel improvement: **arm choreography is the
primary remaining issue**; shorter claws alone are insufficient.
[CI passed](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40096948043),
including a geometric comparison confirming original pelvis/leg sampling,
foot-contact markers at 17 frames × 2 feet, and unchanged non-hand geometry.

### Required continuation (not yet delivered)

A convincing running action now needs genuine shoulder/torso driven sprint
coordination and proper *forearm following* throughout the complete stride,
with no elbow extension reversal and no hooked hand/cross-body loops.
Respect the leg contact / compression / takeoff / recovery phases and
the original CMU motion-capture timing; validate real travel speed against
the actual Hunt movement rather than merely showing a centered sprite GIF.
Audit weighted shoulder, elbow and hand surface deformation in enlarged
front/back/side/three-quarter motion and all eight native-pixel loops.
Keep the long cape absent in all final clips; if the costume change is
adopted, attack/death must be regenerated from the **same edited mesh**,
not from old cape-containing geometry.

Nothing gets called `production ready` before motion and 96px Hunt-size
mobile captures are actually accepted. On acceptance, source-derived
walk/attack/death geometry, normals, depth and shadow casters must be
exported and hash-verified atomically; never put novel colours or material
passes over older body poses. PR #332 still owns the shared GPU renderer.
