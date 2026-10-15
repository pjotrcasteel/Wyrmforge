# Dynamic spell lighting — mage and environment

**Direction:** spell animation must feel physically present in the ruined world. Each cast, travelling projectile, impact and fourth Focus Surge casts local color onto surrounding terrain, buildings, monsters, and the approved slate-blue mage. No constant screen glow, hit-location guesswork or free extra attacks.

## Lighting sources
All sources are built from read-only C# render snapshots; lighting does **not** feed into collision, health, enemy AI, spell schedule, loot, or RNG.
- Cast: center displaced toward real cast angle (staff side). Light fades through cast progress.
- Projectile: small moving radial spill at actual projectile coordinates, ranked.
- Impact: stronger, short-lived pool at real collision, ranked.
- Focus Surge: 1.4× source strength and +42 world-unit radius. Does not add projectiles.
- Frostfire: warm inner/icy outer colors on one actual combined source.
- Fire: slightly irregular orange flicker; Frost: steady crisp blue; Storm: short ochre-white flash; Arcane: slow violet breathing. Reduced motion fixes temporal oscillation without removing readable school color.

## Presentation and performance
Two bounded world-space passes: brighter diffuse spill over *actual* terrain and masonry; faint response over enemy silhouettes. The mage separately receives directional side-light on hood, cloak, collar and staff without a permanent aura or silhouette ring. Both passes are screen-composited gradients with steep falloff, not an additive full-screen shader. **Maximum six lights** per frame, with culling for the active camera. The render path is pure visual state and supports an unchanged seeded simulation.

## Acceptance
- Unit tests verify C# snapshot family/level/surge identity is respected, brightness/radius follow masteries, deterministic reduced-motion and six-light cap.
- Playwright at 390px verifies actual painted pixels on ground and mage with different colors and stronger Surge (not only successful JS invocation).
- Compare fresh (240 and 600 seconds) and established (720 seconds) seeded hunts: all gameplay metrics should be identical before/after.
- Authored mage pixel sprite sheets and GPU/light occlusion may be future improvements. This is a lightweight, production-compatible Canvas2D lighting pass.
