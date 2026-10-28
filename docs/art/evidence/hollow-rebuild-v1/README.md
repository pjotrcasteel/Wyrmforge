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
