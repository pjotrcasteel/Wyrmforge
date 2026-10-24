# WyrmForge player wizard — visual/animation direction (candidate)
## Identity and boundaries
An original elderly, thoughtful, road-weathered wizard: tall narrow hat/hood hybrid with a deliberately NOT Gandalf-accurate crown, substantial pale beard split into two weighted tufts, stooped but resilient shoulders, asymmetric layered ash-grey field coat and robe, sturdy boots, battered leather satchel, one visible staff hand. Human proportions and true cloth weight: not chibi, shiny high fantasy, ornate wizard costume, or a copy of any existing fictional character. Long beard, hat brim and staff silhouette read independently at 320 px. Eyes/face remain modest detail rather than an emissive player outline.

### Source comparison
- Hollowed: muted bone/dirty cloth, articulated weight, eight original facings, real 16-frame gait and semantic feet; match camera/material/grain while remaining recognizably human.
- Ashling: eight non-mirrored facings, real attack follow-through, rig ownership, restrained emissive anatomy. Player materials stay physically grounded.
- PR #332 LitSprite: one pose source supplies RGB albedo/alpha, authored normal/roughness/depth/caster; no standalone wizard light effect or fake glow mask.
- Original-game Diablo II / modern Gothic sprite references: transfer compact silhouettes, readable animation arcs and grounded dark cloth; never copy a sprite or costume.
- Gandalf the Grey: take the archetype of an old staff-bearing wanderer ONLY, not Ian McKellen's facial likeness, movie costume, hat geometry or decorative signature features.

### Base appearance
Weathered charcoal/slate-grey layered robes; faded taupe edges, brown leather cinch, tiny bone-tone hair/face accents; dark boots; believable fold shadows from texture/material but no painted directional torch/firelight. Left shoulder cape fragment provides recognizable asymmetry, right hand grips staff. Hat may be worn leather/felt with an irregular, short split brim rather than the familiar oversized pointed movie hat. Lower two beard strands carry real secondary motion.

### Schools
One **mesh, armature, base textures, animations, camera, anchor and body silhouette**. A data-driven skin switch selects a narrow cloth seam/cuff/satchel stitch accent plus a different staff shaft/head; material albedo remains low saturation.
- Fire: rusty ember-orange stitches; split scorched iron staff, not a flame permanently illuminating the robe.
- Frost: desaturated frost blue seam; crystal rime crown with meaningful angular silhouette.
- Storm: ochre-gold knots and thin brass conductors; forked asymmetrical lightning rod.
- Arcane: dusty violet details, compact enclosed astrolabe staff.
- Necromancer: grey-green/bone thread, weathered carved bone and dull grave-iron staff.
- Summoner: lichen/earth trim, animal-totem wood head with binding rings (not floating summoned creatures).

Future emitters are explicit world-snapshot resources. A glint/emissive gem can self-illuminate only when its own material declares emission. Environment lighting still decides whether ordinary fabric/skin is visible.

### Motion ownership & required clips
- **Idle**: 12 frames. Chest breath, beard/fabric settle, staff planted. Authored clip, not a still jitter.
- **Walk**: 16 frames. True foot plants, step timing independent from cast, alternating contact, subtle staff timing; keep feet root still relative to authoritative movement.
- **Cast**: 20 frames. Anticipation -> braced plant -> staff lifts/turns toward facing -> clear release -> weighted recovery; no spell spawned by graphics.
- **Hurt**: 10 frames. One reactive shoulder/body recoil, no forced displacement by presentation.
- **Death**: 24 frames. Grip breaks, staff falls, knees fail, robe collapses onto authored ground plane, terminal pose holds.
All 8 views independently rendered from the same 3D source; no mirrored west facings. Freeze/pause and reduced motion use existing shared animation sampler actions. Profiles are aspirational until exact authored motion exists.

## Stage and validation gates
1. Keep original visual turnaround/contact sheet and editable source, provenance and revision SHA. Current concept is NOT approved and is NOT a production atlas.
2. Create an editable, properly skinned textured Blender wizard rig (mesh + beard/hair + cloth and hand-held staff), six model/staff variants and persistent .blend file.
3. Prove South walk first in Sprite Lab: foot contacts, robes and staff interaction at 320px/390px.
4. Eight-direction idle/walk/cast/hurt/death from the same camera/feet-anchor, with every phase visually inspected.
5. Pack each accepted school export into the exact Hollowed/Ashling schema; verify no clipping, frame shape, per-pose normals from model (not albedo), shadow caster/occluder compatibility, and black-world diagnostic on PR #332.
6. Only replace the temporary arena mage once review, animation mapping, six variants (with disabled schools remaining disabled in character creation), real rendering and physical mobile checks are passed.

No change in this slice to `arena-mage.js`, `arena.js`, C# combat, Hollowed/Ashling art, or the lighting engine. Existing mage is a fallback until proper art acceptance.
