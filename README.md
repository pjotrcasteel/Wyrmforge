# Wyrmforge

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.68 — Balance Baseline Integrity

0.0.68 hardens the Balance Lab before the first gameplay tuning pass. The original baseline mixed 10-point single-Keystone routes with 23-point hybrid plans, which made cross-build conclusions misleading. Balance evidence is now split into equal-budget cohorts and every run/report records its Arcane point investment. No combat values are changed in this milestone.

### Baseline integrity

- **KeystoneRoute** compares eight single-school Keystone routes at exactly **10 Arcane points** each.
- **FullBuild** compares four adjacent two-school hybrid plans at exactly **23 Arcane points** each.
- Reports include cohort and spent Arcane points so unequal-budget comparisons are visible instead of implicit.
- Tests fail if a cohort drifts to mixed budgets.
- Balance interpretation now explicitly requires comparing builds within the same cohort and agent.
- The first 0.0.67 data remains useful as instrumentation validation, but is not used to nerf/buff builds.

### Self-play and balance instrumentation

- A public `IRunAgent` contract receives player-visible run observations and makes movement, route, draft, relic, Essence and Refuge decisions.
- Four deterministic heuristics model different play styles: Casual, Kiter, Greedy and BuildFocused.
- Six representative Arcane builds cover single-school and hybrid Keystone goals.
- `RunSelfPlayDriver` executes the real `RunSimulation` without renderer shortcuts and records kills/min, XP/min, health pressure, damage taken, level cadence, peak enemies, routes, Wyrms, Essence and decisions.
- `Wyrmforge.BalanceLab` runs build × agent × seed batches and exports JSON, CSV and Markdown summaries with medians, P90 depth and outcome rates.
- Pull-request validation produces a small balance artifact; main builds can produce a larger baseline matrix through the Balance Lab workflow.
- Playwright browser smoke runs the published Blazor app at phone and desktop sizes, checks mobile overflow, captures the Arcane Atlas and route preview, and uploads screenshots plus traces.
- A developer-only `/balance-lab` screen can run a deterministic headless trial interactively next to Combat Lab.
- 0.0.67 intentionally makes **no gameplay balance changes**; it establishes the baseline first.

### Arcane readability fixes

- Minor nodes show their effect directly inside the circle: e.g. cast speed, spell damage, vitality or projectile speed plus the value.
- Hybrid travel nodes show both minor effects as compact icon/value rows.
- Travel-node names and long descriptions no longer float over the graph, eliminating the overlap visible on mobile.
- Notables, Masteries and Keystones keep a short school icon + name on the Atlas and reveal their full effect on tap.
- Route preview now includes a **Minor bonuses on this path** aggregate before the defining landmarks.
- Intermediate Travel nodes are summarized instead of repeated as verbose route cards, making a planned Keystone path much easier to evaluate.

### Arcane planning fixes

- Tapping an Arcane node no longer spends a point.
- Any node, including distant Keystones, can be inspected before committing.
- The Atlas previews the cheapest valid connected route and its total point cost.
- Every node on the preview lists its actual effect and individual cost.
- Route allocation is explicit and atomic: either the whole planned route fits or nothing changes.
- Planned paths are highlighted separately from reachable and already-traversed paths.
- The mobile inspector is dismissible and no longer permanently covers the lower Atlas.
- Travel-node effects become visible when they are part of a planned route.
- Refuge Return/Descend comparison cards are now the actual actions, removing the duplicated choices below.

### Previous gate fix sequence

1. **Mobile Overlay Contract** — one iOS-safe scrolling model for Level Up, Relic Cache, Wyrm Harvest, Refuge and Run Summary.
2. **Experience Shards** — enemies drop physical XP that must be collected instead of granting XP directly on death.
3. **Horde Encounter Pacing** — larger encounter targets and composition-driven spawn batches.
4. **Combat Impact** — stronger kill, pickup and level-up feedback at horde density.
5. **Arcane Atlas** — bring the spatial/fantasy language of the Wyrmrealm map into the Arcane Web.
6. **Fun Ugly Gate** — repeated mobile/desktop playtests and a pass/fail decision.

The first fix establishes a shared overlay contract: the viewport layer owns scrolling, cards never create nested scroll traps, dynamic viewport height and safe-area insets are honored, and iOS momentum scrolling remains enabled.

The second fix moves XP into the battlefield. Enemy deaths now drop physical Experience Shards valued by enemy threat, shards magnetize toward the player within collection range, compact without losing XP when the loose-shard cap is reached, and remaining route XP is vacuumed before the next map decision. Level progression therefore follows **kill → collect → level → draft** instead of granting XP invisibly at death time.

The third fix replaces five-kill skirmishes with encounter-specific horde objectives. Depth-one Stalker, Mixed and Swarm trails require 12, 16 and 20 kills respectively and scale with depth. Spawning now happens in pattern-specific batches—largest for Swarm, smallest for Stalker pressure—behind a deterministic active-enemy cap that grows from 22 at Depth 1 to 52 at Depth 4. The XP curve is retuned around the larger kill volume so draft pacing does not explode with the new density.

The fourth fix strengthens combat impact without adding final art. Chasers, Rift Stalkers, Skitters and Brutes now have distinct battlefield silhouettes and colors, higher-threat enemies produce heavier death bursts, XP collection creates player-centered pickup pulses, loose shards visibly pulse, and the level-up draft has a stronger transition moment. The intent is to make pack clears and collection readable at horde density without filling the screen with damage numbers.

The fifth fix turns the Arcane Web into the **Arcane Atlas**. It borrows the Wyrmrealm map's spatial language: chart contours, elemental territories, travelled paths and landmark hierarchy. The Wyrmheart becomes the visual origin, Keystones read as destinations rather than large buttons, and mobile controls float over the Atlas instead of consuming a toolbar row. On phones the contextual node inspector becomes a compact bottom sheet above game navigation so the Web owns most of the viewport.

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

## Balance workflow

Quick validation:

```bash
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj -c Release -- \
  --runs-per-combination 10 \
  --max-seconds 720 \
  --output artifacts/balance
```

The report contains raw per-seed runs plus grouped build/agent summaries. Compare builds inside the same agent first, then inspect suspicious seeds individually; the agents intentionally value survival, tempo and risk differently.

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
