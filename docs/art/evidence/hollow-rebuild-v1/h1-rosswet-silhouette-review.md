# Hollowed H1 — legally sourced Ashfall Wretch and three real Blender silhouette studies

**Date:** 2026-10-28  
**Status:** source evaluation runs green, **all three studies artistically rejected**; NOT ready for owner approval, runtime export or animation integration.  
**Actual source run:** [#40761182862](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40761182862), [genuine Blender editables and 8-way 96px previews](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40761182862/artifacts/12848437027).

## Verified source and attribution

- Original human-undead character: **Rosswet Mobile, Thin Zombie [Awake Zombie Asset]**, <https://opengameart.org/content/thin-zombie-awake-zombie-asset>; **Creative Commons Attribution 3.0 Unported**. Must retain attribution and indicate authored changes. This is **not** a CC0 asset.
- Legal original ZIP downloaded from <https://opengameart.org/sites/default/files/new_thin_zom.zip>; SHA256 `ba9a8d2a444f36b77f838251103f2c9a3d570db3bf1e10fb38b80f4f480b40`; native original `new_thin_zombie.blend` SHA256 `37e26b0c7f680baf474c25cf4f8459f364bb212a5f71226f8a700801851d7647`.
- The original model has a real source skin (3340 triangles, UVs, 41 bones); imported and saved in isolated Blender with **0 animation actions**. The original atlas `new_thin_zombie.png` was rebased, linked to its materials and packed into the source-only evaluation .blend. The rig's weights and mesh topology remain unchanged.
- Art authoring scripts: `evaluate_free_character_blender.py`, `sculpt_ashfall_wretch_h1_blender.py`, `sculpt_silhouette_variants_h1_blender.py`. Their outputs are genuine `bpy==4.5.15` editable Blender .blend plus 8 independent orthographic clay/material renders and downsampled **96px** sheets, not image-generation mockups or gameplay captures.
- No author source animation was transplanted, and absolutely no universal animation-engine source/PR #387, existing animations, C# gameplay, live atlas, renderer, Ashling or production resources were modified.

## Comparison: genuine H1 sculpt and two extremes

| Independent source silhouette | Modified vertices | Max static shape change | Owner approval | Visual verdict |
| --- | ---: | ---: | --- | --- |
| Ashfall Wretch r2 | 1,369 | 0.2456m | **NO** | Better licensed rotten texture, but generic tall zombie anatomy |
| Raker (elevated attacking scapula; hunched reach) | 1,450 | 0.5466m | **NO** | More predatory leaning mass, but skull and shoulders remain smooth and nearly stock at native 96px |
| Collapsed (asymmetric broken scapula; twisted spine) | 1,464 | 0.4294m | **NO** | More dynamic shoulder line, but looks like another deformed humanoid rather than a memorable Gothic WyrmForge enemy |

**Critical review:** all three share the same original 3340-triangle surface and UV atlas. These are distinct *coordinate edits*, but do NOT constitute the three complete, independently authored 3D sculptures required by H1. At a native 96px character cell, face/jaw/ribcage destruction and distinct limb injuries remain weak or invisible. Green rendering and QA numbers prove repeatability, NOT exceptional art.

## Correct next artistic technique (not yet done)

**Stop trying to achieve the entire design by deforming the existing low-poly character!** The next viable step must include direct local sculpting and new authored **anatomical mesh** (high-poly sculpt followed by independent production retopology): sculpt an expressive human skull/mandible, real clavicle/scapula connection, anatomically damaged multi-layer ribcage and inner membrane, correctly shaped knuckles/claws, and a bitten/chipped asymmetrical head. Ensure *no cape or trailing coat*. Use bear/werewolf only as body-weight and swipe reference; the creature remains an undead human. Fire/ember must be internally occluded by true cavities, never painted floating orange spots. Verify different sizes and genuine 8-way Blender at native scale, side-by-side approved Ashling.

Retarget deformation testing may be performed only on the new static source/rig, **never by altering universal animation-engine code or existing animation assets**. No merging PR #391 until full owner visual approval with a real image/GIF. Approval of visuals alone is NOT approval for H7 animation integration.

## Rejected fallback inventory

- Self-authored procedural Wretch/Mauler/Penitent v1-v7: skeletal toys, blobs, generic skulls; self-rejected and not shipped.
- Initial MakeHuman CC0 v3-v6: clean 13,380-vertex body with six surface-attached rib curves, but generic naked human at 96px, failed design.
- Rikindle3D Male City Zombie (CC0): legally downloaded and Blender inspected; rigged generic T-pose mannequin, rejected.
- Two CC0 3DAssets.dev infected: creator-published posters too low-quality, rejected before import.
- Hotstrike Studio CC BY Sketchfab model is a promising professional source listing, but **requires an authenticated authorized download**. Its separate itch.io version restricts standalone redistribution; do not mix platform terms, scrape, or add restricted binaries to the public repository.

**Art milestone:** H1 OPEN — no approved source model, no sprite replacement, no runtime model, no deploy, no merge.
