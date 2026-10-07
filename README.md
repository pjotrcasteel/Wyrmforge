# Wyrmforge

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.64 — Fun Ugly Gate Fix Pass

0.0.64 is the final cohesion pass before the Fun Ugly Gate. It does not add content breadth or final art; it focuses on mobile correctness, survivor-like combat momentum, readable pickups, horde pacing and stronger spatial game UI.

### Gate fix sequence

1. **Mobile Overlay Contract** — one iOS-safe scrolling model for Level Up, Relic Cache, Wyrm Harvest, Refuge and Run Summary.
2. **Experience Shards** — enemies drop physical XP that must be collected instead of granting XP directly on death.
3. **Horde Encounter Pacing** — larger encounter targets and composition-driven spawn batches.
4. **Combat Impact** — stronger kill, pickup and level-up feedback at horde density.
5. **Arcane Atlas** — bring the spatial/fantasy language of the Wyrmrealm map into the Arcane Web.
6. **Fun Ugly Gate** — repeated mobile/desktop playtests and a pass/fail decision.

The first fix establishes a shared overlay contract: the viewport layer owns scrolling, cards never create nested scroll traps, dynamic viewport height and safe-area insets are honored, and iOS momentum scrolling remains enabled.

The second fix moves XP into the battlefield. Enemy deaths now drop physical Experience Shards valued by enemy threat, shards magnetize toward the player within collection range, compact without losing XP when the loose-shard cap is reached, and remaining route XP is vacuumed before the next map decision. Level progression therefore follows **kill → collect → level → draft** instead of granting XP invisibly at death time.

The third fix replaces five-kill skirmishes with encounter-specific horde objectives. Depth-one Stalker, Mixed and Swarm trails require 12, 16 and 20 kills respectively and scale with depth. Spawning now happens in pattern-specific batches—largest for Swarm, smallest for Stalker pressure—behind a deterministic active-enemy cap that grows from 22 at Depth 1 to 52 at Depth 4. The XP curve is retuned around the larger kill volume so draft pacing does not explode with the new density.

### Moment feedback

Short non-blocking callouts now mark the events that should matter during combat:

- entering a Rare trail;
- learning a new spell;
- reaching a spell mastery rank;
- awakening a Synergy;
- claiming a Rare rune;
- taking a relic;
- stealing Wyrm Essence;
- successfully securing Essence;
- healing at Refuge;
- descending into a deeper layer.

Common numerical upgrades remain quiet so the important moments keep their weight.

### Wyrm harvest and extraction

The Wyrm harvest flow now makes the risk sequence explicit:

**Wyrm slain → choose Essence → hold evacuation → Refuge secures the haul**

Selecting an Essence immediately starts evacuation and clearly marks that Essence as **at risk**. Completing the ritual changes the run HUD to **secured**, making the extraction rule visible without needing prior knowledge.

### Route and Refuge decisions

- Rare route inspection explicitly calls out stronger enemies, doubled route score and the relic cache.
- Entering a Rare route gets a dedicated run moment.
- Refuge now compares **Safe Now** against **Risk Next** before the action cards:
  - return to the Forge with secured Essence;
  - or keep secured Essence safe while risking the next haul for deeper rewards.
- Descending gets a clear transition callout with the new depth.

### Run story

The end-run report now summarizes the run as a story rather than only a ledger:

- dominant build identity;
- depth reached;
- Wyrms slain;
- Synergies awakened;
- rare trails cleared;
- Essence secured.

The detailed spell, rune, relic and Wyrm sections remain available underneath.

## Current top-level flow

**Run → Build → Forge → Codex**

- **Run** is the home screen and entry point into the Wyrmrealm.
- **Build** is the 49-node Arcane Web used to define pre-run intent.
- **Forge** owns secured Essence, lineage discoveries, Forge Mastery and Wyrm Offerings.
- **Codex** owns discovery/reference information for Synergies, spells, relics and Wyrms.

## Current run loop

1. Allocate a connected path through the Arcane Web.
2. Optionally carry a forged Wyrm Offering.
3. Choose routes through the Wyrmrealm.
4. Draft Reinforce, Converge and Venture rewards.
5. Adapt the build around spells, runes, Synergies and relics actually offered.
6. Build Resonance and attract a Wyrm.
7. Kill the Wyrm and choose one Essence.
8. Survive evacuation to secure that Essence at Refuge.
9. Return safely or descend with the previous haul banked and the next haul at risk.
10. Bring secured Essence back to the Forge for horizontal progression.

## Current systems

- 49-node Arcane Web with 24 points, hybrid paths, Masteries and Keystones.
- Structured three-role roguelike level-up draft with rarity and build-aware weighting.
- 8 spells across Fire, Frost, Storm and Arcane.
- 12 temporary run upgrades.
- 8 relics.
- Status/interactions including Burning, Frozen, Chilled, Shocked and Arcane Mark.
- Cross-spell Synergies and Resonance.
- Four enemy archetypes and threat-budget encounter composition.
- Branching Wyrmrealm routes, modifiers, hazards and Rare trails.
- Four difficulty depths with finite trials.
- Four Wyrms: Ashfang, Stormcoil, Rimeclaw and Voidweaver.
- Essence Vault, Arcane Codex, four Forge lineages and 12 Forge Masteries.
- Seeded runs, replay support, run summaries and Combat Lab tooling.

## Gate target

The complete loop remains:

**Forge → Arcane Web → route choice → run draft → Wyrm hunt → Essence risk → Refuge → descend/extract → Forge**

The gate passes when the prototype is enjoyable enough that starting another run is an attractive choice despite placeholder visuals. If a pillar fails, the next milestone targets only that failing pillar instead of adding content to hide it.

## Technology

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
4. Persistent progression widens future possibilities rather than creating a mandatory permanent-stat treadmill.
5. Pre-run power comes from connected Arcane Web pathing and opportunity cost.
6. Run drafts present competing intentions, not three equivalent random cards.
7. Route choices influence later decisions as well as the immediate encounter.
8. Important state changes deserve feedback; common noise should stay quiet.
9. Extraction converts survival into a decision; secured loot requires successful evacuation.
10. Stop at assessment milestones and improve cohesion before expanding the feature surface again.
