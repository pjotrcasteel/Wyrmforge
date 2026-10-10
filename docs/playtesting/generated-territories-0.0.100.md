# Generated territories — 0.0.100

## Generator contract

A seeded territory reserves navigable valley corridors and a river crossing, then creates two split/rejoin road sections. Encounter placement follows those corridors. Mountain features are rejected if they overlap reserved trails; the upper ridge/caldera has a visible opening for the shared lair approach. River crossings are confined to the marked shared bridge. Mirrored territories, jittered road geometry, terrain contours, schools and lengths vary by seed. Seeds reproduce problems; this is constraint-guided generation, not an arbitrary heightfield pathfinder. River valley, broken ridge and ashen caldera currently share the two-section campaign structure.

Each fork has 2–4 roads, always including a short road. Short roads have 2 fights, medium 3, long 5. Long roads always grant an additional relic cache at their middle encounter. A road keeps one school across its encounters, and all choices at a fork have distinct schools. All ordinary combat rewards remain; caches are not cosmetic. Common opening/clearing/approach encounters connect the sections. Shortest journey: 8 fights. One long detour: 11; two: 14. The lair follows the final approach. There are no backward graph edges.

Combat pressure progresses across eight baseline positions as 1,1,2,2,3,3,3,4; extra detour encounters retain their section pressure. Minimum eight-fight phase budget is 169 seconds versus 166 in 0.0.99. Depth-one kill quotas total 62 on the shortest road. Additional recovery, school upgrades and time on detours are deliberate tradeoffs. HUD reports actual completed encounters rather than a misleading fixed denominator.

## Rendering and validation

SVG uses generated river polygons, contour features, a bridge, gapped ridge/caldera and authored encounter icons. Node position, road length and guaranteed cache metadata are separate from rendering, so art can replace geometric placeholders later. The map still uses manual scrolling, reduced-motion camera advancement and a fixed reward panel.

Application tests cover 500 distinct seeded layouts, fork sizes, minimum path length, distinct school choices and every promised long-road reward. 200 seeds are sampled along every road to check river and mountain clearance. Seed reproducibility and authoritative route availability remain covered. Browser checks inspect map, road forks and reward previews at 320×568 and 390×844. Full CI and rendered phone inspection precede release. Heuristic runs evaluate reachability and balance; they do not establish human enjoyment.
