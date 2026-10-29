# Hollowed visual rebuild — H0 audit and source isolation

**Date:** 28 October 2026  
**Status:** H0 source/contract audit complete; H1 character design and sculpture **not accepted**.  
**Task branch:** `art/hollowed-new-model-20261028`  
**Base at branch creation:** `789f3c175371dd1b07978424feda725462205db6` (`main`).  
**Owner authorization:** Replace the Hollowed's *visual model*. The **animation engine is absolutely locked**.

## Hard isolation (enforced by task scope)

This branch is for **new, previously nonexistent** paths only:

- `art/source/enemies/hollow/rebuild-v1/` — original model source and versioned material inputs
- `tools/art/hollow-rebuild/` — isolated asset-authoring and QC tools
- `docs/art/evidence/hollow-rebuild-v1/` — source-backed evidence, rendered reviews and reports

**Do not edit, commit to, merge, rebase, or cherry-pick from PR #387 (`feat/universal-character-animation-an0-an6`).** Treat it as a read-only compatibility reference. This remains forbidden **even after owner visual approval**; all animation-engine integration is a different task requiring fresh explicit authorization.

Other strictly read-only paths/subjects: `src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-sprites.js`, `src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/`, all existing Ashling source/runtime assets, C# simulation, renderer/shader engine source, AI, gameplay, published game, and concurrent branches/PRs. No source motion clips, no animation controllers, no existing rig contract changes, and no deploy.

### Verified concurrent streams

