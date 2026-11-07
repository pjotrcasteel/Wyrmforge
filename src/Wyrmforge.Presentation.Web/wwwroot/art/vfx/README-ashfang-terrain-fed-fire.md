# Ashfang terrain-fed fire · FX follow-up

Feature: Ashfang's existing C# breath impact now creates *brief, terrain-aware* fire tongues.

## Authority and style

- **Source of truth:** \`RunSimulation.AshfangGroundFire.cs\` and \`AshfangFireFuelRules.cs\`. The player takes damage only while a real C# patch is burning; presentation cannot ignite or expand one.
- **Physical fuels:** exposed wood, dry organic soil, damp organic soil, and inert stone / ash / boulder / lava. Existing terrain does not yet store per-grass or per-mud gameplay moisture; the new 3×3-cell seeded gameplay moisture pockets are deterministic, separate from the *visual-only* ground seed.
- **Burn:** dry soil 2.75s, damp soil 1.15s, wood 3.5s; charcoal scar remains visible through 9s total. Existing breath damage is unchanged. Every active footprint uses the same 34-unit collision radius and 4 raw damage with a shared 0.5s cooldown: overlapping patches **never** multiply damage.
- **Propagation:** only dry soil and wood transmit the fire. One four-neighbour spread attempt at age 0.7s, at most **two generations**. No spreading to ash/rock/lava/boulder, across high cliffs, outside the terrain or back onto an existing patch. The live patch cap remains 24. This cannot form an endless wildfire or seal a route permanently.
- **Destruction:** a dug-through exposed microcell no longer counts as flammable soil, and a wood microcolumn worn down to its base loses fuel. Already-burning patches extinguish if the exposed fuel disappears.
- **Presentation:** use the existing 16-frame recoloured original PVFX Foundry Ground Flames atlas (source and provenance in \`README-ashfang-ground-fire.md\`), preserving Wyrmforge's muted gothic pixel style. Dry ground burns brightly, damp ground hisses/fades quickly, wood has taller flames, and small deterministic whole-pixel embers rise without runtime texture generation. Reduced-motion hides moving embers.
- **Lighting:** a maximum of six low-intensity warm light emitters participates in the **existing** lighting engine; no independent renderer or invented physics. C# gives the lights' positions and lifetimes.
- **Performance:** the game does not call terrain mutation or change \`ArenaTerrainGrid.Revision\` for the fire spreading/fading. No full terrain repaint, canvas resize, GPU normal-map upload or terrain relight request on contact. Existing breath destructibility retains its current terrain changes.

## Required proof before visual approval

1. Real iPhone Safari and Android Chrome Hunt with Ashfang: visible ignition, short spread, smoke/embers and complete cooling.
2. Stone/lava/ash stops fire; damp soil extinguishes faster; standing within hot radius causes exactly one damage tick per buffer.
3. Destruction during a fire removes exposed fuel, extinguishes it, and never makes the rest of the terrain shift/repaint.
4. GPU and Canvas fallback preserve 2.5D anchoring and telegraphs. Compare true in-game screenshots/recording at 320/390px, not asset previews.
5. No stutters from dynamic ground/normal textures or camera movement; only the existing GPU emitters animate.
