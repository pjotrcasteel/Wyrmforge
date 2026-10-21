# Arena Generator Lab — playtest checklist

This development lab is a routed Blazor WebAssembly page at `/arena-lab`. It is built on top of the **same C# `ArenaEnvironmentState` and `HuntArenaGenerator`** as the proposed in-game arenas, not a screenshot, imitation generator or independent random playground.

## Open the draft preview

1. Open [PR #192](https://github.com/pjotrcasteel/Wyrmforge/pull/192), choose the latest **Browser smoke** workflow run and download its `wyrmforge-playable-preview-<commit>` artifact.
2. Extract it and start `python3 preview_server.py --directory wwwroot --port 4173 --host 0.0.0.0` on your development computer.
3. Open `http://localhost:4173/arena-lab` on that computer. On your iPhone, use your computer's local LAN address on the same private Wi-Fi network: `http://COMPUTER_IP:4173/arena-lab`.

This is a temporary unmerged PR preview; the public Pages site does **not** include this route until a validated release is merged.

## What to test

- Cycle through Abandoned Road, Wet Forest, and the Frost habitats. Regenerate with identical seeds, verify reproducible placement and distinct environmental texture with different seeds.
- Move using WASD/arrows or drag on touch. Explore both sides of the road and both crosswise fighting lanes. Walls and props must have consistent physical collision, without invisible walls across clear ground.
- Toggle **Collision outlines** to inspect the actual C# collider coordinates. Tree canopy may overhang walkable space; its narrow trunk remains solid.
- Enable **Pathing mobs** to observe two non-attacking enemy movement probes approaching around props. This is for navigation only, not a full combat simulation.
- Select **Hit prop** or **Blast area**, then tap an object. Destruction should remove its collider and its rendered object. Drops should appear only when applicable, and be collectible once by moving close.
- Set Wyrm proximity to stages 1, 4, and 8. Fire and Frost should grow in influence without repainting every tile as one colored overlay.
- Test portrait 320×568 and 390×844, and a wide desktop display. Keep the controls usable and maintain 30+ FPS or better where possible.

## Scope

The page does not unlock abilities, save player data or spawn real combat rewards. It is a test-only inspection surface, not a replacement for the full game or final environmental art. Report visual scale, hitbox and navigation issues before merging the gameplay PR.
