# Wyrmforge

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.62 — Roguelike Draft

0.0.62 turns level-up rewards into a structured run draft. The Arcane Web defines the build you intend to pursue; the Wyrmrealm now decides what opportunities actually appear.

### Three draft directions

A normal three-card level-up is deliberately composed instead of being three unrelated random rewards:

- **Reinforce** deepens a spell or upgrade that already fits the current build.
- **Converge** follows route attunement, surfaces a ready Synergy, or helps complete a nearby spell interaction.
- **Venture** offers a spell from an unrepresented school and becomes the deliberate pivot/wildcard slot.

The draft still uses weighted randomness. These roles shape the candidate pools without making every run deterministic.

### Rarity and build awareness

- Choices now carry explicit Common, Uncommon, Rare or Legendary rarity.
- New spells are Uncommon.
- Spell upgrades that reach rank III/mastery are Rare.
- Behavioral runes such as Multicast, Frost Touch, Chain Spark, Arcane Echo, Emberbrand and Static Charge are Rare.
- Completed spell combinations surface Synergies as Legendary Converge choices.
- Resonance biases spells, Synergies and school-aligned runes without hard-locking the player into one school.
- Route attunement directly influences the Converge slot.
- Recently offered rewards receive a soft weight penalty for two drafts, reducing repetitive level-up screens without hard-banning small pools.
- Forge Mastery still controls which secondary spells can enter the run pool.

### Readable decisions

Each reward card now exposes:

- its draft role;
- rarity;
- reward type;
- current/next rank;
- concrete stat or behavior delta;
- a contextual hint explaining why the choice is relevant.

Hints call out route attunement, ready Synergies, spell choices that complete Synergy requirements, and deliberate school pivots.

The old reward text also received a correctness pass: all eight spells and all twelve runes now show their own actual upgrade deltas.

## Current top-level flow

**Run → Build → Forge → Codex**

- **Run** is the home screen and entry point into the Wyrmrealm.
- **Build** is the 49-node Arcane Web used to define pre-run intent.
- **Forge** owns secured Essence, lineage discoveries, Forge Mastery and Wyrm Offerings.
- **Codex** owns discovery/reference information for Synergies, spells, relics and Wyrms.

Mobile uses bottom navigation and safe-area-aware layouts. Desktop uses a persistent navigation rail and wider contextual surfaces.

## Current run loop

A run begins from an allocated Arcane Web and optional forged Wyrm Offering.

Inside the Wyrmrealm the player:

1. chooses routes and route attunements;
2. drafts temporary spells, runes, upgrades and Synergies;
3. adapts the intended build around what the run actually offers;
4. builds Resonance and attracts Wyrms;
5. hunts Wyrms and harvests body-part Essence;
6. chooses whether to extract secured value or descend into greater risk;
7. completes finite depth trials and can continue toward stronger encounters;
8. returns secured Essence to the Forge only after successful extraction.

Run progression is temporary. Forge progression is persistent and primarily horizontal: it unlocks more possible future builds rather than a permanent stat treadmill.

## Current systems

- 49-node Arcane Web with 24 points, hybrid paths, Masteries and Keystones.
- 8 spells across Fire, Frost, Storm and Arcane.
- 12 temporary run upgrades.
- 8 relics.
- Status/interactions including Burning, Frozen, Chilled, Shocked and Arcane Mark.
- Cross-spell Synergies and Resonance.
- Four enemy archetypes and threat-budget encounter composition.
- Branching Wyrmrealm routes, modifiers, hazards and rare route nodes.
- Four difficulty depths with finite trials.
- Four Wyrms: Ashfang, Stormcoil, Rimeclaw and Voidweaver.
- Essence Vault, Arcane Codex, four Forge lineages and 12 Forge Masteries.
- Seeded runs, replay support, run summaries and Combat Lab tooling.

## Roadmap from here

- **0.0.63 — Run Flow & Reward Moments:** make level-ups, Wyrm kills, Essence harvests, rare nodes, Synergy activation and extract/descend decisions feel like deliberate game moments.
- **0.0.64 — Fun Ugly Gate:** judge the complete loop on repeated mobile and desktop playtests before starting serious visual production.

## Technology

Wyrmforge has no paid runtime libraries.

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through thin JavaScript rendering/input adapters
- MSTest
- GitHub Pages

Gameplay rules remain in C# Domain/Application code. JavaScript handles Canvas rendering, input, diagnostics, Arcane Web viewport interaction and browser storage only.

## Local development

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
dotnet run --project src/Wyrmforge.Presentation.Web/Wyrmforge.Presentation.Web.csproj
```

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Mobile input and responsive layout are first-class requirements.
3. New content must create decisions or combinations, not merely inflate a list.
4. Domain and Application remain independent of browser/rendering concerns.
5. Persistent progression widens future possibilities rather than creating a mandatory permanent-stat treadmill.
6. Pre-run power comes from connected Arcane Web pathing and opportunity cost.
7. Run drafts should present competing intentions, not three equivalent random cards.
8. Route choices should influence later decisions as well as the immediate encounter.
9. Extraction converts survival into a decision; secured loot requires successful extraction.
10. Stop at assessment milestones and improve cohesion before expanding the feature surface again.
