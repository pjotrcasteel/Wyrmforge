# Shared Wizard volume — geometry continuity experiment v001

**Status: STRUCTURE ONLY / NOT APPROVED ART. Do not merge, publish, or use in the game.**

This is the first deterministic single-source volume study replacing failed independent
image-generated directional portraits. It is intentionally a rough low-detail blockout:
it does **not** yet match the owner's approved Gothic grey Wizard artwork, cloth styling,
eyes, or hat silhouette well enough for acceptance.

## What is structurally different

- A single unrotated triangle mesh is built for body, clothes, fixed tears, hat,
  beard, boots, staff and fire. The mesh is *never regenerated per direction*.
- Robe holes/rips are fixed in local garment geometry; camera rotation cannot move
  them to different parts of the garment.
- A single staff polyline passes through the physical right-hand grip and angles
  backward behind the shoulder; the same staff exists in every view.
- The camera/yaw rotation is deterministic. It outputs transparent 64×80 RGBA
  frames with shared x=32 / y=74 feet anchor and canonical direction names.
- All material variation is computed from fixed local 3D coordinates, not random
  generation on each frame.

This is **not** a second animation engine or game renderer. It is an offline geometry
reference and exporter isolated within Sprite Foundry. It uses Python 3.10+ and
Pillow, already included in the Foundry requirements. No Blender installation is
required for this structural proof.

## Reproduce (from repository root)

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --preview tools/sprite-foundry/output/master-preview.png
    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --frames tools/sprite-foundry/output/master-frames

The first produces an 8× nearest-neighbor S / SE / E contact sheet. The second
writes all eight alpha PNG frames to the Foundry's source layout, for **review only**.
Neither command touches game assets or produces approved art.

    py -m unittest discover -s tools/sprite-foundry/tests -v

## Visual quality still missing

The preview is a *mechanical continuity test*, not a visual acceptance candidate.
Before this may become the real Wizard master, rebuild its geometry and material maps
against the owner's approved reference from PR #439:

1. Correct actual anatomy, silhouette and robe tailoring (not cylinders/boxes).
2. Model the established hat profile, hair, beard, belt, boots, hand and staff grip.
3. Place the exact approved wear/tear pattern with fixed UV/material coordinates,
   and verify the pattern is visible from all three angles where physically exposed.
4. Replace flat procedural colours with authored albedo, normal, roughness,
   emission, depth and caster data while respecting the shared G lighting contract.
5. Review native S / SE / E pixel screenshots at 8× and real 320/390px gameplay
   scale; **only owner acceptance** unlocks the other five facings and animation.

Do not infer artistic success from deterministic frames or passing unit tests.
