# Wyrmforge

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.60 — Game Shell

0.0.60 turns the existing prototype systems into a cohesive game-facing shell without changing combat balance or starting the art pass.

The current top-level flow is:

**Run → Build → Forge → Codex**

- **Run** is the home screen. It summarizes the prepared build and selected Wyrm Offering and makes **Enter Wyrmrealm** the dominant action.
- **Build** contains the current pre-run passive system. It is intentionally preserved for 0.0.60 and will be replaced by the graph-based **Arcane Web** in 0.0.61.
- **Forge** owns persistent progression: secured Essence, lineage discoveries, Forge Mastery and Wyrm Offerings.
- **Codex** owns discovery/reference information for synergies, spells, relics and Wyrms. Combat Lab remains available as a developer tool rather than primary game navigation.
- Mobile uses bottom navigation and safe-area-aware layouts. Desktop uses a persistent navigation rail and wider contextual surfaces instead of stretching the mobile layout.

## Current game loop

A run begins from a prepared Arcane Build and optional forged Wyrm Offering.

Inside the Wyrmrealm the player:

1. chooses routes through short combat encounters;
2. gains temporary run rewards, spells, upgrades, relics and synergies;
3. builds resonance and attracts Wyrms;
4. hunts Wyrms and harvests body-part Essence;
5. chooses whether to extract secured value or descend into greater risk;
6. completes finite depth trials and can continue toward stronger encounters;
7. returns secured Essence to the Forge only after successful extraction.

Run progression is temporary. Forge progression is persistent and primarily horizontal: it unlocks more possible future builds rather than a permanent stat treadmill.

## Current content and systems

### Combat and build systems

- 8 spells across Fire, Frost, Storm and Arcane.
- 12 run upgrades including additive, multiplicative and rule-changing effects.
- 8 relics.
- Status and interaction engine for effects such as Burning, Frozen, Chilled, Shocked and Arcane Mark.
- Central build modifier and combat rule engines.
- Cross-spell synergies and Resonance.
- Auto-cast combat with spatial collision indexing and decoupled simulation/render loops.

### Enemies and encounters

- Chaser, Rift Stalker, Skitter and Brute enemy archetypes.
- Threat-budget-based encounter composition.
- Encounter modifiers and hazards.
- Branching Wyrmrealm route map.
- Four difficulty depths with escalating enemy, hazard, route, score and Wyrm pressure.
- Finite depth trials rather than unsupported endless depth.

### Wyrms

- Ashfang — Cinder Wyrm.
- Stormcoil — Tempest Wyrm.
- Rimeclaw — Glacier Wyrm.
- Voidweaver — Aether Wyrm.

Each Wyrm has its own movement profile, attack geometry, pressure pattern and Essence rewards.

### Persistent progression

- Essence Vault.
- Arcane Codex discoveries.
- Four Forge lineages: Ashcraft, Stormcraft, Rimecraft and Voidcraft.
- 12 Forge Mastery nodes, three per lineage.
- Forge Mastery unlocks future-run offerings, secondary spells and lineage relics.
- Best score and progression persist in browser localStorage.

## Roadmap from here

The next milestones are deliberately focused on the missing roguelite/build identity rather than final art:

- **0.0.61 — Arcane Web:** replace the current vertical passive lists with a Path-of-Exile-inspired graph of travel nodes, notables, masteries, keystones and cross-school routes.
- **0.0.62 — Roguelike Draft:** refine temporary in-run progression into a coherent draft with weighted choices, pivots, synergies, rarity and build-aware reward pools.
- **0.0.63 — Run Flow & Reward Moments:** improve the UX/game-feel of level-ups, Wyrm kills, Essence harvests, rare nodes, extraction and synergy activation.
- **0.0.64 — Fun Ugly Gate:** judge whether the complete loop is fun enough to deserve the real visual production pass.

## Technology

Wyrmforge has no paid runtime libraries.

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through a thin JavaScript rendering/input adapter
- MSTest
- GitHub Pages

Gameplay rules remain in C# Domain/Application code. JavaScript handles Canvas rendering, input, diagnostics and browser storage only.

## Architecture

The codebase follows Onion Architecture with feature-based grouping inside each layer.

- **Domain** owns reusable gameplay state, definitions and rules.
- **Application** owns run orchestration, progression, navigation, encounter composition and combat simulation.
- **Infrastructure** owns external/runtime implementations.
- **Presentation** owns Blazor composition and the thin Canvas/input adapter.

Folders represent cohesive game concepts rather than broad technical dumping grounds such as `Services`, `Managers` or `Models`.

## Local development

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
dotnet run --project src/Wyrmforge.Presentation.Web/Wyrmforge.Presentation.Web.csproj
```

## Demo deployment

Pushes to `main` restore, build and test the solution, publish the Blazor WebAssembly app and deploy it through GitHub Pages.

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Every milestone adds one meaningful pillar rather than ten shallow systems.
3. Mobile input and responsive layout remain first-class requirements.
4. New content must create decisions or combinations, not merely inflate a list.
5. Domain and Application remain independent of browser, rendering and future mobile hosts.
6. Dragon rewards must change how a run plays, not merely add another percentage stat.
7. Combat feedback should explain impact without requiring health bars or damage numbers.
8. Extraction converts survival into a decision; secured loot requires successful extraction.
9. Knowledge and loot are different persistence concepts: Codex discoveries may survive any outcome, essences may not.
10. Deeper depths must change play and provide a finite objective before another depth is exposed.
11. Performance is measured before invasive optimization, and gameplay density is preserved by reducing algorithmic work first.
12. Permanent resources only become spendable through explicit recipes; adding a resource must not silently expand every economy.
13. Wyrmrealm progression should be visible as route state; bosses should be reached through player-visible progress rather than hidden timers.
14. Persistent progression should primarily widen future possibilities rather than create an unavoidable permanent-stat treadmill.
15. Stop at assessment milestones and improve cohesion before expanding the feature surface again.
