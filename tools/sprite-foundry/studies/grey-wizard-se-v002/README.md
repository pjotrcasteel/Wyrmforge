# Grey Wizard SE directional correction — VISUAL STUDY ONLY

**Not approved. Not a complete 8-direction atlas. Not a walk animation.**

The owner rejected the initial v001 direction sheet. This study isolates the **southeast** facing before expanding to other angles. The [before/after comparison](before-after.png) places the generated candidate between the prior S and E references; [the compass](rejected-v001-compass.png) documents the rejected v001 8-way arrangement.

## Provenance

- Input #1 (edit target): `art/source/characters/grey-wizard/gothic-directions-v005/SE.png` on draft PR #439.
- Input #2 (identity reference): `art/source/characters/grey-wizard/approved-default-reference.png` from the same draft PR; an immutable copy is in `../../references/approved-grey-wizard.png`.
- Built-in OpenAI image edit, transparent output. The output [source master](source-master.png) is 1254×1254 RGBA; alpha range 0–255.
- Alpha-cleanup for stray translucent noise: retain pixels with alpha >32; opaque silhouette bounds (347, 50)–(940, 1202). Uniformly scale the cropped figure to a 68px visible height (35px width) by nearest-neighbor, then place at x=14, y=6 in a 64×80 canvas with the shared foot baseline y=74.
- The [native 64×80 image](se-64x80.png) passes structural checks as part of a temporary 8-way package, **not** visual acceptance.
- The generated angle has a clearer right-facing front three-quarter head/shoulder/boot pose. However, staff continuity from S→SE→E and hand anatomy still require review. Do not treat the 3-view or v005 source as automatically correct at all facings.

## Prompt

Use case: identity-preserve. Image 1 is the existing southeast sprite edit target, Image 2 is the owner's approved character identity. Change only the facing geometry: unmistakable SOUTH-EAST 45° front three-quarter, head and nose distinctly right, torso, shoulder line, belt and boots rotated halfway from front S to right profile E. Preserve elderly grey wizard identity, exact hat, beard, robe, belt, boots and staff. Anatomical RIGHT hand holds the staff, connected naturally without teleporting between S and E. Single full-body painted pixel character, native-pixel intent, transparent RGBA, no backdrop or text.

## Next gate

Inspect the SE orientation and right-hand staff relative to S and E **before** authoring or exporting remaining faces. No runtime or lighting implementation changes.
