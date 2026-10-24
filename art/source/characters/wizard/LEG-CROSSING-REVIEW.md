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
