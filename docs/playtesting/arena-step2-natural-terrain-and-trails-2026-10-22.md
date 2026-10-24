# Arena Rebuild — Step 2: Natural terrain & connected forest trails

**Owner direction:** Continue from the approved ground-only reset of PR #278. The previous arena, trees, cobblestone roads, props, characters, enemy or collision system must NOT return. This is a ground-only visual-acceptance milestone for the eventual iOS/Android game.

## This vertical slice
- A new, standalone, seeded **ground material recipe** (`arena-ground-trails.js`) paints one gently meandering, continuous forest footpath from top to bottom and two linked narrower spurs terminating at organically eroded clearings.
- Uses ONLY the accepted Material Lab grass (0), wet mud (1), dirt (3), marsh (5) painting indices. **Never** the cobblestone paving (2) or scorched (4) in Wet Forest.
- The baseline `naturalGroundPreview` stays **unchanged** and remains available via the **Natural ground** button. The **All grass** button remains; the new **Forest trails** mode is the active Step-2 visual candidate.
- Path width responds slowly to seeded contour variation; damp stretches and soft fringe vary with low-frequency noise. This is material mixing **inside the existing 16-pixel ground board**, not a decal, external stamp, new texture, polygon or CSS overlay.
- Same accepted material quilt, transition renderer, seed, full-world pan and cached atlas. No new per-frame generation or independent rendering of old structures.
- Touch pan still works and the world contains **zero** placed assets, props, roads/cobblestones, collision obstacles, enemies, pickups and character sprites.
- As before, the browser implementation is an **art laboratory**. This JS recipe is not yet game authority. Before using in actual Hunts, express the terrain plan in deterministic platform-independent C# and profile the eventual mobile renderer.

## Validation and acceptance
1. JS tests verify that six representative seeds produce visibly distinct but reproducible trails and clearings; no early/offshoot disconnect; baseline is unmutated; materials restricted to 0, 1, 3, 5.
2. Browser tests compare **Forest trails / Natural ground / All grass** on 390px and verify no props, collision, NPCs, roads, old imports or gameplay changes.
3. Real iPhone visual acceptance: natural connected dirt trail, credible clearings with variable but readable terrain, no squares/repetitions, no broken blends or muddy checkerboards, pan smooth enough to inspect the entire world.
4. **Do not introduce any vegetation, trees, rocks, ruins, bridge, player, collisions or enemies in Step 2.** Step 3 will be newly authored assets only after explicit acceptance.

## Design caveat
Visible ground routes here are **visual paths, not validated navigation paths**, because Step 2 explicitly contains no collision or character systems. Do not advertise them as a playable Hunt route. A later C# arena recipe will own navigability, ground, terrain geometry and spawns together.
