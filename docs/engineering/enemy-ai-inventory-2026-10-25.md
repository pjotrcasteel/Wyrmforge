# Enemy AI inventory after Tier-I Ashfang

Implementation inventory and review evidence at main `1831893613f91b2c74cd4143cdd5623d7dc2939f`, 25 October 2026. This is not a replacement design specification and does not implement the shared agent framework.

Authority: [canonical creatures](../canon/creatures-and-encounters.md#reactive-creature-decisions--owner-direction-23-october-2026), [architecture](../canon/architecture-and-quality.md), and the [AI0–AI6 milestone plan](../design/unified-agent-ai-milestones.md) added by merged #347. The owner requested this review after Ashfang #299 merged, with encounter balance permitted afterward. Town G4/Town spatial work and actor-art PRs remain separate.

## Ashfang prerequisite: verified merge

[#299](https://github.com/pjotrcasteel/Wyrmforge/pull/299) merged as `18318936`. All six checks passed on head `fb03c30c`: [general validation](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956270), [143 browser tests](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956211), [GPU proof](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956202), [WebKit](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956118), [lighting comparisons](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956184), and [matched gameplay comparisons](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40216956187). Validation includes 645 Application and 376 Domain tests; the merged JS suite has 409 passing tests. Current-main #347 added planning documents during validation, with no additional runtime changes.

This completes the present-renderer Tier-I gameplay/art integration checkpoint. Balance, physical iOS/Android profiling, future optional clip conversion and exact-pose material/G5 scene migration remain explicit follow-ups; no whole-game GPU/native release completion is claimed. Native sources, runtime atlases and remote backup receipts are preserved in [Ashfang integration evidence](../../art/source/bosses/ashfang/RUNTIME-INTEGRATION.md).

## Existing mechanisms worth retaining

| Component | Actual behavior / location | Migration boundary |
| --- | --- | --- |
| Common primitives | `Domain/Combat/Behaviors/CreatureDecisions.cs`: finite positive utility scores, direct chase, surround waypoint | Useful helpers, not yet a lifecycle/perception/scheduler framework |
| Hollow / ordinary chase | `RunSimulation.Enemies.cs::UpdateEnemies`: navigation target followed by direct chase, then shared collision/contact resolution | Preserve a deliberately simple instinctive archetype |
| Mire Hound | `MireHoundBehaviorState` plus enemy simulation adapter: orbit flank, fixed-lane windup/pounce, recovery, retreat; Thornrunner feint | Reuse committed action executor and timings; do not replace with generic chasing |
| Frostling pack | `FrostlingPacklingBehaviorState` / `RunSimulation.Frost.cs`: ID-derived circling slots and staggered skitter/bite | Existing surrounding is real; it is not a shared squad/role reservation system |
| Whitefang | `WhitefangStalkerBehaviorState`: heading-dependent flank, feint, warned pounce and recovery | Preserve recognizable flank while correcting information provenance in AI1 |
| Support / ranged / elites | Separate priest, slinger, sentinel, cantor, wraith, Wisp and boss state machines | Keep action modules, interruption/revive budgets and actual damage ownership |
| Ashfang | `AshfangBehaviorState`, `AshfangFlightState` and simulation adapters: context utility, close-action memory, locked commitments, phase-constrained flight | Already reactive; not evidence of learned player tactics or general AI5 completion |
| Attack pressure | `EnemyStagePressure.CommittedThreatCap` (currently 2/3/4 by stage), `CommittedThreatCount`, ranged stagger and `mayCommit` gates | Retain current fairness budget before adding group roles; do not claim a budget is missing |
| Enemy separation | `EnemyCollisionSolver`: spatial grid, deterministic pair resolution and environment-restricted displacement | Reuse physical authority; tactical avoidance/reservations are additional layers |
| Hunt navigation | `ArenaEnvironmentState`: restricted movement, line-of-sight geometry, crossings and local prop detours | Put behind a navigation interface; not equivalent to a general navmesh/path planner |
| Town citizens | C# `Application/World/TownCrowd.cs` and `TownNavigationMap`: seeded stop selection, building/destination reservations, A* caching, bounded path queries, waiting/sidestepping | Existing authoritative C# system, not a JS renderer brain. Preserve it behind an adapter until AI2 |
| Player self-play | `IRunAgent` / `HeuristicRunAgent` / `RunSelfPlayDriver` choose hunter movement/upgrades for tests | Separate test-hunter role; do not mistake this API for an enemy/civilian core |

Paths without a prefix in the table are under `src/Wyrmforge.Application/Runs/Simulation/Enemies` or `src/Wyrmforge.Domain/Combat/Enemies/Behaviors` as applicable. Town and Hunt coordinates use different existing types; an adapter must state units and conversions explicitly.

## Concrete gaps found

1. **Information provenance (AI1).** The combat loop supplies `player.Position` directly to most species on every update. A navigation crossing/path check is not a sensing observation, last-known location or memory expiry. Existing `HasLineOfSight` geometry can be reused, but does not by itself establish a common perception system.
2. **Whitefang reads intended input (AI1).** `RunSimulation.Frost.cs::FrostMovementVelocity` sets `playerHeading` from `desired` before ice/chill movement finishes; `UpdateWhitefang` passes it to the stalker's flank decision. The new plan explicitly prohibits hidden input reading. Replace this seam with bounded observations of actual motion during AI1, with occlusion/age tests. This audit leaves current gameplay unchanged.
3. **Shared contract and diagnostics (AI0).** Identity/state exists per subsystem, but no common agent observation/blackboard, goal/action request/result contract, replayable decision trace or generic inspector was found in the reviewed behavior paths. Adding more species conditionals to the central enemy loop would not satisfy AI0.
4. **Coordination (AI4).** Pack slots and a global attack cap already exist. Explicit pack identities, reserved engagement roles, fair slot reassignment, shared last-known prey information and regroup/retreat coordination are still absent from these paths. Current commitment selection is processed in enemy-list order; measure starvation/order bias before changing it.
5. **Decision budgets (AI0/AI6).** Combat behavior state machines tick in the enemy simulation loop; collision is spatially bounded and Town already budgets A* queries. A shared staggered decision scheduler and per-archetype perception/query budgets are not established. Continue committed action/physics execution every simulation step even when expensive decisions are staggered.

## Position on AI0–AI6

| Gate | Current evidence |
| --- | --- |
| AI0 | This inventory covers the initial audit only. Common core, two-archetype adapter proof, seeded scheduling and inspector exit are still open. |
| AI1 | Useful geometry/navigation pieces exist; shared sensing, hearing, memory expiry and input-reading removal are open. |
| AI2 | Town has working C# routines/reservations; migration to the common core remains open. |
| AI3 | Multiple existing species have distinct tested combat state machines. Common observation/capability profiles and target-loss tests remain open. |
| AI4 | Surrounding, collision separation and pressure limits exist. Explicit pack coordination/roles and mobile group-budget evidence remain open. |
| AI5 | Ashfang has context/history utility within authored phases. No general encounter-local adaptive capability framework is claimed. |
| AI6 | Existing species/simulation/browser tests and balance tools are valuable. Generic decision traces and real-device AI CPU budgets remain open. |

## Recommended first implementation slice: AI0

Keep the milestone order already approved in principle. Build a renderer-independent C# core with stable identity/lifecycle, immutable observations, bounded memory, goal/action requests/results, seeded scheduling and a read-only bounded decision trace. Use **Hollowed and Mire Hound** as two distinct adapter proofs: identical core, different profiles/existing action executors. Preserve current chase/flank, warning, damage, contact, collision and recovery behavior behind a migration flag.

Exit evidence should include exact repeatable traces for fixed seed/tick inputs, two archetypes sharing the core, pause/despawn/reset/interrupt correctness, deterministic tie resolution, no observation mutation, and inspector reasons for chosen/rejected actions. Do not claim AI1 perception from an adapter that still uses legacy omniscient observations: label that compatibility seam and migrate it next. Do not put Town architecture, renderer APIs, raw player input, damage resolution or world geometry inside the decision core.

Next, AI1 supplies actual sensed observations and last-known memory to those adapters, including Whitefang's motion provenance. AI3/AI4 can then deepen fair predatory/pack behavior without erasing existing species mechanics. Five behavioral sophistication tiers from the plan are capability sets; they do not automatically track Wyrm art tiers or increase every ordinary enemy's intelligence.

## Review validation

Read the actual source and existing behavior/collision/Town tests listed above. No gameplay, renderer, balance numbers, saves or assets were edited for this inventory. No new tests are needed for this documentation-only slice; AI0 implementation and its tests remain future work. Do not mark AI0 complete from this report alone.
