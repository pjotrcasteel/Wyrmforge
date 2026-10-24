# Bilateral gait deformation review — not an art acceptance

Previous 16-frame Blender review was visually rejected because legs seem to
cross during walking. Inspecting the **actual** CMU 07_04 capture's local
pelvis/hip coordinates showed knees, ankles and toes staying on their own
left/right sides in all 16 source samples. Artificially widening captured
ankles is therefore **not** the correct first fix.

This checkpoint fixes a plausible retarget defect rather than reauthoring
motion: restrict bone-heat influence leaking from a vertex on one lower leg to
the opposite leg's thigh/shin/foot groups. Only safely separated lower-leg
vertices are changed, preserving the groin, pelvis and capture animations.
If many vertices are substantially bound to the opposite skeleton, validation
fails instead of forcefully flipping them.

The validator measures the CENTROIDS OF THE DEFORMED LEFT AND RIGHT FOOT
VERTICES in all 16 poses and checks their side of the animated hip axis, not
just bone targets or scene positions. It also records independent 3/4-view
Blender renders, and includes them in the recorded artifact.

IMPORTANT: Passing foot-lane numerical tests is NOT owner approval, and the
old GIF remains rejected. Validate the full walk visually, including knee
deformation, weight, planted feet, and at the game's 2.5D angle. The
approved Gothic wizard is still only an art reference. No game player cutover,
no changes to creature rigs or lighting PR #332.


## Root-cause evidence and fitted humanoid correction

Native Blender forensic output conclusively showed that original BVH **rest**
legs flare far outside the realistic male base: left hip X=1.856, knee
X=4.224 and ankle X=6.757 (right side mirrors it). The foot bones were over
three Blender units from nearby mesh, so bone heat assigned no strong foot
weights. This is a rest-rig incompatibility, NOT evidence that the captured
human walks by crossing legs.

The original BVH armature/action is now retained as untouched provenance,
and a SEPARATE fitted humanoid deform armature is generated for the CC0 body.
Leg rest lateral offsets are reduced to 15% relative to each hip, preserving
height and forward rest offsets. The next audit confirmed 1013+ strong left
foot and 1026+ strong right foot vertices, whereas the old bind had ZERO.
This solves **binding strength**, not animated leg crossing.

Applying raw BVH rotation F-curves to changed rest bones was rejected too:
it rotated feet onto the wrong sides. The current source therefore adds
two-bone IK on the fitted target shin chains, keyed from the **original source
ankle and knee world-space motion**, not from deformed mistaken target bones.
Only a whole-clip constant lateral clearance can be applied for pixel-scale
separation, capped relative to hip width; source foot Y/Z trajectory and
BVH keyframes remain intact.

Every native review must retain all 16 actual rendered mesh frames, a
three-quarter camera proof, both weighted-foot centroid lane metrics, source
and fitted rest coordinates, and native .blend even on a failed validation.
A failed Blender job must never create a successful art acceptance claim.

Current state of this IK transfer is UNDER NATIVE CI REVIEW. Until its complete
render has been visually inspected, no animated Gothic wizard atlas exists,
the approved concept remains the only visual target and production player
swap stays disabled. No Hollowed, Ashling or universal lighting changes.
