# AI0 implementation evidence

Authority: [AI0–AI6 plan](../design/unified-agent-ai-milestones.md), [creature canon](../canon/creatures-and-encounters.md), [architecture canon](../canon/architecture-and-quality.md). Inventory: [existing systems](enemy-ai-inventory-2026-10-25.md).

## Checkpoint 1 — common contract (in progress)

Renderer-independent Domain agent core: stable identity, lifecycle, immutable observations and bounded last-value blackboard, utility alternatives with ordinal tie-breaking, action requests/results, seeded staggered integer-tick scheduling, bounded inspector trace and JSON replay snapshot. No world RNG consumption. Executors must continue every simulation step; scheduling only throttles policy evaluation. The first decision is immediate, subsequent decisions are staggered. This is not a global CPU admission budget (AI4/AI6).

Bounds: 32 observations/memory facts, 16 scored alternatives and 16 recent decisions per agent. Memory has deterministic age/key eviction; sensing and expiry remain AI1. Replay snapshots cover the common core, not arbitrary external executor/world state. Restore into the same policy/version, seed, identity and interval.

Validation pending at this remote checkpoint. Hollowed/Mire Hound adapters, actual simulation opt-in, inspector and parity evidence follow. AI0 is not complete yet. Normal encounters and saves remain unchanged.

## Checkpoint 2 — opt-in real simulation

Hollow and Mire Hound now use `LegacyEnemyAgent` with the same Domain runtime when `DevelopmentEnemySetup.AgentFoundation` is true. Normal creation remains on the old path. `enemy-lab?kind=Hollow&ai0=true` and `enemy-lab?kind=MireHound&ai0=true` expose an opt-in and on-demand JSON inspector (observations, memory, module goal/action, alternatives, rejection reasons, executor result and decision history). This selects legacy execution modules, not AI3 tactics. All target provenance explicitly says legacy exact target. Existing navigation, pressure, status time scale, collision, damage, pounce commitments and art are retained. Paused/routed actors do not advance core decisions; removed actors are pruned. Inspector snapshots are immutable and excluded from saves and render frames.

Focused validation: 5 Domain core tests pass; 5 Application tests pass. Both archetypes have 1,200-frame full render-snapshot parity against the fallback and repeatable inspector traces; additional tests cover denied pressure, locked pounce direction between decisions, removal and unsupported-species fallback. Full suites and actual browser inspector validation pending at this checkpoint.
