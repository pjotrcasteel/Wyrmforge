# WyrmForge — reactive cloister and genuinely moving undead (art slice 2)

Reference: [Legion Breaker gameplay](https://www.youtube.com/watch?v=WePyhtxZ4t0) and original WyrmForge monastery concepts under `art/world`.

This second vertical slice improves the *playable* scene merged via PR #112 without introducing a new game rule.

## Enemy motion authored from gameplay truth
- `EnemyRenderSnapshot` now carries the existing `EnemyState.Id` as `EntityId` (optional positional constructor arg for backwards compatibility). Rendering cannot reliably animate a dense crowd from nearby positions alone.
- The browser retains each enemy's traveled world distance by canonical ID, updates that distance only when the C# position actually changes, and selects one of two **individually drawn lower-body pixel poses** per archetype.
- Standing still, frozen-in-place enemies and paused render snapshots stop stepping. Reduced-motion preference turns off gait frame changes without preventing enemy movement.
- Dead IDs release state immediately. There is no new RNG, artificial monster movement or chase velocity.
- Fixed palette and source-sprite cache (up to 36 images: 4 enemy types × 3 hit states × 3 poses); not one canvas allocation per drawn enemy.

## Spell reflections grounded in the cloister
- The existing world-level spell lighting still comes from C# cast/projectile/impact positions.
- A restrained three-line highlight now appears **only** where those actual source lights reach the courtyard's shallow water. Its hue derives from the actual elemental light; Surge brightness comes from the same source strength.
- Zero spells mean zero extra highlight. The reflection is clipped to the water footprint, draws no walls and creates no faux gameplay marker.
- World geometry and texture cached once; the rendering pass reads the same environment plan, not a re-rolled floor.

## Acceptance
- JavaScript tests prove stable IDs, not blinking actors, stopping at rest, removal on death, authored feet for all four enemy types, and no autonomous water glow.
- Browser pixel test on 390px viewport compares standing vs moving sprites and Fire-reflected monastery water against the identical pre-light canvas.
- Build and deterministic simulation tests must remain green. No changes to DPS/XP/primary spell or arena hitboxes.

The original art is still a foundation for further hand-authored sprite atlas and tile lighting; passing tests is not final aesthetic approval.