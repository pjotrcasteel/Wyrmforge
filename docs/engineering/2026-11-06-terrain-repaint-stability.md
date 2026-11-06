# Hunt 1.0 terrain repaint stability — 6 November 2026

## Problem

A confirmed Fireball hit on an enemy or breakable prop also mutates authoritative C# terrain. The client pulls the changed fine columns and paints their surrounding blends, walls and moon shadows. Previously `paintTerrainRegion` put all dirty cells in one bounding rectangle, so two distant impacts repainted almost the whole map. More than 40 changed blocks unconditionally triggered a full rebuild. The GPU path also re-uploaded unchanged ground albedo and normals on stationary frames.

## Fix on `fix/20261106-terrain-repaint-stability`

- Merge only overlapping dirty paint clips. Keep separate damage regions independent, including the existing east/south shadow and raised-face margins; never clear undamaged areas between distant impacts.
- Remove the arbitrary 40-block full-repaint threshold. Full repaint remains appropriate for a newly created canvas, influence-band change, late forest-kit load or an unidentifiable revision.
- Cache camera-visible ground albedo and normal surfaces by painted repaint count, exact camera crop, dimensions and art scale. Reuse the corresponding GPU textures while all of those are unchanged; emissive animation is never frozen.
- Preserve deterministic `visualSeed`, global tile coordinates, splat blending, normal twins, depth cues, 2.5D projection and authoritative C# heightfield/destruction unchanged.

## Evidence

Synthetic 32×60-cell terrain paint-operation benchmark (Node.js, no DOM atlas), baseline vs localized clipping:

| Update | Previous operations / ms | New operations / ms |
| --- | ---: | ---: |
| Initial full map | 39,856 / 116 | 39,856 / 115 |
| One local damaged cell | 2,734 / 6 | 2,734 / 6 |
| Two far-apart damaged cells | 39,856 / 86 | 2,168 / 4 |
| 41 connected changed cells | 39,856 / 92 | 15,251 / 35 |

These numbers are diagnostic CPU paint timings, **not mobile frame-time or GPU measurements**.

Native Canvas RGBA comparison used the production texture atlas code and two full-colour/normal canvases. For one local hit, two distant hits, 41 nearby damaged cells and edge/cliff impacts, a regional update was compared pixel-for-pixel against a fresh full render of the **same final damaged heightfield**. All eight albedo/normal comparisons had **zero differing pixels**. Damaged pixels did visibly change in each scenario. The production visual seed and global tile sampling were unchanged.

Focused Node tests: `node --test tests/javascript/arena-terrain-canvas.test.mjs tests/javascript/arena-destruction-fx.test.mjs tests/javascript/arena-gpu-world.test.mjs` — 77 passing. New regressions cover disjoint clips, more than 40 changed blocks, viewport invalidation and GPU capture revision propagation.

## Still required before merge or publication

- Real in-Hunt 320px and 390px captures: kill an enemy, break a crate, hit a cliff, and verify textures away from impacts remain unchanged.
- Compare `?perf=1` p95/p99, terrain repaint max/average, heap, and GPU upload counts before/after at a stable seed on iPhone Safari and Android Chrome. Test camera movement and a stationary fight.
- Verify the visible exit gate, real movement/collision and game save compatibility (no C# or persistence files changed in this fix).
- C# compilation and browser integration could not be run in the current environment because the .NET SDK is unavailable. JS tests and native-canvas comparisons are the completed evidence, not full visual acceptance.

Do not merge until the actual-Hunt visual/performance gate is verified.
