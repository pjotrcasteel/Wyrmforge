# WyrmForge vertical art slice 1 — Legion Breaker-informed cloister and Fire Bolt

Reference analysis: [verified Legion Breaker/Battlemage video](https://www.youtube.com/watch?v=WePyhtxZ4t0) and the [timestamped visual study](https://github.com/pjotrcasteel/Wyrmforge/blob/design/visual-first-magic-ui-rfc/docs/design/battlemage-visual-reference.md).
The original WyrmForge approved concept references remain in [art/README.md](../../art/README.md).

## Actual playable integration

- A valley **sanctuary** district uses a coherent flooded monastery courtyard: dark covered walkway footprint, shallow waterlogged garden, broken low plinth inlays, adjacent chapter house, old scriptorium and cistern. These are **walkable ground markings**; there are no arbitrary non-colliding solid pillars or giant ornamental glyph rings. Other districts and biomes retain their normal identity.
- The two sealed crossings still originate in the authoritative C# `ArenaEnvironmentState`. New wall art is drawn to those exact rectangles, and opening gates follows `barrier.open`. No new collision/hitboxes, access restrictions or movement side effects.
- The cloister blueprint, foundation and materials are deterministically seeded and cached alongside the existing world texture. Ground fog is only three faint strips per frame.
- All four canonical enemy archetypes now render from original, reusable cached 36x44 pixel art instead of generic circles, diamonds and triangles. A skeletal scavenger, dark wraith, hooded executioner and armored revenant have distinct body/weapon silhouettes. Existing `enemy.kind`, `hitFlash`, `frozen`, health scratches and size remain authoritative.
- The mage keeps the **approved slate-blue hood, pale collar and staff**. Two independent walk silhouettes follow **actual changes in the C# player position** and never alter movement. Existing wind-up, release, follow-through and Surge art receives hand-placed material/stitching details.
- Fire Bolt is rendered as a single small faceted pixel projectile with a warm core and limited wake. Canonical rank I–III and Surge identities vary the density/shape/area of *one actual impact*, not spawn fictitious shots. Frost, storm, arcane and Frostfire still use their previous renderers. Local spell light remains driven by C# cast, projectile and impact snapshots.

## Correctness and UX

- No game-domain files changed; this is **strictly presentation art**.
- Never confuse decorative floor with blocking walls: only barrier rectangles draw solid masonry. Open gates remove the sealed visual.
- Do not confuse the source game's short fixed lane with our roaming Diablo-influenced game.
- Smooth mobile movement is unchanged; pixel sprites and deterministic effects use Canvas2D.
- Performance: one cached world texture, <=12 cached enemy sprite images for 4 kinds x 3 states, maximum six diffuse spell lights, 3 mist strips. The scene does **not** repaint hundreds of random floor tiles every frame.
- Node tests cover deterministic floor layouts, exact hitbox masonry, enemy body identities/cache, walking animation from canonical movement, and fire rank/Surge distinction. Playwright has an actual 390px viewport rendering test sampling ground pixels, open/closed gates, enemy shapes, and Fire I/III/Surge.

## What is not yet done

This is an original, deliberate **first production-oriented pixel-material slice**, not the finished character/tileset quality bar. The mage, enemies and masonry still use hand-painted Canvas pixels rather than an artist-created image atlas. More extensive character frame direction, camera-angle consistent building elevations, action animation, grounded props and biome-specific palettes should be refined after user iPhone review.

Do not merge to live Pages without successful .NET/JavaScript and browser pixel CI, then human review of the authored sprites **at actual game size**. Avoid prematurely claiming that code acceptance proves art quality.
