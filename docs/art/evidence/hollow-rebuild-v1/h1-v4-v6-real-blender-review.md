# H1 v4→v6 actual Blender proof — self-rejection and next source decision

**Date:** 28 October 2026  
**Review type:** Genuine Blender 4.5 LTS source renders, all eight directions, full 320×400 and downsampled native 96px.  
**Approval:** NONE. Neither a mesh nor animation is released. Existing live game, Ashling and animation engine / PR #387 are untouched.

## Source execution and reproducibility

The isolated [Blender Actions run #40754415484](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40754415484) is **green**. The exact [unapproved v6 Blender artifact](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40754415484/artifacts/12845501388) contains an editable source `.blend`, eight real orthographic renders, native-resolution composite and `source-qc.json`.

The v5 earlier run [#40753487125](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40753487125) **rendered** but was marked red by a stale QC field; its source artifact was preserved. It was correctly fixed by checking actual output fields rather than simply ignoring failures.

Verified v6 `source-qc.json`:

| Invariant | Measured result |
|---|---:|
| Real skin vertices | 13,380 (no MakeHuman skirt/hair helpers) |
| Sculpted front-wound vertices | 425 |
| Deep-wound tissue vertices | 132 |
| Local wound material polygons | 117 |
| Back-facing wound material polygons | **0** |
| Maximum continuous skin recession | 0.116 m |
| Ray-anchored rib curves | 6 |
| Extraneous detached source mesh fragments | 0 |
| Imported or newly created animation actions | 0 |
| Emission | OFF |

**Accuracy distinction:** the wound is a continuous depressed *skin surface*, not yet a true hollow cutout or damaged production mesh with interior membranes. The ribs are Blender curves with endpoints embedded below the skin surface, not a single retopologized, deformable unified production mesh. These source geometry checks **cannot** establish riggability, physically meaningful penetration, shading quality, or artistic approval.

## Visual assessment

**v4:** clean but unmistakably generic bald humanoid; shoulders and mouth lack feral Gothic undead character.

**v5:** first successful six skin-anchored ribs, but at native size they appear as bright horizontal small bars on smooth human skin. This is not a real exposed ribcage.

**v6 initial:** source script wrongly used negative world-space Y as a proxy for torso front. The entire leaning back was painted dark, creating a rejected dark backpack-like patch.

**v6 corrected:** the actual surface normal gates both the deformation and cavity material to front-facing skin. Back is clean in the genuine eight-angle render; CI checks `rear_wound_faces == 0`. Yet front still looks like an otherwise healthy, slender human carrying six bright bars and a small black hole; **no distinctive creature or compelling damaged anatomy**. **ART REJECTED.**

At **native 96px** the chest details are less readable and the silhouette is nearly unchanged from v4. There is no reason to claim this is as good as the approved Ashling; it is not.

## Decision

**Stop iterating the same procedural and CC0-human naked-skin silhouette.** More torse dents, grayscale paint or glow would be cosmetic and repeat the old Hollowed mistakes. Instead choose an authored, modifiable, genuinely undead source with an expressive skull, proper clavicle/scapula volumes, protruding bones, torn flesh, claws and a convincing hunched stance; then significantly re-author for WyrmForge. The user explicitly permitted switching to a free alternative when the current approach fails.

Best immediately verified source listing: [Hotstrike Studio — Free Stylized Dark Fantasy Zombie V1 on Sketchfab](https://sketchfab.com/3d-models/free-stylized-dark-fantasy-zombie-v1-9e8ec26242d3467ca75314a84c43eb24), currently listed **CC Attribution** with downloadable editable Blender/FBX, rig, UVs and PBR source. **Avoid mixing licenses:** the *same creator's itch.io* distribution has a separate restriction on standalone asset redistribution. Obtain/validate the source under the exact platform's CC BY listing and preserve attribution, license text, downloaded source hash and the original sculpt's change log. A listing alone is NOT evidence the binary was downloaded or reviewed. Never silently check the restricted source into the public repo. If lawful acquisition is blocked, find another clearly licensed source; do not treat a stock humanoid as good enough.

Already added `tools/art/hollow-rebuild/evaluate_free_character_blender.py` to import a legally obtained asset as **STATIC SOURCE ONLY**, strip its actions, and render genuine comparison. Do not run source with embedded scripts. **Do not edit animation engine, source clips, runtime or gameplay, and do not merge this draft PR.** Next owner visual gate is a genuine image/GIF of the *new* source-derived authored creature, only when appearance deserves approval.

## Source integrity

All work remains on `art/hollowed-new-model-20261028`, draft [PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391). The original source scripts v3–v6 and local rejection documentation remain inspectable; neither these rejected prototypes nor third-party renders have been shipped to production.
