# Hollowed body-first checkpoint 1 — actual Blender source, 29 October 2026

**Verdict: TECHNICALLY REPRODUCED, VISUALLY REJECTED.** This is an owner-steer checkpoint, **not approval**, not a production character, and not the current live WyrmForge Hollowed.

## Genuine source / evidence

- Owner selected definitive [front / side / back design](owner-reference-2026-10-29.md).
- Source authoring: `tools/art/hollow-rebuild/sculpt_body_pose_h1_blender.py`, invoked on the pre-detail `horror-feral-rest-h1` Blender file. This source is independent from all finished hair, waist strips, skull graft, rib extras, materials and emission.
- [Successful actual Blender CI run 40845974697](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40845974697), [downloadable actual original editable .blend, 8-way neutral-clay/silhouette PNGs and native-96 evidence](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40845974697/artifacts/12884673861).
- Source-only blend: `artifacts/hollow-rebuild/horror-body-pose-h1/Hollowed-H1-body-pose-source-NOT-APPROVED.blend` inside the CI artifact. The output is **not** in game assets.

## Measured changes / preservation

| Property | Real Blender QC |
|---|---|
| Connected original skin vertices affected | 1,198 |
| Maximum original source-shape adjustment | 0.12660 m |
| Hunch: new neck forward displacement versus previous | 0.18935 m |
| Pose height between head joint and hip joint | 1.06588 m |
| Evaluated full-body height | 2.96156 m |
| Minimum evaluated foot Z | -0.00291 m (2.9mm source heel contact) |
| Preserved existing original armature | 70 bones |
| Original mesh topology and source weights | Unchanged |
| Newly authored source shape keys | 1; total 3 |
| Source animation actions | 0 |
| Approved or merged? | **NO** |
| Animation engine, controllers, gameplay, runtime sprites | **UNCHANGED** |

## Genuine visual self-review: reject this body as the target

1. **Shoulders too polygonal:** unnatural triangular acromion mass and abrupt pectoral/arm attachments. Reference has more natural, asymmetrically damaged scapulae and collar.
2. **Pinched waist / narrow abdomen:** the strong hourglass silhouette is artificial and reads mannequin-like instead of gaunt decayed human anatomy.
3. **Legs too symmetrical/straight:** not enough weight asymmetry, knee collapse or grounded stagger. Need actual contact poses as a separate source QC, not arbitrary camera tricks.
4. **Feral reach underpowered:** arms are long but mostly hang; shoulder reach and asymmetry are less threatening than the owner reference.
5. **Head remains old exploratory placeholder** in this stage. The existing source has a pointed side-profile shape that must not be mistaken for a designed Hollowed face.
6. **Skeletal torso remains generic:** no intentional anatomical shoulder/rib cage planes. Details must not be added to hide these flaws.

The first variant should be compared *against this honest baseline*, never presented as finished art. New candidate must hold plausible real anatomical masses in both black silhouette and neutral clay from all eight actual 3D views and at native 96px **before moving on to hair, costume or glow**.

## Next source priority

Build a broader but more natural asymmetrical shoulder girdle with joined muscles, remove waist pinch, increase upper-torso forward collapse while adjusting counterbalance at hips/knees, strengthen claw-reaching gesture and test real foot contacts. Retain the current owner reference and the single existing animation engine as hard boundaries.

The owner must be able to steer from genuine Blender renders, not AI-generated art. Draft PR #391 only; no merge or deployment.
