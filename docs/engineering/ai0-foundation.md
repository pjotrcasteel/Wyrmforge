# AI0 implementation evidence

Authority: [AI0–AI6 plan](../design/unified-agent-ai-milestones.md), [creature canon](../canon/creatures-and-encounters.md), [architecture canon](../canon/architecture-and-quality.md). Inventory: [existing systems](enemy-ai-inventory-2026-10-25.md).

## Checkpoint 1 — common contract (in progress)

Renderer-independent Domain agent core: stable identity, lifecycle, immutable observations and bounded last-value blackboard, utility alternatives with ordinal tie-breaking, action requests/results, seeded staggered integer-tick scheduling, bounded inspector trace and JSON replay snapshot. No world RNG consumption. Executors must continue every simulation step; scheduling only throttles policy evaluation. The first decision is immediate, subsequent decisions are staggered. This is not a global CPU admission budget (AI4/AI6).

Bounds: 32 observations/memory facts, 16 scored alternatives and 16 recent decisions per agent. Memory has deterministic age/key eviction; sensing and expiry remain AI1. Replay snapshots cover the common core, not arbitrary external executor/world state. Restore into the same policy/version, seed, identity and interval.

Validation pending at this remote checkpoint. Hollowed/Mire Hound adapters, actual simulation opt-in, inspector and parity evidence follow. AI0 is not complete yet. Normal encounters and saves remain unchanged.