| Reference | Verified 28 October | Scope |
| --- | --- | --- |
| [PR #387](https://github.com/pjotrcasteel/Wyrmforge/pull/387) | Open draft, unmerged | **Animation engine locked/read-only** |
| [PR #385](https://github.com/pjotrcasteel/Wyrmforge/pull/385) | Open draft, unmerged | Existing Hollowed variety and crawlers; preserve |
| [PR #390](https://github.com/pjotrcasteel/Wyrmforge/pull/390) | Open draft; targets #387 branch | Rejected polishing of the previous Hollowed, historical evidence only |
| `main` | `789f3c175371dd1b07978424feda725462205db6` | New source-only branch base |

The old no-cape Hollowed exists and works in production, but **that is not artistic acceptance of the current look**. Do not mistake prior 2026-10-20 approval of a previous lifecycle for approval of the new visual design.

## Source-backed production baseline (READ ONLY)

- Old Hollowed editable sources: `art/source/enemies/hollow/rigged-poc/model/local-appearance-004/`; current sprite runtime: `wwwroot/art/enemies/hollow-rigged/`, with injuries drawn first and arms second.
- Current target projection from `docs/art/hollow-runtime-integration-2026-10-20.md`: 96px walk cell at 93 world units and anchor (48,72); padded 128px attack/death at 124 units and anchor (64,88). **Do not bake these as an irreversible anatomy constraint**; preserve matching export scale for later handoff.
- Approved Ashling source: `art/source/enemies/ashling/model/local-appearance-002/`; production records `art/source/enemies/ashling/production.json`. Match *polish and legibility*, not its anatomy/horns/tail.
- Existing Blender 4.5 LTS source workflows use source .blend, genuine eight-direction render, CI QC, explicit provenance and authored texture maps. This branch has **not** independently reopened a new finished .blend.
- Canonical rules: `AGENTS.md`, `docs/canon/art-and-animation.md`, `docs/canon/roadmap.md`, `docs/canon/architecture-and-quality.md`.

## New visual direction — HARD requirements

A feral ash-corrupted **human undead**, with unmistakable intentional anatomical damage. **No cape, no long coat, no skirt/cloth tails, no backpack bulk, no demon horns or tail.** The silhouette must show a recognizable skull/jaw, distorted ribcage, pelvis, irregular limb weight, grounded feet and reaching claws. Fire must eventually occur *inside actual cavities/wounds*, not as arbitrary detached painted orange spots.

Review in this order: (1) 8-view flat black silhouette at 96px-class native presentation; (2) neutral-clay volume from front/back/profile/three-quarter; (3) connected deformable source topology with anatomical joints; (4) distinctive flesh/bone/char materials without emission; (5) occluded interior embers in off/subdued/surge lighting; (6) actual matching Ashling comparison. If anatomy is weak, return to silhouette before adding any emission.

### Independent anatomical studies for proportion, not geometry copying

1. [NIH 3D — Visible Human Male Skull](https://3d.nih.gov/entries/12260): orbital cavity, zygoma, real mandible/skull projection. Reference *anatomical concepts*; no mesh/material copied.
2. [Grand Valley State University, Introduction to Human Osteology — skull figures](https://pressbooks.gvsu.edu/introhumanosteology/chapter/skull-figures/): mandible in anterior/lateral/posterior projections. The publication specifies CC BY-NC 4.0; use as visual study only, **do not import or redistribute any images/geometry**.
3. [NIH 3D — human scapula](https://3d.nih.gov/entries/16813) and [rib cage](https://3d.nih.gov/entries/3dpx-016836): shoulder/rib articulation. Reference only; check actual licensing before potential reuse.

## H1 experiments — self-rejection / no approval

Two local exploratory geometry passes, each with Wretch, Mauler and Penitent candidates, were **generated and inspected** using original 3D modeling code. Both passes failed. The first looked like an articulated toy skeleton: exposed primitive seams, spherical skull and disconnected anatomical parts. The second used a joined organic surface but looked like a rounded generic creature with a comical face and insufficient rib/pelvis identity. **Do not promote either source as the new standard Hollowed; no source mesh has been accepted.** Their preview evidence is exploratory and not part of the approved source baseline.

Some exploratory meshes also showed >1 connected components and one failed the watertight diagnostic; passing triangle counts are not art acceptance. Reproduce further exploration with inspectable real source and visual critique, not auto-generated beauty claims. No .blend or final source image is being claimed for these attempts.

## Execution gates (one owner approval at end, no early promotion)

- [x] H0: audit current main, source, preservation rules, PR ownership and renderer scale; establish isolated branch.
- [ ] H1: **three genuinely distinct sculpted anatomical silhouettes**, then select and refine one. No mannequin, generic round goblin or cloth silhouette.
- [ ] H2: production sculpt, source topology, UVs, rest pose, diagnostic deformations **without editing the animation engine**.
- [ ] H3: restrained flesh/bone/ash textured original material source.
- [ ] H4: mesh-occluded internal fire using existing material interfaces only.
- [ ] H5: genuine Blender 8-way, source/wireframe, Ashling parity, native/mobile review evidence.
- [ ] H6: cleaned packed editable .blend + source/manifests/QC; safe generic retarget map **document only**, one owner art-approval checkpoint.
- [ ] H7: future separate integration only with a **new explicit authorization**, not automatically unlocked by H6 approval.

**No production code, renderer, lighting or animation-engine changes are authorized on this branch.** Passing tests without compelling genuine 3D visuals does not satisfy H1–H6.


## H1 checkpoint — connected original anatomical source (28 October, still NOT owner-ready)

The visual rebuild now contains actual source code for a new `hollowed-anatomical-v3.glb` 3D character study, authored *without importing* the previous Hollowed or the approved Ashling:

- `tools/art/hollow-rebuild/create_anatomical_v3.py` generates real implicit-sculpted tissue (with anatomically carved eye/mouth/chest cavities), reaching claws, skin-bearing limbs, plus separately authored ribs, clavicle, mandible and charred wound interiors.
- Local self-test: connected primary tissue **1 component**, **watertight**, **35,536 base triangles**, 30 labeled anatomy parts and 37,780 total triangles. These are structural checks, **not** proof of visual quality.
- Independent local VTK clay/material/silhouette renders of four genuine camera views were produced and inspected. **They remain rough.** Face and torso proportions still look too conventional, and native 96px silhouette is not sufficiently feral. This is **not an approved Hollowed**, and current runtime is untouched.
- `tools/art/hollow-rebuild/render_source_blender.py` imports this genuinely new GLB into Blender 4.5, writes an editable `.blend`, and renders front/three-quarter/profile/back with matching clay, material and absolute silhouette. Source-only GitHub Actions runs the pipeline; results must be inspected before any Blender-rendered claim.
- Isolated workflow is in `.github/workflows/hollow-rebuild-art.yml`. A passed CI job proves source can generate actual Blender assets, **not** owner art acceptance or game integration.

**Important difference:** The earlier rejected H1 studies remain historical evidence and should **not** be imported/retopologized as a production base. The v3 anatomy is also provisional. The next art pass must fix native-scale silhouette and specific Gothic/human identity before H1 closes; do **not** add orange glow or claim H2/rig/UV completion.

Reference principles used for anatomy (reference only; no source geometry copied): [OpenStax — skull](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull), [NCBI StatPearls — thoracic cage and ribs](https://www.ncbi.nlm.nih.gov/books/NBK538328/). Organic rig source will be independently authored; reference licensing does not grant image/mesh redistribution.

**No changes to animation engine / PR #387 / gameplay / Ashling / lighting engine / runtime files; no cutover.**

## H1 continued — three further source studies (v5–v7), 28 October 2026

**Artistic decision: REJECTED; H1 remains open.** This checkpoint is a rejection and direction change, **not** a completed model, model-owner approval, source integration or production export.

- V5: authored a new connected SDF anatomy study with dropped skull, displaced jaw, injured ribs, asymmetrical arms and planted feet. It remained visibly mannequin-like and the large eye cavities / jaw made the face childish.
- V6: removed the symmetrical U-shaped grin, reduced eye cavity radii, deepened wound cuts and corrected floating bone ornaments. The figure still read as a generic thin humanoid rather than a frightening original WyrmForge Hollowed.
- V7: introduced a source-only static forward/lateral body collapse and authored a genuine eight-facing 3D turntable at an elevated orthographic camera. The eight facings exposed still-unconvincing rear geometry, bland legs, smooth rounded anatomy, awkward head/jaw placement and an unmemorable silhouette.

The local v7 source primary mesh reports 45,344 triangles, exactly one connected component and watertight topology. **These are technical observations, not aesthetic acceptance.** The source-only VTK renders are not Blender renders, real Hunt captures or animation-engine results. No new animation, retarget, rigging, shaders, gameplay, renderer or runtime changes were made.

**Source retention:** A self-contained *rejected-studies* bundle `WyrmForge_Hollowed_H1_v5-v7_REJECTED_Source_Review.zip` was generated in the conversation with three new GLBs, original reproducible Python source files, native 96px images, eight-view true 3D renders, a rotation GIF and reports. The bundle is **not** committed into this PR; do not claim a fresh-checkout source model exists for v5–v7.

### H1 next-path correction

Procedurally blended cylinders and ellipsoids are producing visually consistent but aesthetically poor anatomy. **Stop iterating on those shapes**. Rebuild the visual source as a deliberate **sculpted** original model using anatomical references for skull, zygoma/mandible, scapula, ribs, pelvis and musculature. Sculpt silhouette with actual large, medium and small forms, asymmetric injury, and clear front/back profile. Avoid simplistic round sockets, a smile-shaped hanging jaw, tube-shaped arms, uniform unbroken tissue and toy feet. Preserve ash-in-wound material intention but do not add emission to hide failed geometry.

Because the current chat container does not have Blender installed and network installation is unavailable, a genuine `.blend` render/reopen is **not verified in this checkpoint**. A subsequent isolated Blender execution environment (the repository's established Blender 4.5 LTS CI/local workstation) is required to establish genuine sculpt evidence. Do not reinterpret VTK screenshots as a completed Blender deliverable.

**Hard scope lock continues unchanged**: Animation PR #387 and all engine/animation/runtime source remain read-only, **even after eventual owner art approval**. No merge or deploy.


## H1 continuation: predator swipe anatomy studies — 28 October 2026

Owner requested rigged zombie, bear and werewolf references to ensure future **swipe-capable** anatomy. The reference audit and deliberate non-copied design choices are in [rigged-zombie-bear-werewolf-swipe-references.md](rigged-zombie-bear-werewolf-swipe-references.md).

**Implemented on this isolated branch:**
- `tools/art/hollow-rebuild/sculpt_feral_anatomy_v2_blender.py`: a new original **STATIC REST MODEL** shape pass over the CC0 human base, varying thoracic yaw, left/right shoulder positions, scapular reach, head lean and leg weight. It is not an animation clip, and its existence alone is not artistic acceptance.
- `tools/art/hollow-rebuild/test_feral_source_shape.py`: Python-only source-shape tests for asymmetry, bounded deformation, deterministic vertex layout and ground contact.
- The existing isolated GitHub Actions renderer now generates eight genuine Blender angles and reopens the authored `.blend`. Preview artifacts are marked **UNAPPROVED**. Do not claim the visual render passed until the run succeeds and the resulting image is inspected.

**Explicit exclusions:** No bear/werewolf skeletons or animations were imported. No rig/action keyframes, new swipe animation, runtime atlases, C# combat code, existing animation source or shared engine changed. PR #387 remains absolutely read-only even after future visual approval.

**Next H1 quality gate:** inspect the latest actual Blender turnaround, reject weak model proportions and iterate sculpt. Only a clearly feral, coat-free, damaged HUMAN undead with proper shoulder mechanics and readable native mobile silhouette can advance to H2. Do not present technical green checks as owner approval.
