# Architecture, persistence and validation

> **Canonical WyrmForge specification · updated 20 October 2026.** Keep gameplay deterministic and platform-agnostic; distinguish simulator truth from client rendering.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## 10. Suggested architecture / repo touchpoints — implementation guidance, not new API orders

### 10.1 Separation of durable state lifetimes

| Conceptual state | Authority and lifecycle |
|---|---|
| `PlayerLegacy` + `PermanentArcaneNexusProgress` | Account knowledge, researched spells, unlocks, season-to-Eternal power, cosmetics, access. |
| `ChronicleState` / `StoryBookState` / `Persona` | Independent narrative events, endings and active story identity, versioned Books. |
| `PersistentRegionWorldState` | Stable IDs/geography/bridges/settlement history, causal events, in-game evolution and validated available topology. |
| `HunterGeographicKnowledge` | First-hand discoveries, books/maps, certainty/provenance, dated last-known condition, persistent across failure. |
| `GeneratedHuntPlan` / `ExpeditionState` | Correct graph, node/route commitments, current/candidate objectives, encounter rewards, run-local state and RNG streams. |
| `ArenaRecipe` / `ArenaEvolutionState` | Legal solid geometry, spawns, exits, phase hazards, mutation telegraph chronology and validated transition. |
| `EternalExpeditionSave` | Same expedition ID, secured refuge, frontier, route decisions, resources, world history, active build and atomic sanctuary checkpoint. |
| `SeasonRuleset` / `VerifiedSubmission` | Independent seasonal mode seed, catalogue/version/caps, replay evidence and verified best; immutable archive. |
| `SpellBlueprint` / `PreparedSpell` / `NexusLoadout` | Typed catalogued composition, per-revision ownership, resolved legal cast behavior + temporary run evolution. |
| `PlayerAimIntent` / `TargetingMode` / `EffectiveAimState` (conceptual) | Legal automatic enemy acquisition by default; active independent manual input overrides it and release restores auto mode. C# owns effective target/angle; snapshots and verifiable replays consume it. |
| `BlueprintPublication` / `ChampionArchiveRecord` | Visibility consent, immutable published version/provenance; authorized competitive historical reference. |

**All names are conceptual; use existing C# assemblies/class contracts where possible.** Existing saves and `SpellId` data must deserialize. Research, Rune/Arcane tree, Forge, Essence Vault, Codex and current quest/world state cannot be silently rebuilt or duplicated.

A useful causal shape:

```text
Versioned Region/World state + Hunter Knowledge
            -> HuntRequest (mode, target envelope, seed)
            -> validated GeneratedHuntPlan (directed graph and physical paths)
            -> selected EncounterSiteProfile / ArenaRecipe
            -> authoritative RunSimulation C# + authored waves/events
            -> deterministic visual snapshots (Blazor/JS/SVG/canvas)
            -> transactional results: run rewards, map knowledge, world consequences
            -> ordinary extraction OR season submission OR Eternal sanctuary checkpoint
```

### 10.2 Existing repository seams, observed Oct 2026 (verify before editing)

