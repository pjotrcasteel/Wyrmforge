# Hollowed M1 — structural anatomy and stance recovery (29 Oct 2026)

**Owner directive:** keep improving, but current model is "completely fucked" even though the trace-driven silhouette is moving in the correct direction. Reject cosmetic incremental tweaks. Work on actual source mesh, armature deformation and physical weight-bearing first.

## Grounded diagnosis

Real Blender model from [owner-target limb sculpt run 40879189523](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40879189523/artifacts/12899053255) is **NOT GOOD** despite passing automated two-foot lowest-vertex contact. Both long forearms look too stiff, shoulders remain block-like with overlapping armor, boots tilt and the figure reads as mechanically distorted. A sole represented by just one touching vertex is a false positive.

New source changes:
1. **Organic shoulder source sculpt** now modifies ~3,418 actual shoulder/source-body vertices around the shoulder shelf, shrinking the sharp acromion/armor silhouette, adding a shallow asymmetry and scapula continuity. Original Sotudios source remains Basis in the editable Blender source. No detached shoulder mesh / visual gimmick.
2. **Anatomical length limitations:** all source-art upper-arm rest-pose bones now max 1.13x; forearm 1.16x; hand 1.08x; thighs 1.17x, shins 1.23x. This protects the new 3D mesh's thickness and stops the reference fitter from flattening anatomy simply to match an illustrated pixel point.
3. **Real two-foot sole evidence:** each source leg must pass independent height measurement AND have a longitudinal contact patch with enough actual evaluated mesh vertices, not a single toe/heel. Both source shoes should bear weight. This is still not verified foot IK or gameplay locomotion.
4. The initial attempted near-horizontal left-ankle/foot targeting created a worse regression: left actual source sole at **+0.278m** versus right sole at 0.0 in [Blender run 40887088007](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40887088007). **That attempt is REJECTED.** Restore last proven left ankle/toe coordinates from owner constrained reference and retest the new sole patch QC. Keep source and original owner trace unchanged.

## Quality and scope gates

Current expected effect is smoother original shoulder shape, less distorted forearms, and actual boot/foot area support. **Automated success does not equal artist approval**. Re-evaluate genuine full resolution Blender front/side/back and 8-way source motion. If source rig still cannot make real heel-and-toe contact and plausible shoulder/rib transitions, do not mark M1 finished or auto-advance M2 hair. Report blockers and preserve owner steers.

Only art code/docs under PR #399 are modified. Existing game, universal animation PR #387, GPU lighting and pixel conversion untouched.
