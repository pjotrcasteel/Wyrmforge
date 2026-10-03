# Wyrmforge

Wyrmforge is an experimental C# magic roguelike built in small, playable milestones. Mechanics and architecture come before visual fidelity.

## Prototype 0.0.30 — Core Loop Review

The current playable loop is:

**Choose a passive build + hunt route → enter the Wyrmrealm → grow spells and synergies → hunt a dragon → steal one body essence → extract or push → clear the Depth II Rift Trial → hunt the second dragon → steal a second essence → survive extraction → bring secured essences and discovered knowledge back to the Forge.**

### Build identity

- Four auto-cast spells: Arcane Orb, Fire Bolt, Frost Shard and Chain Lightning.
- Named cross-spell synergies: Frostfire, Stormglass and Arcane Conduit.
- Rank III masteries give each spell a behavioral destination: Arcane pierces, Fire leaves Burning Ground, Frost releases a Frost Nova, and Storm forks its first lightning hit.
- Run upgrades and the 28-node pre-run passive tree layer additional build direction without replacing spell identity.

### Encounter structure

- Normal pressure arrives in six-spawn encounter phrases rather than one endless uniform stream.
- Swarm phrases emphasize rapid chasers, Stalker Pressure mixes repeated Rift Stalker lunges, and Mixed phrases combine both.
- Rift Stalkers visibly wind up before committing to a fixed-direction lunge, so their threat is read and dodged rather than merely out-statted.
- The Canvas renderer uses spatial collision indexing and a decoupled simulation/render loop; the in-game performance panel exposes FPS, SIM/s, C# time, bridge time and entity counts.

### Dragon hunting

- The Forge lets the player choose Ashfang or Stormcoil as the first hunt target.
- If the player pushes after harvesting the first dragon, the other dragon becomes the deeper prey.
- Ashfang is a two-phase Cinder Wyrm built around a directional breath cone and approach/retreat spacing.
- Stormcoil is a two-phase Tempest Wyrm that orbits at range and telegraphs large radial storm pulses; phase II increases pulse radius/damage while shortening the warning and cooldown.
- Ambient Depth II rifts pause during dragon fights so each boss's own spatial question remains readable.

### Dragon essences

Ashfang offers:
- **Cinder Heart** — every sixth cast erupts around the player.
- **Molten Fang** — projectile impacts gain fiery direct and splash damage.
- **Ashen Wing** — sustained movement periodically launches a cinder strike.

Stormcoil offers:
- **Storm Heart** — every fifth cast releases a multi-target lightning chain.
- **Charged Scale** — periodically blunts the next genuinely heavy hit without being wasted by tiny contact ticks.
- **Tempest Wing** — sustained movement charges the next spell to echo at partial damage.

Exact harvested essence IDs stay active for the current run. Successful extraction stores every carried essence in the persistent browser-local Essence Vault; defeat or abandonment stores none. Wyrm Offerings are an explicit recipe system: currently only Ashfang essences have offering recipes, so future/new vault resources are not assumed to be spendable automatically.

### Push, Depth II and extraction

- After the first dragon harvest, the player chooses extraction or deeper risk.
- Extraction creates a fixed ritual circle. The four-second timer progresses only while the player remains inside; leaving pauses progress without resetting it.
- Depth II has +35% enemy health, +15% enemy speed, faster spawns and ×1.5 normal-enemy score.
- Periodic telegraphed rifts lock onto the player's position and detonate if not dodged.
- Pushing starts a finite **12-kill Rift Trial**. Completing it grants +750 score and reveals the second dragon rather than opening unsupported infinite depths.
- Depth III is intentionally unavailable until it has real content.

### Persistent knowledge

- The Arcane Codex records Frostfire, Stormglass and Arcane Conduit when the player actually assembles them in a run.
- Codex knowledge survives extracted, defeated and abandoned runs because it represents discovery, not secured loot.
- The Codex currently grants no stats, currency or unlock power.
- Best score, Essence Vault and Codex persistence use browser localStorage and safely ignore unavailable/corrupt values.

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

The codebase follows Onion Architecture with feature-based grouping inside each layer. Domain owns reusable gameplay state and definitions such as spells, dragons, essences, the passive tree and persistent Codex/Vault models. Application owns run orchestration, encounters, combat simulation, depth/trial rules, extraction and dragon-hunt routing. Presentation owns Blazor composition and the thin Canvas adapter.

Repeated behavior is kept near its cohesive concept: dragon-specific profiles stay with dragons, encounter composition stays with enemies, spell mastery behavior stays with spell simulation, and persistent resources do not implicitly share spending rules. Combat spatial indexing remains an Application concern; browser frame pacing remains a Presentation concern.

Folders represent cohesive game concepts rather than broad dumping grounds such as `Services`, `Managers` or `Models`.

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
3. Minor tree nodes add small additive stats; Major nodes specialize or multiply; Epic nodes change builds; Legendary nodes change rules.
4. Mobile input and responsive layout remain first-class requirements.
5. New content must create decisions or combinations, not merely inflate a list.
6. Domain and Application remain independent of browser, rendering and future mobile hosts.
7. Prefer cohesive feature folders over broad technical dumping grounds.
8. Dragon rewards must change how a run plays, not merely add another percentage stat.
9. Combat feedback should explain impact without requiring health bars or damage numbers.
10. Extraction converts survival into a decision; secured loot requires successful extraction.
11. Knowledge and loot are different persistence concepts: Codex discoveries may survive any outcome, essences may not.
12. Deeper depths must change play and provide a finite objective before another depth is exposed.
13. Performance is measured before invasive optimization, and gameplay density is preserved by reducing algorithmic work first.
14. Max-rank spells gain distinct behavioral masteries rather than ending as numeric upgrades.
15. Enemy variants and encounter compositions should create readable movement/dodge questions before stat variation.
16. New status and damage effects reuse central combat rules so synergies compose instead of fragmenting into parallel systems.
17. Different dragons should ask different spatial questions and reward different body-part choices.
18. Permanent resources only become spendable through explicit recipes; adding a resource must not silently expand every economy.
19. Hunt-route choice should alter the order and risk context of known prey before procedural route complexity is added.
20. Stop at assessment milestones and improve cohesion before expanding the feature surface again.