- `src/Wyrmforge.Domain/Spells/SpellBook.cs`, `SpellCatalog.cs`, `Synergies/SynergyCatalog.cs`, `Evolutions/*`; `src/Wyrmforge.Domain/Progression/PassiveTree/*`, current `TotalPoints = 24` baseline; `RunSimulation.*`; `LevelChoiceService.cs`, `PowerMilestoneProfile.cs`; Forge Masterworks, Dragon Essences/Vault, Spell Mastery.
- `src/Wyrmforge.Application/Runs/Navigation/WyrmrealmMapGenerator.cs`, `WyrmrealmRouteGenerator.cs`, `WyrmrealmMapState.cs` (`CombatStages = 8` at time of prior audit), `WyrmrealmStageCatalog.cs`, `WyrmrealmMapNode.cs` and tests: current seeded territory/roads, tier migration and possibility of late Wyrm attraction. **Do not patch the eight-stage constant alone**: stage budget, boss trigger, pressure, run progression and map UI must migrate together.
- `src/Wyrmforge.Presentation.Web/Features/Map/WyrmrealmMapView.razor` and `.razor.css`; `wwwroot/js/hunt-map.js` current scroll-to-hunter logic. Add pan/zoom/fog only with manual scroll accessibility and real touch validation.
- **Auto-target with manual override (19 Oct):** `MovementInput.cs`, `Movement/RunSimulation.Movement.cs`, `RunSimulation.cs`, `Spells/RunSimulation.Spells.cs`, `Combat/RunSimulation.Targeting.cs`, `ArenaView.razor.cs`, `wwwroot/js/arena-input.js`, `wwwroot/js/arena-mage.js`, snapshots and focused C#/JS tests. Preserve legal default nearest-target acquisition and existing chains; add active manual aim precedence, release/reacquisition and stable target feedback.
- `ArenaEnvironmentState.cs`, `RunSimulation.Navigation.cs`, `RunSimulation.Resonance.cs`, `RunSimulation.Dragons.cs`, `wwwroot/js/arena-environment.js`, `arena-territory-art.js`: existing simulation-driven local scene/region art, physical causeway/sanctuary/rift regions, barriers and gates. **Decouple reward school from environment school** when introducing region-wide corruption.
- `src/Wyrmforge.Presentation.Web/Features/Leaderboard/LeaderboardView.razor`, `wwwroot/js/leaderboard.js`, `services/playtest-collector/migrations/0002_leaderboard.sql`: not official ranked service.
- Relevant docs already in repo: `docs/design/long-term-progression.md`, `docs/design/visual-first-magic-ui-rfc.md`, `docs/design/living-territories-0.0.116.md`, `art/README.md`, `docs/handover/2026-10-15-project-art-and-backlog.md`. Treat GitHub code and approved art as current factual references; this unified file is product-direction source.

### 10.3 Migration and safety

- Adopt adapters/staged versioning for old `SpellBook`, recipes, story saves, current map generator/8-stage data, progression levels, leaderboard distinction and in-progress Eternal saves.
- Dynamic generated scene still requires **pre-phase and post-phase validity**. Deterministic generator retries bounded with proven fallback; visual render doesn't alter physics/rewards/RNG.
- Server verified seasonal records preserve historical build/ruleset version even if future updates change legal recipe/component IDs. Never rewrite archived champion's exact result while migrating current client data.
- Save-at-sanctuary is transactional and idempotent; no duplicative season rewards, side-quest caches or upgrades on retry/resume. Prevent two simultaneous conflicting active Eternal writes; exact sync conflicts unresolved.

---

---

## 11. Validation requirements — evidence, not visual claims

### 11.1 Map and world property tests

- Thousands of seeded layouts: every required route has valid continuation to lair/goal; all promised crossings possess physically traversable bridge/ford; Chapel branch **actually rejoins** and cannot dead-end falsely; chosen routes and skipped bonuses remain committed through save/restore; no accidental road over impassable ridge or hostile floodplain.
- Realistic landmark/road relationships, seed/version reproducibility, unique site IDs and reward-one-time flags. Random region variation does not overwrite recognized past geography.
- Fog/visibility respects distance, earnable scouting and real previous knowledge; confirmed facts cannot contradict world state, stale facts have recorded cause; failure retains geography and legitimate research.
- If bridge/outpost changes, both illustrated map and actual travel graph update; advanced Wyrm disruption always leaves a viable route/fallback/escape and fair warning. Character doesn't softlock after losing optional outpost.
- Map picture on real iPhone portrait: understandable road, current position, next reachable site, low clutter, subtle ambient light/water/wind, pan/zoom/recenter and reduced-motion usability. Do not declare design accepted merely because generated PNG looks attractive.

### 11.2 Combat and balance

- Every generated arena/topology/post-transformation phase satisfies real collision, player/enemy spawn safety, accessible objectives/loot and physical exit. C# visuals and game state agree, no billboards. Check portrait/landscape boss telegraphs.
- Challenge/wave compositions truly respond to topology and skill limits; no 4× default damage from contextual auto-casts, infinite chains, performance overload or defensive starvation. Enemy death/upgrade and hazards are deterministic and logged for replay.
- **Aiming regression matrix (19 Oct):** one-thumb auto-targeting irrespective of movement direction and while stationary; manual second-thumb/mouse/right-stick direction wins over a nearer enemy; releasing/cancelling returns to auto without double casts; visible/legal enemy acquisition (not through walls), non-flickering targets, real manual misses, first lightning target and subsequent chains, legible minimal Gothic cue, legal non-directional exceptions and exact cast/render/replay sync. Test genuine iPhone two pointers, cancellation, focus loss, camera/2.5D, save compatibility and controller deadzones.
- Minor/major upgrade eligibility intact at differing Hunt lengths, no early broken rare/golden, reused Frostfire exactly once. Reroll 1 card changes only that card and consumes exactly one shared charge. Golden remains same-charge and legal tier.
- Run outcomes and rare specimen acquisition correct; failing research advances valid knowledge; Forge/Nexus cannot double-spend rare material. Legacy inventory, Chronicles, persona and existing Wyrms remain valid after migrations.

