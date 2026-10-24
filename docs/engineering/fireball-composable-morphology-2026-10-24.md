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

## Third technical checkpoint — authoritative ignition for things under ground fire

**New owner requirement (24 October):** the orange ground circle is an interim visualization, not the desired effect. A burning area must interact with the physical ground/objects UNDER its footprint and ignite suitable materials. A future renderer must depict actual scorched/ignited materials, not paint a circle above them.

### First implemented gameplay slice: existing world props
- `RunSimulation.UpdateBurningGrounds` asks the actual `ArenaEnvironmentState` to ignite props overlapping each currently active C# zone, using the simulation's world units (not the 320/390 viewport scale).
- Ignition only applies to already-existing flammable prop kinds (`barrel`, `crate`, `stump`, `fallen-log`, `dead-tree`, `pine`, `broken-cart`), rejects solid stone/frozen props/other decoration and respects existing sealed world barriers.
- Ignited objects own their remaining burning time/damage progression, even after the Fireball ground zone expires. They are not re-lit every frame; no random number or new loot mechanism is introduced. Destroyed barrels/crates use the **same existing** physical salvage drops once.
- `ArenaPropRenderSnapshot.BurningSeconds` is additive and allows a future *approved* material-layer painter and single GPU light to show the burning object correctly. This checkpoint does NOT overlay orange rings, add fire sprites, or alter the existing screen renderer.
- Verified with deterministic application tests for ignition, propagation-free fuel progression, existing single-drop ownership, unlit stone and distant props.

### Deliberate remaining gaps
- The live game does not yet have C#-authoritative surface/material polygons for every existing ground pixel; WetForest ground patches are currently generated for the lab and include puddles, leafbeds, moss, mud and clearings. Do **not** invent fire on random floor swatches. Next, establish typed world-space flammable ground surface IDs/coverage and material transitions, and prove water/stone stop burning while dry leafbed catches.
- Fire should not spread without limit or through sealed obstacles. Prop-to-prop spread, vegetation fuel exhaustion, aftermath/decal persistence and physical iPhone frame budgets are later bounded simulation/visual slices, not claimed now.
- Integration of burning object emission and physically coherent environmental illumination waits for the universal GPU light engine PR #332. No new bespoke lighting renderer is permitted.

