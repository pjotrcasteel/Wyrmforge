# Wyrmforge — Voxel Engine V2 roadmap

**Status:** approved research direction; engineering and device acceptance remain open.  
**Scope:** isolated mobile-first voxel laboratory, not an automatic production Hunt replacement.  
**Branch:** `experiment/voxel-v2`  
**References:** [75-source research ledger](RESEARCH.md) · [Architecture decisions](ARCHITECTURE-DECISIONS.md) · [Live implementation status](PROGRESS.md) · [Canonical Wyrmforge roadmap](../../../../../docs/canon/roadmap.md) (repository-root relative link; consult canonical documents directly if this link does not resolve).

## 1. Goal and non-negotiable boundaries

Build a **buttery-smooth, fully destructible terrain foundation** in which ground, hills, cliffs, arches, overhangs and other solid geometry share one authoritative voxel representation. Destruction must be spatially local, deterministic, and observable. The renderer must not change the terrain truth. The lab must run on mobile Safari and Chrome, with desktop as a development environment.

This experiment evaluates an editable 3D occupancy model, **not** permission to replace Wyrmforge's pixel-first 2.5D runtime with a default 3D mesh pipeline. Production canon currently defines 1 m blocks, 32 gameplay world units/m, 12.5 cm (8³) fracture cells and 64 terrain-art pixels/m. A 10 cm voxel pitch and WebGL2 mesh rendering may be evaluated **only in isolation**. The C# simulation retains authoritative gameplay, collision/navigation and save/replay ownership at integration; JS rendering and workers are derived presentation. Integration requires an explicit owner decision, 2.5D visual acceptance and actual phone evidence. Never silently replace approved assets, gameplay or the Town.

## 2. Research-informed architecture

```text
Lab UI / scenario harness / deterministic report exporter
    -> ordered edit commands -> authoritative sparse 3D voxel store
                                -> committed voxel queries (DDA, collision)
                                -> versioned immutable chunk snapshots
                                -> bounded mesh-worker scheduler
                                -> revision/epoch validation
                                -> budgeted WebGL2 upload + disposal
                                -> pixel-readable orthographic 2.5D view

Future game: C# gameplay authority -> typed versioned adapter -> voxel queries/edits
                                              -> derived renderer, lighting/VFX/audio
```

- **Truth:** integer coordinates, Euclidean division for negative positions, explicit out-of-bounds policy, empty/uniform/mixed chunk encodings. Benchmark 16³ versus 32³ chunks; choose on memory, mutation, query and frame-time data, not folklore.
- **Geometry:** benchmark exposed-face meshing against greedy meshing under both intact and heavily fragmented terrain. A chunk's mesh is a disposable cache, never collision authority.
- **Mutation:** a single ordered writer accepts idempotent command IDs, material/resistance rules, bounded edit volumes, and increments chunk revisions. Neighbor invalidation includes all affected boundaries.
- **Concurrency:** bounded jobs and snapshot bytes; transferable buffers where supported; validate world epoch, chunk revision and neighbor revisions before applying results. Discard stale work and dispose replaced GPU resources.
- **Queries:** integer voxel sampling, 3D DDA rays, and direct committed-state collision; compare continuous swept AABB and capsule behavior rather than assume one algorithm is sufficient.
- **Replay:** versioned generator/material schema, deterministic seeds, accepted-command log and periodic snapshots. Verify canonical voxel hashes. Cross-device bitwise floating-point actor simulation is **not** assumed.
- **Browser:** WebGL2 baseline, context-loss recovery, pointer-cancellation-safe touch controls, no mandatory WebGPU, shared memory or cross-origin isolation.
- **Performance:** prioritize p95/p99 frame time, input-to-visible edit latency, upload budgets, allocation trend and sustained thermal behavior over headline FPS.

## 3. Milestones and acceptance gates

### V2.0 — Isolated experiment shell and trustworthy instrumentation

