# The Hollow — rigged source proof of concept

Scope: one complete three-quarter walking cycle from an editable textured 3D
character. This is a candidate; no owner acceptance or gameplay rollout is implied.
Follow `docs/art/card-to-spritesheet-production.md` stages A–D before expansion.

## Identity observed in the card

- Gaunt human undead with a long narrow skull, hollow eye sockets and exposed jaw.
- Narrow rib cage, hunched shoulders, long arms and elongated bare fingers.
- Bare thin legs and feet. Muted weathered bone, dried brown tissue and frayed cloth.
- Ragged skirt-like strips, rope/costume remnants and exposed ribs. No armor,
  horns, weapon, magical eye glow, new ornaments or bulky musculature.
- The turnaround establishes front, three-quarter, side and back silhouette.
- The hero pose is expressive and asymmetrical; it is not a safe rigging rest pose.

## Modeling input and interpretation

Prepare one neutral front-facing A-pose from the card, with separated arms and
legs and visible fingers. This image is modeling input, not an animation frame.
Inspect identity against the card before image-to-3D conversion. Hidden geometry
is reconstructed/inferred and must be reviewed in a turntable. Do not describe
the reconstruction as an exact recovery of the original illustration.

## Motion brief

Slow heavy shamble, alternating support, bent knees and a hunched torso.
Pelvis/shoulders react to each loading step; hands and cloth lag slightly.
No bouncing toy motion or a frozen torso above swinging legs. A full cycle ends
at the same leg's equivalent contact, with continuous velocity at the seam.
Root travel and cycle time determine nominal speed. Inspect on a moving ground
grid to see stance sliding, and beside the mage at current gameplay scale.

## Review gates

1. Neutral pose preserves the creature's thin silhouette and materials.
2. Reconstructed model has usable separated limbs and coherent back/undersides.
3. Mesh deforms at hips/knees/shoulders/elbows without rigid cutout seams.
4. One view shows convincing contact/loading/passing/rise and a continuous loop.
5. The source, render profile, transparent frames and preview are saved together.

No automatic test grants artistic approval. If stages 2 or 3 fail, repair the
model/rig before rendering a walking sheet. Do not replace this route with another
independently generated frame grid.

## Research principles

- Blender action/NLA documentation: preserve reusable editable motion and bake
  only for export; do not claim PNG playback retains a live skeleton.
- Toon Boom walk analysis: contact/loading/passing/rise establish weight transfer;
  preserve the Hollow's own restrained posture rather than copying cartoon posing.
- Microsoft TRELLIS.2: an alpha-masked character may seed a textured mesh; it is
  an initial reconstruction and still needs topology, identity and deformation QA.

Source links are in the production algorithm; this proof does not copy another
game's character, mesh, animation or textures.
