# WyrmForge — Living Territories / 0.0.116 design and implementation order

Workstream: WF-TERRITORY-20261014-B
Status: slice A implemented on `feat/0.0.116a-territory-visual-language`; B and C are not delivered by this PR.
Target: Dark, violent, aged, distinctly **inhabited places ruined by elemental Wyrms**, readable in portrait mobile even with placeholder art.

## The problem we are fixing

0.0.114 delivered a real world-space camera and a physical exit; 0.0.115 delivered solid ruins and phase gates. The terrain still resembled a flat uniform canvas with sparse decor. A clear lane does not automatically become a believable road, and darker colors do not automatically imply menace.

A place must have a readable **purpose, history, route, scar and silhouette**. The floor should make sense at a glance: "a chapel was destroyed here" rather than "some objects are scattered around me". Every visible world element must earn its position.

## Ongoing reference library and translation rules

This is a living design reference. At the beginning of each subsequent environment milestone, review *at least one* comparable game or developer retrospective, extract a specific technique, document a WyrmForge-specific implementation and test it. Never import assets, audio, names, layouts, logo treatment or literal maps from other games.

| Reference | Public source | Transferable observation | WyrmForge-specific implementation |
| --- | --- | --- | --- |
| **Diablo II / Resurrected** | https://news.blizzard.com/en-us/article/23460551/diablo-ii-continues-to-inspire-blizzard-20-years-later ; https://michaelmanfredi.artstation.com/projects/48Yyw8 | Broad explorable outdoor regions, authored structures and roads; tomb/ruin entrances and clusters communicate place. | A persistent broken causeway connects north/south crossings. Each territory has 3 site silhouettes conveying its former function. |
| **Hades** | https://www.digipen.edu/showcase/news/eduardo-gorinstein-delivers-challenge-and-fun-hades ; https://www.supergiantgames.com/blog/hades-hit-up-the-nighty-night-update/ | Distinct environments + legibility matter more than maximizing procedural randomness. Level authors chose deliberate composition. | A protected central fighting courtyard; curated location of focal landmarks on lateral edges; randomized wear and variation inside authored semantic templates. |
| **Darkest Dungeon** | https://www.gamedeveloper.com/audio/road-to-the-igf-red-hook-studios-i-darkest-dungeon-i- ; https://www.darkestdungeon.com/darkest-dungeon/about/ | Historic materials, pronounced outlines, pooling blacks and worn places sustain gothic atmosphere. | High-contrast silhouette-first stone ruins, old banners, ossuary stones, collapsed chapel, ruined forge/pyre. |
| **V Rising — Gloomrot** | https://playvrising.com/expansions/gloomrot | Environmental damage, polluted valleys, lightning-scarred highlands and weather express faction and danger. | Fire burns charred valleys; Frost makes polygonal fractures; Storm branches into split-earth lightning wounds; Arcane distorts the landscape into rings and ritual geometry. |
| **Darkest Dungeon II** | https://www.gamedeveloper.com/design/how-a-theme-of-a-road-trip-from-hell-would-shape-darkest-dungeon-ii | The route between locations is a memorable landscape, not just a transition screen. | Player actually travels through a world and observes increasingly damaged districts before physically entering the exit. |
| **Grim Dawn** | https://www.grimdawn.com/guide/gameplay/exploration/ | Hand-crafted areas establish geography and history; selected bridges, barricades and shortcuts vary between sessions. | Different canonical combat districts (causeway/sanctuary/rift), opening passages of different widths, and recognizable foundations. Prefer meaningful regional geometry to random debris. |
| **No Rest for the Wicked** | https://80.lv/articles/interview-inside-the-tech-and-artistic-inspirations-of-no-rest-for-the-wicked-from-moon-studios | Expressive silhouette and lighting deliberately emphasize the painterly scene over indiscriminate photorealism. | Introduce one enormous visual landform per element and a distinct composition per district, always preserving player/attack readability. |

**Next sources to assess:** *Ravenswatch* (top-down hostile world exploration), and *Path of Exile* (strong act-biome landmarks). Research techniques, not content or grind loops.

## Slice A — Readable Territories (this PR)

