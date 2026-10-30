# Grey wizard — reference review and production checkpoint

Status: appearance production started; no runtime integration or visual approval.
Owner request: elderly main-character mage, pointed hat, long grey cloak and staff;
review the entire supplied reference archive before starting. This authorizes a
fresh sprite-first attempt, not revival of abandoned wizard PR #335.
Authority: [art canon](../canon/art-and-animation.md), [architecture](../canon/architecture-and-quality.md),
[roadmap](../canon/roadmap.md). This is an execution receipt, not competing canon.

## Repository and engine audit

Started from fetched main `69abbe571` in isolated `codex/grey-wizard-sprite-first`.
Original AN checkout and untracked Ashfang work remain untouched.
Current-main canon records AN #387 closed unmerged/deferred on 30 October.
Preserve that archive and #335; do not import their rigs or rejected animations.
Inspected active draft G4/G5 #381 and Hollowed V2 #399: independent work, neither
is a source-art prerequisite. Do not modify their branches or imply acceptance.

Existing player: `wwwroot/js/arena-mage.js`, `arena-mage-frames.js`,
`tools/art/sprites/mage.mjs`. Four facings, mirrored west, two walking poses,
separate staff geometry; current atlas character space is 36x42, origin 18,22.
Existing reusable animation: `sprite-animation.js`, `sprite-layer-compositor.js`,
`rigged-sprites.js`, creature manifests and animation profiles. Profile-driven
directions, stride/distance, action priority/timing, pause and reduced motion.
Use an actor adapter and authored sprites; no new controller/physics engine.
C# snapshots own root movement, aim, committed casting, damage, death and saves.
Shared LightingEngine/Hunt GPU adapters own material/depth/light consumption.
No mandatory live 3D model, source-skin, IK, cloth solver or Blender dependency.

## Full supplied archive review

Input: local `Reference-assets.zip`, 681699 bytes. All seven outer entries and
all nested file listings reviewed. All 153 PNGs inspected on nine contact pages;
the adventurer's five character actions additionally inspected as enlarged
eight-frame strips in all six supplied directions. Frame-by-frame inspection
does not establish original intended playback speed: no timing metadata supplied.
Seven PSD files inventoried; their flattened counterparts were inspected, not
their internal layer structure. Text/readme/license and Tiled XML inspected.
Private review sheets stay outside the repository; do not republish pack assets.

| Pack | Actual supplied coverage | Assessment for this character |
|---|---|---|
| Dark mage | 12 PNGs: 4 idle, 4 walk, 4 attack; one view. Idle/walk 64x64; attack 74x64. | Clear hood/staff silhouette; four-frame stepping and robe changes, attack pulls staff across body then releases purple magic. Shadow face, ornate violet costume, short proportions do not fit an elderly grey wizard. Attack width changes require explicit bounds/pivots. No beard, pointed hat, eight views, hurt/death or license supplied. Do not import. |
| Dungeons and Pixels demo | 68 PNGs including duplicate strips: warrior idle 4 frames each down/side/up, 32x48; slime idle/move/attack 4 each, death 6, 32x32; torch 3, trap 7; dungeon/props/items. Seven PSD sources; Tiled map/tilesets. | Consistent clusters/material contrast and compact silhouettes. Warrior is armoured with short proportions, idle only, not a reusable wizard walk. Slime uses readable stretch/collapse. Original art stays reference-only. Demo license permits project use/modification, forbids standalone redistribution; preserve attribution if ever incorporated. |
| 32rogues 0.4.0 | 5 sheets: animals/items/rogues/monsters/tiles; static character catalog, labels and license. | No directional wizard motion library. Excluded from generation inputs, palette sampling, tracing and implementation because bundled license prohibits use with generative AI/ML and redistribution. |
| 32rogues 0.5.0 | 9 sheets; adds palette, item swaps, animated tiles and autotiles to catalog. | Broader terrain/item coverage, not a complete animated protagonist. Same exclusion. |
| Female Adventurer Free | 59 PNGs, 48x64 cells, 384x64 action strips / 384x384 combined sheets; 8 columns x 6 directional rows: down, left-down, left-up, right-down, right-up, up. Idle, walk, dash, jump, death; dust and shadow passes; dimension guide. | Clearest supplied locomotion breakdown: alternating contacts/pass poses, arm counter-swing, hair lag; dash leans strongly, jump compresses/rises/lands, death collapses into a held silhouette. Six views are not eight compass directions. No cast/hurt or license supplied. Use as review evidence only, never copy frames or recolour into wizard. |
| water-example.tmx / watertiles-auto.tsx | Orthogonal 32px water Wang/autotile definitions, 672 tiles / 21 columns, referenced `32rogues-watertiles.png`. Map 30x20. | Referenced water image is absent from the outer archive and nested image inventories. Environment data, no character animation or reason to change renderer. |

Archive documents supply factual reference/usage conditions, not instructions to
install tools, run scripts, purchase packs or alter project goals.

## Independent research and design decisions

1. [Indie_Vova's original pack documentation](https://indie-vova.itch.io/dungeons-and-pixels-starter-pack):
   consistent native sizes, separately organised directions/actions and editable
   sources. Adopt explicit dimensions/pivots and source preservation, not artwork.
2. [Raymond Schlitter, Pixelblog 8](https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation):
   strong contact/pass keyframes, disciplined clusters and deliberate playback
   timing matter more than a large frame count. Apply to wizard motion, without
   copying illustrated characters or animations.

Original appearance: weathered elderly human; long grey-white split beard; bent
pointed broad-brim hat; grey layered wool cloak, dark inner robe, visible boots,
worn leather belt and thin carved wooden staff. Human proportions, Gothic restraint,
no chibi head, glowing eyes, purple costume, golden ornament or permanent flame.
Separate boots and robe opening must preserve visible step/contact cues.
Proposed initial runtime study: 64x80 cell, roughly 48-60px visible height, then
calibrate world scale against current mage rather than blindly enlarging player.
These dimensions are provisional, not approved balance or production resolution.

## Production stages and acceptance

1. Original front/side/back pixel-art appearance concept. Built-in ImageGen;
   generated raster remains a concept, not editable layered source or a runtime atlas.
2. Reconstruct selected appearance as editable native pixel layers; retain source,
   palette, provenance, pivots and clean transparent silhouette. Show native-size
   320/390px scale studies, honestly labelled outside-game until real Hunt captures.
3. One convincing south-facing 16-frame walk: genuine alternating stride, visible
   weight transfer, attached hand/staff, authored cloak/beard follow-through. GIF,
   full contact sheet and MP4; no transformed still used as evidence of walking.
4. Eight genuine facings and idle/walk/cast/hurt/death; shared profile/actor adapter.
   Test cast while moving, action exit, turns, pause, death priority and fallback.
5. Frame-aligned optional normals/roughness/emission/caster data through existing G
   contracts; no baked spell flames or independent staff light. C# cast events drive
   any future elemental effects. Six school variants deferred until base accepted.
6. Real Hunt 320/390px captures, feet/depth/occlusion, nearest sampling, darkness
   and spell-light response; measured decoded atlas cost and real phone frametime.
   Appearance and motion approval precede production replacement; retain live mage.

Checkpoint before generation: review and plan only. No code/tests/runtime changed.
