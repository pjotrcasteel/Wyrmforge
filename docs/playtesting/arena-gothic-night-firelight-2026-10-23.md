# Arena high-contrast Gothic night and real firelight — 23 October 2026

Canonical direction: [Art & Animation](../canon/art-and-animation.md#arena-rebuild-v2--shared-lighting-before-further-forest-asset-production-locked-23-october-2026). **Every arena is night; black is allowed to be black, and fire must light real surroundings**. No permanent bright daylight.

## Implemented visual slice

- The existing live `arena.js` renders a near-black `arena-night-lighting.js` mask **after all terrain, structures, enemies, player and dragon have been drawn**, with shared source cutouts in **world coordinates**. This applies to all current Hunt arenas, not just the optional Lighting Lab.
- Default mask darkness: 90%; a small, neutral world-space halo around the player preserves an immediately legible silhouette. These are design-tuning values and do not change simulation, spawning or collision.
- Existing C# cast/projectile/impact snapshots feed the light plan via `buildSpellLights`. Fire casts make a wider, warmer, brighter opening; frost/storm/arcane retain their own light color. C# Fire-Wyrm-breath direction/range and explicitly burning trees feed additional **real** source positions. No burning-tree lights are invented if the existing authoritative environment exposes none.
- The night mask has a strict ten-source maximum, culls to the viewport, and reuses a single viewport-sized offscreen canvas. It is black-only masking, not a rewrite of the approved six ground textures/transition painter.
- **Warning cues stay readable**: hostiles' attack telegraphs and Fire Wyrm breath are redrawn above night. Spell VFX, projectiles, exit navigation, HUD and touch input remain above the night layer. This is intentional; black-on-black unavoidable damage is not acceptable.
- Optional `/arena-lighting` starts at Gothic night darkness 90% and has a labeled **calibration fire** switch; it is a presentation tool only, not a new game flame.

## Acceptance tests and remaining risks

- Pure JS: profile is near black, fire more intense than frost, cutouts use world coords, actual breath and burning props only, bounded lights, painting-mask composite correctly restores canvas state.
- Playwright on 320×568 and 390×844: default Night is On, calibration flame toggles produce different ground pixels, restoring light restores identical pixels, Night Off restores *unmodified* approved ground.
- Full game: run real Fire Tier-I live Hunt and observe mage, enemies, impacts, dragon cone and safe telegraphs. Night is global across arenas but hardcoded lighting values require **owner visual acceptance**.
- Device acceptance pending: physical iOS and Android fps, battery, thermal/overdraw, actual ability to distinguish enemies in dark areas and boss telegraph legibility. The mask works in Canvas today; a future mobile GPU/native adapter must preserve the same light-source semantics.
- L2 PR #324 for original-tree pivots and grounding is **separate and unmerged**. Reconcile it without overwriting the new night implementation, retain the original editable Blender .blend assets in Step-3 PR #307.

**No new fake scenery or runtime source art**, no modification to C# gameplay authority, original ground library, character saves, enemy behavior or town visual system.
