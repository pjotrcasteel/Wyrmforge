# WyrmForge — Unified Agent AI Milestones (AI0–AI6)

**Status:** Architecture/roadmap approved in principle; **separate implementation workstream**, not a G4 Town deliverable.
**Town spatial contract:** reuse existing painted 2D Town walk masks, C# NPC navigation and interaction data. The 3D Town rebuild was cancelled 26 October 2026; AI is not dependent on it.
**Goal:** One reusable AI Agent framework supporting Town inhabitants, ordinary enemies, elites, Wyrm bosses and later summons/companions through specialized profiles and behaviors.

## Architectural rules

- **One core, specialized behaviors:** share perception, memory/blackboard, goals, action selection, navigation interfaces, coordination, diagnostics and deterministic simulation scheduling. Town NPCs, combat enemies and Wyrms have different *profiles and action modules*, not three incompatible AI engines.
- **Deterministic C# simulation:** decisions and authoritative state live outside rendering, support seeded reproducibility, bounded CPU budgets and testable action outcomes. The GPU renderer visualizes agent states but never decides behavior.
- **Perception is earned:** agents use vision/line of sight, hearing, threat events, distance and last-known information. No omniscient access to player inputs, invisible actors or exact positions without a sensing mechanism.
- **Utility decisions + controlled execution:** utility scoring selects goals/tactics; explicit state machines or behavior trees execute actions with animation locks, cooldowns, telegraph commitments, interrupt/cancel rules and gameplay authority.
- **Navigation is pluggable:** existing 2D Town route/occlusion data and semantic anchors, Hunt traversal, flying Wyrms and special movement share queries and commands, not identical locomotion assumptions.
- **No LLM dependency in real-time combat.** Optional generative dialogue/high-level personality is a future extension, not required for agent motion or combat.
- **Fair difficulty:** tactical intelligence progresses through capabilities, not only stat inflation. Preserve readable telegraphs, counterplay, bounded reaction times, limited simultaneous pressure and controlled randomness.
- **Isolation:** AI0–AI6 are **not** T0–T6 or G4/G5 acceptance requirements. The existing 2D Town provides spatial data interfaces; no 3D Town art/lighting migration is planned.

## Shared agent contract (target)

Each agent has a stable identity, archetype/faction, sensing profile, short-term memory, goals, allowed actions, locomotion/navigation adapter, coordination group, decision budget and debug state. Decisions consume **observations and events**, produce **intent/action requests**, and receive authoritative action results. All state needed for replay/debug is serializable; randomness is seeded. Profiles are data-driven so future enemy types do not require bespoke engine logic.

## Milestones and exit gates

### AI0 — Agent foundation and simulation contract

