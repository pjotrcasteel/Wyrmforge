# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. Mechanics and architecture come before visual fidelity.

## Prototype 0.0.6 — First Dragon Hunt

The current playable slice contains:

- responsive arena combat for desktop and touch;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- free pre-run respec;
- XP, level-ups and three-choice in-run progression;
- four distinct spells: Arcane Orb, Fire Bolt, Frost Shard and Chain Lightning;
- spell ranks that improve behavior as well as numbers;
- three cross-spell synergies: Frostfire, Stormglass and Arcane Conduit;
- runes that compound with the spell system;
- clearly differentiated Rune, New Spell, Spell Upgrade and Synergy choices;
- the first dragon boss, Ashfang the Cinder Wyrm, arriving during the run;
- a dedicated dragon health bar, two combat phases and telegraphed fire-breath attacks;
- frost affecting dragons at reduced strength rather than fully locking a boss down;
- score, dragon-kill tracking, best-score persistence and run summaries;
- automated .NET tests and GitHub Pages deployment.

## Technology

Wyrmforge has no paid runtime libraries.

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through a thin JavaScript rendering/input adapter
- MSTest
- GitHub Pages

Game rules do not live in JavaScript. Combat, progression, spells, synergies, passive-tree rules, dragons and run simulation are implemented in C#. The browser adapter only handles Canvas drawing, keyboard/touch input and browser storage.

## Architecture

The codebase follows Onion Architecture with feature-based grouping inside each layer:

```text
src/
├── Wyrmforge.Domain/
│   └── Combat/
│       ├── Dragons/
│       ├── Enemies/
│       └── Targets/
├── Wyrmforge.Application/
│   └── Runs/Simulation/
│       ├── Combat/
│       ├── Dragons/
│       ├── Enemies/
│       ├── Movement/
│       ├── Progression/
│       ├── Snapshots/
│       └── Spells/
├── Wyrmforge.Infrastructure/
├── Wyrmforge.Bootstrap/
└── Wyrmforge.Presentation.Web/

tests/
├── Wyrmforge.Domain.Tests/
└── Wyrmforge.Application.Tests/
```

Dependency direction stays inward:

```text
Presentation ─┐
              ↓
Application → Domain
              ↑
Infrastructure┘
```

Folders represent cohesive game concepts rather than generic dumping grounds such as `Services`, `Managers` or `Models`. Dragons already have their own domain and simulation boundaries so future lineages, attacks and essences do not inflate the normal-enemy implementation.

A future mobile presentation can reuse the same Domain and Application assemblies for iOS and Android without moving gameplay rules out of C#.

## Local development

Restore, build and test:

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
```

Run the browser version locally:

```bash
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
10. A player should understand the type and consequence of a level-up choice before needing to read its full description.
11. Domain and application logic remain independent of browser, rendering and future mobile hosts.
12. Prefer cohesive feature folders over broad technical dumping grounds.
