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

## Owner pose feedback and geometry freeze (2 Nov 2026)

The owner said **"The pose looks good!"** after inspecting the S/SE/E 8×
and eight-direction comparison. This freezes the current shared pose as a
working reference. It **does not** approve the robe/face/hat details, final
directional art, animation, or import into the live game.

[pose-lock.json](pose-lock.json) records the 64×80 dimensions, feet anchor,
camera yaw, right-hand staff attachment, and Git-blob fingerprints of
`build_master()` and `project()`. Tests fail if either geometry or camera
code is changed without explicitly revisiting the pose lock. Subsequent
changes should be restricted to **material painting** until the owner
requests another geometry change.

## Garment-space material refinement

Three named vertical seam strokes, linked to local robe azimuths, now
remain attached to the garment as it turns. The cloth shader also uses
lower-frequency vertical folds, gentler weave, fixed lower-hem grime
and subtle discoloration around the three shared rip landmarks. No
geometry, hand grip, staff, camera, alpha geometry, or frame dimensions
were modified in this material pass. The S / SE / E and eight-way CI
images remain **unapproved color studies**.

The temporary south-only color decal remains optional. A real UV texture
painted against the accepted wizard identity is still required before
this can be production art.

## Shared cylindrical robe UV atlas v001 — editable source material

The model can now optionally read a **single 96×128 RGBA robe texture**
(`robe-uv-v001.png`) for all eight camera directions. Its cylindrical
coordinates are computed from the same original 3D garment:
`u = atan2(z,x) / 2π` around the robe; `v` runs from shoulder to hem.
The alpha in this file is a paint blend mask, **never sprite transparency**.

The atlas is generated deterministically by
[`robe_uv.py`](robe_uv.py), which places pronounced grayscale folds, three stitched panel seams,
hem soil, edge fraying around the 11 existing physical cutouts, and the same three scar landmarks at fixed local garment coordinates. The PNG
is a normal image that can later be hand-painted in Krita, Aseprite or GIMP
without changing the mesh, direction frames or the camera.

To review the new study from the repository root:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --preview tools/sprite-foundry/output/robe-uv-S-SE-E.png

For the eight-way comparison, replace `--preview` with `--comparison`
and give an output PNG path. Both preview files also live in this experiment
folder with `NOT-APPROVED` names. The texture is deliberately optional:
the previous pose and color baseline remain reproducible.

### Decal-free primary review and physical atlas guide

**Primary review no longer applies the rejected south-only sprite decal.**
S, SE, E, and the eight-direction atlas are now rendered directly from the
same source geometry and the same editable robe UV material. This avoids a
front-only color patch making the Wizard change appearance as he turns.
The rejected decal remains usable through `--reference-sprite` only for
isolated historical comparisons.

`robe-uv-guide-v001.png` is a separate, transparent **96×128 artist overlay**
generated from the same exact 11 physically open mesh cells, three seam
azimuths, and three scar marks as `robe_uv.py`. Red indicates missing
outer-gown panels (the under-gown is visible); cyan indicates sewn seams;
amber indicates surface scar anchors; faint horizontal guides mark garment
height rings. The guide is NOT a paint layer or extra garment texture.
[View a 5× atlas / physical-landmark overlay comparison](robe-uv-atlas-guide-NOT-APPROVED.png).
The white top tick is the front (+Z, 90°), lavender the rear (270°).
The left/right edges meet around the cylinder.

To reproduce both the editable material and its aligned guide:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/robe_uv.py --output tools/sprite-foundry/output/robe-uv.png --guide-output tools/sprite-foundry/output/robe-uv-guide.png

UV micrograin now uses only integer angular frequencies, so its
left/right circumference wrap is stable and deterministic. The
physical mesh, accepted pose, right-hand staff and transparency are unchanged.

Two established surface-scar triangles crossed cells already missing from
the outer gown (near 35°/1.20 and 138°/0.80). The **material renderer now
masks scar pigment inside those physical voids**, so detached dark slash
fragments no longer float over the under-gown. If a lone scar tip supplies
a silhouette pixel, it remains dark instead of creating an accidental 1px
transparency hole. The actual mesh and camera remain unchanged; all
eight alpha silhouettes match the previous pass byte for byte.
The guide draws red absent panels over overlapping scar guide marks.



This second paint iteration strengthens fold depth, seam stitching and rip-edge wear in **one common atlas**. The UV receives a higher blend weight, while the rejected south-only decal has a lower weight. The frozen pose, alpha and staff anatomy are untouched. It is still a **rough material study**, not an accurate tracing of the owner's accepted Gothic robe. Named physical holes and the right-hand staff remain defined by the frozen geometry.

## Visual quality still missing

The preview is a *mechanical continuity test*, not a visual acceptance candidate.
Before this may become the real Wizard master, refine its character identity and material maps
against the owner's approved reference from PR #439, while **preserving the pose the owner liked**. Any future pose or silhouette change must be separately approved:

1. Improve actual anatomy, silhouette and robe tailoring without silently changing the locked pose.
2. Model the established hat profile, hair, beard, belt, boots, hand and staff grip.
3. Place the exact approved wear/tear pattern with fixed UV/material coordinates,
   and verify the pattern is visible from all three angles where physically exposed.
4. Replace the experimental planar decal with an actual painted UV material and authored albedo, normal, roughness,
   emission, depth and caster data while respecting the shared G lighting contract.
5. Review native S / SE / E pixel screenshots at 8× and real 320/390px gameplay
   scale; **only owner acceptance** unlocks the other five facings and animation.

Do not infer artistic success from deterministic frames or passing unit tests.
