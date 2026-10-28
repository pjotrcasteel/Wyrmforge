# Free, modifiable external undead source — H1 alternative decision

**28 October 2026 · Source-only research for [draft PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391).**

## Reason for the pivot

The in-house procedural v3–v7 studies repeatedly produced a too-simple human skull,
weak rib/shoulder anatomy and a generic action figure rather than compelling Gothic
undead. Model topology/closed-mesh success did NOT indicate visual acceptability.
A separately authored human-undead 3D character is a better starting *reference*
than repeatedly scaling the same generated figure.

The current `sculpt_feral_anatomy_v2_blender.py` remains an isolated, **unapproved
source experiment**. CI-generated Blender renders must be visually inspected; a
successful Blender job is not owner artistic acceptance.

## Actual downloadable alternatives and usage constraints

| Source | Character source and genuine terms | Use |
| --- | --- | --- |
| [Hotstrike Studio Free Stylized Dark Fantasy Zombie](https://hotstrikestudio.itch.io/free-stylized-dark-fantasy-zombie) | Free ~8,286-triangle one-mesh humanoid with rig, Blender/FBX and PBR maps; creator explicitly permits modification and game use. **However its itch.io terms forbid distributing or repackaging the standalone asset.** | **Top visual reference**, local-only evaluation; **DO NOT** commit source or derivative .blend in public GitHub under this store license without confirming redistribution rights |
| [Same creator's Sketchfab listing](https://sketchfab.com/3d-models/free-stylized-dark-fantasy-zombie-v1-9e8ec26242d3467ca75314a84c43eb24) | Displayed as downloadable **CC Attribution**, with roughly the same 8.3k tris and Blender/FBX/PBR offering. This apparently differs from the creator's itch.io usage restriction. | If obtained under Sketchfab's CC BY listing, retain creator attribution, license and change log; clarify contradictory platform terms before publishing adapted source |
| [Colin Greenall ZOMBIE CORPSE](https://sketchfab.com/3d-models/zombie-corpse-bb2ebca80471423a93a60a6552928abe) | Downloadable **CC Attribution** model with sculpt-derived details, normal maps and 7.7k triangles. Creator explicitly describes it as **intended to be rigged**, not already rigged. | **Safer second candidate** for original H2 rig/skin creation once legally downloaded; do not claim an included source rig |
| [Petrov_the_blind 3D Zombie Grandma](https://petrov-the-blind.itch.io/3d-zombie-grandma) | Artist describes a free **CC0** rigged Blender/FBX source, with a PSX-style lower-poly variant. | Legally flexible anatomy/rig sample, but its base identity/style is not sufficiently similar to WyrmForge; don't ship as standard Hollowed |
| [Gobkit free character assets](https://gobkit.com/freebies) | Public CC0 low-poly rigged GLB packs and source documentation | Legally flexible **technical rig sample**, generally too simplified to be the finished Hollowed |
| [MakeHuman core CC0 base](https://github.com/makehumancommunity/makehuman) | Already checked into this isolated PR with original source/provenance | Remains a lawful **anatomical topology reference**; not a finished decayed/sculpted Hollowed |

These are verified public listing/creator terms, **not evidence that any third-party
binary is downloaded, inspected in Blender, artistically approved, rigged for
WyrmForge or licensed for unrestricted republishing**.

## Safe evaluation pipeline — implemented

`tools/art/hollow-rebuild/evaluate_free_character_blender.py` supports legally
obtained source `.blend`, `.glb`/`.gltf` or `.fbx`. Require a local creator
license record and exact source URL/artist. It opens a **separate empty Blender
scene**, reads only the external source, strips imported animation actions from
the new evaluation scene, keeps editable meshes/materials/armature **as source
data**, normalizes feet/height and renders eight genuine 3D clay and material
views at 320px and 96px preview scale. Saves a separate **UNAPPROVED**
`.blend`, with source hash, scale, UV count and source provenance.

It explicitly rejects `GAME-USE-ONLY` for public/redistributable evaluation
artifacts. Restricted-license external binaries must stay outside this public
repository, even while art reference use continues. This is **not** a license
verification service; an artist's actual license text and platform terms still
must be reviewed independently.

Example (only after the user legally obtains a downloadable source):

```bash
blender --background --factory-startup --disable-autoexec \
  --python tools/art/hollow-rebuild/evaluate_free_character_blender.py -- \
  --input /external/creator-source.glb \
  --license-file /external/creator-LICENSE.txt \
  --license CC-BY-4.0 --author "Creator name" \
  --source-url https://example.org/exact-download-listing \
  --output artifacts/hollow-rebuild/external-candidate
```

The importer DOES NOT add animation, new clips, gameplay, shared-engine
changes, runtime sprite replacements or published assets. No production
integration before full owner visual review; model approval alone does not
authorize PR #387 changes.

## Artistic next gate

Compare **actual Blender eight-way source renders**, at the *same native
96px size* and Gothic night lighting, against the unchanged approved Ashling
before selecting any candidate. A modified third-party zombie must have
WyrmForge-original feral silhouette, anatomy, no coat/cape, thoughtful char
and true internal ember cavities. Do not replace one generic zombie with a
different generic zombie and call it finished. Once a source is genuinely
owner-reviewable, show **actual model images or GIF in chat**, not an AI
concept illustration.


## Visual screening decision — 28 October (before mesh import)

Actual creator-published model poster images were inspected for the two 3DAssets.dev candidates:

- **Ash-burnt husk** ([actual model preview](https://cdn.3dassets.dev/assets/12006/v1/poster.webp)): **REJECT**. Too mannequin-like; cylindrical forearms, simplistic skull and clothed outline; not the ash-corrupted anatomy or cohesive WyrmForge quality required.
- **Brute infected** ([actual model preview](https://cdn.3dassets.dev/assets/12007/v1/poster.webp)): **REJECT**. Giant smooth cylindrical shoulder growth and cartoon-like form; would recreate the previous rejected shapeless/backpack mass. No genuine open wounds or believable shoulder structures.

These posters are **third-party source previews**, not Blender renders of our edited model. No attempt to claim imported source or owner-reviewed gameplay art. The CC0 license remains valid; quality is the reason to reject them.

Both automated import/render jobs were **removed from the routine PR workflow**, since they cannot pass the shape/silhouette gate and would unnecessarily consume CI resources. The separate license-gated evaluator remains available for a better future source.

**Priority:** first complete and inspect the source-derived **feral human anatomy sculpt** using the existing CC0 MakeHuman topology. If it remains generic, research/license a meaningfully better **professionally authored human-undead anatomy base**, such as Hotstrike Studio's actual Sketchfab CC BY upload (requires attribution and an exact download/provenance receipt). Do not use a license-conflicted itch.io standalone package as a committed source substitute. Do not import random zombie samples merely because they are free.

The shared animation engine and PR #387 are still **ABSOLUTELY READ ONLY**.
