# Hollow runtime integration — 20 October 2026

Implementation checkpoint: the owner accepted all three eight-direction art exports and authorized runtime integration, push, merge and GitHub Pages deployment. Current main was merged into the task branch, preserving concurrent town and Divine magic changes.

Runtime assets are exact approved atlas bytes under `wwwroot/art/enemies/hollow-rigged/`, with a small hashed manifest. Editable Blender sources, individual frames, authoring scripts and historical candidates remain under `art/source/enemies/hollow/rigged-poc/`.

`hollow-sprites.js` adapts only enemy kind 0. Actual displacement advances the 16-frame walk by its authored stride distance. Eight facings use real source rows with small heading hysteresis. Contact with the player starts the 16-frame claw, locks its visual facing and recovers; this is presentation only. No new damage events, cooldown, movement, collision, simulation states or save changes are introduced. The existing C# contact-damage behavior remains authoritative.

Real identity-bearing death bursts create a 24-frame collapse, then a held corpse. The death lasts two seconds, holds until age three, and fades by age four; the corpse cache is capped at 96 and stale living state is pruned. No disappearance/despawn can create a corpse. Death takes precedence over attack. Pause and freeze stop clip time; reduced motion uses static representative frames. Enemy Lab now exposes its pause to the renderer correctly. Loading failures retain existing painted/native fallback art and other enemy kinds are unchanged.

The 96px walk cell draws at 93 world units and pivot 48,72. Padded 128px attack/death cells draw at 124 units and pivot 64,88, preserving identical pixel density. Canvas smoothing is disabled. Frozen/hit flashes tint the same geometry without fabricating a missing hurt clip.

Validation so far: 10 focused JavaScript tests passed (including six new Hollow tests), 333 Domain and 511 Application C# tests passed, and the Release web publish succeeded. New actual-combat browser coverage checks movement, contact attack and a fully held death at 390px. Browser evidence, final CI status and deployment verification are pending at this checkpoint; this document will be updated before merge/deployment completion is claimed.
