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