**Deliver:** isolated `/experimental/voxel-v2/` page; build SHA and experiment version visible; deterministic scene picker and seed; desktop pointer and mobile tap/orbit/pinch with cancellation handling; reset; frame-time p50/p95/p99 and hitch counts; report JSON export; CPU and estimated GPU/worker bytes; optional GPU timing when available. Keep production and experiment deployment distinguishable.

**Critical deployment change:** GitHub Pages publishes a **whole-site artifact**. The current independent experimental and production workflows can race even with exact-main caches. Move to **one Pages deployment owner** or a genuinely separate preview host before claiming safe deployment. Check production root, existing game routes and experiment route after each publish; compare expected SHAs. A cache is not a safety guarantee.

**Gate:** fast build/deploy timing recorded; correct SHA and scene confirmed in a browser; no production overwrite/regression; desktop interaction checked; real iPhone Safari and Android Chrome basic operation checked; report exported. **Current status: IN PROGRESS; gate NOT MET.** Existing fixed-array WebGL2 demo and FPS counter are prototypes, not acceptance evidence.

### V2.1 — Authoritative sparse terrain core

**Deliver:** sparse integer-addressed voxel store with configurable 16³/32³ chunk pitch; deterministic flat, hill, cliff and arch/overhang generators; layered grass/dirt/stone/bedrock; material and resistance schema; world-to-chunk/local coordinate APIs; explicit bounds and uniform/empty chunks; immutable revisioned snapshots.

**Tests:** seeded repeatability, negative coordinates, six-face neighbor boundaries, all generator shapes, serialization round trip, memory accounting and uniform-to-mixed transition.

**Gate:** identical canonical hashes across repeat runs; intact overhangs and cliffs occupy real 3D cells, not heightmap illusions; 16³/32³ comparative measurements recorded.

### V2.2 — Derived rendering and pixel-readable camera

**Deliver:** WebGL2 orthographic/oblique pixel-art camera; exposed-face baseline and greedy mesher; material-atlas sampling and stable texel density; face visibility across chunk seams; geometry revision metadata; renderer ownership/disposal and context recovery.

**Tests:** no internal faces, no missing boundary faces, correct grass/dirt/stone strata, stable camera and zoom, renderer reset, context-loss injection.

**Gate:** scene screenshots at 320/390 CSS px and on desktop; triangle counts, draw calls, mesh CPU time, upload bytes and p95/p99 compared between meshing algorithms; choose measured winner or justified hybrid.

### V2.3 — Deterministic destruction and resistance

**Deliver:** one command API for sphere, crater, line/tunnel and area damage; material resistance, unbreakable bedrock, capped per-hit excavation, optional repeated damage; bounded multi-chunk edit transactions; precise dirty-chunk/neighbor set; edit IDs and revision increments; immediate authoritative query visibility.

**Tests:** repeated identical edit hashes, duplicate command handling, cross-chunk sphere, cliff breach, arch destruction, bedrock invariance, no unrelated chunk mutations.

**Gate:** hills, cliffs and overhangs all destructible through the same path; destruction visibly localized; edit-to-committed latency measured separately from edit-to-visible latency.

### V2.4 — Bounded asynchronous meshing and GPU budgets

**Deliver:** worker pool sized to device capability; bounded pending jobs and memory; transferable snapshot buffers; cancellation/coalescing; world epoch and chunk/neighbor revision checks; frame-budgeted GPU uploads and disposal; explicit backpressure and queue metrics.

**Tests:** delayed/reordered workers, rapid repeated explosions, reset during rebuild, neighbor edits while jobs run, worker errors, stale-result injection, context loss during uploads, bounded allocation trend.

**Gate:** no stale mesh resurrects removed voxels; no unbounded queue or memory growth; burst workloads have measured p95/p99 and edit-to-visible latency on target phones.

### V2.5 — Physical interaction and collision queries

