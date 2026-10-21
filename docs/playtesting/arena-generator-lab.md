# Arena Generator Lab — playtest checklist

This development lab is a routed Blazor WebAssembly page at `/arena-lab`. It is built on top of the **same C# `ArenaEnvironmentState` and `HuntArenaGenerator`** as the proposed in-game arenas, not a screenshot, imitation generator or independent random playground.

## Open the lab

The development page is at https://pjotrcasteel.github.io/Wyrmforge/arena-lab.
Wet Forest is being developed and accepted first; other biome modes remain experimental.
Normal Hunts do not use the new scene until acceptance.

## What to test

- Cycle through Abandoned Road, Wet Forest, and the Frost habitats. Regenerate with identical seeds, verify reproducible placement and distinct environmental texture with different seeds.
- Explore the wet old road, scattered wooded glades and human traces in both directions. There are
  **no compulsory horizontal barriers, gated checkpoints or empty cross-shaped bands** in Wet Forest.
  Movement must stay reachable in multiple ways; physical prop collision must match actual art.
- Toggle **Collision outlines** to inspect the actual C# collider coordinates. Tree canopy may overhang walkable space; its narrow trunk remains solid.
- Enable **Pathing mobs** to observe two non-attacking enemy movement probes approaching around props. This is for navigation only, not a full combat simulation.
- Select **Hit prop** or **Blast area**, then tap an object. Destruction should remove its collider and its rendered object. Drops should appear only when applicable, and be collectible once by moving close.
- Set Wyrm proximity to stages 1, 4 and 8. Wet Forest should gradually show localized Fire influence, without a uniform color wash.
- Test portrait 320×568 and 390×844, and a wide desktop display. Keep the controls usable and maintain 30+ FPS or better where possible.

## Scope

The page does not unlock abilities, save player data or spawn real combat rewards. It is a test-only inspection surface, not a replacement for the full game or final environmental art. Report visual scale, hitbox and navigation issues before merging the gameplay PR.
