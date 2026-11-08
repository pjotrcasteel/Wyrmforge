# Bell Warden slam art – provenance and integration

The owner supplied \`FX (2).zip\` on 7 November 2026. Source pack: PVFX Foundry 1.0, strict pixel tier.

- \`effects/impacts/ground-slam/strict/grid/sprite-sheet.png\`: 19 authored frames, 128×64, eight frames per row, 70 ms per frame, pivot (64,44).
- \`effects/impacts/rock-shatter/strict/grid/sprite-sheet.png\`: 18 authored frames, 64×56, eight frames per row, 60 ms per frame, pivot (30,44).
- Bundled \`LICENSE.txt\`: commercial use, recolouring and modifications permitted; no attribution required.
- Output: \`bell-warden-slam-atlas.png\`, an indexed 16-colour PNG combining both complete animations without regenerated motion, stretching, added frames or frame removal; the second row group starts at y=192.
- Use: a cosmetic centre impact only at the existing C# Bell Warden smash event. The existing warning circle and exact 26-unit expanding collision-band visual remain authoritative.
- \`ageSeconds\` and \`z\` come from simulation snapshots, preventing false impacts and ensuring 2.5D raised-ground alignment. The lossless WebP decodes pixel-identically to the source PNG and is loaded once per app runtime.
- VFX does not modify health, collision, projectile/terrain physics, light emitters or tile revisions.
- Reduced-motion preference uses a single frame and no shatter animation.

Never publish the original third-party pack as a standalone download. Keep manifests and source ZIP in the owner's source material, not the game's runtime.