**Deliver:** 3D DDA for aiming/projectiles; swept-volume player movement with step/slide rules; evaluate capsule versus swept AABB; grounding, wall/cliff contact, overhang and pit handling; movement and projectile queries read committed voxels, never GPU mesh data.

**Tests:** diagonal motion, high-speed tunneling, floor/ceiling transitions, negative coordinates, cross-chunk collision, edits immediately under a moving player, impossible-spawn recovery.

**Gate:** no pass-through or obvious directional collision artifacts in the defined fixtures; same committed edit produces the same terrain query result before the mesh rebuild completes.

### V2.6 — Typed integration boundaries (without production cutover)

**Deliver:** versioned interfaces for terrain snapshots, edit commands, material queries, raycast/collision, change notifications, and renderer/lighting/VFX/audio hooks. Document C# ownership, adapter direction, thread/worker rules and failure handling. Keep feature-specific effects outside the terrain core.

**Tests:** contract serialization/versioning, adapter fakes, event ordering, replay-compatible change notifications, renderer failure isolation.

**Gate:** a minimal C#-authoritative integration proof in an isolated harness; existing game engines remain owners of lighting, VFX, audio, AI and animation. **No production migration without explicit owner approval and canonical 2.5D gates.**

### V2.7 — Foundation release and sustained mobile acceptance

**Deliver:** versioned snapshots and accepted-command replay; deterministic stress scenes and exportable benchmark profiles; reproducible 10-minute destruction sessions; documentation, known limits and recovery procedure; final chunk-size/mesher choices backed by measurements.

**Tests:** direct-run versus snapshot+replay hash equivalence; reordered worker completions do not change terrain truth; repeated resets; background/foreground; context loss; sustained destruction and collision; production route regression checks.

**Gate:** ten-minute physical iPhone Safari **and** Android Chrome runs, including p50/p95/p99, hitch counts, input/edit latency, worker queue peak, CPU/GPU estimated memory and device/browser/resolution. No progressive slowdown, state corruption, unexpected GPU resource growth or loss of production routes. Establish explicit target thresholds from V2.0 baseline and owner-approved device classes before claiming “buttery smooth”; **do not invent universal FPS guarantees**.

## 4. Execution order and dependencies

```text
Research: 75 documents + architecture synthesis  [DONE — documentary evidence only]
V2.0 deployment ownership + instrumentation     [ACTIVE — BLOCKED on deployment safety]
    -> V2.1 sparse authoritative store
    -> V2.2 render and camera
    -> V2.3 local destruction
    -> V2.4 bounded workers and GPU uploads
    -> V2.5 collision and projectiles
    -> V2.6 typed adapters
    -> V2.7 replay + sustained device acceptance
    -> separate owner-approved production integration proposal
```

Maintain a working vertical slice after every milestone. Small remote commits, isolated tests and preview builds are preferred over 20-minute full production builds. Do not mark milestones complete based on code presence, green CI alone or a GitHub deployment status without route/device verification.

## 5. Integration map: other V2 engines

| Component | Voxel V2 exposes | Owner / integration rule |
| --- | --- | --- |
| C# gameplay and terrain | versioned occupancy, material queries, accepted edit commands, snapshots | **C# authoritative**; voxel JS prototype cannot become the source of gameplay truth |
| Lighting V2 | changed solid/occluder bounds, material/height/face data | lighting engine owns light transport, emitters, shadows and mobile budget |
| Physics V2 | voxel collision/raycast queries and changed-cell notifications | physics owns actors and movement; no duplicate terrain store |
| VFX V2 | typed impact, fracture and material events with stable world coordinates | VFX owns particles, dust, sparks, burns; cosmetic only |
| Audio V2 | material and impact events | audio owns sound selection, mixing and spatialization |
| AI/navigation V2 | changed walkability/visibility regions and solid queries | C# navigation/AI authority; incremental invalidation, no renderer dependency |
| Animation/characters V2 | shared coordinate/projection contract and grounding queries | sprite-first 2.5D; terrain does not own rigs or animation |
| World generation V2 | seeded material/voxel initialization interface | generation owns biomes, landmarks and protected routes |
| Save/replay | snapshot schema, ordered accepted edits, canonical hashes | gameplay/save owner controls persistence and schema migration |
| HUD/debug tools | counters, test scenario commands, benchmark report schema | no performance-critical game logic in UI |

