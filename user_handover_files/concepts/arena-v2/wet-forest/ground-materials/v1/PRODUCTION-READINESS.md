# Wet Forest 6×6 source artwork — visual production-readiness review

**Status: 36 archived source candidates; 0 approved; 0 runtime-ready.** This is a review receipt, not a replacement for the canonical art specification or the owner's approval. It applies only to PR #340. No existing texture, arena renderer, gameplay, or shared GPU lighting implementation was altered.

## Evidence checked (24 October 2026)

- Reviewed the complete 6×6 [contact sheet](review-contact.jpg), and enlarged original-resolution `grass-moss/variant-01.webp`, `wet-mud/variant-01.webp`, `old-paving/variant-01.webp`, `trampled-earth/variant-04.webp`, `scorched-ground/variant-02.webp`, and `marsh-wet-bank/variant-06.webp`.
- All 36 candidate files, their 6×6 IDs, source PNG digests and stored WebP hashes are tracked in [manifest.json](manifest.json). The separate integrity job verifies archived bytes; its initial run passed. WebP size/header checks were subsequently added to the script and require CI verification on the updated commit.
- A contact-sheet review is **not** equivalent to full-resolution inspection of every variant or a rendering test. Unexamined individual details remain unverified.

## Actual suitability by family

| Family | Evidence-based observation | Production conversion needed |
| --- | --- | --- |
| **Grass / Moss** | Full-bleed soil, moss, stone and leaves; appealing wet-forest color variation. Painted highlights and distinguishable rock/plant details remain. | Define diffuse/albedo base and optional separated stones/foliage/depth; correct illumination; seam and repeat test. |
| **Wet Mud** | Full-bleed soil interspersed with puddles and glossy spots; the current blue-gray water/highlights are fixed in the painting. | Separate water masks, specular response, normals/roughness and albedo. Test reflective light with the shared renderer. |
| **Old Paving** | Full-bleed fractured stonework; individual slabs have light-direction cues and deliberate pattern scale. | Reserve for ruins/settlement context, preserve believable slab dimensions, remove baked-light dependence and author transitions. |
| **Trampled Earth** | At least one full-resolution sample is an isolated diagonal path motif **surrounded by a near-black matte**. All six contact-sheet variants show a similar path direction. | Use as authored path motifs or recreate clean masked source patches. Do not blindly repeat the full rectangle as generic walkable terrain. Provide paths that turn and fork without stamped repetition. |
| **Scorched Ground** | Visible near-black matte around selected ground islands; glowing magma-like fissures are baked into the art. | Extract a ground/char mask, separate actual emissive fractures from ordinary albedo and preserve non-glowing scorch. Place only where simulation state warrants; never make every burnt patch permanently glow. |
| **Marsh / Wet Bank** | An isolated wetland patch with near-black matte; bright water reflects an authored fixed environment, with banks, roots and reeds mixed into the same image. | Separate bank soil, water region, plants/roots, height/collision metadata and material channels; water reflection must come from actual scene light/geometry. |

## Gates before using these in the Arena Generator

1. **Art signoff:** owner decides which of the six variants per family are accepted. Do not change `approval: unreviewed` based on automatic quality tests.
2. **Material preparation:** work from originals and keep them immutable; author cleaned grounded albedo, water/emission/roughness/height/normal/depth/occluder masks as needed. Never solve baked lighting with a CSS filter or black overlay.
3. **Spatial composition:** define meaningful semantic material families and world-scale patch/edge masks, seamless blending, non-repeating seeded distribution, road curvature/branching, and shoreline transitions. A square WebP must not be treated as an automatically repeatable tile.
4. **Shared light proof:** only use the common G0–G1 GPU renderer from lighting PR #332, not a second ground-lighting implementation. Actual lights and water reflections must be responsive. With all lights/ambient/emission OFF, ordinary world material must be black.
5. **Game-scale acceptance:** inspect representative 320×568 and 390×844 gameplay captures with movement, many enemies, a moving Fireball, wet/stone/moss transitions and a fire-Wyrm influence region. Check style, scale, brightness, frame stability, and performance before promoting any derivative.
6. **Integration isolation:** preserve the original six-swatch approved Materials Lab atlas, existing C# authority and all gameplay. Production material derivatives belong in a separately reviewed integration PR; this art PR can safely merge only as an **unapproved archive** after integrity tests pass.

