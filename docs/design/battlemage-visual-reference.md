# Battlemage art reference — frame-by-frame review required

**User-provided exact reference:** https://www.youtube.com/watch?v=WePyhtxZ4t0

**Status: pending video-frame verification.** As of 2026-10-15 the source video could not be loaded or its identity/frames independently verified from this development environment. The name “Battlemage” is shared by multiple unrelated games, including top-down pixel-art and first-person 3D titles. **Do not claim that screenshots from one of the other games represent this particular video.** Never infer the linked game's appearance or graphics pipeline merely from its title.

The user identifies this video as the recent Battlemage title whose **art style** should inspire WyrmForge. This supersedes using random generic fantasy references as the primary style baseline. Reference influence is for original art-direction principles only; do not copy proprietary sprites, environments, UI, or effects.

## Source-frame audit once video frames are available

Capture representative stills from (1) idle character in environment, (2) traveling cast, (3) elemental projectile in flight, (4) enemy impact or a powerful attack, (5) a decorated environment without combat, (6) upgrade/menu UI. Where applicable, note the camera view, original rendered pixel pitch, outlines, light source, palette, animation frames, and readability.

Record a visual comparison using these objective questions:

| Property | Observe in referenced frames | WyrmForge mobile requirement |
| --- | --- | --- |
| Silhouette / proportions | How many readable body details, contrast of weapon to outfit, pose variance? | Mage recognizable at 390px; blue hood, pale collar and articulated staff persist. |
| Pixel-art craft | Consistent pixel pitch and texture, or hybrid sprites and shapes? | Authored cohesive original animation frames; no arbitrary stretched block rectangles or mixed giant procedural shapes. |
| Terrain | Materials, debris, negative space, layering, architectural evidence | Ruined monasteries and towns must look like real architecture; damaged materials rather than repeating square tiling and giant decorative rings. |
| Elemental light | How cast, flight, impact affect characters and walls | Fire/frost/storm/arcane have distinct lighting identities with visible source falloff; avoid neon wash. |
| Combat animation | Anticipation, release, recovery, recoil/hit feedback | Distinct motions and responsiveness, not a rigid mage body with overlapping decorative crescents. |
| Focus Surge | How power is communicated by **shape and timing**, not only brightness | Rank/Surge changes silhouette and timing/lighting; avoid blocking visibility or unrelated full-screen geometry. |
| Readability | Player/enemy separation in a dense battle and tiny viewport | Actual projectile/enemy tells stand out; calm negative space around player. |
| UI | How actions, selected spells, upgrades and goals look in one glance | Picture-first + very short label; one major action, no long text stacks or mandatory scrolling. |

## WyrmForge issues already confirmed by actual user iPhone captures (not from the Battlemage link)

- Previous mage appeared very small and nearly static, with flat blue block geometry even after initial authored frames.
- Oversized purple ritual arcs and repeated paving overshadowed the character and enemies. The clutter-removal iteration reduced them, but does not prove coherent authored environment art.
- Player requested spells illuminate mage, staff, nearby enemies, masonry and terrain with school-specific light; a bounded Canvas2D prototype exists on `main`.
- The user prefers dark, weathered Diablo I/II atmosphere, with consistency across mage, ruined masonry, wet forests and protected city.

## Proposed original-art vertical slice after visual reference verification

1. Establish one source-verified art board: palette/materials/pixel pitch, silhouette targets, three lighting frames, UI motif. Obtain user acceptance.
2. Redraw **one** mage idle + wind-up + release + follow-through + impact reaction as one consistent original sprite sheet. Avoid replacing all schools at once.
3. Redraw **one** ruined-monastery tile/prop set as physically plausible architecture with quiet playable space.
4. Make Fire Bolt Rank I, Rank II, and Surge visibly different while lighting the authored sprite, wet stone, nearby props and enemies.
5. Test on actual iPhone Safari and browser pixel snapshots for silhouette readability and VFX coverage in 390px viewport. Keep live `main` unchanged until acceptance.

**Open dependency:** obtain accessible video frames or screenshots from the exact user link, or user-connected video-analysis capability, before attributing any actual visible property to “Battlemage.” Until then, this is a carefully scoped inspection/implementation plan, not a completed visual review.
