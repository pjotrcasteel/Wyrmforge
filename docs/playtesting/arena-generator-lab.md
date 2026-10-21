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


## Wet Forest depth and cohesion check (21 October 2026)

- Compare seeds with contact shadows and litter enabled (the dressing is part of the cached
  terrain texture and therefore cheap to render each frame). Ground should read as wet loam,
  moss, old wood and scattered forest floor, not an unrelated uniform color tint.
- **Hollow and Ashling**, not Mire Hound, are the two non-attacking movement probes.
  Their approved pixels should remain intact; real movement distance determines foot poses.
  Check feet touching dirt at 390px and 320px, including movement behind rooted trees.
- Compare resting vs moving enemies, collisions at fallen logs, barrel destruction and
  pickup readability. No mandatory crossing walls or glow circles have been reintroduced.
- Acceptance is visual: the current environment atlas is still a basic proxy and needs
  a later focused Gothic tree/canopy art pass. Do not describe this as final artwork.

## Pixel material-pass acceptance — 21 October 2026

Candidate branch `feature/wet-forest-pixel-ground-20261021` (not shipped unless merged).

- Open `/arena-lab?seed=1204&stage=1&habitat=WetForest`, then repeat with seeds 1205 and
  3312. Compare the trail, puddles, root dressing and named site. The forest should have
  recognisable ground material clusters rather than smooth islands over a gradient.
- Walk across the entire trail and approach the offshoot and visible story site from both sides.
  The route must remain navigable and the drawn ground must not imply new solid boundaries.
- Try all four site identities via **Different seed**, checking disturbed graves, charred camp
  floor, broken flat waystone paving and cart ruts. Physical objects are still the C# props.
- Hit a tree/barrel and verify that its collision and sprite disappear together, while baked soil
  and footprints remain a floor detail. Turn Collision outlines on/off for comparison.
- Test 320×568 and 390×844 portrait Safari, with Hollow and Ashling following, plus a desktop
  wide scene. Check legibility at actual device scale, no noisy gridlines, correct feet contact
  and acceptable FPS. A successful automated test is **not** owner/device visual approval.
- Stage 1 versus stage 8 should differ via local soot spots only, not a global Fire color wash.

Pure JS regression: `tests/javascript/arena-wet-forest-art.test.mjs`. No changes to C#
world generation, enemy AI, saves or normal Hunt staging. Final Gothic forest atlas remains
outstanding; this checkpoint is a consistent material base for those assets, not the final art.
