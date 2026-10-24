# Fireball composable morphology — implementation checkpoint (24 October 2026)

Status: **draft PR #336**, not shipped. Authority: [canonical Magic & Combat](../canon/magic-and-combat.md) and [Art & Animation](../canon/art-and-animation.md). This document is implementation evidence, not a new design specification.

## Reused systems
- `FireballCoreState`: owns research, Lv.1–5 real sockets, saved equipped mutations and upgrade spending. No changes to its schema or rules.
- `RunSimulation.Fireball.cs`: owns which effects are active and snapshots prepared Web amplifier factors. Unchanged combat calculations and legal target/hit behavior.
- Existing `SpellBlueprint` validators continue to govern their **different** Form/Infusion/Reaction composition domain; this PR does not reinterpret those seats as Fireball slots.
- Nexus retains existing approved layout, mutation research cards, sockets, material counts and contextual lower panel.

## Implemented in this draft
- `FireballVisualRecipe`: stable, versioned C# **presentation projection** from real Fireball mutations, with deterministic bit identity, resolved physical core shape, and explicit detonation/ground-fire descriptors. Only implemented catalogue entries may contribute.
- `RunRenderSnapshot.FireballVisual`: one recipe for prepared Fireball identity. Existing per-projectile and per-impact C# positions, angles, ranks, and real collisions remain authoritative. Cinder Needle's legacy standalone `SpellId.CinderNeedle` must **not** inherit Fireball's unrelated equipped mutations.
- `fireball-morphology.js`: **same** pixel-art drawing for Nexus core and Fireball projectiles. Meteor Heart forms fractured volcanic rock, Cinder Needle condenses flame, both together get an explicit dense molten-spine shape; Detonation adds pre-impact fissures and fragments, while Scorched Earth visibly sheds molten bits. No independent extra casts.
- `BurningGroundRenderSnapshot`: actual hazard radius and remaining seconds from C# instead of collapsing ground fire into fake 0.2-second `EssenceBurst` pulses. Paints jagged, bounded ground fractures while the field really exists.

## Deliberate non-goals and risks
- The **combat execution pipeline has not been rewritten** as a generic interpreter: existing C# mutation arithmetic remains the truth. This PR connects one presentation projection to it.
- Impact fracture size is art guidance; actual Detonation/AoE radii are authoritative only in C#. A later snapshot extension will be needed if we render exact explosion perimeter/telegraphs.
- New Fireball art is a **procedural draft**, not owner-approved animation/source art. Review the actual live Nexus, gameplay and 320/390px captures before replacing the art canon.
- This PR does not implement Phoenix Volley, Piercing Ember, Seeker Ember, Wildfire, Ash Harvest, Ember Recall, or any hybrid. It never renders them as usable.
- The generic GPU lighting engine is being developed in **PR #332**. This PR touches no GPU shaders, scene light registries, G0–G1 validation geometry or actor atlas assets. Adding gameplay-sourced burning-ground emitters to that engine belongs to **G2**, after integration with #332. Do not create a new `FireballLightingEngine`.
- Browser display, real iOS/Android readability and GPU material/depth acceptance are still pending.

## Acceptance checklist
- [ ] Validate Wyrmforge (.NET Domain/Application and browser build)
- [ ] JavaScript unit tests including `fireball-morphology.test.mjs`
- [ ] Browser smoke and Arcane WebKit
- [ ] 320x568 and 390x844 Nexus core and actual Hunt screenshots inspected
- [ ] Shared G2 emitters integrated when #332 reaches supported integration gate
- [ ] Physical device and owner art sign-off

## Rollback and compatibility
New fields are additive and consumers may ignore absent `fireballVisual` / `burningGrounds` snapshots. Saves, research ownership, Web assignments, current materials, permanent signatures, game simulation, town visuals, Hollowed/Ashling and mage art are unchanged. Existing standalone Fireball source artwork stays in Git.
