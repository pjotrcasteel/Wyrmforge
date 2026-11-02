# Grey Wizard EAST profile correction v003 — visual study only

**REJECTED BY OWNER (2 November 2026). Not a directional source, not a walk animation, and never a gameplay asset.**

The owner rejected this three-way comparison: the staff disappears in the profile and the wizard's robe geometry, holes, rips, seams and overall character proportions change arbitrarily between directions. The problem is structural: S, SE and E came from separate image-generation outputs, not one persistent character asset. Pixel dimensions and technical checks cannot repair missing artistic continuity. **Do not reuse this artwork as a baseline or generate further facings from it.**

The [8× native-pixel comparison](s-se-e-comparison.png) juxtaposes:
- S: the existing front source from rejected v001 (identity/perspective reference only);
- SE: the existing [v002 study](../grey-wizard-se-v002/se-64x80.png), still awaiting artistic acceptance;
- E: this v003 right-facing profile, with the staff held in the wizard's anatomical right hand on the far/back, screen-left side of the torso.

The previous E profile put the staff on the screen-right/front side, creating an abrupt staff-side jump from SE to E. This v003 was intended to explore staff continuity, but it failed: the staff becomes obscured, and the figure's construction and clothing details visibly change between views. An attempted additional near-profile SE edit was discarded because it no longer read as 45 degrees.

## Provenance and processing

- Image-editing input: an unapproved high-resolution SE pixel study generated from the S, SE and E source reference sprites and the owner's grey-wizard design.
- Output [source master](source-master.png): transparent RGBA generated EAST study, 1122×1402 pixels.
- Alpha threshold >32 establishes the opaque subject crop (326,66)–(817,1326).
- Crop uniformly resized by nearest neighbor to 26×68, centered on world foot anchor x=32 and baseline y=74, producing [native e-64x80.png](e-64x80.png). Alpha and unchanged canvas dimensions are preserved.
- The comparison image shows **actual native 64×80 frames enlarged 8× with nearest-neighbor pixels**. The checker is review-only; it is not part of any sprite.

## Rejected — replacement workflow required

1. Establish **one shared master** for the entire character: stable body proportions, geometry, UV/material landmarks for every fixed robe tear and rip, and a single staff object anchored to the anatomical right hand.
2. Show the master in S, SE and E from one consistent source/camera rig before any pixel-art animation. An orientation must not regenerate or redesign its outfit.
3. Export 64×80 review sprites and check that the exact same robe features, staff and body identity persist across angles.
4. Obtain owner approval of the actual three-direction visual output before authoring any additional views or walk frames.

Do not import this study, replace v001, merge PR #471, or mark any art approved solely because the Foundry's automated checks pass.