## All-family at-footprint inspection — 25 October 2026

Artifact: [GitHub Actions artwork QA / all-family screenshots](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40172144784) (successful `verify` and `visual-review` jobs, source branch checkpoint `67abc8f`). Download `wet-forest-grass-mud-repeat-studies` for **twelve individual 320×568 / 390×844 portrait review sheets** (`family-*-UNAPPROVED.png`) plus `family-role-review.json`. These are unlit source-art sizing sheets, **not playable arena frames, relightable textures, or physical-device captures**.

I inspected the 390px sheets for all six families at their representative **112px** review footprint and raw 2×2 repetition:

| Family | Observed at reduced scale | Next authoring action |
| --- | --- | --- |
| Grass / Moss | Strong botanical/rock detailing but recognisable plant and stone clustering repeats at raw joins; too busy for automatic per-cell stamps | Use only as neutral-diffuse *source* for continuous multi-variant mosaic; prove composition/contrast with game actors and lighting |
| Wet Mud | Puddle glints and small stone texture crowd each other when reduced; original painting already implies reflections | Separate soil diffuse from manually authored water regions; use one shared physical reflection/material system |
| Old Paving | Plausible block texture but repeated square layouts and occasional black source borders are visible | Author site-specific stone footprints and masonry rather than generic wilderness floor |
| Trampled Earth | Six almost identical diagonal trail motifs; repeated squares make a conspicuous stamped diagonal grid | Extract road-surface detail clipped to C# authoritative winding route from the existing one-road workstream; never invent traversability |
| Scorched Ground | Visually powerful painted orange cracks repeated in every variant; a 2×2 stamp makes the Wyrm effect generic | Hand author non-emissive charred ground separately from actual emissive cracks and registered light sources |
| Marsh / Wet Bank | Water colour and aquatic vegetation already painted into each bounded patch; repeated water margins form visible isolated islands | Create geometry-aware bank/water/vegetation layers; no inferred collision and no baked highlight as a real reflection |

**Decision:** all 36 remain useful candidate sources, but none should be shipped as a tiled runtime image. Put the next implementation effort into physical material authoring and one genuine C#-geometry + shared GPU-renderer integration proof, not more arbitrary square-tiling tricks. The preview tooling and `material-family-roles.json` are isolated production inputs, not a second arena engine. Preserve the approved atlas and current gameplay.

## G1-hold authoring checkpoint — 25 October 2026

**Dependency constraint:** GPU PR #332 remains explicitly at **G1**, not G2. The C# integration bridge, renderer adoption and physical iOS/Android work remain blocked by independent G1 acceptance; PR #340 does not assume those later milestones. Road PR #338 remains its own draft.

Three editable *source painting* motifs are now hash-locked in [annotations/feature-motif-source-studies-v1.json](annotations/feature-motif-source-studies-v1.json). Their offline overlays/masks can be regenerated by `tools/art/review_ground_feature_motifs.py`; CI runs unit tests and exports the visuals. These are **not C# polygons** or GPU albedo/emissive/water channels. They only indicate what an artist should inspect and refine on the original picture.

Initial full-resolution image review of the coarse outlines found:
- **Trampled Earth:** painted path regions are not cleanly isolated and some grass/stone detail falls inside the selected polygon. A narrower, locally hand-corrected art mask and actual road-direction/edge variants are needed before placement experiments.
- **Scorched Ground:** the coarse boundary captures a broad charred island but cannot separate fire cracks from non-glowing ash; **do not** use it as an emission map.
- **Marsh / Wet Bank:** the broad wetland motif still includes vegetation/stones; **do not** use it as physical water or traversability.

**Safe next authoring order during G1:** (1) refine hand-authored source-feature boundaries, (2) produce separate light-neutral diffuse edits and physically authored material channels using editable sources, (3) test neutral pixel scale and non-repeating placement against supplied *authoritative* C# layout fixtures only, (4) wait for G1's validated common renderer before creating an integration PR. Do not create another GPU lighting engine or import concept-painted highlights as reflection/emission.

## Decision

**Archive integrity is a separate accomplishment from visual approval and engine-readiness.** The next useful asset task is preparing representative editable derivatives and a scene-lit mobile comparison, beginning with Grass / Moss + Wet Mud (plus an actual water/light response), without committing them to production rendering. The other families stay source concepts until reviewed.
