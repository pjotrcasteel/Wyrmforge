# Grey Wizard EAST profile correction v003 — visual study only

**Unapproved artwork. Not a complete directional sheet, not a walk animation, and never a gameplay asset.**

The [8× native-pixel comparison](s-se-e-comparison.png) juxtaposes:
- S: the existing front source from rejected v001 (identity/perspective reference only);
- SE: the existing [v002 study](../grey-wizard-se-v002/se-64x80.png), still awaiting artistic acceptance;
- E: this v003 right-facing profile, with the staff held in the wizard's anatomical right hand on the far/back, screen-left side of the torso.

The previous E profile put the staff on the screen-right/front side, creating an abrupt staff-side jump from SE to E. This v003 explores a physically more continuous position and does **not** establish that the three figures have fully matched anatomy, rig proportions, hat, clothing folds or walking geometry. An attempted additional near-profile SE edit was discarded because it no longer read as 45 degrees.

## Provenance and processing

- Image-editing input: an unapproved high-resolution SE pixel study generated from the S, SE and E source reference sprites and the owner's grey-wizard design.
- Output [source master](source-master.png): transparent RGBA generated EAST study, 1122×1402 pixels.
- Alpha threshold >32 establishes the opaque subject crop (326,66)–(817,1326).
- Crop uniformly resized by nearest neighbor to 26×68, centered on world foot anchor x=32 and baseline y=74, producing [native e-64x80.png](e-64x80.png). Alpha and unchanged canvas dimensions are preserved.
- The comparison image shows **actual native 64×80 frames enlarged 8× with nearest-neighbor pixels**. The checker is review-only; it is not part of any sprite.

## Acceptance still required

1. Owner inspects S → SE → E turning geometry, body anatomy, boot positions and **right-hand staff**.
2. Confirm E v003 preserves the approved Wizard identity well enough to serve as an art candidate.
3. Author all eight independently consistent facings only after this gate.
4. Then create four authentic gait key poses per facing, complete 16-frame motion, and validate inside the actual Hunt.

Do not import this study, replace v001, merge PR #471, or mark any art approved solely because the Foundry's automated checks pass.
