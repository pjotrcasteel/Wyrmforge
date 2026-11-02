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

## Experimental local-space front decal — UNAPPROVED

The optional `--reference-sprite` flag samples subdued grey albedo from **one**
64×80 south-facing study. Its colors are projected into the *local coordinates*
of the shared mesh and deliberately fade out across the side and back. This is a
front-only, planar paint experiment — **not a UV atlas**, a model reconstruction,
or a source of new geometry. It cannot add, move or erase a rip, hole, limb or staff.

The example source is the **rejected** Foundry v001 south frame, used only as a
temporary material swatch; this does **not** mean the owner approved that sprite:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --reference-sprite tools/sprite-foundry/candidates/grey-wizard-idle-v001/source/idle/S/00.albedo.png --comparison tools/sprite-foundry/output/shared-master-front-decal.png

The eight-way comparison displays base geometry above and identical geometry
with the front decal below. Both rows are **not approved game art**. Neither
their individual facing count nor their generated colors unlocks animation.

The regression tests assert that albedo changes leave all eight alpha
silhouettes intact, that the color decal mostly vanishes on the north-facing
back, and that a visible flame remains in all eight views. This proves only
that front paint does not invent holes or make the staff disappear, **not** that
the torn garment has been authored to match the approved identity.

## Garment damage atlas v002 — deterministic cutouts

The previous generator calculated a hem profile and silently discarded it.
That bug is fixed. One immutable garment-space damage atlas now controls:

- **24 hem sectors** around the waist-to-ground robe, with raised notches and
  hanging points (15 degrees per sector; sector 6 is the front).
- **11 omitted outer-robe mesh panels** at specific height/angle cells. These
  are actual holes exposing the darker under-gown, not face-specific overlays.
- **Three named frayed scars** anchored by a local angle, garment height,
  length and width. Their 3D coordinates track the tapered gown surface.

The damage atlas is in `ROBE_HEM_OFFSETS`, `ROBE_OPEN_SECTORS` and
`ROBE_SCARS` near the top of `master.py`. The generator now uses additional
height rings to give each tear a stable geometric boundary. No individual
facing can alter these features: all eight are rendered from one built mesh.

For an 8× S / SE / E close-up (from the repository root):

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --reference-sprite tools/sprite-foundry/candidates/grey-wizard-idle-v001/source/idle/S/00.albedo.png --preview tools/sprite-foundry/output/garment-damage-closeup.png

**Remaining art gap:** these are exploratory authored placement landmarks,
not a traced match for the owner's actual approved robe rips. The correct
Gothic garment styling, detailed physical cloth edge work and proper UV
painting are still needed before any sprite can be approved.

## Visual quality still missing

The preview is a *mechanical continuity test*, not a visual acceptance candidate.
Before this may become the real Wizard master, rebuild its geometry and material maps
against the owner's approved reference from PR #439:

1. Correct actual anatomy, silhouette and robe tailoring (not cylinders/boxes).
2. Model the established hat profile, hair, beard, belt, boots, hand and staff grip.
3. Place the exact approved wear/tear pattern with fixed UV/material coordinates,
   and verify the pattern is visible from all three angles where physically exposed.
4. Replace the experimental planar decal with an actual painted UV material and authored albedo, normal, roughness,
   emission, depth and caster data while respecting the shared G lighting contract.
5. Review native S / SE / E pixel screenshots at 8× and real 320/390px gameplay
   scale; **only owner acceptance** unlocks the other five facings and animation.

Do not infer artistic success from deterministic frames or passing unit tests.
