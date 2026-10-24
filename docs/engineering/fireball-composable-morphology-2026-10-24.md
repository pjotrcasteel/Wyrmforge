# Fireball composable mutations — technical-only checkpoint (24 October 2026)

**Status: DRAFT PR #336 — ART ROLLED BACK. Not merged.**

## Source of truth
- [Magic and combat](../canon/magic-and-combat.md): existing five physical Fireball mutation sockets, research and real combat effects.
- [Art and animation](../canon/art-and-animation.md): Gothic art, world-space material/light/shadow interactions. User-facing visual quality is a release gate.
- Shared universal GPU lighting is being developed separately in PR #332. **Never** build a second independent lighting system.

## Retained technical foundation
- `FireballVisualRecipe` projects the actual equipped playable mutations into a deterministic, versioned identifier, explicit physical shape and flags. Does not change saved state, economy, cast timing, damage or hit rules.
- `RunRenderSnapshot.FireballVisual` exposes the prepared visual recipe without modifying existing snapshot consumers.
- `BurningGroundRenderSnapshot` reports authoritative C# zone radius, position and remaining lifetime **additively**, while the existing `CreateFieryAreaSnapshots` presentation remains byte-for-byte unchanged to preserve legacy burning-ground appearance.
- `ElementalImpactRenderSnapshot.SplashRadius` carries real C# projectile blast radius; non-damaging wall contacts do not invent splash.
- Domain and Application regressions for composition and hazard identity remain.

## Production rendering explicitly restored
The first visual prototype was rejected after actual Nexus and 320/390px GIF screenshot review: flat blocky Fireball anatomy, tiny cartoon-like preview effects, over-simple cracked ground and poor Gothic style cohesion. **None of this is acceptable as WyrmForge art.**

To protect approved live artwork, this checkpoint restores `FireballRitualView.razor`, its styles, `arena.js`, `arena-spell-vfx.js`, `arena-fire-pixels.js` and the established browser acceptance test **byte-for-byte to main**.

The unapproved `fireball-morphology.js`, `fireball-preview.js`, and accompanying prototype JS tests are removed from the branch entirely. They cannot render in Town, Nexus or Hunts. The separate G0–G1 light-engine PR #332 is untouched.

## Art acceptance gate before any new production wiring
1. Review canonical Hollowed/Ashling actor assets and the actual in-game original Fireball source, current lighting integration requirements, material taxonomy and mobile pixel scale.
2. Design a coherent authored Fireball body and mutation effects as editable pixel art/material assets, not generated canvas rectangles or CSS color filters. Use a single physical body that morphs by effects and real event phases.
3. Show **recorded in-engine GIFs** for base, Meteor Heart, Detonation, Scorched Earth, Cinder Needle, and the combined Meteor + Detonation + Scorched result, at 320px and 390px, in both Nexus and actual Hunt against existing characters/terrain. Never present standalone mockups as in-game proof.
4. Get explicit visual approval **before** binding a new renderer into production paths. Keep experimental art behind a lab-only route in another workstream if necessary.
5. Integrate real GPU emitters/materials/occluders through the existing engine at its integration milestone, rather than a second lighting workaround.

**Do not merge until new visual direction is approved, tests are green and the game is visibly no worse than baseline.**
