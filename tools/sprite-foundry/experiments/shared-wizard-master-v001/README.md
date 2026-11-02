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

## One additional upper-cloth paint atlas — shared material v004 (not approved)

The 96×128 `upper-cloth-uv-v001.png` is an independent, **single source**
for three parts that previously used only flat base colors:

| Pixel rows | Shared part | World-local sampling |
| --- | --- | --- |
| 0–47 | Torso mantle and two shoulder cape panels | Cloth azimuth and garment height 1.35–2.75 |
| 48–95 | Both sleeves | Cloth azimuth and sleeve height 1.40–2.60 |
| 96–127 | Floppy hat | Hat azimuth and fixed crown height 3.17–3.67 |

The texture has restrained warm-grey cloth folds, sewn shoulder seams, darker
cuffs and a weathered hat brim. It is **never generated per facing**.
It is editable PNG albedo, with a separate
[1:1 zone guide](upper-cloth-uv-guide-v001.png) and a
[5× zone layout image](upper-cloth-uv-layout-NOT-APPROVED.png).
The hat band, hands, beard, belt, boots, physical staff and all pose geometry
remain unchanged. Neither this texture nor the robe atlas controls transparency.

`upper_uv.py` reproduces the texture and painting guide:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/upper_uv.py --output tools/sprite-foundry/output/upper-cloth.png --guide-output tools/sprite-foundry/output/upper-cloth-guide.png

Review both shared material atlases from the same pose master, **with no rejected
south-only planar decal**:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --upper-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/upper-cloth-uv-v001.png --preview tools/sprite-foundry/output/full-garment.png

The resulting [native-pixel 8× S/SE/E sheet](full-garment-uv-S-SE-E-8x-NOT-APPROVED.png)
and [eight-way previous-vs-full-material comparison](full-garment-uv-8way-NOT-APPROVED.png)
are unapproved visual studies, not production sprites. All original pose-locked
mesh vertices and camera projection are unchanged.

## Shared face, beard and rear-hair atlas v006 — unapproved

The optional `head-uv-v001.png` adds a third **96×128 RGBA local-space
paint map** to the same physically consistent Wizard model. Its upper
80 rows contain the beard and moustache strands; the bottom 48 rows
contain facial/neck skin. The face sphere blends toward grey hair at
the rear, based only on **local Z**, not the camera angle. No independent
front, side or rear head portraits are generated.

An editable, transparent [head painting guide](head-uv-guide-v001.png)
and [5× material layout](head-uv-layout-NOT-APPROVED.png) accompany the atlas.
The [8× S / SE / E closeup](head-uv-S-SE-E-8x-NOT-APPROVED.png),
[garment-only vs head-textured comparison](head-uv-before-after-NOT-APPROVED.png)
and [eight-way continuity sheet](head-uv-8way-NOT-APPROVED.png) are
direct PNGs for owner review, **not approved art**.

Generate the material and guide from their deterministic source:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/head_uv.py --output tools/sprite-foundry/output/head.png --guide-output tools/sprite-foundry/output/head-guide.png

Render all three independent but locally anchored material maps:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --upper-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/upper-cloth-uv-v001.png --head-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/head-uv-v001.png --preview tools/sprite-foundry/output/wizard-head-study.png

This changes RGB material shading only; the owner's liked pose, same
right-hand staff and all eight alpha silhouettes remain frozen.
The head is still low-poly and does not yet reproduce the detailed
owner-approved face/hair design. This is a UV authoring step, **not** an
acceptance claim or game-asset promotion.

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

## Per-pixel eight-way staff-visibility audit v007 — known failures, not approved

A feature-label buffer is now written **by the exact same depth-tested rasterizer**
that paints the 64×80 Wizard. It is an optional diagnostic output: ordinary
albedo bytes, geometry, camera, feet anchor, robe atlas and pose lock are
unchanged. No sprites are generated by mirroring, reposing or painting over
the right hand.

The [all-directions staff visibility sheet](staff-visibility-8way-NOT-APPROVED.png)
highlights the **visible** staff shaft in mint, exposed right-hand pixels in
blue, and the persistent flame in amber. Its companion JSON report records
per-facing staff pixels, grip pixels, and screen-space distance from the
projected physical grip to the nearest actually visible shaft pixel.

**This audit is intentionally red:** on the frozen pose, N exposes only one
right-hand pixel; NW shows 42 staff-shaft pixels but no visible right hand
(nearest visible shaft is 10.17px from the projected grip); W shows only 14
shaft pixels and no visible hand (nearest shaft 21.37px away). The staff
remains a shared physical object and its flame remains on-screen, but those
particular back/side renderings do not communicate a plausible held staff.
A structurally present mesh object is not proof of a visually correct sprite.

Reproduce the same material and diagnostics, without altering game art:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --upper-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/upper-cloth-uv-v001.png --head-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/head-uv-v001.png --staff-audit tools/sprite-foundry/output/staff-visibility-8way.png --staff-audit-json tools/sprite-foundry/output/staff-visibility-report.json

