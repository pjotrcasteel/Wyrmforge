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
| AI2 | Seeded 180-second ambient schedules, work/social/visit/rest utilities, shared AgentRuntime, scene IDs, closure handling, atomic destination reservations, existing walking/collision/path budget, opt-in inspector | The approved painted 2D Town remains the permanent spatial/visual authority; no 3D navmesh or replacement is planned. Live browser validation and owner believability review remain distinct. |
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

## Follow-up implementation checkpoint — 26 October 2026

- AI5 sensing fix: an unsampled perception frame is no longer treated as a
  confirmed line-of-sight loss. `EncounterAdaptation` now preserves its previous
  **observed** target only until the next actual sample; it never reads hidden
  movement, and a confirmed loss still clears the motion baseline. The same
  correction is wired into Tactical/Adaptive Hound and Ashfang adapters.
- AI5 freeze fix: Ashfang's agent perception and decision clock no longer advance
  when the authored Wyrm time scale is zero. A frozen boss cannot accumulate
  observations and immediately exploit them when it unfreezes.
- Added Domain and Application regression tests for staggered lateral sightings,
  adaptation confidence, confirmed sight loss and frozen Ashfang frames.
- Rebased the validation input by **merging** main `2fb030a` into this PR at
  `0c72ea1` (two parents, no overlap with the 36 AI PR files). This retains
  all unrelated source-backed Wet Forest and Hollowed fixes from main without
  copying their changes into the AI PR diff. The earlier failed check was an
  unrelated Wet Forest JavaScript determinism assertion on the older base.
- AI6 horde cost fix: dead-agent pruning now builds a single living-ID set rather
  than scanning the enemy list once per registered agent each update; a new
  64-agent regression verifies that eliminating one member leaves 63 intact.
- Latest-head CI is a release gate, **not yet counted as passing evidence**.
  No production rollout, physical mobile performance sign-off or user visual
  acceptance is claimed by this checkpoint. Keep all opt-ins and fallback.

## AI6 damage-pressure instrumentation checkpoint — 26 October 2026

The opt-in `AgentPerformanceSnapshot` differentiates simultaneous committed attack pressure from real hunter **HP lost when the authoritative damage buffer resolves at the end of the active Hunt tick**, exposing last-step, cumulative and peak-step damage. Enemies, Ashfang and other hostile sources share this buffer; the counter does not claim per-source attribution. Dodged attacks, invulnerable practice, guarded frames and absorbed hits are not counted as health damage. These are read-only measurements, never combat inputs or a substitute for human fair-pressure assessment. A focused Application regression covers a committed threat without an actual hit and one resolved hit. Physical device and browser acceptance remain pending.

**Damage instrumentation correctness:** the original instrumentation checkpoint sampled player HP at the end of `UpdateEnemies`, but hostile attacks still held their damage in `pendingPlayerDamage`; this would always undercount or report zero. The final hook samples immediately around `ResolvePlayerDamage()` in `RunSimulation.Tick`, with zero-damage frames recorded separately from combat pressure. This correction is included before AI6 acceptance and does not change how damage is resolved.