### 11.3 Persistence, modes and competition

- **Sanctuary checkpoint → close app → town first → Continue Eternal Hunt → same sanctuary and expedition ID**, same map, region history, build, RNG state, spent rewards and committed route. Test offline/online, interrupted atomic writes, double-click Continue and old-save migration; no exploits or stale best-frontier inflation.
- Eternal death returns to legal recovery with bounded setback, remembers world and retains verified historic peak. Secured-refuge travel cannot bypass exploration, blocked bridges, Wyrm gate or mutually exclusive route rewards.
- Equal standardized season start despite different account research/story/cosmetics/seasonal permanent power. Each four-week board shared seed and immutably frozen rules. Unlimited attempts, one best **verified** per player/mode/season, no one-time seasonal payout duplication.
- Expedition rank orders region/progress/Merit; Arena rank orders waves/Merit; Eternal ranks genuine conquered frontier. No score gain through farming/looping/death or merely seeing unexplored depth. Rank recipes private and never reveal confidential blueprints to public.
- Human playtests and real mobile device reviews inform art, session duration and fair pressure. CI/build/test validation and PR review required before any real claim of completion.

---

---

## iOS / Android portability and delivery gates

**Explicit product goal:** ship WyrmForge on **iOS (App Store)** and **Android (Google Play)** after evidence-backed browser gameplay has stabilized. This is not merely a responsive web page goal.

### Architectural invariants

- The deterministic .NET 10 **Domain + Application simulation** remains platform-independent. No gameplay logic moves into the browser, mobile shell or a second engine.
- Platform adapters own storage, input, graphics, audio, sharing, crash reports and permissions. They do not modify progression rules.
- Keep save schemas versioned and provide migrations. Today's localStorage player saves must not silently disappear when moving to native storage.
- Do not put secrets or privileged analytics credentials in a native bundle or public JavaScript.
- Touch controls, safe areas, portrait/landscape, back navigation, pause/resume and reduced motion are first-class design constraints.

### Planned delivery gates

| Stage | What must be true |
| --- | --- |
| 1. Browser beta / 0.0.80 | External sessions, simple report sharing, action-oriented feedback, mobile web baselines |
| 2. Playtest fixes | Unassisted first-run clarity, engaging combat, reliable performance, readable long-term goals |
| 3. Mobile architecture proof | Compare .NET MAUI Blazor Hybrid/native shell or another supported packaging route against pure-web rendering on actual iPhone/Android hardware; select only after measuring input latency, frame pacing, startup, battery and store compatibility |
| 4. Platform abstraction | Interfaces for save persistence, diagnostics consent, native share sheet, audio/haptics, lifecycle and updates |
| 5. Native alpha | Installable development builds on iOS and Android, reliable offline launch, progress migration, device matrix and crash capture |
| 6. Store release | App Store / Play policy, privacy disclosures, signing, ratings, screenshots, accessibility, QA, support and release workflows |

### Porting decision

The current presentation uses Blazor WebAssembly and a canvas-based JavaScript renderer. A WebView-based mobile shell could preserve that investment, but this is **only a candidate**, not a decision to ship a wrapper. Test hardware before committing: a native rendering layer might become necessary for consistently satisfying control and frame-time targets. Keep Build Evolution, Great Hunt, Ascendants and Elder Wyrms independent of that UI decision.

### Arena GPU lighting proof: preserve gameplay authority — 23 October 2026

