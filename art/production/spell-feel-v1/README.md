# Spell motion, identity and rank studies

The player should feel upgrades through gesture, release, projectile character and impact, as well as damage. Injury is visual only and never changes movement, cast release, recovery eligibility, damage, cooldown or input handling. These files are art studies; they do not modify gameplay.

## Current implementation

Open `index.html` over HTTP to compare ranks I–III for all eight spell identities, including healthy/hurt/critical mage poses. `spell-rank-review.gif` compares the four starter spells across three ranks. The same analytical mage and staff are used throughout. The spell gesture is a skeletal overlay: root and legs are untouched, and the free arm temporarily takes casting priority over the injury guard. Release starts at the supplied cast event with zero added delay. Recovery is a visual envelope, not an action lock.

`spell_profiles.mjs` keys visual identity by SpellId, with an independently named gesture, silhouette, rank signature and recoil profile. Schools are shared design families, not the animation lookup key. The existing eight spell definitions each have their own profile. Twenty-four existing evolutions have separate identity routes checked against the C# catalog. These evolution routes are names for later art production; the current gallery renders base spell ranks, not finished evolution effects.

| Spell | Gesture and silhouette | Rank development in this study |
| --- | --- | --- |
| Arcane Orb | Controlled compression; dense round core | Piercing wake at II; broader weighted core at III |
| Fire Bolt | Forward thrust and strongest body recoil; irregular hot tail | Denser flame; III adds the existing impact blast |
| Frost Shard | Precise slicing release; long crystal facets | Denser trail; III adds the existing freezing fracture |
| Chain Lightning | Raised conducting hand; immediate angular discharge | Additional chain steps; III adds a fork |
| Cinder Needle | Short finger/arm flick; thin burning filament | Sharper sustained burning core; no invented extra projectile |
| Ice Lance | Deliberate spear-like extension; longer heavy crystal | Weight and cold core become denser |
| Ball Lightning | Coiled palm pulse; volatile linked electrical knots | More links and stronger contained discharge |
| Aether Dart | Small marking gesture; pointed phase dart | Etched wake and a stronger contact mark |

For rank upgrades, emphasize a clear primary silhouette, a concentrated release, and a short readable impact. Keep rank I recognizably the same spell as rank III. Reserve split projectiles, wide novas, different delivery patterns and other semantic changes for upgrades/evolutions that actually provide them. In the review, target spacing and effect scale are arranged for side-by-side inspection; they are not world-space hitbox declarations.

## Sound and further asset work

Sound design is specified but not generated here. Arcane: contained pressure and a low resonant release. Fire: a short combustion thump with a dry trailing roar. Frost: a hard crystal snap and granular break. Storm: a sharp crack with a brief electrical tail. Higher ranks should add low-frequency weight, transient layers and richer material response while preserving the spell's identity; do not simply increase volume. Use distinct sounds for release and confirmed contact.

Final work still includes painted sprites/VFX, actual sound assets, evolution-specific effects, eight-direction casting renders, multi-spell visual budgets and live event integration. Do not delay an automatic cast to accommodate an anticipation animation. If a future spell is explicitly a charged ability, its charge belongs to its gameplay definition and its event timeline. Actual damage, projectile count, hit radius, chain targets, release times and status effects must come from the simulation. Art profiles must not create those mechanics.

## Validation and reproduction

Run `node check_spell.mjs`. It compares profile/evolution IDs to the existing C# catalogs and checks 13,824 pose cases across eight spells, three ranks, three injury states, 32 locomotion phases and six cast times. It checks unchanged root/leg positions, unchanged skeletal lengths, finite coordinates, zero added release delay and source-pose immutability. `validation.json` records the measurements.

Run `node render_review.mjs /path/to/scratch-frames` with `@napi-rs/canvas`, then encode at 30 fps. The 96-frame GIF spans three complete walk strides and two review casts. Browser and native-canvas renderers use the same `drawSpellPanel` and skeletal `applyCastPose` functions.

Primary reference: Riot's [VFX style guide](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/) and [public guide PDF](https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf), focusing on shape, value, timing and clarity. WyrmForge retains its own restrained dark-fantasy art direction. Canonical local references are `art/README.md`, `art/world/forest-monastery-encounter-v1.png` and the earlier mage identity study.
