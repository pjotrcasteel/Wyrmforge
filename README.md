# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. Mechanics and architecture come before visual fidelity.

## Prototype 0.0.7 — Dragon Essence

The current playable slice contains:

- responsive arena combat for desktop and touch;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- XP, runes, spell learning/upgrades and cross-spell synergies;
- four spells: Arcane Orb, Fire Bolt, Frost Shard and Chain Lightning;
- Ashfang, the first two-phase dragon hunt with a telegraphed fire-breath attack;
- a paused post-dragon harvest where one of three body-part essences is bound into the current build;
- Cinder Heart, Molten Fang and Ashen Wing as behavior-changing dragon rewards;
- score, best-score persistence and run summaries that track dragons and essences;
- automated .NET tests and GitHub Pages deployment.

## Technology

Wyrmforge has no paid runtime libraries.

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through a thin JavaScript rendering/input adapter
- MSTest
- GitHub Pages

Game rules do not live in JavaScript. Combat, progression, spells, synergies, passive-tree rules, dragon encounters and dragon essences are implemented in C#. The browser adapter only handles Canvas drawing, keyboard/touch input and browser storage.

## Architecture

The codebase follows Onion Architecture with feature-based grouping inside each layer. Dragon combat and dragon-essence progression are intentionally separate concepts: `Combat/Dragons` owns the encounter, while `Progression/DragonEssences` owns what the player steals from it.

```text
src/
├── Wyrmforge.Domain/
│   ├── Combat/Dragons/
│   └── Progression/DragonEssences/
├── Wyrmforge.Application/
│   └── Runs/Simulation/
│       ├── Dragons/
│       └── DragonEssences/
├── Wyrmforge.Infrastructure/
├── Wyrmforge.Bootstrap/
└── Wyrmforge.Presentation.Web/
    └── Features/
        └── DragonHarvest/

tests/
├── Wyrmforge.Domain.Tests/
└── Wyrmforge.Application.Tests/
```

Folders represent cohesive game concepts rather than broad dumping grounds such as `Services`, `Managers` or `Models`.

## Local development

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
dotnet run --project src/Wyrmforge.Presentation.Web/Wyrmforge.Presentation.Web.csproj
```

## Demo deployment

Pushes to `main` restore, build and test the .NET solution, publish the Blazor WebAssembly app and deploy it through GitHub Pages.

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Every milestone adds one meaningful pillar rather than ten shallow systems.
3. Minor tree nodes add small additive stats.
4. Major tree nodes add large multiplicative or specialized stats.
5. Epic nodes change how a build works.
6. Legendary nodes change game rules.
7. Tree choices may lock competing paths.
8. Mobile input and responsive layout remain first-class requirements.
9. New content must create decisions or combinations, not merely inflate a list.
10. A player should understand the type and consequence of a choice before needing to read its full description.
11. Domain and application logic remain independent of browser, rendering and future mobile hosts.
12. Prefer cohesive feature folders over broad technical dumping grounds.
13. Dragon rewards must change how a run plays, not merely add another percentage stat.
