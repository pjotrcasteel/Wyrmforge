# Hollowed feral locomotion — anatomy audit and rejected-candidate history

24 October 2026 — child PR #333 of #332. This is an **unapproved art review**, not a new engine or live gameplay migration.

## Owner feedback

- v1 and v4 **rejected**. Legs appeared to shuffle, knees hardly bent, and the arms hung/hooked or flopped instead of receiving purposeful shoulder propulsion.
- **v5 and v6 are diagnostic transitions only.** The wrist-target IK still created odd forearm and elbow silhouettes.
- **v7 is still UNAPPROVED**, produced with bone-driven arms. It is the best current measurable anatomy candidate, not a visually accepted new canonical walk.

## Biomechanics researched

The rig's new kinematics are adapted from these grounded studies, rather than copying an actor or existing copyrighted sprite motion:

1. Mattes et al., *Kinematic Stride Characteristics of Maximal Sprint Running of Elite Sprinters*, 2021. https://pmc.ncbi.nlm.nih.gov/articles/PMC8008308/ — knee drive, stance/swing relationships, speed and contact duration.
2. Haugen et al., *Age-Related Changes of Sprint Kinematics*, 2019. https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.00613/full — touchdown, loading, propulsion, toe-off, flight and pre-contact sequence.
3. *A need for speed: Objectively identifying full-body kinematic and neuromuscular features associated with faster sprint velocities*, 2023. https://pmc.ncbi.nlm.nih.gov/articles/PMC9936194/ — contralateral upper/lower timing, heel recovery and thoracic rotation.
4. Otsuka et al., *Scapula behavior associates with fast sprinting in first accelerated running*, 2016. https://pmc.ncbi.nlm.nih.gov/articles/PMC4899390/ — shoulder/scapular coordination with opposite-leg action.

These empirical angles describe athletic sprinting, not rigid bounds for an undead monster. The Hollowed should preserve its corrupted, aggressive silhouette while maintaining sensible leg attachment, knee folding, weight exchange and shoulder-driven arm action.

## Technical root causes in previous versions

- High stance-knee flexion persisted through ground contact because the pelvis was kept excessively low; stance lacked a visible extend/compress cycle.
- The flight ankle never approached the pelvis sufficiently, meaning 'higher foot' did not reliably translate into a bent knee.
- Wrist-chasing two-link IK could put a joint at a mathematically valid location without a believable arm pose, even while an 'elbow stays below the shoulder' assertion passed.
- Preview playback was initially disconnected from the actual displacement-driven runtime animation system. Hollowed's C# base speed is 52 world-units/sec; with the rig/world ratio of 60 and 37.5 world-units per new gait cycle, 16 frames play ~22.19fps.

## V7 authored motion and mechanically checkable facts

| Metric | Previous v4 | Current v7 |
| --- | --- | --- |
| Max swing-knee flexion | 124 degrees | 137.4 degrees |
| Stance-knee flexion | 66.2–81.9 degrees | 31.9–59.9 degrees |
| Elbow flexion | 102.2–123.5 degrees | 67–113.4 degrees |
| Max foot recovery lift | .128 model units | .224 model units |

V7's planted foot is driven in source coordinates with root motion owned by gameplay; the swing leg retracts toward its hip with a separate articulated knee. Clavicle rotation is calculated from the opposing leg and the arm pose is authored in **forward kinematics**: shoulder -> elbow -> wrist -> hand, preserving bone lengths, avoiding fast directional sign flips in the elbow IK pole. True 8-direction sprite and normal maps have **not** been exported for this replacement candidate.

Editable source: `art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-sprint-v7-candidate/hollow-rigged.blend`.
Original source is untouched: `rigged-pixel-v3/hollow-rigged.blend`.
Authoring: `tools/sprite-lab/build-hollow-sprint-v7.py`.
Native pixel review: `tools/sprite-lab/render-hollow-sprint-v7.py`.

Unapproved evidence, generated from the actual skinned surface and anatomy diagnostics:

- [Animated v7 native pixel motion](evidence/hollowed-sprint-v7-2026-10-24/feral-sprint-v7.gif)
- [16 source frames](evidence/hollowed-sprint-v7-2026-10-24/sprint-v7-16-poses.png)
- [Four diagnostic camera azimuths](evidence/hollowed-sprint-v7-2026-10-24/sprint-v7-four-view-pose-review.png)
- [Moving projected knee/elbow bones with angles](evidence/hollowed-sprint-v7-2026-10-24/anatomy-kinematics-v7.gif)

## Visual risks still open

- Native 96px silhouettes make bent knees difficult to see in dark side/three-quarter views. Kinematic numbers are NOT sufficient evidence of leg clarity at actual Hunt scale.
- Arms no longer follow independently animated wrist IK, but animation still needs expert-quality anticipation/follow-through and nonmechanical asymmetry. Review front and side elbow silhouette throughout the cycle.
- Motion needs stance-foot drift and toe-off continuity checked with actual authoritative root displacement, especially on slopes or while changing directions and interrupting for attack.
- A 16-frame 3/4 view and four camera azimuth checks **are not** accepted eight-direction production sprite exports. The new walking normal/depth/caster/emissive assets must be regenerated from the new rig/pose if this candidate becomes approved.
- Nothing replaces the currently approved Hollowed or Ashling production assets. No game or engine code changed.


## 11:46 user rejection: the arms still visibly flail (v7)

Do **not** infer an approved run from bone-length or elbow-angle tests. The v7
upper-arm and forearm Y trajectories were both driven by the same leg phase.
In 24 of 32 sampled side/frame combinations, the upper arm and forearm had
the same front/back travel direction; the arm often unfolded into a long tentacle.

V8 separates the coupled upper/forearm trajectories: forward swing now raises
the bent elbow's hand and back swing sends the hand back toward the hip.
The v8 preview exposed a second problem: the independent hand bone
pointed downward while the front forearm pointed up, creating an obvious
hooked wrist/claw.

V9 keeps the wrist oriented continuously with its parent forearm. A strict
wrist-angle gate verifies 0° relative discontinuity at all 16 frames and both
arms, and the Blender/source-sample workflow passed. Evidence is stored in
`docs/art/evidence/hollowed-sprint-v9-2026-10-24/` with the editable
`rigged-sprint-v9-candidate/hollow-rigged.blend`.

**Still visually UNAPPROVED**: v9 is more mechanically continuous, but the
full-body actor still reads as a procedural, exaggerated zombie wave when
seen at 96px or side-on. The original rig has unusually long arm/hand chains
and automatically distance-weighted mesh deformation. No amount of wrist
angle assertions proves the running animation is acceptable.

The next artistic approach must be to build and retarget from credible sprint
reference with edited contact/toe-off/fold/arm-pump key poses, then review the
real skinned model in 3D before 8-direction pixel export. Do NOT promote
the v9 trial to the production `walk.png` or pair it with the approved
G1 walking normals. Leave Ashling and the shared GPU renderer unchanged.

