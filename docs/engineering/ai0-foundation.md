# AI0 implementation evidence

Authority: [AI0–AI6 plan](../design/unified-agent-ai-milestones.md), [creature canon](../canon/creatures-and-encounters.md), [architecture canon](../canon/architecture-and-quality.md). Inventory: [existing systems](enemy-ai-inventory-2026-10-25.md).

**Current status:** AI0 implemented and locally validated in [PR #348](https://github.com/pjotrcasteel/Wyrmforge/pull/348), not merged. Final runtime code checkpoint `32e62905ea07ad89c83f0135e80c9afd7b118577`. CI was still queued at the evidence checkpoint; no remote check pass or rollout is claimed. The dated checkpoints below describe progress, not additional open implementation gates.

## Checkpoint 1 — common contract (in progress)

Renderer-independent Domain agent core: stable identity, lifecycle, immutable observations and bounded last-value blackboard, utility alternatives with ordinal tie-breaking, action requests/results, seeded staggered integer-tick scheduling, bounded inspector trace and JSON replay snapshot. No world RNG consumption. Executors must continue every simulation step; scheduling only throttles policy evaluation. The first decision is immediate, subsequent decisions are staggered. This is not a global CPU admission budget (AI4/AI6).

Bounds: 32 observations/memory facts, 16 scored alternatives and 16 recent decisions per agent. Memory has deterministic age/key eviction; sensing and expiry remain AI1. Replay snapshots cover the common core, not arbitrary external executor/world state. Restore into the same policy/version, seed, identity and interval.

Validation pending at this remote checkpoint. Hollowed/Mire Hound adapters, actual simulation opt-in, inspector and parity evidence follow. AI0 is not complete yet. Normal encounters and saves remain unchanged.

## Checkpoint 2 — opt-in real simulation

Hollow and Mire Hound now use `LegacyEnemyAgent` with the same Domain runtime when `DevelopmentEnemySetup.AgentFoundation` is true. Normal creation remains on the old path. `enemy-lab?kind=Hollow&ai0=true` and `enemy-lab?kind=MireHound&ai0=true` expose an opt-in and on-demand JSON inspector (observations, memory, module goal/action, alternatives, rejection reasons, executor result and decision history). This selects legacy execution modules, not AI3 tactics. All target provenance explicitly says legacy exact target. Existing navigation, pressure, status time scale, collision, damage, pounce commitments and art are retained. Paused/routed actors do not advance core decisions; removed actors are pruned. Inspector snapshots are immutable and excluded from saves and render frames.

Focused validation: 5 Domain core tests pass; 5 Application tests pass. Both archetypes have 1,200-frame full render-snapshot parity against the fallback and repeatable inspector traces; additional tests cover denied pressure, locked pounce direction between decisions, removal and unsupported-species fallback. Full suites and actual browser inspector validation pending at this checkpoint.

## Final local exit evidence

| AI0 gate | Evidence |
| --- | --- |
| Inventory and migration boundaries | Existing-system inventory; only two species opt in, normal Hunts/Town/Ashfang use existing execution |
| Shared identity, lifecycle, observations, blackboard, goals/actions | Domain `Agents` contracts and runtime; Application `LegacyEnemyAgent` adapts both species |
| Deterministic scheduling and harness | Fixed seed/id integer scheduling, ordinal utility ties, no world RNG consumption, repeatable full simulation traces |
| Inspector | Real enemy lab, module/goal/reason summary plus JSON containing observations, memory, alternatives, results and bounded history |
| Two distinct archetypes | Hollow direct chase and Hound existing flank/windup/pounce/recover/retreat; 1,200-frame parity per species against legacy snapshots |
| Lifecycle/replay | Pause/resume, despawn/reset, interrupt and stale results, no eligible action, invalid replay boundaries, JSON restore-and-continue |
| No rendering coupling | Core resides in Domain with no renderer dependency; adapters in Application; inspector is read-only presentation |

Validation actually run:

- Full Application suite: **650 passed** at `2235a8a5`. After final core restore validation change, all **5 adapter/parity tests** passed again.
- Full Domain suite at final runtime head: **383 passed**, including **7 AI0 tests**.
- Release web publish succeeded. This local SDK reports publishing without WASM workload optimizations; this is functional validation, not mobile performance proof.
- Final Release browser checks: **2 passed** (Hollow and Mire Hound at 390×844), with no page errors or rendering failure. Checks verify inspector choices, rejected alternatives, bounded trace, unchanged inspection during pause, no Great Hunt save, and disabling the opt-in.
- Actual browser captures reviewed: [Hollow](evidence/ai0/ai0-Hollow-390.png), [Mire Hound](evidence/ai0/ai0-MireHound-390.png). Corresponding [Hollow JSON](evidence/ai0/ai0-Hollow-inspector.json) and [Hound JSON](evidence/ai0/ai0-MireHound-inspector.json) preserve inspector output. Browser frame counts depend on browser frame timing; fixed-input repeatability is tested in C#.
- `git diff --check` clean; current main remained `18318936` at final reconciliation. Concurrent G4, actor-art and Fireball PRs were not modified.

Reproduce with `dotnet test tests/Wyrmforge.Domain.Tests`, `dotnet test tests/Wyrmforge.Application.Tests`, and `dotnet test tests/Wyrmforge.Browser.Tests --filter FullyQualifiedName~AgentFoundationBrowserTests` against a published app via `WYRMFORGE_BASE_URL`.

Playable entry points: `/enemy-lab?kind=Hollow&ai0=true&autoplay=false&cast=false` and `/enemy-lab?kind=MireHound&ai0=true&autoplay=false&cast=false`. Pause and select **Refresh AI inspector** for a stable readout. Uncheck AI0 or remove its query parameter for fallback. No save migration, asset change, balancing change or new normal-Hunt behavior is introduced.

Remaining after AI0: earned sensing and navigation/memory-expiry contracts (AI1, including Whitefang input provenance); Town modules (AI2); richer combat tactics (AI3); packs and global scheduling/pressure budgets (AI4); bounded adaptation (AI5); physical-device profiling and rollout (AI6). The compatibility policy selects existing execution modules, not new phase tactics. Snapshot restore reproduces **core** state with the same policy/version; full world/executor save/replay migration is not claimed. Current trace/blackboard bounds are entry counts, not a measured mobile allocation budget.
