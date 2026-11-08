# Hollowed H2 — confirmed damage impact

Source: user-supplied `FX (2)(1).zip`, PVFX Foundry strict grid
`effects/impacts/blood-splat/strict/grid/sprite-sheet.png`.
License: PVFX Foundry **CC0 1.0 Universal**. Credit: PVFX Foundry / Pixel VFX Studio.
Source SHA-256: `0de76e0a0aaece15f5c2ea7547542c34007d482b7eea846594377bc318b993f4`.
Runtime SHA-256: `9a58b3feaf8e3f2cb087f0588f138372f02fbfda9276d529c02a42ebcf38c805`.

The first eight authored frames are downsampled nearest-neighbor from 128×120 to
64×60 and recolored strictly to the existing Hollowed-claw six-color gothic
palette. No effects or pixels were procedurally invented. The lossless 4-bit indexed
PNG is 2.4 KB; its hit strip is 512×60.

**Authoritative trigger:** `DamageNumberRenderSnapshot.TargetId` identifies the
enemy that actually lost health; `IsDragon` excludes boss ID collisions.
C# supplies `Heavy`, `Finisher`, `Periodic`, `Amount`, and `Progress`.
The JS runtime does not infer crits/hits/damage from contact, hit flash, timing
or the mage's animation; it excludes blocked and periodic damage. Normal burst
is 0.28s, heavy/finisher 0.36s, reduced motion one static frame. Up to two
bursts per live enemy are drawn at actor depth before terrain occlusion.
A dead Hollowed's full-body death effects remain H4 work.

Lab: `/enemy-lab?kind=Hollow&count=3&autoplay=false&cast=true`.
Use **Hollowed damage VFX** on/off with the same seed; **Autocast** must be
enabled for the mage to damage enemies. Check one enemy, eight enemies, and
on-device 320px/390px. Main's visual effects are for direct confirmed hits
only. No change to combat damage, collisions, terrain, loot, or animation
authoring.
