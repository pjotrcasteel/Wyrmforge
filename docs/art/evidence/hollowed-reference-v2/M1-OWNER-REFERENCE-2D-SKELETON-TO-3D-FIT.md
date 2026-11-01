# Hollowed M1 — 2D owner reference directly mapped onto true Blender bones

**Status 29 October 2026: SOURCE ART BODY/POSE STUDY — VISUALLY UNAPPROVED.** Owner explicitly requested a major reference-guided anatomical/pose reconstruction rather than tiny rotation changes. This documents genuine Blender results and source-edit history. The reference image is a stylized drawing, *not* orthographic scan geometry.

## Source methodology

The owner's real 1536×1024 front/side/back image was manually traced for 22 named anatomical points in the front and side views, preserving their original pixel coordinates in:

- `art/source/enemies/hollow/reference-v2/owner-reference-pose-landmarks-2026-10-29.json`
- `tools/art/hollowed-reference-v2/fit_owner_reference_2d_skeleton_blender.py`

Front image supplies X and elevation; side image supplies Y/depth and corroborating elevation. These are combined into constrained 3D anatomical targets. The new **source-only Blender art rig** aims 19 actual weighted bone tails toward those 3D targets, saving both the raw illustrated target and the resulting actual bone position. All image-front/back comparisons are shown as **real Blender renders**, no generated replacement concept art or pixel export.

## Two authentic Blender source passes

1. [Initial direct joint fit run 40876895228](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40876895228), [genuine source and images](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40876895228/artifacts/12898497613).
   - Average 3D joint error **0.0895 m**, head **0.8642 m** forward of pelvis. But the direct skeleton fit **visually fails**: oversized local bone stretch causes flat, thin forearms/hands and implausible leg placement; one toe floats while the mesh's single lowest vertex passes contact QC. This is precisely why raw pixel landmark correspondence is not sufficient for convincing 3D anatomy.
2. [Anatomy-constrained baseline run 40878165223](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40878165223), [genuine editable 3D and images](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40878165223/artifacts/12899447080).
   - Preserve original joint trace unchanged, but bound limb scaling and adjust unreachable left-leg markers by explicitly logged physical constraints. Both independently measured ground contacts: **L +0.00762 m and R 0.00000 m**; median/worst joint offsets **0.1224/0.6398 m** (mean / worst), largely because the artist's original arms are too short to match the owner's long claws without destroying morphology.
3. [New source-anatomy reconstruction run 40879189523](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40879189523), [real Blender source+images artifact 12899053255](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40879189523/artifacts/12899053255).
   - Original Sotudios artist mesh preserved as unchanged **Basis** shape key; new WyrmForge original sculpt layer lengthens/repositions 3,933 actual 3D source vertices with proportional falloff (**max +0.3069 m** at fingertips) BEFORE real rest skeleton weighting. Source arm-span increases **2.3337 → 2.9474 m**; connected topology/polygon count unchanged. Corresponding 20-bone rig armature and source weights adapted to the anatomical extension.
   - True measured owner-fit bone error **0.1017 m mean, 0.3940 m worst**, skull **0.8643 m** ahead of pelvis, hands genuinely project **0.9406 m (L)** and **0.7182 m (R)** forward from shoulders while dropping ~0.90–0.97 m. Both actual mesh feet contact independently within **8 mm** of the reference floor. The original 2D target joint residuals are reported rather than silently edited.
   - Genuine front/side/back, eight 3D views, actual source-bone-vs-target overlay, eight-frame front/side articulated source motion, reopenable editable Blender source file. Native pixel export remains intentionally disabled.

## Honest artistic verdict — NOT YET THE OWNER'S HOLLOWED

The difference is still **large**. The current full-resolution 3D silhouette retains the Rotwalker soldier's squared armor and cloth-heavy chest, whereas the reference has a broken, pronounced organic shoulder/back arch; anatomically integrated exposed ribs; longer hooked physical claw anatomy; dirty flowing hair and complex, irregular skeletal face. The motion remains a source-art idle experiment, **not a completed biologically grounded locomotion**. Though two-foot numeric contact passes, the pose still looks insufficiently weight-bearing because boot orientation and knee/hip placement need further genuine 3D sculpt/pose refinement. Rendering success is never visual approval.

**M1 remains OPEN.** Next:
- Correct/restyle the shoulder/scapula/upper back **mesh and weight transitions** to match the trace, not simply rotate those shoulders farther.
- Add leg/boot ankle physical plant constraints; current per-side mesh minimum is not full heel-and-toe contact or verified foot IK.
- Retarget frame-to-frame organic gait with pelvis counterbalance, different lead/lag phases and no sliding, and test collision/contact in full 3D.
- Improve actual head/hand anatomy, then later hair, cracked flesh, mouth and materials (M2–M4), and **only then** pixelize with Blender (M5).
- No source art merged into the game, no new runtime/animation engine, PR #387 animation engine is untouched. PR #399 remains draft.

## Quality authority

**Owner's 2D front/side/back image is the primary silhouette target**, Sotudios Rotwalker is selected editable 3D base with attribution. No screenshots of actual Hunt/gameplay are claimed. Source asset lives in CI artifact, not runtime.