**Implementation checkpoint, 25 October 2026:** [PR #348](https://github.com/pjotrcasteel/Wyrmforge/pull/348) supplies the common C# core, Hollow/Mire Hound compatibility adapters, replay tests and real enemy-lab inspector. Local exit evidence is recorded in [AI0 foundation](../engineering/ai0-foundation.md). AI0 and AI1 are merged (#348, #362), with opt-in rollout. AI2–AI6 implementation continues in [PR #364](https://github.com/pjotrcasteel/Wyrmforge/pull/364). See [implementation and acceptance evidence](../engineering/ai2-ai6-implementation.md); automated implementation evidence is distinct from mobile/gameplay acceptance.

- Inventory existing Town NPC and enemy/Wyrm behavior paths; define migration/adapters without replacing live behavior prematurely.
- Build common agent identity, lifecycle, blackboard, observations, goal/action interfaces, seeded scheduler and deterministic test harness.
- Add inspector output: current perceptions, memory, goal, scored alternatives, chosen action and reason.
- **Exit:** two distinct agent archetypes run the same core in repeatable tests; no render/gameplay coupling.

### AI1 — Perception, memory and navigation
- Implement configurable vision/occlusion, hearing, event sensing, last-known locations and memory expiry.
- Connect abstract path queries to Town spatial contracts and Hunt navigation; support dynamic obstacles and path failure recovery.
- Budget spatial queries and decision ticks; test many idle and moving agents.
- **Exit:** agents cannot detect occluded/out-of-range targets; paths and memory behave deterministically.

### AI2 — Civilian/Town behavior modules
- Add schedule/activity/utility profiles for working, walking, socializing, waiting, resting, visiting and reacting.
- Use Town-provided entrances, workstations, queues, occupancy reservations and semantic places; handle locked/vacant buildings.
- Integrate incrementally behind a flag while retaining current NPC simulation as fallback.
- **Exit:** believable multi-NPC demonstrations without collisions or activity-slot contention; no hardcoded Town geometry inside AI.

### AI3 — Core combat tactics
- Add combat perception, threat assessment, approach/retreat/strafe, attack-range control, telegraph commitment and cooldown awareness.
- Distinguish basic instinctive enemies from reactive ones through **capability profiles**.
- Test dodge windows, attack fairness, target loss and recovery, path obstruction and seeded repeatability.
- **Exit:** representative Hollowed/Mire Hound behaviors are more interesting without hidden input-reading or unavoidable attacks.

### AI4 — Group intelligence and coordination
- Add squads/packs, flanking roles, pressure budgets, engagement slots, friendly collision avoidance and retreat/regroup.
- Prevent all enemies attacking simultaneously or forming impossible body-block traps.
- Scale from a few tactical enemies to large mobile hordes through staggered decision ticks and cheap distant behavior.
- **Exit:** reproducible pack encounters, fair simultaneous-pressure limits and CPU/frame-budget evidence.

### AI5 — Adaptive elites and Wyrm encounter intelligence
- Add bounded encounter-local observations (e.g. repeated dodge direction, preferred range, spell usage), confidence/decay and counter-tactic selection.
- Support phase-constrained boss decision-making: authored Ashfang/Wyrm phases and telegraphs remain authoritative; agent utility chooses valid tactics **within** those phases.
- Implement five behavioral sophistication tiers: I Instinctive, II Reactive, III Tactical, IV Adaptive, V Masterful. These are capability sets, not automatic health/damage multipliers.
- **Exit:** elites/Wyrms demonstrate explainable adaptations with counterplay; seeded scenario tests show no cheating, phase bypass or unfair chain attacks.

### AI6 — Profiling, balancing and rollout
- Add agent inspector overlays/logs, behavior traces, replayable encounters and metrics for detection, decision latency, damage pressure and action diversity.
- Profile mobile CPU, memory, pathfinding, scheduling and worst-case crowds/hordes; provide per-archetype decision-rate budgets and graceful degradation.
- Run balance/playtesting across early hunts, advanced hunts and Wyrm encounters; ship behind flags with fallback.
- **Exit:** validated mobile budgets, combat fairness, stable Town behavior, reproducible regression suite and gameplay sign-off.

## Progressive enemy intelligence

| Tier | Behavior capability | Example |
| --- | --- | --- |
| I — Instinctive | Pursue, basic attack, obvious recovery and mistakes | Hollowed approaches directly |
| II — Reactive | Respond to distance, hazards and failed attacks | Mire Hound repositions before lunging |
| III — Tactical | Flank, control space, cooperate within pressure limits | Two enemies alternate pressure |
| IV — Adaptive | Learn *within the encounter* from bounded recent observations | Elite counters repeatedly predictable retreats |
| V — Masterful | Phase-aware tactical combinations and controlled unpredictability | Ashfang alternates air pressure, area denial and close attacks |

An ordinary enemy may remain Tier I late in the game. Intelligence tiers are assigned by archetype, variant, encounter and difficulty rules rather than increasing every agent's intelligence automatically.

## Cross-workstream interface with Town

Town T1/T3/T5 own **world-space scene IDs, collision/navmesh, semantic destinations, interaction/occupancy slots and scene-state events**. AI1/AI2 consume these contracts later. Town does **not** implement sensing, memory, planning, utility scoring, dialogue or behavior trees. Combat AI uses the same agent core with Hunt-specific navigation and action modules.

## Non-goals and release safeguards

No second renderer, no generative-model inference per frame, no replacing boss animation choreography with free-form AI, no uncontrolled cross-encounter learning, no enemy omniscience, and no coupling AI completion to cancelled G4 Town reconstruction. Every milestone requires tests, inspectable behavior traces and playable examples, not merely a design document.
