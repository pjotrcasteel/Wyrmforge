# Legion Breaker / Battlemage — exact source art reference

**Exact player-selected video:** https://www.youtube.com/watch?v=WePyhtxZ4t0

**Identity verified through YouTube metadata (vidIQ):** the video is titled *Highly Anticipated BATTLEMAGE Incremental is Here and It's Great!* by **Idle cub**, published 2026-10-14, runtime **2h44m55s**. Its subject is **Legion Breaker**, by Baffled Engineer, released October 13, 2026 on Steam: https://store.steampowered.com/app/4425980/Legion_Breaker/

**Visual verification status:** full source-video visual analysis initiated through vidIQ; timestamped findings must be added only after the visual result completes. The name *Battlemage* describes the player fantasy and is used in the video headline, not the game's proper title. Do not substitute assets or screenshots from any other game with a similar name.

**Grounded public design context:** Steam and the developer characterize Legion Breaker as *pixel graphics*, a 2D active incremental wizard-vs-undead game with handmade sprite art, distinct battlefields, many concurrent troops/enemies, powerful spells and a large skill tree. Developer notes identify a May visual-overhaul release and a June upgrade-screen clarity release. These are documented facts about the product, **not frame-by-frame observations from the user's video**. Its short 3–4 hour campaign and incremental auto-battler structure are *not* the target WyrmForge game loop.

Use Legion Breaker as the preferred **art/readability** benchmark, while retaining WyrmForge's manually traversed dark Diablo-influenced roguelite world, one committed primary, combinations, 100+ meaningful hunts, and spell-lit architecture. Borrow abstract art-direction principles, not copyrighted sprites, interface composition or VFX artwork.

## Source-frame audit — pending the full gameplay walkthrough

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

**Open dependency:** obtain the timestamped visual walkthrough from the connected vidIQ video-watching job before treating any observed look as verified. Identity and source are now confirmed; detailed graphics must be described only from the source visuals. No live-game changes made.