The next Wet Forest art milestone is **one real original Blender ancient oak with dynamic leaf-on-leaf GPU shadow visibility**, under one movable Fireball, in an isolated fixed-camera 2.5D review route. See the [complete implementation and acceptance plan](../design/arena-real-geometry-light-engine.md), which is subordinate to the [canonical art decision](art-and-animation.md#proper-lighting-engine-and-foliage-self-shadowing--locked-23-october-2026). The current Canvas masks, shadow ellipses/alpha projections, and per-pixel normals are valid *experimental baselines* but cannot demonstrate occlusion between distinct leaves.

**Boundaries:**

- C# `RunSimulation`, terrain recipes and movement/collision remain authoritative. Real light sources are derived from versioned snapshots (position, *height*, intensity/color, radius, lifetime, emitter kind and stable ID) and do not mutate gameplay. These are a **proposed typed renderer contract**, not permission to invent a parallel gameplay state or claim that APIs already exist.
- One proof renderer using WebGL2/Three.js or equivalent may test actual 3D geometry, alpha-clipped foliage, cast/receive shadow maps, orthographic camera and light-space depth. Keep it at a separate opt-in route and **do not reroute existing Hunts or replace the working JS/Blazor UI** during G1. Check current libraries/tooling and dependency policy before adding packages.
- Source artwork is Blender `.blend`, with reproducible low-poly export (e.g. glTF/GLB) and preserved source identity. The original PNG, geometry and exported passes are still unapproved until explicit visual sign-off. An alpha-masked shadow-pass must use the same leaf cutout as its color pass; a normal map alone cannot establish visibility.
- Native iOS/Android architecture is **not decided** by using a browser proof. Prototype GPU performance and on-device testing determine the production renderer. Avoid tying `.NET 10` domain/gameplay code to a native runtime that cannot host it without a deliberate boundary/port plan. Frame-rate targets are aspirational until benchmarked.
- Unit and screenshot tests must distinguish caster direction and *intra-tree self-occlusion*, not only a darker ground patch. Use reproducible Fireball left/right/behind/off/shadows-off presets, debug shadow depth/visibility and phone portrait captures. Visual and physical device acceptance is mandatory prior to production asset integration.

### Material Lab is a preview, not the mobile engine — reaffirmed 22 October 2026

**iOS and Android are the production targets.** GitHub Pages, Blazor and JavaScript Canvas currently enable fast visual iteration, but are **not** the target game architecture by default. Do not optimize the project into an increasingly browser-dependent game.

For every accepted ground/material change:

- Treat the six approved source paintings, stable material identifiers, seeds, recipe parameters, variation masks and blending rules as **portable content**. Preserve the original assets and record their provenance.
- Material generation and physical terrain ownership belong in deterministic, platform-neutral **C# Domain/Application** models and recipes when moved into the actual game; renderers consume the same approved recipe/snapshot, not their own independent world or random biome system.
- The present `arena-materials.js` atlas baking, DOM controls, Canvas 2D mask effects and GitHub Pages URLs are **lab-only presentation mechanisms**. Do not make gameplay terrain authoritative in JavaScript or require these browser APIs in future iOS/Android builds.
- A future native render adapter may implement visually equivalent blending using GPU texture atlases/masks/shaders, or a validated mobile shell may use existing graphics: choose only after profiling **real iOS and Android installs**. An iPhone screenshot of mobile Safari is visual feedback, not proof of native compatibility, battery efficiency or stable frame pacing.
- Validate actual mobile constraints: low-/mid-range device CPU/GPU, draw calls, overdraw, texture decompression/memory budget, launch and resume, touch responsiveness, framerate, battery/thermal behavior and offline asset packaging. Do not introduce a second gameplay authority to solve a rendering problem.

Until that adapter decision, keep the current browser lab replaceable: test appearance there, preserve portable input assets/recipes, and leave integration into production scenes behind explicit visual and native-device acceptance gates.

### Data continuity

Playtest evidence now uses a versioned JSON schema and explicit export/sharing. Future analytics intake and native diagnostics should reuse its **meaningful events**, not browser-specific global functions. An iOS/Android release must have its own privacy choices and report-sharing affordances, and should never require a GitHub account.

## Repository checkpoint discipline

The root [AGENTS.md](../../AGENTS.md) governs frequent remote checkpoints, non-destructive work on concurrent branches, tests and explicit handovers. New architecture must preserve the versioned save format, source-of-truth C# domain, stable replay seeds and compatible web/native adapters. A GitHub Action passing is **not** physical iPhone visual acceptance.
