# Unified agents: AI2–AI6 implementation and acceptance

26 October 2026. AI0 #348 and AI1 #362 are merged. PR #364 continues the same deterministic C# core. This work does not change Town artwork or satisfy T1/T2 visual approval.

## Playable opt-ins

- Town: `/?townAi2=1`. Open **Town AI inspector** and refresh to read actual shared-core decisions. The existing crowd timer, paths, collision and scene destinations remain authoritative.
- Enemy: `/enemy-lab?kind=MireHound&tier=2&count=1&autoplay=false&cast=false`. Tier 2 adds reactive distance control; tier 3 adds pack slots; tier 4 uses encounter-local adaptation. Use `count=8` for a pack or `count=64` for bounded load testing. Hollow remains a direct pursuer.
- Boss: `/hunt-lab?wyrm=Ashfang&ai5=true&play=true&cast=false`. The boss inspector exposes perception, phase, alternatives and confidence. Use `phase=2` for the second authored phase.
- Normal new Hunts: open `/?agents=1` before starting a run. Ordinary Hollow uses Instinctive, ordinary Hound Tactical, elite Hound Adaptive; Ashfang uses phase-aware adaptation. Other enemy archetypes retain existing executors. Remove the query and start a new run for fallback. This per-run preview is not a persistent save setting and is not a migration of saved encounters.

The factory also accepts typed `AgentRolloutOptions`. No health/damage inflation accompanies the five capability sets.

## Implemented behavior

| Milestone | Implementation | Acceptance boundary |
| --- | --- | --- |
| AI2 | Seeded 180-second ambient schedules, work/social/visit/rest utilities, shared AgentRuntime, scene IDs, closure handling, atomic destination reservations, existing walking/collision/path budget, opt-in inspector | Current authored 2D Town adapter; future 3D navmesh remains the Town workstream. Live browser validation and owner believability review remain distinct. |
| AI3 | Earned contact and LOS, approach/retreat/strafe/range control, cooldown-aware scoring, executor locks, target-loss tests | Hound and Hollow migration, not a claim that every existing enemy is migrated. Provisional tuning. |
| AI4 | Two pressure leases, deterministic rotating admission, retained commitments/recovery, support staging on an arc, existing physical crowd separation, 32-query budgets | Pack replay and 64-agent stress scenarios; player escape comfort still needs playtesting. |
| AI5 | Five capability sets, decaying near/far and observed lateral-motion evidence, bounded confidence/bias, elite strafe/range counters, Ashfang utility restricted to authored phase/range/LOS and cooldowns | No cross-encounter learning, input inspection or telegraph shortening. Existing flight cadence, overhead targetability and landing warnings remain authoritative. |
| AI6 | On-demand traces/observation age/decision latency/action diversity, rolling CPU sample window, query/pressure maxima, deterministic replay scenarios, normal-Hunt flag with fallback | Physical iPhone/Android CPU/memory/battery and human early/advanced/boss balance sign-off are **not completed**. Host timing and browser emulation cannot satisfy those gates. |

## Evidence and repeatable scenarios

- 402 Domain tests and 670 Application tests passed on the first complete implementation checkpoint. Additional rollout/closure checks are tracked in PR validation.
- 85 focused Application tests passed: agents, TownCrowd and Ashfang. Replay compares actual simulation snapshots in both boss phases and the eight-Hound encounter. Target-loss tests preserve a warned pounce lane and its recovery.
- Fourteen-resident scenario checks foot-circle separation, path budget and closure of all four real building IDs.
- [Host sample](evidence/ai6-host-64.json): 64 Hounds, seed 42, 400 steps, maximum 32 sight/32 path queries and 2 committed threats. Mean 1.686 ms, final-window p95 2.719 ms, maximum 11.089 ms on this host, including UpdateEnemies work. This is not a mobile frame-time promise.
- Tests: `dotnet test tests/Wyrmforge.Domain.Tests`; `dotnet test tests/Wyrmforge.Application.Tests`; browser scenarios in `AgentFoundationBrowserTests` and `Mobile_TownAgents_ExecuteSharedCoreAndExposeSchedule`.
- Local WebAssembly packaging requires task-host support absent in the execution sandbox. Standard CI publish/browser checks remain authoritative. Do not infer a successful browser render from a C# test alone.

## Resource bounds and replay

Agent decisions and sight are staggered every six active ticks; committed executors run every step. Each runtime retains at most 32 facts, 16 alternatives and 16 trace decisions. Adaptation samples at most twice per second, caps evidence at 16 and decays with an eight-second time constant. Its counter requires confidence above .35; boss score bias is at most .25. Sensor snapshots, agent snapshots, pack leases and adaptation state support deterministic restore; full encounter replay uses the same seed, setup and movement-step sequence.

Pack admission preserves the last confirmed sight result between scheduled samples, but a new attack still requires sight on its actual commitment frame. This prevents lease churn without granting unseen attacks. Expired/dead/routed candidates release slots; already-warned attacks retain execution. Support actors route through the same navigation checks. CPU metrics never feed decision logic.

## Remaining release gates

Run the final-head browser/CI suite, inspect the live 390px Town/pack/boss previews, and measure the same scenarios on actual iPhone and Android hardware. Validate early and advanced Hunt pressure, escape lanes, boss recovery and Town believability with human play. Keep opt-in defaults until those results are recorded; do not mark AI6 accepted or claim automatic art/gameplay sign-off.
