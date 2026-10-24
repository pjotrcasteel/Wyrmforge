# Arena ground foundation reset — 22 October 2026

## Owner direction (supersedes the previous Arena Generator Lab preview)
Start over. **Ground foundation is step 1.** Remove all old trees, cobblestone roads, ruins, camp props, vegetation, pickups, enemies, character sprites, shadows and hidden collision from the new Arena Lab. Do not re-use the previous art/placement systems and do not polish their appearance.

## Implemented in /arena-lab
- Replaced the entire Blazor page with a **ground-only** viewer. No old habitat, hunt route length, Wyrm influence controls, Walk, Hit prop, Blast area, Collision outlines, Pathing mobs or world inspector for legacy scene entities.
- Replaced the active scene with a separate `arena-ground-foundation.js`, using **only** the accepted six painted base materials from `arena-materials.js`. Current natural forest board actually uses grass, mud, dirt and marsh; paving and scorched are not randomly scattered in Wet Forest.
- No imports or calls of `arena-environment.js`, `arena-lab.js`, `arena-wet-forest-art.js`, `drawMage`, old tree/camp/landmark painters or `ArenaEnvironmentState` in the new scene. No actor, no hidden geometry and no collisions.
- The approved Material Lab art quilting and natural blending are retained as the only source of pixels. Fine Detail is off; the ugly foreign-material overlays are never invoked.
- Pan freely with mouse/touch; seeds and Natural/All grass show different base compositions. A bounded, single static baked scene is redrawn only on changes or pan gestures, **not** 60 times/second.
- Existing game/Hunts, other canonical art, and their asset files are unchanged. This removes legacy assets from the **new arena**, not from other features or the repository's source archive.
- Final iOS/Android game production remains the goal. This Canvas preview is a replaceable art-acceptance tool and isn't a new browser-owned gameplay world.

## Acceptance
1. Mobile `/arena-lab` shows **only the ground**; count of old visible or logical props, walls, characters, trees, road blocks, interactive pickups and collision is zero.
2. Natural ground visually retains approved continuous transitions; no cobblestone road, tiled camp, structures, minimap or scenery.
3. All grass and different seed work; touch dragging does not scroll the page and pans within bounds.
4. JavaScript unit tests and responsive iPhone browser tests assert no legacy imports/controls and capture both Natural and Grass screenshots.
5. Do not add trees, trail splines, props, collision, combat or old assets until a **new stage** is deliberately approved, built from scratch.
