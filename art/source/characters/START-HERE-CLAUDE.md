# Wyrmforge — unified wizard and enemy animation handover

Use this document as the single handover. It supersedes the chronological notes inside `Archive/`. The archive preserves original artwork and source studies; the new animated masters and exports are the integration inputs.

## What was added

The wizard has newly drawn idle, walk-start, eight-pose walk, walk-stop and cast/recovery sequences in eight directions. This includes front/back casting and staff-walking poses, left views and diagonals. Its native master is `Wizard/Animated/Fire-Mage-Eight-Directions.aseprite`; eight smaller directional Aseprite files are also supplied.

All ten Fire Tier I enemies are included: Hollowed, Ashling, Ash-Priest, Ash-Slinger, Mire-Hound, Penitent, Bell-Warden, Drowned-Wraith, Reliquary and Ashfang. Bell-Warden, Reliquary and Ashfang have separate phase forms, giving thirteen enemy masters in `Enemies/Animated/`.

Every enemy form has idle, walking, its primary action, hit/recovery and defeat sequences in eight directions. Bell-Warden additionally has Toll/Rally; Reliquary has Corruption/Seal; both Ashfang forms have breath, breath sweep, left/right claws, claw combo, pounce, left/right tail sweeps, takeoff, landing, run, roar, walk-start/stop, turn and alert. The three bosses also have normal-to-second-phase transitions. The final phase-change cel matches the target form's directional idle cel exactly.

`COVERAGE.md` gives exact counts. The 14 primary masters contain 3,800 frames and 928 tagged clips. Counts include explicitly reused neutral endpoint cels; those endpoint copies are not newly drawn in-betweens. New pose source sheets are retained under each animated character's `Sources/` directory.

## Open and integrate

1. Open `preview.html` locally after extracting the whole ZIP. It needs no installation or network connection. Choose a character, action and direction; pause and step through individual frames.
2. Open the character's `.aseprite` for editing. Enemy animation masters contain body/equipment cels; original layered studies remain in `Archive/Enemies/`. Wizard component layers remain separated.
3. Read `runtime-index.json`. Each `Runtime/<character>/<action>.png` is a simple horizontal frame strip with eight direction rows: **E, SE, S, SW, W, NW, N, NE**. Row 0 is E. Do not infer row order from old source sheets.
4. Use the supplied canvas size, foot/root anchor, frame count and frame durations. Wizard canvas is 48×48, root (24,44); enemy canvases are 80×80, root (40,76). Transparent canvas padding is not body size or collision size. Preserve the game's feet-only collision/footprint definitions.
5. Adapt the manifest to the existing sprite-animation and rigged-sprite renderer contracts. The bundle does not silently change simulation code, attack timing or balance. Preserve existing C# authority for damage, healing, resurrection, projectiles and phase changes.

Exports use nearest-neighbour sampling, straight alpha and untrimmed cells. Use integer screen coordinates after camera transformation where practical. Do not bilinearly filter these sprites or apply automatic horizontal mirroring to asymmetric equipment.

After editing existing native tags, run `python Tools/rebuild_runtime.py` to refresh the runtime strips and viewer data (Python 3 and Pillow). Run `python Tools/validate.py --editor /path/to/aseprite` for the file checks and independent editor export comparison; LibreSprite is also supported. The helper supports the bundle's RGBA normal-blend cels. New actions or changed rendering features require updating the integration contract explicitly.

## Transitions and blending

Use discrete pose changes and explicit recovery frames. Alpha crossfades create double silhouettes, ghost limbs and duplicated staffs at this resolution.

- Wizard: `idle → walk_start → walk`; exit through `walk_stop → idle`. The stop and cast endpoints reuse the exact first idle cel. The wizard manifest includes a suggested stop-entry pose for each walk phase; verify it at gameplay speed.
- Movement direction changes: preserve normalized walk/run cycle phase. Keep facing hysteresis so small aim changes do not alternate direction every frame. Do not restart the gait at frame zero each time facing changes.
- Attacks/casts: choose facing at anticipation, retain it through contact/release, then enter recovery. Combat events are simulation-owned. A visual contact marker must never cause a second hit, heal or projectile.
- Interruptions: death overrides everything and holds its final cel. Apply the existing simulation rules for phase changes, stagger and attack cancellation. A cancelled cast must not reach a release marker accidentally. Short hits recover through the supplied neutral endpoint.
- Phase changes: switch to the target form at the end of `phase_change_<direction>` using the `nextEntity`/`nextClip` metadata. The new phase must retain the same world scale and collision identity.
- Ashfang flight: play takeoff's anticipation before moving rapidly above the camera. During the overhead phase render the moving ground shadow, not a hovering body. Restore the body for the braking-wingbeat landing. External breath, vent flames, falling cinders and impacts remain separate effects; the original VFX source art is retained.

Wizard staff contact is authored as a plant/support/lift/swing sequence. During support, the renderer must account for world movement so the planted tip does not skate. Use the wizard manifest's contact intent and anchors as starting data; these are not proof that world-space locking has been validated. Keep the staff in the anatomical right hand and keep its length rigid.

## Character constraints

| Character | Preserve |
|---|---|
| Wizard | Elderly gray-robed mage, beard and pointed hat, no cape; right-hand staff; free hand casts; rear Fire sigil |
| Hollowed | Gaunt human undead, ragged trousers, ember eyes; not a rabbit |
| Ashling | Small feral silhouette, roughly half Hollowed's height; ember eyes |
| Ash-Priest | Right-hand lantern staff, free left-hand support casting; heal/resurrection rather than a damage projectile |
| Ash-Slinger | Right-hand throw and empty throwing hand after release; projectile is separate |
| Mire-Hound | Four-legged canine gait and lunging bite |
| Penitent | Pale hood and visible skull, left shield/right sword; no emissive fire and no phase two |
| Bell-Warden | Right bell/left chained lantern; normal and molten forms; Smash/Toll/Rally |
| Drowned-Wraith | Wet dark hair, blue-gray body/dress, chains/cross; no opaque fog baked into the sprite |
| Reliquary | Two censers; normal and awakened forms, exposed gold-white core in awakened form |
| Ashfang | Compact young dragon, four legs plus two wings, continuous tail; unchanged world size between normal/enraged |

## Validation and remaining integration work

The structural sanitizer checks native Aseprite decoding, frame/tag ranges, positive timing, nonempty cels, canvas padding and an independent LibreSprite batch open/export. Enemy exports match the editor pixel-for-pixel; wizard output allows a maximum one-channel-value difference from the editor's alpha rounding. All included Aseprite files receive an editor open check. The archive checker verifies PNG decoding, runtime references, filenames, SHA-256 entries and ZIP CRCs. See `Validation/` for the actual results.

**This is an authored asset package, not an in-game approval.** No game build was modified or played with these assets. Gameplay-speed direction changes, foot/staff world contact, combat synchronization, material/lighting registration, occlusion and mobile readability still need validation in Wyrmforge. A structural pass cannot certify anatomy or facing quality in every generated pose. Show genuine in-game clips of these cases before requesting visual approval.

Original material/height/emissive studies in `Archive/` use the old source layouts. Do not bind those draft maps to the new animation atlases as if their pixels were registered. Preserve the established renderer/material pipeline when importing the new body frames.

The package includes the actual new drawings and native clips; creating missing directional animation artwork is not being handed back to Claude as a TODO. Integration and gameplay validation are the next step.
