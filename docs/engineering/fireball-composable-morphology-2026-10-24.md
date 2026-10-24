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

## Second technical checkpoint — preparing the art pipeline without affecting the live game

- **Source audit (main `5a4933f`):** `wwwroot/art/fireball-ritual-hero.png` is the current central Fireball painting; `wwwroot/art/arcane-nexus/{meteor-heart,detonation,scorched-earth}.svg` are existing mutation icons. No approved editable, morphable Fireball frame/normal/depth source sheets were identified in the Fireball-specific paths. Hollowed/Ashling's actual rigged source pipeline is a *workflow* reference, not a matching Fireball sprite to copy or reskin.
- **Production safety:** there is no additional DOM, Canvas, spell VFX, shader, sprite atlas or CSS touched by this checkpoint. Legacy `CreateFieryAreaSnapshots` remains active unchanged. Rejected `fireball-morphology.js` and preview scripts remain absent.
- **Composition semantics:** `FireballVisualRecipe` no longer chooses hardcoded `CoreShape` strings like `molten-spine`; that was unapproved artwork disguised as technical authority. Keep the recipe as immutable, versioned **identity and actual playable mutation effect presence**. The equipped-to-render projection reflects active legacy pre-Hunt effects rather than inventing a separate capacity rule; actual socket gating remains `FireballCoreState`'s job.
- **Mobile cost:** prepared visual identity is computed once whenever pre-Hunt level or mutation loadout changes, rather than reallocated every simulation render snapshot. Tests check reference stability while prepared identity is frozen.

### External production research (technique only, not reference-art permission)

- Blizzard, [Diablo IV December 2021 VFX breakdown](https://news.blizzard.com/en-us/article/23746639/diablo-iv-quarterly-updatedecember-2021): lit VFX/materials need to react to the same environment; emissive and legible important actions must not light the entire world or become brighter-than-reality overlays. Adaptation to WyrmForge: a future spell emitter will illuminate Hollowed/Ashling/terrain **through the shared GPU engine #332**, not independent screen-space compositing. **Do not copy Diablo effects, animation, audio or palettes.**
- Riot, [Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/): projectile direction, readable shape/motion, visual event importance and conservative noise all matter during combat. Adaptation: Fireball's earned mutations must be identifiable at real 320/390px Hunt scale, without making normal attacks resemble boss ultimates; actual C# area/lifetime bounds must match warnings. **Do not copy League characters, particles or spell art.**

### Next art-only acceptance milestone (NOT IMPLEMENTED OR APPROVED)
1. Find or author editable source sheets for baseline Fireball body at in-world scale, matching approved Gothic materials and the existing mage's actual cast anchor, plus explicit separate source frames for impact and persistent hazard. If absent, record missing editable source rather than generating new unapproved materials.
2. Author separate diffuse/emissive/normal/depth/cutout sheets for each **approved and playable** mutation, not color overlays; ensure combined forms read as one body. Asset authoring stays isolated and requires user art review.
3. After the GPU engine supports spell emitters and receivers, record unedited real in-engine GIFs from 320/390px **Hunt** against real Hollowed/Ashling and nearby ground; separately verify Nexus at the same size. Approve base before composite. Do not wire any new art into live rendering before signoff.
