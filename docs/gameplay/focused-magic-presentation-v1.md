# Focused magic presentation — live vertical slice

The gameplay owns one active primary cast; this layer gives that cast a visible gesture and a readable projectile while leaving the character art unfinished.

- Simulation snapshots expose the latest non-echo primary cast: position, aim angle, spell ID, rank, selected combination and normalized cast progress. Its duration (360/440/520ms at ranks I/II/III) is **presentation only**. It changes no cooldown, movement speed, damage, invulnerability or projectile trajectory.
- Render snapshots additionally expose each projectile's actual travel angle. Animation uses that angle, not a guessed target.
- Casts draw a widening, purposeful sweep for Fire; a direct crystalline thrust for Frost; a whipping angular discharge for Storm; and a broad asymmetric crescent for Arcane.
- Frostfire retains **one** Fire or Frost host projectile, with a blue shell around a hot core. Its cast cue layers the two motions once. No second independently scheduled attack.
- Earned rank raises actual cast gesture reach. Real projectile radius grows from the rank-based simulation rules already present. No purely cosmetic rank damage changes.
- Reduced-motion preference removes moving sweeps and scales the cast cue without suppressing gameplay.
- Until final mage artwork is approved, these cues sit over the existing placeholder. They are not final sprite animations or finished pixel-art assets.

Validation: JavaScript shape/identity/drawing smoke tests and application regression for the snapshot's focused spell + combination. GitHub Actions must validate before merging draft PR #107.

Next: grounded authored mage animation frames consistent with the white-robed silhouette, spell-specific recoil and release poses, plus browser/human combat readability review on iPhone and desktop.