`--strict-staff-audit` will return nonzero for these known occlusion failures;
the normal Foundry workflow captures this **unapproved diagnostic** and
reports the bad facings without making every unrelated tooling check red.
No fake screen-space staff patch is applied. Correcting W/NW visibility
requires explicit review of the right-arm/staff silhouette against the
owner-liked pose, not secretly altering a frozen camera or bone placement.

This diagnostic is **Wizard-model specific**. The Foundry exporter,
profile-driven review contract and source layout remain generic for other
characters.

## Opt-in right-arm presentation correction v008 — **visual review needed**

A single rigid static pose puts the right hand on the far side of the Wizard
during the NW/W rotation. The original audit correctly found the staff
apparently disappearing. Moving the entire arm and staff in every direction
would have changed the S/SE/E pose the owner liked, so that approach was
discarded.

Instead, `--presentation-pose-review` creates a **candidate only** for NW
and W. This is a deterministic *articulated presentation pose* derived from
the same anatomy and materials, not an independently generated portrait:

- A fixed right-shoulder socket feeds a two-segment bent sleeve and its
  right-hand grip. The hand and the lower shaft remain physically connected.
- The right-hand wrist moves 0.70 world units toward local -Z for NW/W.
  The staff head and flame keep their source-world coordinates; the shaft
  changes its tilt between its fixed top and adjusted grip.
- Robe, permanent tears, scar atlas, hat, face, boots, left arm, camera,
  64x80 pixel canvas, staff materials and feet anchor are unchanged.
- **Default render mode stays byte-identical in all eight directions.**
  When the preview mode is enabled, S/SE/E/NE/N/SW also remain byte-identical;
  only the two failing rear/side facings change.
- NW visible staff increases from 42 to 104 pixels, with 13 right-hand
  pixels visible. W improves from 14 to 35 shaft pixels and from 0 to 3
  right-hand pixels. The same real depth buffer detects both, and the
  stricter minimum shaft check now requires at least 30 pixels.

Owner review: [NW/W original-versus-candidate at native 8x](pose-NW-W-before-after-NOT-APPROVED.png);
[all eight directions highlighted](staff-visibility-8way-candidate-NOT-APPROVED.png).
**A green structural audit is not approval of how the bent elbow looks.**
The new two-segment NW elbow silhouette, in-between turns and animation
need further visual work before this optional mode can become the default.

Reproduce the two visual studies:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --upper-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/upper-cloth-uv-v001.png --head-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/head-uv-v001.png --pose-comparison tools/sprite-foundry/output/pose-NW-W-before-after.png

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/master.py --robe-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/robe-uv-v001.png --upper-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/upper-cloth-uv-v001.png --head-uv tools/sprite-foundry/experiments/shared-wizard-master-v001/head-uv-v001.png --presentation-pose-review --staff-audit tools/sprite-foundry/output/staff-visibility-candidate.png --strict-staff-audit

Safety: `--presentation-pose-review --frames` intentionally exits with an
error. The candidate cannot be exported into regular Foundry source frames
or included in game assets before owner approval. No merge has been made.

## Four-key walking feasibility study — NOT APPROVED (2 Nov 2026)

The [walk study](walk_study.py) reuses the *existing, pose-locked* authoritative
3D Wizard master. This is the first isolated test of a walking gait; it must not
be confused with the finished game sprite or permission to change the accepted
idle pose. No magic-school variant, runtime integration or game asset was added.

- Front/back stride alternates between the **anatomical** right and left boots.
- Four authored phase positions represent contact, right passing, opposite
  contact and left passing; the same continuous motion can be sampled at 16
  frames per direction for later timing review.
- Feet and trousers move around fixed hips, and the lifted passing foot
  clears the floor. The free left arm counter-swings slightly.
- The staff, its flame and **right-hand grip remain exact copies** of the
  original master in *every* frame. The robe's physical tears and scars are
  transformed together, not regenerated per camera angle.
- All eight camera facings use the same posed triangles and output
  actual transparent **64×80 RGBA** frames. The review image shows them
  enlarged with nearest-neighbour sampling; enlargement adds no fake pixels.
- The existing idle-pose lock and unanimated render path remain untouched.

Reproduce the review sheet:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/walk_study.py --preview tools/sprite-foundry/output/walk-four-key-8way-NOT-APPROVED.png

Or generate all sixteen frames of the full tentative gait cycle:

    py tools/sprite-foundry/experiments/shared-wizard-master-v001/walk_study.py --count 16 --frames tools/sprite-foundry/output/wizard-walk-study

**Approval gate remains closed.** This is a kinematic proof while the art
master still lacks approved facial, beard, hat and fabric detailing. A true
walk still requires human appraisal of joint motion, weight transfer,
foot sliding and leg occlusion. The user-provided Dark Mage 64px reference
is a quality/motion *reference*, not a redistributable source texture;
rights must be confirmed before any direct adaptation.
