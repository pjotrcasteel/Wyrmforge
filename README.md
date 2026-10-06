# Wyrmforge

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.63 — Run Flow & Reward Moments

0.0.63 makes important run events read like game moments instead of silent state changes. It is still a fun-ugly milestone: hierarchy, pacing and feedback are the work here, not final illustration or VFX.

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

## Next milestone

**0.0.64 — Fun Ugly Gate**

No new major system is planned before the gate. The next step is repeated mobile and desktop playtesting of the complete loop:

**Forge → Arcane Web → route choice → run draft → Wyrm hunt → Essence risk → Refuge → descend/extract → Forge**

The gate passes when the prototype is enjoyable enough that starting another run is an attractive choice despite placeholder visuals.

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