### Wet Forest material contact proof (lab-only, not production cutover)
- `ArenaGroundFireState` uses the pre-existing seeded `HuntArenaGenerator.WetForestRecipe.Ground` patches that already drive Wet Forest lab painting. **Only uncovered dry `leafbed` patches are fuel**; puddles, moss, mud and clearings have no fuel records.
- A real C# ground burn can ignite such a patch in world coordinates; leaves continue burning independently and retain a charred state after fuel runs out. `ArenaEnvironmentRenderSnapshot.GroundScorches` exposes source patch IDs and material footprint for future approved visuals, without new Canvas drawing.
- This bridge is deliberately enabled **only for the existing Wet Forest generator lab**, where the seeded physical material recipe actually exists. Ordinary Hunt scenery does not yet share a full C# terrain material map, so do not claim every grass pixel ignites or draw invented scorch under a mismatched backdrop.
- The future unified renderer (#332) must match each approved albedo/material patch, cutout/normal/roughness map, fuel contact/char state and real emitter, proving wet puddle remains unlit/nonflammable and dry leaves burn and extinguish at 320/390px in-engine.

## Fourth checkpoint — restore playable Fireball mutation focus (24 October 2026)

This checkpoint returns the PR to the **four currently playable** Tier-I mutations after the material/ignition branch work. The six remaining candidates are still research previews only.

| Equipped mutation | C# gameplay source | Art/phase handoff |
| --- | --- | --- |
| Meteor Heart | Firebolt speed ×0.75, body/collision radius ×1.45, direct damage ×1.15 | Frozen projectile mutation mask; approved heavy-body art remains to be authored |
| Cinder Needle | Firebolt speed ×1.4, body/collision radius ×0.72, direct damage ×0.70 | Frozen projectile mutation mask; legacy separate `SpellId.CinderNeedle` stays unaffected |
| Detonation | Actual C# splash with independently amplified radius; no persistent damage zone created at Rank I | Real impact event carries exact projectile mutation mask and authoritative `SplashRadius` |
| Scorched Earth | Persistent damaging C# ground fire at Rank I; independently affects ground fuel and flammable world props | Actual `BurningGroundRenderSnapshot` carries original mutation mask and real radius/lifetime |

**Important mechanical fix:** Scorched Earth's former invented radius-`8` miniature damage splash has been removed. The ground field now uses its own authorization; combinations with Detonation retain Detonation's real AoE. At Rank II+, an unrelated baseline Fireball ground field still occurs only when an actual qualifying splash is present. No changes to research, cast budget, elemental synergies, permanent socket progression, save IDs, or existing art paths.

**Immutable event provenance:** Each generated Firebolt projectile freezes its prepared 4-bit mask. The authoritative hit, world-wall impact and persistent hazard inherit **that particular projectile's mask**, rather than inferring current HUD loadout after the fact. Other spell identities use mask `0`. The versioned global `FireballVisualRecipe` remains available but is not a substitute for phase-local provenance.

**Regression gate:** `FireballMutatorCompositionTests` casts all 16 possible combinations of the four playable effects, asserting one signature projectile (no extra attack stream), multiplicative mechanical form tradeoffs, splash only with a real Detonation effect, Rank-I fire only with Scorched Earth, and the same mutation mask across projectile → impact → hazard. The standalone legacy Cinder Needle test verifies it does not inherit Fireball mutations. Older passive Web amplification and high-rank mastery tests remain authoritative.

**Visual approval remains outstanding.** These are mechanics and event descriptors, not replacement VFX. No rejected square/circle-based compositor has been restored. After the owner approves authored Gothic material/animation assets, connect these event-specific descriptors through universal GPU lighting PR #332 and record genuine 320px/390px game GIFs for all mutator variants.

## Fifth checkpoint — authored composition and physical Fireball source continuity (24 October)

This pass adds immutable **per-projectile** `FireballSourceId` alongside the already-frozen `FireballMutationMask`. A C# cast increments a deterministic counter for each *physical Fireball projectile*. Existing spell IDs (including standalone Cinder Needle) carry source `0`. Impact and persistent burning-ground records inherit their real projectile source ID, with no invented second cast, splash or lingering field. It is permissible for a legitimately piercing projectile to produce multiple impacts sharing its original source ID.

**Why this matters to art:** an approved renderer can now preserve the same blackened crust, ember fragments and casting identity across one projectile's actual travel, explosion and real fuel aftereffects, including in Hunts with overlapping spells. The visual effect must follow the authoritative source/location/time; it may not synthesize a collision or hazard because a pretty sprite suggests one. Tests check all 16 legal subsets of the four playable mutations and verify *two independent Fireballs* retain separate impact and burning-ground provenance.

**24 October conceptual art review reference (not production):** one non-runnable Gothic pixel-art sheet was presented in chat, showing basic Fireball, the heavy molten Meteor Heart, the compact Cinder Needle, an impact event and fuel burning underneath nearby objects, as well as the composed Meteor → impact → ground sequence. This is a **visual direction proposal, not existing WyrmForge source art, actual screenshot, sprite frame, licensing permission or owner approval**. Do not commit it as a working runtime atlas or claim the game already resembles it.

**Original external technique references (style must remain WyrmForge's):**
- Noita, documented at https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/ — physical material response at the impact point; don't copy its falling-sand visuals or gameplay model.
- Dead Cells oil-and-fire combat screenshots, https://steamcommunity.com/sharedfiles/filedetails/?id=1187351360 — terrain and object fire is visible where it occurs; don't copy its effects, characters or sprites.
- WyrmForge canonical approved art takes precedence. Use PR #332 for lighting, normals, shadows and emitter visibility; no new light engine or Canvas geometry-overlay substitute.

### Art ownership and next implementation gate
- Baseline source: `src/Wyrmforge.Presentation.Web/wwwroot/art/fireball-ritual-hero.png`; legacy Hunt VFX remain intact.
- Awaiting **approved edited source**: velocity-aligned Fireball body animations in a consistent coordinate frame; Meteor heavy body / Cinder needle body; impact fragment motions that inherit the projectile material; actual burned-ground tiles and flammable prop state skins; separate relightable albedo, emissive, normal, depth/height and cutout material channels where applicable.
- An exporter can adapt from the existing `art/source` and `tools/sprite-lab` workflows; every art variant needs source version, explicit loop/frames/anchors, material channels and validation against real 320px/390px Hunt gameplay. A high-resolution contact sheet is **never** a substitute for low-resolution real-device test evidence.
- **No production renderer modified in this checkpoint.** The concept sheet is not checked into the branch as an art asset. Owner approval and truthful real-in-game animated GIFs remain gates.

## Sixth checkpoint — complete mutation provenance across the actual cast/hit/hazard lifecycle (24 October)

- **Verified earlier checkpoint**: all five workflows on `746478a` passed, including .NET, browser smoke, focused magic, WebKit and Gothic night.
- The `fa5f2b4` C# test run built and executed 381 Domain and 637 Application tests; the **only two failures** were reversed argument ordering in the newly written MSTest `Assert.IsGreaterThan` source-ID checks, not failures of the ID generator. `eb4eb2c` fixes those incorrect assertions.
- `13952b2`: real `CastMotionRenderSnapshot.FireballMutationMask` now comes from the exact prepared mechanical recipe for the casting staff, in addition to the projectile/impact/burning-ground snapshots. Standalone Cinder Needle, Frost etc. do not borrow Fireball mutations. This cast cue deliberately has **no physical projectile source ID**: one cast may emit several separate physical projectiles through established passives/volley mechanics, each with its own physical ID.
- `8fd969d`: the existing swept masonry collision test now fires a real C# projectile with all three mutations and explicit source ID, proving the **non-damaging wall impact** preserves identity but never invents the Detonation damage radius or persistent Scorched Earth field behind masonry.
- No new spell painter or shader has been introduced. The accepted original Nexus hero and existing Hunt pixels remain unchanged; the novel visual passes must use PR #332 and pass actual 320/390px art approval before adoption.
- **Latest CI after these corrections is a separate run**. Mark tests green only when their corresponding SHA finishes.

## Seventh checkpoint — authored asset readiness without replacing game art

- Added the standalone authoring/review manifest at `art/source/spells/fireball/manifest.json` with a deliberate **`awaiting-authored-source`** status and **no invented asset files**. The real current UI Fireball painting stays unchanged.
- `tools/art/fireball/authoring-contract.mjs` lists the 16 valid playable combinations and the authored roles needed for cast, in-flight shape, impact fragments and material-ground interaction. A Meteor Heart + Cinder Needle combination requires an **authored, approved physical hybrid body** rather than layering incompatible silhouettes.
- The five independently authored material channels are albedo, emissive, normal, height and cutout. Validation requires real editable source, stable frame anchors and world scale, actual files and owner approval. It prohibits references escaping the owned Fireball source subtree.
- The same authoring contract can examine actual C# cast, projectile, impact and burning-ground snapshots and reject inconsistent `FireballSourceId` / `FireballMutationMask` pairs. It never invents damage, hits, secondary projectiles, light or persistent fire.
- **Gameplay-authoritative gating:** an equipped Detonation does **not** imply an explosion at a world-wall contact. Only a real damaging C# impact with `SplashRadius > 0` requests Detonation fragments. Conversely the existing Rank-II baseline Fireball may own a real burning-ground area even without Scorched Earth; that actual material also needs authored ground-fire art. No visible orange circles are introduced.
- `tests/javascript/fireball-authoring-contract.test.mjs` cross-checks bit positions against C# `FireballMutationId`, enumerates all 16 roles, rejects unapproved/missing assets, verifies per-source identity and prevents phantom impacts/afterburn. The existing .NET gameplay/combination tests remain authoritative.
- `node tools/art/fireball/check-source.mjs` is an **explicit manual release check** and **must currently fail** until the real frames are produced and visually approved. CI tests that the contract works; CI must not treat missing artwork as a reason to greenlight release or sneak placeholder pixels into live rendering.
- **No production Hunt/Nexus renderer was changed**; PR #332 still owns all world-space lighting and visibility. This is an authoring validation step only, **not complete art**, and the owner must inspect genuine 320px/390px gameplay GIFs when actual new artwork exists.

## Visible ground-fuel contact correction (24 October 2026)

- The Wet Forest generator lab's C# fuel ignition previously decided whether a leafbed was exposed solely by its **centre pixel**. A later puddle covering the centre suppressed legitimate fire on an uncovered leaf rim. Conversely, a large cover over the entire patch must never permit fire on buried leaves.
- The simulation now checks a bounded deterministic contact grid in the **actual ground draw order**, excluding patches hidden by subsequent material overlays. Exposed leaf edges can ignite; fire touching only water, clearing or a later leafbed cannot ignite the buried layer. This is C# state only, not a visual shader or mutation-balance change.
- Added three regression tests using explicit two-layer material fixtures, including a leaf-over-leaf example and permanent post-burn char state. This remains **lab-only**: normal Hunt surface maps and authored world material replacement are not implemented. A six-world-unit sampling grid is conservative at subpixel intersections and will need visual verification against the eventual authored material footprint.
- Approved live art, `arena.js`, GPU lighting PR #332, real projectile lineage and five Fireball sockets remain unchanged. Captured existing real 320/390px game baseline separately; no new mutation GIF is claimed. Keep this PR **draft** until all tests, owner review and shared GPU integration pass.