**Cross-engine invariant:** one world coordinate contract; typed events; one owner per responsibility; changes can be replayed; cosmetic failures cannot roll back committed terrain truth. Respect production's existing 32-units/m metric and 12.5 cm cell contract unless explicitly revised.

## 6. Standard benchmark matrix

Run the same deterministic seed and edit scripts against both chunk sizes and candidate meshers:

| Fixture | Workload | Required evidence |
| --- | --- | --- |
| Flat layered ground | idle camera, orbit and zoom | baseline frames, memory, draw calls |
| Hill and cliff | repeated localized crater and wall cuts | cross-boundary edits, mesh cost, strata |
| Arch/overhang | ceiling, wall and underside removal | genuine 3D occupancy, collision, faces |
| Fragmented terrain | many small cuts across chunks | worst-case greedy efficiency and queue pressure |
| Ambush-like burst | many simultaneous projectiles, impacts and terrain edits | bounded work, p99, hitch counts, edit latency |
| Sustained session | 10 minutes edit/reset/move/background/foreground | leak trend, thermal context, context/input recovery |
| Deterministic replay | snapshot, restore, shuffled worker completions | identical authoritative hashes, no stale mesh |

Collect: commit/build SHA; seed; scene; device, OS, browser, viewport and render scale; chunk size; mesher; frame p50/p95/p99 and >33/>50/>100 ms hitches; input-to-visible latency; committed-edit time; worker queue peak and wait; mesh build duration; GPU upload bytes/time; estimated CPU/worker/GPU memory; triangles and draw calls; context-loss counts. Report unknown measurements as **unavailable**, not zero.

## 7. Risks, alternatives and explicit deferrals

1. **Pages publication race (highest immediate risk):** fix deployment ownership before public V2.0 acceptance; fail closed rather than overwrite the game.
2. **Mobile bandwidth/thermal pressure:** benchmark real phones at sustained load; quality tiers may adjust resolution and visual complexity, never authoritative edits.
3. **Greedy mesh fragmentation:** benchmark, do not assume greedy is always fastest end-to-end.
4. **Worker backlog/stale results:** enforce revisions, epoch, bounded queues, upload budgets and explicit disposal.
5. **Cross-platform replay:** canonical integer voxel state is the hash target; avoid promising identical floating-point actor trajectories.
6. **Canon mismatch:** 10 cm experimental pitch and WebGL2 3D meshes do not override 12.5 cm / 2.5D production rules.

**Deferred until evidence warrants:** octrees, sparse voxel DAGs, brickmaps, WebGPU compute, GPU ray marching, LOD/Transvoxel, smooth density meshing, fluid simulation, structural collapse, advanced lighting, full AI/enemies and production Hunt migration.

## 8. Definition of done and status discipline

Each milestone requires: merged or remotely checkpointed code on the intended branch, focused automated tests, a reproducible demo scenario, measured acceptance evidence, a current `PROGRESS.md` update, and a known-limitations note. Only mark **ACCEPTED** when all milestone-specific gates pass; otherwise mark **IN PROGRESS**, **BLOCKED** or **READY FOR DEVICE TEST**. Document both successes and failures.

**Current verified state:** the 75-document ledger and architecture synthesis exist; the isolated prototype exists; V2.0 is not accepted; no real-device measurements or verified safe live deployment have been recorded. The immediate implementation task is to remove the dual-deployer Pages risk, then finish V2.0 instrumentation and validate the live routes and phones.
