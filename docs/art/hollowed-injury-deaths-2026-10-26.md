# Hollowed — injury-consistent skeletal deaths (26 October 2026)

**Status:** work in progress on PR #363. Blender one-direction preflight passed, full eight-direction renders and mobile/gameplay approval are separate gates. This is an implementation record, not an owner art approval.

## Why

The current game has four genuine cape-free Hollowed appearances (standard, broken right arm, unusable left arm, injured left leg). It already features two independent skinned 3D deaths, but damaged-looking enemies still fall in the **undamaged standard** pose. This destroys the visible injury continuity just before they die.

## Authoring contract

- Source: preserved `rigged-hollow-death-no-cape-standard/hollow-death.blend`. Three additional editable source rigs have been recovered from the original Hollowed art history for pose comparison; no 2D repainting or mirror-based death animation.
- Real Blender actions: `Hollow_Death_Injury_broken_arm_right_v1`, `Hollow_Death_Injury_one_arm_left_v1`, and `Hollow_Death_Injury_broken_leg_left_v1`, separately keyed over 24 poses at 12fps. They reuse the licensed/derived actor's skin and the established floor-contact corrective.
- Broken right arm: damaged side guards the chest during the fall, healthy left arm catches the impact.
- Unusable left arm: damaged side trails instead of acting as a support, healthy right side does the bracing.
- Injured left leg: visibly shortened reach and restricted lower-limb travel during the buckling and settle phases; sound right leg remains source keyed.
- Each actual 3D pose has eight individually rendered direction views. No 2D rotation, frame mirroring, hue filters or recolored corpse.
- Source edits remain in `art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-injury-deaths/hollow-injury-deaths.blend`. The generated 96px `24×8` atlases and hash manifest live under `wwwroot/art/enemies/hollow-rigged/death/injuries/`. Contact sheets and GIF reviews go in `docs/art/evidence/hollow-injury-deaths-2026-10-26/`.

## Runtime safety and mobile memory

`hollow-injury-death.js` loads only when a compatible damaged silhouette actually appears in a Hunt: no eager 3×(2304×768×4 bytes) sprite allocation. Each loaded atlas is ~6.75MiB decoded, compared with ~12MiB for a standard 128px 24×8 atlas. If an injury-specific atlas is missing or undecoded, the corresponding damaged body's own source pose briefly fades instead of resurrecting the undamaged arms/legs or the rejected spinning-walk corpse. Standard non-injured Hollowed keep their existing 3D forward/braced deaths. Entity IDs make appearances and death choice deterministic; C# is still authoritative for physics, contact damage, death timing and spawning.

## Acceptance gates

1. Blender rig preflight: original skinned mesh + both source actions, independent real limb keys, 24 valid non-clipped frames and the floor-contact corrective.
2. Full atlas: three distinct eight-view images and recorded SHA-256 hashes, each physically legible without chopped limbs at 96px.
3. QA: actual native-resolution GIF and contact sheet for all 3, confirm right/left injury persists through every pose, compare floor contact and terminal silhouettes to standard death.
4. JS: per-entity damaged type/pose preservation, lazy loads, directions, pivots, fallback on missing art, pause/freeze clock and stable corpse fade. Verify no C# changes.
5. Only after actual game and mobile screenshots are inspected should the PR be merged as a production art change. Rendering success alone is not artistic approval.

## Future variation

Per-type idle breathing/stagger/hit-reaction and additional attack actions need new Blender authoring (not CSS sway or changed combat damage/timing). Keep those in separate reviewable milestones.
