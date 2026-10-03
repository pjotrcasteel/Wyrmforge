# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. Mechanics and architecture come before visual fidelity.

## Prototype 0.0.21 — Fire Mastery

The current playable slice contains:

- responsive arena combat for desktop and touch;
- an always-visible Canvas performance panel showing FPS, simulation updates/sec, C# frame cost, JS↔.NET bridge cost and live enemy/projectile counts;
- a browser render loop decoupled from the async C# simulation round-trip so requestAnimationFrame no longer waits for interop before drawing again;
- spatial collision indexing for projectile hits, splash effects and lingering damage zones as runs become crowded;
- Arcane Orb mastery: Rank III orbs grow visibly larger and pierce through their first target before disappearing on the next hit;
- Fire Bolt mastery: Rank III impacts keep their blast and also leave 2.4 seconds of Burning Ground that damages targets inside every 0.3 seconds;
- Burning Ground scales from the projectile that created it, can overlap, can damage dragons and uses the normal target-damage path for kills, XP and score;
- Rift Stalkers as the first normal-enemy behavior variant: every sixth spawn is larger, pauses for a 0.65s warning, locks a direction toward the player's position and then lunges along that fixed line;
- Rift Stalker wind-up/lunge state pauses while frozen, matching the rest of the combat movement rules;
- compact projectile effect state that groups chains, splash, freeze, inferno and piercing without expanding projectile constructors;
- cached spell/synergy HUD data that is rebuilt only when the run build changes;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- XP, runes, spell learning/upgrades and cross-spell synergies;
- four spells: Arcane Orb, Fire Bolt, Frost Shard and Chain Lightning;
- Ashfang, the first two-phase dragon hunt with a telegraphed fire-breath attack;
- a paused post-dragon harvest where one of three body-part essences is bound into the current build;
- a post-harvest risk decision: begin extraction or descend to a harsher depth;
- a fixed extraction ritual circle: remain inside for four seconds to escape, step out to dodge and the timer pauses until you return;
- a persistent Essence Vault that stores exact essences recovered through successful extraction;
- Wyrm Offerings: optionally consume one secured essence before a run for one small starting boon;
- Cinder Heart starts with Fire Bolt I, Molten Fang starts with Potency I and Ashen Wing starts with Fleetfoot I;
- repeated extractions stack in the vault, while defeated or abandoned runs secure nothing;
- Depth II enemies with +35% health, +15% speed, 20% faster spawn cadence and ×1.5 enemy-kill score;
- Depth II rift pressure: a locked warning zone periodically appears at the player's position and detonates for 28 raw damage unless dodged;
- health-bar-free enemy damage feedback, elemental impact signatures, splash pulses and death cues;
- score, best-score persistence and run summaries that track depth, dragons and essences;
- automated .NET tests and GitHub Pages deployment.

## Technology

Wyrmforge has no paid runtime libraries.

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through a thin JavaScript rendering/input adapter
- MSTest
- GitHub Pages

Game rules do not live in JavaScript. Combat, progression, spells, synergies, passive-tree rules, dragon encounters, dragon essences, offerings, run depth, depth hazards, extraction rules and normal-enemy behaviors are implemented in C#. The browser adapter handles Canvas drawing, keyboard/touch input, diagnostics and browser storage.

## Architecture

The codebase follows Onion Architecture with feature-based grouping inside each layer. `DragonEssenceVault` owns permanent essence counts and consumption in Domain. `Runs/Offerings` owns the data-driven mapping from a consumed essence to its temporary run-start boon. `Runs/Depth` owns risk/reward multipliers and renderer-independent rift cadence. `Runs/Extraction` owns the anchored ritual position, radius and pause/resume progress. `ProjectileEffects` keeps projectile behavior cohesive while `ProjectileState` owns remaining pierces and the last pierced target. Burning Ground lives with spell simulation as a timed area effect and reuses the central target damage path rather than creating Fire-specific kill rules. Enemy-specific behavior state is kept with the enemy concept rather than growing one central movement manager. Combat spatial indexing remains inside the Application simulation layer, while browser frame pacing and diagnostics remain presentation concerns.

Folders represent cohesive game concepts rather than broad technical dumping grounds such as `Services`, `Managers` or `Models`.

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
14. Combat feedback should explain impact without requiring health bars or damage numbers.
15. Extraction should turn survival into a decision instead of letting every successful kill automatically become permanent progress.
16. Choosing extraction should still require one final moment of survival before rewards become safe.
17. Persistent rewards should first prove the earn-and-secure loop before gaining spending or crafting systems.
18. Spending permanent resources should create a clear decision without turning early metaprogression into permanent stat inflation.
19. Deeper depths should change how the player moves or fights, not only scale enemy numbers.
20. Extraction tension should come from positioning and exposure, not from erasing already-earned ritual progress.
21. Measure frame rate, simulation cost, bridge cost and entity counts before adopting invasive runtime optimizations.
22. Performance work must preserve C# as the canonical gameplay layer and scale by reducing algorithmic work before reducing gameplay density.
23. Max-rank spell upgrades should gain a distinct behavioral mastery instead of ending as another numeric increase.
24. Enemy variants should introduce a readable movement or dodge question before they introduce stat variation.
25. Persistent area effects should tick at bounded intervals and reuse existing combat paths rather than adding frame-rate-dependent damage logic.