1. **Place identity:** three original silhouette recipes per biome (ash: black pyre, forge, burnt convoy; ridge: watch, ossuary, banners; valley: chapel, waystation, flooded altar).
2. **Road hierarchy:** a strong continuous north–south paved causeway, broken stone slabs, deliberate gaps and a central courtyard. The physical 0.0.115 gates continue to align with the north/south route.
3. **Ground zoning:** clustered irregular banks and deposits along the lateral world edges, leaving central combat movement unobstructed.
4. **Elemental damage:** Fire/Frost/Storm/Arcane have **different geometric signatures**, with wound count and severity increasing toward the lair based on route stage.
5. **Subtle movement:** seeded drifting motes reinforce the element without becoming gameplay hazards or obscuring telegraphs.
6. **Deterministic presentation:** `arena-territory-art.js` derives appearance from canonical `environment.seed, stage, biome, element`, no combat RNG calls. Expensive ground passes are baked into the existing bounded texture cache.

Acceptance:
- same seed/route + world size => same landmark and ground plan;
- biome changes site identity; element changes scar geometry; stage amplifies damage without moving landmarks;
- place silhouettes visible while standing in the starting courtyard and moving into north/south regions;
- no added player/enemy collision, hidden damage or inaccessible rewards;
- unchanged touch, camera, exit, HUD, combat and progression;
- build, unit tests, JS tests, Chromium portrait smoke, balance simulation pass;
- physical iPhone Safari screenshot/playtest remains mandatory before subjective art quality is declared good.

## Slice B — The Wyrm Is Watching (next PR; not present in A)

1. Deterministic timed or director-triggered **large shadow pass**, using a canonical Wyrm presence event.
2. Distinct audio/visual signature per Wyrm with original/licensed audio only.
3. One distant elemental strike outside immediate player danger, creating persistent local scorch/frost/storm/arcane aftermath in canonical world state.
4. Combat readable at all times: shadow cannot conceal enemy telegraphs; no unavoidable hits; events pause appropriately on level-up and other UI.
5. Mobile portrait browser test verifies visible timed presence; seeded replay ensures reproducibility.

## Slice C — Wyrm Approach and Dramatic Openings (after B)

1. Gate shatter + dust, short diegetic directional signal, and clearly changed terrain shape.
2. Stronger proximity escalation affects ruined structure conditions, visible wounds, weather and ambient light *without* a uniform screen tint.
3. Environmental choices: tempting detours, authored safe corridors and hazards tied to actual canonical interaction state.
4. A short, fair first Wyrm flyover/skirmish becomes a future combat milestone once the environmental cameo is satisfying.

## Engineering invariants

- The .NET simulator owns collision, encounter phases, rewards, hazards, gate state, enemy navigation and outcome. JS is presentation only.
- Noninteractive scenery must look nonblocking; visually solid barriers use exact C# barrier geometry. Do not create fake walls.
- Do not change balance RNG, run state or level progression for purely decorative additions.
- Limit offscreen full-world caches and per-frame costs; watch iPhone Safari thermal/texture behavior.
- Keep the lane and combat signals readable in portrait. Avoid uniformly bright or overloaded effects.
- Never claim a milestone visually successful without looking at representative phone screenshots or actual device feedback.

## Future inspiration review template

Record for each milestone: **game + source, concrete observation, WyrmForge adaptation, what we deliberately reject, screenshot/test acceptance**. This keeps research productive rather than becoming style imitation.

## 0.0.117 playtest response — explicit anti-repetition and health-clarity gates

User feedback: the health HUD must not require a clickable question-mark tutorial, and different levels must **not** be one floor with small different-colored scars.

Implementation: remove health tutorial state/UI; a passive ♥ HP bar communicates current health, percentage and criticality through shape/length/color. Adjacent nodes choose different deterministic districts. Each district changes the world's major floor footprint and the physical crossing width, while each element creates a large identifiable landform.

Keep these hard acceptance gates in future changes:
- **Three screenshots, same biome and element, three sequential districts:** large areas of the image must differ structurally, not just in particles or color.
- **One-element monochrome test:** Fire/Frost/Storm/Arcane ought to remain distinguishable by their different patterns/shapes, not their hue alone.
- **No user interaction required to understand health, energy, XP or the route.** Noninteractive progress meters may carry screen-reader labels, not clickable tutorial buttons.
- **All new geography must agree with canonical navigation.** Scenery that looks like an inaccessible cliff but has no collision should read as shallow damaged ground instead.
- **Do not declare visual quality passed based only on automated checks.** Compare actual portrait phone screenshots and adjust based on player feedback.
