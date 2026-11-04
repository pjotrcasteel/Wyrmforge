# Hollowed appearance target — owner-selected 29 October 2026

**Status: VISUAL TARGET LOCKED, not sculpt/runtime approval.** The owner supplied a front/side/back reference of an ash-corrupted undead creature and explicitly said, "I want this." It replaces the previous vague procedural skull-only silhouette as the intended character *appearance*. Reproduce with original editable 3D source, not image-generated fake model screenshots or copied geometry. Retain the existing 70-bone source rig for reference, and do not alter any animation engine, gameplay, Ashling or deployed atlas.

## Fidelity targets visible in the owner's reference

1. **Whole silhouette:** tall, emaciated, forward-hunched human undead with raised shoulder mass, ribs and pelvis visible through fractured tissue. Long and uneven arms, long hooked claws, asymmetrical planted legs and recognizable feet. No T-pose, clean mannequin surface or harmless clean skeleton.
2. **Head:** fully three-dimensional human-like damaged skull with displaced lower jaw and a screaming, cavernous mouth, genuine cheek/brow/nasal anatomy, glowing *interior* eye sockets and oral cavity, irregular gray-black facial rot. Hair is extremely important: long, dirty, matted and tangled, hanging over temples and down beyond the neck on front, profile and rear. No simple bald skull and no solid black face-mask.
3. **Back/shoulders:** dense original charcoal fissured plates, cracks following spine, scapulae and upper arms, intermittent ember seams rooted *inside* actual cracks. No floating plate fragments, spike crowns or pasted painted orange outlines. Keep physically credible movement clearance around shoulders.
4. **Chest/arms:** broken, asymmetrical exposed ribs embedded inside blackened soft tissue, torn muscle and prominent shoulder structures. At the hands, claws lengthen/curl from connected source fingertips. Do not add floating nails or glowing rings.
5. **Clothing:** weathered leather/bandage belt, overlapping short irregular torn waist panels and strapped lower legs. Explicit owner-provided visual *supersedes the old absolute no-skirt rule* only for these short intentional waist flaps. **Still prohibited:** cape, long coat, robe, large loose back drapes or fabric that hides the leg silhouette.
6. **Palette:** ash gray flesh, scorched brown leather, aged bone, black char and sparingly hot orange-red magma in internal wounds. No brightly baked environment highlights. Neutral-clay anatomy must pass *before* using emissive cracks to conceal weak sculpting.
7. **Scale:** must read as a distinct frightening undead next to approved Ashling, with strong head/hair/claw silhouette in **real 96px native** views. Material detail that disappears at 96px is optional and should not burden mobile GPU budgets.

## Source production contract

- Preserve original deform weights, original 70 bones, no new actions/keyframes and separate source assets. All generated meshes must attach to existing anatomical bones and be documented; no independent animation architecture.
- Publish genuine Blender front / three-quarter / profile / back, all eight compass angles, neutral-clay and material, plus native 96px sheets. Compare against the actual owner reference, acknowledging its painterly detail cannot itself serve as topology.
- Add LOD/material tri budgets, 8-way wireframe/deformation probe and mobile-readability acceptance before runtime integration. Hair must not create hundreds of transparent layered sprite particles; prefer grouped skinned source hair cards/geometry with bounded strands.
- H1 is not accepted until *actual source-model renders* are worthy of the supplied reference. Passing CI only verifies reproducibility.
- H2–H6 continue production topology, UV/material, inside-cavity emission, genuine views and packed editable model. H7/runtime integration requires **separate** owner authorization.

## First modeled exploratory pass

`tools/art/hollow-rebuild/sculpt_reference_hollowed_h1_blender.py` implements only **first-pass** source-hair silhouettes, short waist wrapping, skin-anchored char ridges and matte aged skin. It does **not** yet produce the rich facial tissue, ember sockets/mouth, dimensional char cracks, accurate leather/greaves, fully deforming source, source textures, or a convincing finished model. **Reject if it reads as a clean skull wearing a wig or as a faceless mannequin.**

**Hard isolation:** [PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391) stays draft. [PR #387](https://github.com/pjotrcasteel/Wyrmforge/pull/387) and the entire universal animation engine stay untouched. No merge or deploy.
