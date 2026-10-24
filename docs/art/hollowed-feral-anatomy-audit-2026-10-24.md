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
